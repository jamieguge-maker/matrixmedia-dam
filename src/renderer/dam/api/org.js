/** 账号管理接口（部门 / 成员）。服务端只允许管理员调用，失败时按 403 提示。 */

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

export function listDepartments() {
  return api.get("/departments");
}

export function listOrgUsers(params) {
  return api.get("/users" + buildQuery(params));
}

export function createOrgUser(payload) {
  return api.post("/users", payload);
}

export function updateOrgUser(id, payload) {
  return api.patch(`/users/${id}`, payload);
}

export function resetOrgUserPassword(id, password) {
  return api.post(`/users/${id}/reset-password`, { password });
}

export function deleteOrgUser(id) {
  return api.del(`/users/${id}`);
}

/** 分配某人负责哪些社媒（发布）账号：人 → 账号方向，与发布账号里的「负责人」同一张表 */
export function saveUserTargets(id, targetIds) {
  return api.put(`/users/${id}/targets`, { targetIds: targetIds || [] });
}
