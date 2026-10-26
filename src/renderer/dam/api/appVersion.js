/** 客户端版本策略（服务端 /app/client-version，免登录） */

import { api } from "./client";

/**
 * 拉取「最低允许版本 + 下载地址」。
 *
 * 不重试、不带登录态要求：登录页也要能弹升级提示，
 * 而且网络不通时静默失败比反复重试更合适。
 */
export function fetchClientVersionPolicy() {
  return api.get("/app/client-version", { retry: 0, authRedirect: false, timeout: 8000 });
}
