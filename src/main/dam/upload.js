"use strict";

/**
 * 壳内上传能力（主进程）。
 *
 * 大文件不能进渲染层内存：选文件、算哈希、流式上传都在主进程完成，
 * 渲染层只拿进度与结果。
 */

import { dialog, ipcMain, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import http from "http";
import https from "https";
import { getConfig } from "./config";
import { readSession } from "./session";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff", "heic"];
const VIDEO_EXTS = ["mp4", "mov", "m4v", "avi", "mkv", "webm", "flv", "wmv", "mpg", "mpeg"];

function apiUrl(pathname) {
  const base = String(getConfig().apiBase || "").replace(/\/+$/, "");
  return base + pathname;
}

function namesFromPaths(paths) {
  return paths.map((filePath) => {
    let size = 0;
    try {
      size = fs.statSync(filePath).size;
    } catch (_) {
      size = 0;
    }
    return { path: filePath, name: path.basename(filePath), size };
  });
}

function pickFiles(event, options) {
  const type = (options && options.type) || "all";
  const multiple = options && options.multiple !== false;
  const owner = BrowserWindow.fromWebContents(event.sender) || undefined;

  let filters;
  if (type === "image") {
    filters = [{ name: "图片", extensions: IMAGE_EXTS }];
  } else if (type === "video") {
    filters = [{ name: "视频", extensions: VIDEO_EXTS }];
  } else {
    filters = [{ name: "素材文件", extensions: [...IMAGE_EXTS, ...VIDEO_EXTS, "pdf", "doc", "docx", "txt", "zip"] }];
  }

  return dialog
    .showOpenDialog(owner, {
      title: type === "image" ? "选择封面图" : "选择素材文件",
      properties: multiple ? ["openFile", "multiSelections"] : ["openFile"],
      filters
    })
    .then((result) => {
      if (result.canceled || !result.filePaths.length) return [];
      return namesFromPaths(result.filePaths);
    });
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const md5 = crypto.createHash("md5");
    const sha256 = crypto.createHash("sha256");
    let size = 0;

    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => {
      size += chunk.length;
      md5.update(chunk);
      sha256.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve({ size, md5: md5.digest("hex"), sha256: sha256.digest("hex") });
    });
  });
}

/**
 * 流式上传到 DAM 服务端 `/wps/upload`。
 *
 * 服务端按固定落点 + x-folder-path 建目录，再转存 WPS。
 */
function uploadFile(event, payload) {
  const { filePath, fileName, folderPath, taskId } = payload || {};
  if (!filePath || !fs.existsSync(filePath)) {
    return Promise.resolve({ ok: false, message: "文件不存在：" + (filePath || "") });
  }

  const session = readSession();
  if (!session || !session.token) {
    return Promise.resolve({ ok: false, message: "登录已过期，请重新登录" });
  }

  const stat = fs.statSync(filePath);
  const url = new URL(apiUrl("/wps/upload"));
  const transport = url.protocol === "https:" ? https : http;
  const targetName = String(fileName || path.basename(filePath));

  return new Promise((resolve) => {
    let uploaded = 0;
    let lastSentAt = 0;

    const sendProgress = () => {
      const now = Date.now();
      if (now - lastSentAt < 200 && uploaded < stat.size) return;
      lastSentAt = now;
      try {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send("dam:upload-progress", {
            taskId,
            uploaded,
            total: stat.size,
            percent: stat.size ? Math.min(100, Math.round((uploaded / stat.size) * 100)) : 0
          });
        }
      } catch (_) {
        /* 窗口关闭时忽略 */
      }
    };

    const request = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          Authorization: "Bearer " + session.token,
          "Content-Type": "application/octet-stream",
          "Content-Length": stat.size,
          Accept: "application/json",
          "x-file-name": encodeURIComponent(targetName),
          "x-folder-path": encodeURIComponent(JSON.stringify(folderPath || []))
        }
      },
      (response) => {
        let body = "";
        response.setEncoding("utf-8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          let data = null;
          try {
            data = body ? JSON.parse(body) : null;
          } catch (_) {
            data = null;
          }
          const status = response.statusCode || 0;
          if (status >= 200 && status < 300) {
            sendProgress();
            resolve({ ok: true, data });
            return;
          }
          const message =
            (data && (data.message || data.error)) ||
            (status === 401 ? "登录已过期，请重新登录" : `上传失败（HTTP ${status}）`);
          resolve({ ok: false, data, message });
        });
      }
    );

    request.on("error", (error) => {
      resolve({ ok: false, message: `上传失败：${(error && error.message) || error}` });
    });

    request.setTimeout(0);

    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => {
      uploaded += chunk.length;
      sendProgress();
    });
    stream.on("error", (error) => {
      request.destroy();
      resolve({ ok: false, message: `读取文件失败：${(error && error.message) || error}` });
    });
    stream.pipe(request);
  });
}

export function registerUploadIpc() {
  ipcMain.handle("dam:pick-files", (event, options) => pickFiles(event, options));
  ipcMain.handle("dam:hash-file", (_event, filePath) => hashFile(filePath));
  ipcMain.handle("dam:upload-file", (event, payload) => uploadFile(event, payload));
}
