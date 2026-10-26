"use strict";

/**
 * 壳内 IPC。统一 dam: 前缀，避免与上游通道重名。
 */

import { app, BrowserWindow, ipcMain, shell } from "electron";
import { getConfig, setConfig } from "./config";
import { readSession, writeSession, clearSession } from "./session";
import { APP_NAME } from "./identity";
import { registerUploadIpc } from "./upload";
import downloadFile from "../services/downloadFile";

const UPDATE_CHANNELS = ["check-for-updates", "start-update-download"];

/**
 * 接管上游更新检查。
 *
 * 上游在 windowManager 模块求值时注册这两个通道，本模块由锚点 A1 引入，
 * 一定在其之后执行。上游若改名，removeHandler 不报错但接管失效，
 * 此时会回落到官方逻辑（appId 不同，不会覆盖二改版）。
 */
export function takeoverUpdateCheck(source) {
  for (const channel of UPDATE_CHANNELS) {
    try {
      ipcMain.removeHandler(channel);
    } catch (_) {
      /* 上游还没有注册时忽略 */
    }
    ipcMain.handle(channel, (event, ...args) => source.handle(channel, event, ...args));
  }
}

export function registerDamIpc() {
  ipcMain.handle("dam:app:info", () => ({
    version: app.getVersion(),
    name: APP_NAME,
    electronName: app.getName(),
    userData: app.getPath("userData"),
    updateFeed: (process.env.DAM_UPDATE_URL || "").trim()
  }));

  ipcMain.handle("dam:config:get", () => getConfig());

  ipcMain.handle("dam:config:set", (_event, patch) => setConfig(patch));

  ipcMain.handle("dam:session:get", () => readSession());

  ipcMain.handle("dam:session:set", (_event, session) => writeSession(session));

  ipcMain.handle("dam:session:clear", () => clearSession());

  ipcMain.handle("dam:open-external", async (_event, url) => {
    const text = String(url || "");
    if (!/^https:\/\//i.test(text)) {
      return { ok: false, message: "只允许打开 https 链接" };
    }
    await shell.openExternal(text);
    return { ok: true };
  });

  ipcMain.handle("dam:download-update", (event, url) => {
    let parsed;
    try {
      parsed = new URL(String(url || ""));
    } catch (_) {
      return { ok: false, message: "下载地址无效" };
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "github.com" ||
      !parsed.pathname.startsWith("/jamieguge-maker/matrixmedia-dam/releases/download/")
    ) {
      return { ok: false, message: "只允许下载官方 GitHub Release 安装包" };
    }
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { ok: false, message: "主窗口已关闭，无法下载" };
    downloadFile.download(win, parsed.href, { damUpdate: true });
    return { ok: true };
  });

  registerUploadIpc();
}
