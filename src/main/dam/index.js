"use strict";

/**
 * DAM 薄壳 · 主进程入口。
 *
 * 由 src/main/index.js 的锚点 A1 引入，位置在其它 import 之后、cliMode 判断之前：
 * 此时 windowManager 已完成模块求值（上游的 ipcMain 通道已注册），
 * 因此这里可以安全地接管更新检查。
 *
 * 本文件只做三件事：
 *   1. 与官方版隔离应用身份（userData / AppUserModelId）
 *   2. 接管更新检查，避免提示安装官方安装包
 *   3. 注册 dam:* IPC 通道
 */

import { app } from "electron";
import path from "path";
import { registerDamIpc, takeoverUpdateCheck } from "./ipc";
import { damUpdateSource } from "./updateSource";
import { APP_NAME, APP_ID } from "./identity";
import { clearSession } from "./session";

/** 与官方 matrix-video 隔离：userData、任务栏标识、单实例都独立 */
if (app.name !== APP_NAME) {
  app.name = APP_NAME;
}
if (typeof app.setName === "function" && app.getName() !== APP_NAME) {
  app.setName(APP_NAME);
}

/**
 * 只改 app.name 不足以隔离 userData：
 * Electron 在 JS 执行前就按 package.json 的名字算好了默认路径，
 * 必须显式 setPath，否则会和官方版共用登录 Cookie 与本地数据。
 */
try {
  const override = process.env.DAM_PROFILE_DIR;
  const target = override ? path.resolve(override) : path.join(app.getPath("appData"), APP_NAME);
  if (app.getPath("userData") !== target) {
    app.setPath("userData", target);
  }
} catch (error) {
  console.warn("[dam] 设置 userData 目录失败：", error && error.message);
}

if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}

/**
 * 每次启动都要求重新登录（用户要求：打开应用必须有登录操作）。
 *
 * 之前把令牌加密留在本机，启动即自动进入工作区；现在启动时清掉，
 * 页面会落到登录页。clearSession 必须在上面 setPath 之后调用，
 * 否则会去删默认的 matrix-video 目录。
 */
clearSession();

/**
 * 上游 main/index.js 在 import 之后会强制 app.name = "matrix-video"
 * （为了让 dev / cli / 打包后的 userData 路径一致），会覆盖上面这次赋值。
 *
 * userData 已经用 setPath 固定，不受影响；这里再延后设置一次，
 * 让应用名、日志名与关于信息也保持二改版身份。
 */
setImmediate(() => {
  try {
    if (app.name !== APP_NAME) app.name = APP_NAME;
    if (process.platform === "win32") app.setAppUserModelId(APP_ID);
  } catch (error) {
    console.warn("[dam] 设置应用名失败：", error && error.message);
  }
});

takeoverUpdateCheck(damUpdateSource);
registerDamIpc();

export { APP_NAME, APP_ID };
