#!/usr/bin/env node
/**
 * 预修复 electron-builder 的 winCodeSign 缓存。
 *
 * 背景（Windows）：
 *   winCodeSign-2.6.0.7z 里包含 macOS 用的符号链接（darwin/10.12/lib/*.dylib）。
 *   解压符号链接需要「创建符号链接」特权，普通用户（甚至未提权的管理员）没有，
 *   于是 electron-builder 解压失败：
 *     ERROR: Cannot create symbolic link : 客户端没有所需的特权
 *
 * 做法：
 *   把压缩包解压到 electron-builder 期望的目录（winCodeSign-2.6.0），
 *   但排除我们用不到的 darwin/ 目录 —— Windows 打包只需要 rcedit 与 signtool。
 *
 * 使用：
 *   node scripts/fix-wincodesign-cache.mjs
 *   （已配置为 yarn build 的 prebuild 钩子，正常打包会自动执行）
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "2.6.0";
const MIRROR =
  "https://npmmirror.com/mirrors/electron-builder-binaries/winCodeSign-" + VERSION + "/winCodeSign-" + VERSION + ".7z";

function cacheRoot() {
  if (process.env.ELECTRON_BUILDER_CACHE) {
    return String(process.env.ELECTRON_BUILDER_CACHE).replace(/[\\/]+$/, "");
  }
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;
  return path.join(localAppData, "electron-builder", "Cache");
}

function log(message) {
  console.log("[fix-wincodesign] " + message);
}

function isReady(target) {
  return fs.existsSync(path.join(target, "rcedit-x64.exe"));
}

async function download(url, output) {
  log("下载 " + url);
  const response = await fetch(url);
  if (!response.ok) throw new Error("下载失败：HTTP " + response.status);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(output, buffer);
  log("已下载 " + buffer.length + " 字节");
}

async function main() {
  if (process.platform !== "win32") {
    log("非 Windows，跳过");
    return;
  }

  const cache = cacheRoot();
  if (!cache) {
    log("找不到 LOCALAPPDATA，跳过");
    return;
  }

  const dir = path.join(cache, "winCodeSign");
  const target = path.join(dir, "winCodeSign-" + VERSION);

  if (isReady(target)) {
    log("缓存已就绪：" + target);
    return;
  }

  fs.mkdirSync(dir, { recursive: true });

  // 优先复用 electron-builder 失败时留下的 .7z，避免重复下载
  let archive = null;
  try {
    const files = fs
      .readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith(".7z"))
      .map((name) => path.join(dir, name))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    archive = files[0] || null;
  } catch (_) {
    archive = null;
  }

  if (!archive) {
    archive = path.join(dir, "winCodeSign-" + VERSION + ".7z");
    try {
      await download(MIRROR, archive);
    } catch (error) {
      log("下载失败，交给 electron-builder 自行处理：" + (error && error.message));
      return;
    }
  } else {
    log("复用已有压缩包：" + archive);
  }

  const sevenZip = path.join(ROOT, "node_modules", "7zip-bin", "win", "x64", "7za.exe");
  if (!fs.existsSync(sevenZip)) {
    log("找不到 7za.exe，跳过");
    return;
  }

  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });

  // -x!darwin/* ：跳过含符号链接的 macOS 目录
  const result = spawnSync(sevenZip, ["x", archive, "-o" + target, "-x!darwin/*", "-y"], {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    log("解压失败（退出码 " + result.status + "）");
    return;
  }

  log(isReady(target) ? "完成：" + target : "解压完成，但未找到 rcedit-x64.exe");
}

main().catch((error) => {
  // 这里只做预处理，失败不阻断打包
  log("跳过：" + ((error && error.message) || error));
});
