/** 管理员视图接口：操作记录（审计）与社媒账号管理 */

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

/**
 * 操作记录（服务端 /audit-logs，仅管理员）。
 *
 * 返回的是数据库原始行（snake_case）：username / display_name / action /
 * entity / entity_id / detail / ip / created_at。
 */
export function listAuditLogs(query) {
  return api.get("/audit-logs" + buildQuery(query));
}

/** 成员列表（用来把 createdBy 的用户 id 换成姓名） */
export function listUsers() {
  return api.get("/users");
}

/** 启用 / 停用某个社媒账号 */
export function updateTarget(id, payload) {
  return api.put(`/targets/${id}`, payload);
}

/** 删除社媒账号（服务端仅管理员可删） */
export function deleteTarget(id) {
  return api.del(`/targets/${id}`);
}
