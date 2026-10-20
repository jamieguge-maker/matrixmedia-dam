"use strict";

/**
 * 更新检查（公司自有清单）。
 *
 * 接管上游的 check-for-updates / start-update-download：
 * 上游读的是官方 Gitee 仓库，直接沿用会把官方安装包当成新版本提示。
 *
 * 清单地址来自环境变量 DAM_UPDATE_URL，格式与 GitHub Release latest 兼容：
 * { tag_name, name, body, assets: [{ name, browser_download_url }] }
 * 未配置时不检查、不下载。
 */

import { app, BrowserWindow } from "electron";
import https from "https";
import downloadFile from "../services/downloadFile";
import { pickReleaseInstaller } from "../services/pickReleaseInstaller";

const FEED_URL = (process.env.DAM_UPDATE_URL || "").trim();
const CACHE_TTL_MS = 60 * 60 * 1000;

let cache = null;
let cacheAt = 0;

function requestJson(url, redirectLeft) {
  const remaining = typeof redirectLeft === "number" ? redirectLeft : 3;
  return new Promise((resolve) => {
    let target;
    try {
      target = new URL(url);
    } catch (_) {
      resolve(null);
      return;
    }

    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "matrixmedia-dam"
        }
      },
      (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location && remaining > 0) {
          res.resume();
          resolve(requestJson(res.headers.location, remaining - 1));
          return;
        }
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (status !== 200) {
            console.warn("[dam] 更新清单返回", status);
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            console.warn("[dam] 更新清单不是合法 JSON：", error && error.message);
            resolve(null);
          }
        });
      }
    );

    req.on("error", (error) => {
      console.warn("[dam] 拉取更新清单失败：", error && error.message);
      resolve(null);
    });
    req.setTimeout(20000, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

async function getLatest() {
  if (!FEED_URL) return null;
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;

  const data = await requestJson(FEED_URL);
  if (data && (data.tag_name || data.name)) {
    cache = data;
    cacheAt = Date.now();
    return data;
  }
  return null;
}

/** 二改版版本形如 0.12.9-dam.1，比较时只取上游部分 */
function baseVersion(value) {
  return String(value || "")
    .replace(/^v/i, "")
    .trim()
    .split("-")[0];
}

function parseParts(value) {
  return baseVersion(value)
    .split(".")
    .map((part) => parseInt(part, 10) || 0);
}

function compareVersions(remote, local) {
  const a = parseParts(remote);
  const b = parseParts(local);
  const length = Math.max(a.length, b.length, 3);
  for (let i = 0; i < length; i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    if (left !== right) return left > right ? 1 : -1;
  }
  return 0;
}

export const damUpdateSource = {
  async handle(channel, event) {
    if (channel === "check-for-updates") {
      const latest = await getLatest();
      if (!latest) return { hasUpdate: false };

      const currentVersion = app.getVersion();
      const remoteVersion =
        (latest.tag_name && String(latest.tag_name).replace(/^v/i, "")) ||
        String(latest.name || "").replace(/^v/i, "");
      const installer = pickReleaseInstaller(latest.assets || [], {
        translated: Boolean(app.runningUnderARM64Translation)
      });

      return {
        hasUpdate: Boolean(installer && compareVersions(remoteVersion, currentVersion) > 0),
        currentVersion,
        latestVersion: remoteVersion,
        releaseName: latest.name || latest.tag_name || "",
        releaseBody: latest.body || ""
      };
    }

    if (channel === "start-update-download") {
      if (!FEED_URL) {
        return { ok: false, message: "未配置更新源（DAM_UPDATE_URL）" };
      }
      const latest = await getLatest();
      if (!latest) return { ok: false, message: "未获取到版本信息，请检查网络" };

      const installer = pickReleaseInstaller(latest.assets || [], {
        translated: Boolean(app.runningUnderARM64Translation)
      });
      const downloadUrl = installer && installer.browser_download_url;
      if (!downloadUrl) return { ok: false, message: "未找到适合当前平台的安装包" };

      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return { ok: false, message: "主窗口已关闭，无法下载" };

      downloadFile.download(win, downloadUrl);
      return { ok: true };
    }

    return { ok: false, message: `未知的更新通道：${channel}` };
  }
};
