/**
 * 上传路径与媒体类型规则。
 *
 * 与 version1 的 shared/assetSections.ts 保持一致：
 *   产品      /产品/{系列}/{品类}/{素材类型}/{尺寸?}/{英文版?}
 *   项目案例  /项目案例/{案例名称}/{尺寸?}/{英文版?}
 *   黄总个人  /黄总个人/{视频名称}/{尺寸?}/{英文版?}
 *   公司活动  /公司活动/{视频名称}/{尺寸?}/{英文版?}
 */

export const SECTION_ROOT = {
  product: "产品",
  case: "项目案例",
  personal: "黄总个人",
  activity: "公司活动"
};

export const SECTION_GROUP_LABEL = {
  product: "系列",
  case: "案例名称",
  personal: "视频名称",
  activity: "视频名称"
};

export const SECTION_HAS_CATEGORY = {
  product: true,
  case: false,
  personal: false,
  activity: false
};

export const SECTION_HAS_KIND_FOLDER = {
  product: true,
  case: false,
  personal: false,
  activity: false
};

export const SECTION_REQUIRE_COVER = {
  product: false,
  case: true,
  personal: true,
  activity: true
};

export const SECTION_IMAGE_IS_COVER_ONLY = {
  product: false,
  case: false,
  personal: true,
  activity: true
};

export const RATIO_FOLDER = {
  "9:16": "9-16",
  "3:4": "3-4",
  "16:9": "16-9"
};

export const LANGUAGE_SEGMENT = "英文版";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff", "heic"];
const VIDEO_EXTS = ["mp4", "mov", "m4v", "avi", "mkv", "webm", "flv", "wmv", "mpg", "mpeg"];

export function extOf(fileName) {
  const name = String(fileName || "");
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function isImageFile(fileName) {
  return IMAGE_EXTS.includes(extOf(fileName));
}

export function isVideoFile(fileName) {
  return VIDEO_EXTS.includes(extOf(fileName));
}

export function mediaTypeOf(fileName) {
  if (isVideoFile(fileName)) return "video";
  if (isImageFile(fileName)) return "image";
  return "document";
}

/** 文件夹名清洗（与 version1 一致：去掉非法字符、压缩空格、截断 80） */
export function sanitizeSegment(name) {
  return String(name || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** 生成云端目录片段（不含根目录与文件名） */
export function buildSegments(input) {
  const section = input.section;
  const segments = [SECTION_ROOT[section] || ""];

  const group = sanitizeSegment(input.groupName);
  if (group) segments.push(group);

  if (SECTION_HAS_CATEGORY[section]) {
    const category = sanitizeSegment(input.categoryName);
    if (category) segments.push(category);
  }

  if (SECTION_HAS_KIND_FOLDER[section]) {
    const kind = sanitizeSegment(input.kindName);
    if (kind) segments.push(kind);
  }

  if (input.ratio && RATIO_FOLDER[input.ratio]) {
    segments.push(RATIO_FOLDER[input.ratio]);
  }

  if (input.language === "en") {
    segments.push(LANGUAGE_SEGMENT);
  }

  return segments.filter(Boolean);
}

/** 展示用完整路径（不含 WPS 根目录名） */
export function buildFullPath(input, fileName) {
  return "/" + [...buildSegments(input), fileName].filter(Boolean).join("/");
}
