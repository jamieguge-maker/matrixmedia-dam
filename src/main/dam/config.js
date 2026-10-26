"use strict";

/** 壳内配置（服务端地址、同步间隔）。存 userData/dam-config.json。 */

import { app } from "electron";
import fs from "fs";
import path from "path";

const DEFAULT_CONFIG = {
  /**
   * DAM 服务端 API 根地址（不含末尾斜杠）。
   *
   * version2 走独立实例：/api-v2 → 127.0.0.1:3011 → 库 guocio_dam_v2，
   * 与 version1 的 /api（3010 → guocio_dam）完全隔离。
   */
  apiBase: "https://dam.guocio.cn/api-v2",
  /** 「当前在发布」自动同步间隔（分钟）；0 = 关闭 */
  syncIntervalMin: 5
};

/** 老版本默认地址：升级时要自动迁到 apiBase，否则会继续连 version1 的库 */
const LEGACY_API_BASE = "https://dam.guocio.cn/api";

function configPath() {
  return path.join(app.getPath("userData"), "dam-config.json");
}

export function getConfig() {
  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    const parsed = JSON.parse(raw);
    const next = Object.assign({}, DEFAULT_CONFIG, parsed && typeof parsed === "object" ? parsed : {});
    /**
     * 升级迁移：旧版默认地址写在配置文件里（或用户沿用了默认值）。
     * version2 现在有独立库，继续连 /api 会读到 version1 的数据，必须自动改过来。
     */
    if (String(next.apiBase || "").replace(/\/+$/, "") === LEGACY_API_BASE) {
      next.apiBase = DEFAULT_CONFIG.apiBase;
    }
    return next;
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
