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

// ─────────────────── 筛选与展示字典 ───────────────────

export const SECTION_OPTIONS = [
  { value: "", label: "全部板块" },
  { value: "product", label: "产品" },
  { value: "case", label: "项目案例" },
  { value: "personal", label: "黄总个人" },
  { value: "activity", label: "公司活动" },
  { value: "uncategorized", label: "未分类（老素材）" }
];

/** 素材类型（与 shared/assetSections.ts 保持一致） */
export const SECTION_KINDS = {
  product: ["白底、细节图", "场景图", "视频"],
  case: ["图片", "视频", "案例介绍"],
  personal: ["视频", "视频资料"],
  activity: ["视频", "视频资料"]
};

export const LANGUAGE_OPTIONS = [
  { value: "zh", label: "中文版" },
  { value: "en", label: "英文版" }
];

export const RATIO_OPTIONS = ["9:16", "3:4", "16:9"];

export const PLATFORM_LABEL = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  wechat_channels: "视频号",
  kuaishou: "快手",
  bilibili: "B站",
  toutiao: "头条",
  baijiahao: "百家号",
  fanqie: "番茄视频",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube"
};

/** DAM 平台编码 → 矩媒平台别名 */
export const MM_ALIAS = {
  xiaohongshu: "xhs",
  douyin: "dy",
  wechat_channels: "sph",
  kuaishou: "ks",
  bilibili: "blbl",
  toutiao: "tt",
  baijiahao: "bjh",
  fanqie: "fqsp"
};

export const PUBLISH_STATUS_LABEL = {
  draft: "草稿",
  queued: "待发布",
  scheduled: "定时中",
  submitted: "已提交",
  success: "已发布",
  failed: "失败",
  manual_done: "人工完成"
};

export const PUBLISH_STATUS_TYPE = {
  draft: "info",
  queued: "warning",
  scheduled: "warning",
  submitted: "warning",
  success: "success",
  failed: "danger",
  manual_done: "success"
};

export function platformLabel(code) {
  return PLATFORM_LABEL[code] || code || "-";
}

export function publishStatusLabel(status) {
  return PUBLISH_STATUS_LABEL[status] || status || "-";
}

export function publishStatusType(status) {
  return PUBLISH_STATUS_TYPE[status] || "info";
}
