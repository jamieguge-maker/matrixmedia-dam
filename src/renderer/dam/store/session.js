/**
 * 壳内会话（DAM 账号）。
 *
 * 令牌只存主进程（safeStorage 加密），渲染层通过 IPC 读取；
 * 这里维护一份内存状态供页面使用，401 时统一清空。
 */

import Vue from "vue";
import { ipcRenderer } from "electron";
import { api, setToken, clearToken, onUnauthorized } from "../api/client";

const state = Vue.observable({
  ready: false,
  token: "",
  user: null,
  baseUrl: "",
  loading: false,
  lastError: ""
});

let restorePromise = null;

function resetState() {
  state.token = "";
  state.user = null;
  state.ready = true;
}

async function loadBaseUrl() {
  try {
    const config = await ipcRenderer.invoke("dam:config:get");
    state.baseUrl = (config && config.apiBase) || "";
  } catch (_) {
    state.baseUrl = "";
  }
  return state.baseUrl;
}

/**
 * 恢复会话。
 *
 * - 首次进入 DAM 页面时调用一次；之后按内存状态直接返回
 * - 有令牌时用 /auth/profile 校验一次，避免拿着过期令牌进页面
 * - 网络失败不清令牌（下次还能用），只返回 false 并给出原因
 */
async function restore(force) {
  if (!force && state.ready) return Boolean(state.token);
  if (!force && restorePromise) return restorePromise;

  restorePromise = (async () => {
    await loadBaseUrl();
    let session = null;
    try {
      session = await ipcRenderer.invoke("dam:session:get");
    } catch (_) {
      session = null;
    }

    if (!session || !session.token) {
      resetState();
      return false;
    }

    setToken(session.token);
    try {
      const user = await api.get("/auth/profile", { retry: 0 });
      state.token = session.token;
      state.user = user;
      state.ready = true;
      state.lastError = "";
      return true;
    } catch (error) {
      if (error && error.status === 401) {
        resetState();
        return false;
      }
      // 网络问题：保留令牌，等用户重试
      state.token = "";
      state.user = null;
      state.ready = true;
      state.lastError = (error && error.message) || "无法确认登录状态";
      return false;
    }
  })();

  try {
    return await restorePromise;
  } finally {
    restorePromise = null;
  }
}

async function login(username, password) {
  state.loading = true;
  state.lastError = "";
  try {
    await loadBaseUrl();
    const result = await api.post(
      "/auth/login",
      { username: String(username || "").trim(), password: String(password || "") },
      { retry: 0, authRedirect: false }
    );
    const token = result && result.token;
    if (!token) throw new Error("服务端未返回登录令牌");

    setToken(token);
    await ipcRenderer.invoke("dam:session:set", {
      token,
      user: result.user || null,
      baseUrl: state.baseUrl
    });

    state.token = token;
    state.user = result.user || null;
    state.ready = true;
    return result.user || null;
  } catch (error) {
    state.lastError = (error && error.message) || "登录失败";
    throw error;
  } finally {
    state.loading = false;
  }
}

async function logout() {
  clearToken();
  try {
    await ipcRenderer.invoke("dam:session:clear");
  } catch (_) {
    /* 忽略 */
  }
  resetState();
  state.lastError = "";
}

onUnauthorized(() => {
  resetState();
  state.lastError = "登录已过期，请重新登录";
});

export function useDamSession() {
  return { state, restore, login, logout, loadBaseUrl };
}
