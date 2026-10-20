/**
 * DAM API 客户端（渲染层）。
 *
 * 约定：
 *   - 服务端路由统一挂在 apiBase 下，如 https://dam.guocio.cn/api
 *   - 鉴权用 Authorization: Bearer <JWT>，令牌存在主进程（safeStorage）
 *   - 401 统一清理会话并广播，由上层跳转登录页
 */

import { ipcRenderer } from "electron";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status || 0;
    this.code = code || "";
  }
}

const DEFAULT_API_BASE = "https://dam.guocio.cn/api";
const DEFAULT_TIMEOUT = 20000;

let baseUrlPromise = null;
let tokenCache = "";

export function resetBaseUrl() {
  baseUrlPromise = null;
}

export function setToken(token) {
  tokenCache = token || "";
}

export function clearToken() {
  tokenCache = "";
}

async function getBaseUrl() {
  if (!baseUrlPromise) {
    baseUrlPromise = ipcRenderer
      .invoke("dam:config:get")
      .then((config) => (config && config.apiBase) || DEFAULT_API_BASE)
      .catch(() => DEFAULT_API_BASE);
  }
  return baseUrlPromise;
}

async function getToken() {
  if (tokenCache) return tokenCache;
  try {
    const session = await ipcRenderer.invoke("dam:session:get");
    tokenCache = (session && session.token) || "";
  } catch (_) {
    tokenCache = "";
  }
  return tokenCache;
}

function joinUrl(base, path) {
  const left = String(base || "").replace(/\/+$/, "");
  const right = String(path || "");
  return left + (right.startsWith("/") ? right : "/" + right);
}

const unauthorizedHandlers = new Set();

export function onUnauthorized(handler) {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

function notifyUnauthorized() {
  unauthorizedHandlers.forEach((handler) => {
    try {
      handler();
    } catch (error) {
      console.warn("[dam] 401 处理回调异常：", error && error.message);
    }
  });
}

async function handleUnauthorized() {
  clearToken();
  try {
    await ipcRenderer.invoke("dam:session:clear");
  } catch (_) {
    /* 忽略清理失败 */
  }
  notifyUnauthorized();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 发起请求。
 *
 * @param {string} path        `/assets` 这类以 / 开头的路径
 * @param {object} options     method / body / timeout / retry / raw
 */
export async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const retry = options.retry === undefined ? (method === "GET" ? 2 : 0) : options.retry;
  const base = await getBaseUrl();
  const url = joinUrl(base, path);
  const token = await getToken();

  let lastError = null;

  for (let attempt = 0; attempt <= retry; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

    try {
      const headers = { Accept: "application/json" };
      let body = options.body;
      if (
        body !== undefined &&
        body !== null &&
        !(body instanceof FormData) &&
        !(body instanceof Blob)
      ) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(body);
      }
      if (token) headers.Authorization = "Bearer " + token;

      const response = await fetch(url, {
        method,
        headers,
        body: body === null ? undefined : body,
        signal: controller ? controller.signal : undefined
      });

      if (timer) clearTimeout(timer);

      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = null;
        }
      }

      if (response.status === 401) {
        // 登录接口的 401 是「用户名或密码不正确」，不能当成会话过期
        if (options.authRedirect === false) {
          throw new ApiError(
            (data && (data.message || data.error)) || "用户名或密码不正确",
            401,
            "unauthorized"
          );
        }
        await handleUnauthorized();
        throw new ApiError("登录已过期，请重新登录", 401, "unauthorized");
      }

      if (!response.ok) {
        const message =
          (data && (data.message || data.error)) || `请求失败（HTTP ${response.status}）`;
        throw new ApiError(message, response.status, (data && data.code) || "");
      }

      return options.raw ? { data, response } : data;
    } catch (error) {
      if (timer) clearTimeout(timer);
      if (error instanceof ApiError) throw error;

      const aborted = error && error.name === "AbortError";
      lastError = new ApiError(
        aborted
          ? `请求超时（${Math.round(timeout / 1000)} 秒），请检查网络或服务端地址`
          : `无法连接 DAM 服务端：${(error && error.message) || error}`,
        0,
        aborted ? "timeout" : "network"
      );

      if (attempt < retry) {
        await sleep(400 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError || new ApiError("请求失败", 0, "unknown");
}

export const api = {
  get: (path, options) => request(path, Object.assign({}, options, { method: "GET" })),
  post: (path, body, options) =>
    request(path, Object.assign({}, options, { method: "POST", body })),
  put: (path, body, options) =>
    request(path, Object.assign({}, options, { method: "PUT", body })),
  patch: (path, body, options) =>
    request(path, Object.assign({}, options, { method: "PATCH", body })),
  del: (path, options) => request(path, Object.assign({}, options, { method: "DELETE" }))
};
