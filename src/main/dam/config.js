"use strict";

/** 壳内配置（服务端地址、同步间隔）。存 userData/dam-config.json。 */

import { app } from "electron";
import fs from "fs";
import path from "path";

const DEFAULT_CONFIG = {
  /** DAM 服务端 API 根地址（不含末尾斜杠） */
  apiBase: "https://dam.guocio.cn/api",
  /** 「当前在发布」自动同步间隔（分钟）；0 = 关闭 */
  syncIntervalMin: 5
};

function configPath() {
  return path.join(app.getPath("userData"), "dam-config.json");
}

export function getConfig() {
  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return Object.assign({}, DEFAULT_CONFIG, parsed && typeof parsed === "object" ? parsed : {});
  } catch (_) {
    return Object.assign({}, DEFAULT_CONFIG);
  }
}

export function setConfig(patch) {
  const next = Object.assign({}, getConfig(), patch && typeof patch === "object" ? patch : {});
  try {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(next, null, 2), "utf-8");
  } catch (error) {
    console.warn("[dam] 保存配置失败：", error && error.message);
  }
  return next;
}

export { DEFAULT_CONFIG };
