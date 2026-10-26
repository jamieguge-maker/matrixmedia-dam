/** 客户端版本策略（服务端 /app/client-version，免登录） */

import { api } from "./client";
import { compareVersion } from "../utils/versionCompare";

const RELEASE_API = "https://api.github.com/repos/jamieguge-maker/matrixmedia-dam/releases/latest";
let releaseCache = null;
let releaseCacheAt = 0;
const RELEASE_CACHE_MS = 10 * 60 * 1000;

async function fetchPublicReleasePolicy() {
  if (releaseCache && Date.now() - releaseCacheAt < RELEASE_CACHE_MS) return releaseCache;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const response = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller ? controller.signal : undefined
    });
    if (!response.ok) return null;
    const release = await response.json();
    const latestVersion = String(release.tag_name || release.name || "").replace(/^v/i, "").trim();
    const installer = (release.assets || []).find((asset) => /-win-x64\.exe$/i.test(asset.name || ""));
    if (!latestVersion || !installer || !installer.browser_download_url) return null;
    releaseCache = {
      latestVersion,
      downloadUrl: installer.browser_download_url,
      notes: release.body || "本次版本更新已发布。",
      force: false
    };
    releaseCacheAt = Date.now();
    return releaseCache;
  } catch (_) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 拉取「最低允许版本 + 下载地址」。
 *
 * 不重试、不带登录态要求：登录页也要能弹升级提示，
 * 而且网络不通时静默失败比反复重试更合适。
 */
export function fetchClientVersionPolicy() {
  return Promise.all([
    api.get("/app/client-version", { retry: 0, authRedirect: false, timeout: 8000 }).catch(() => ({})),
    fetchPublicReleasePolicy()
  ]).then(([serverPolicy, releasePolicy]) => {
    const policy = serverPolicy || {};
    if (
      releasePolicy &&
      (!policy.latestVersion || compareVersion(releasePolicy.latestVersion, policy.latestVersion) > 0)
    ) {
      return Object.assign({}, policy, releasePolicy);
    }
    return policy;
  });
}
