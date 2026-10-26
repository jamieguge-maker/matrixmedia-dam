/** 素材相关接口（壳内） */

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

export function listAssets(query) {
  return api.get("/assets" + buildQuery(query));
}

export function assetStats() {
  return api.get("/assets/stats");
}

export function assetGroups(section) {
  return api.get("/assets/groups" + buildQuery({ section }));
}

export function assetThumbUrls(ids) {
  return api.post("/assets/thumb-urls", { ids });
}

export function assetPreviewUrls(ids) {
  return api.post("/assets/preview-urls", { ids });
}

export function getAsset(id) {
  return api.get(`/assets/${id}`);
}

export function assetPublishRecords(assetId) {
  return api.get("/publish/records" + buildQuery({ assetId, page: 1, pageSize: 50 }));
}

/** 产品板块的「系列 → 品类」清单（用于品类筛选） */
export function categoryTree(section) {
  return api.get("/categories/sections" + buildQuery({ section }));
}

/** 按校验值查重（上传前用） */
export function findAssetByChecksum(checksum) {
  return api.get(`/assets/by-checksum/${encodeURIComponent(checksum)}`);
}

export function createAsset(payload) {
  return api.post("/assets", payload);
}

export function patchAssetStorage(id, payload) {
  return api.post(`/assets/${id}/storage`, payload);
}

/** 移入回收站（软删除，可在正式版「素材回收站」恢复） */
export function deleteAsset(id) {
  return api.del(`/assets/${id}`);
}

/** 彻底删除素材；deleteRemote=true 时连 WPS 云端文件一起删（仅管理员） */
export function purgeAssets(ids, deleteRemote) {
  return api.post("/assets/purge", { ids, deleteRemote: Boolean(deleteRemote) });
}

export function appendUploadLog(payload) {
  return api.post("/logs", payload);
}
