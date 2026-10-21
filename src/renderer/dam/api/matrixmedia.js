/**
 * 调用本机矩媒内核发布。
 *
 * 壳自己就是矩媒，内置服务跑在 127.0.0.1:30088；
 * 鉴权用主进程发放的一次性 X-Matrix-Token（不落盘、重启失效）。
 */

import { ipcRenderer } from "electron";

const PUBLISH_URL = "http://localhost:30088/publish";

let tokenPromise = null;

function getToken() {
  if (!tokenPromise) {
    tokenPromise = ipcRenderer.invoke("matrix:server-token").catch(() => "");
  }
  return tokenPromise;
}

export async function publishToMatrixMedia(payload) {
  const token = await getToken();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers["X-Matrix-Token"] = token;

  let response;
  try {
    response = await fetch(PUBLISH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return {
      ok: false,
      data: null,
      message: `无法连接本机矩媒内核（30088）：${(error && error.message) || error}`
    };
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = null;
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      data,
      message: (data && (data.message || data.error)) || `矩媒返回 HTTP ${response.status}`
    };
  }

  return { ok: true, data, message: (data && data.message) || "" };
}

/** 把矩媒的返回映射成 DAM 的发布状态 */
export function mapMatrixMediaOutcome(result, scheduled) {
  const data = (result && result.data) || {};
  const raw = String(data.status || "").toLowerCase();

  if (raw === "needs_attention") {
    return {
      status: "queued",
      success: false,
      message:
        (data.message || "发布完成但需人工确认") +
        "（视频号链接添加失败，视频已转存草稿，请到视频号后台检查）"
    };
  }

  const exitCode = Number(data.exitCode);
  const success = data.success === true || exitCode === 0;

  if (success) {
    return {
      status: scheduled ? "scheduled" : "success",
      success: true,
      message: data.message || (scheduled ? "已定时" : "发布成功")
    };
  }

  return {
    status: "failed",
    success: false,
    message: (result && result.message) || data.message || "发布失败"
  };
}
