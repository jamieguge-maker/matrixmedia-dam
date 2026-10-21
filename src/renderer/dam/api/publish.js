/** 发布相关接口（壳内） */

import { api } from "./client";

function buildQuery(query) {
  const params = new URLSearchParams();
  Object.keys(query || {}).forEach((key) => {
    const value = query[key];
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const text = params.toString();
  return text ? "?" + text : "";
}

/** 当前用户可见的发布账号（服务端已按负责人过滤） */
export function listTargets(query) {
  return api.get("/targets" + buildQuery(query));
}

/** 按发布计划计算每个平台的下一个可发日期 */
export function publishSlots(platforms) {
  return api.get("/publish/slots" + buildQuery({ platforms: platforms.join(",") }));
}

/** 提交发布前先落一条记录 */
export function createPublishRecord(payload) {
  return api.post("/publish/records", payload);
}

/** 发布完成后回写状态 */
export function updatePublishRecord(id, payload) {
  return api.patch(`/publish/records/${id}`, payload);
}

export function listPublishRecords(query) {
  return api.get("/publish/records" + buildQuery(query));
}
