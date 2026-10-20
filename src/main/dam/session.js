"use strict";

/**
 * 壳内登录态。
 *
 * 只保存 DAM 服务端签发的 JWT，不保存密码。
 * 优先用 Electron safeStorage 加密；不可用时退化为普通文件（并记录警告）。
 */

import { app, safeStorage } from "electron";
import fs from "fs";
import path from "path";

function sessionPath() {
  return path.join(app.getPath("userData"), "dam-session.bin");
}

function encryptionAvailable() {
  try {
    return safeStorage && safeStorage.isEncryptionAvailable();
  } catch (_) {
    return false;
  }
}

export function readSession() {
  try {
    const raw = fs.readFileSync(sessionPath());
    let text;
    if (encryptionAvailable()) {
      text = safeStorage.decryptString(raw);
    } else {
      text = raw.toString("utf-8");
    }
    const parsed = JSON.parse(text);
    if (!parsed || !parsed.token) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

export function writeSession(session) {
  const payload = {
    token: String((session && session.token) || ""),
    user: (session && session.user) || null,
    baseUrl: String((session && session.baseUrl) || ""),
    savedAt: new Date().toISOString()
  };
  if (!payload.token) return null;

  try {
    fs.mkdirSync(path.dirname(sessionPath()), { recursive: true });
    const text = JSON.stringify(payload);
    if (encryptionAvailable()) {
      fs.writeFileSync(sessionPath(), safeStorage.encryptString(text));
    } else {
      console.warn("[dam] safeStorage 不可用，登录态将以明文保存");
      fs.writeFileSync(sessionPath(), text, "utf-8");
    }
    return payload;
  } catch (error) {
    console.warn("[dam] 保存登录态失败：", error && error.message);
    return null;
  }
}

export function clearSession() {
  try {
    fs.unlinkSync(sessionPath());
  } catch (_) {
    /* 文件不存在时忽略 */
  }
  return true;
}
