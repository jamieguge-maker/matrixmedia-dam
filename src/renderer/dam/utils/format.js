/** 壳内格式化与字典 */

export const ROLE_LABEL = {
  admin: "管理员",
  deptadmin: "部门管理员",
  operator: "成员",
  viewer: "只读"
};

export const SECTION_LABEL = {
  product: "产品",
  case: "项目案例",
  personal: "黄总个人",
  activity: "公司活动"
};

export const UPLOAD_STATUS_LABEL = {
  pending: "待上传",
  uploading: "上传中",
  stored: "已入库",
  failed: "上传失败"
};

export const UPLOAD_STATUS_TYPE = {
  pending: "info",
  uploading: "warning",
  stored: "success",
  failed: "danger"
};

export function roleLabel(role) {
  return ROLE_LABEL[role] || role || "-";
}

export function sectionLabel(section) {
  return SECTION_LABEL[section] || "未分类";
}

export function uploadStatusLabel(status) {
  return UPLOAD_STATUS_LABEL[status] || status || "-";
}

export function uploadStatusType(status) {
  return UPLOAD_STATUS_TYPE[status] || "info";
}

export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
