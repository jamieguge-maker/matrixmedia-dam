/**
 * 本机文件的预览地址。
 *
 * 主窗口 webPreferences.webSecurity 已关闭，页面（dev 的 http://localhost、
 * 打包后的 file://）可以直接把 file:// 用作 img / video 的 src；
 * 而直接写 `C:\...` 会被浏览器当成相对地址。
 */

export function localFileUrl(filePath) {
  const text = String(filePath || "").replace(/\\/g, "/");
  if (!text) return "";

  // 盘符（E:）原样保留，其余片段逐个转义，避免中文、空格、# 截断地址
  const encoded = text
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join("/");

  // UNC 路径（\\server\share\...）转义后以 // 开头，拼成 file://server/...
  if (encoded.startsWith("//")) return "file:" + encoded;

  return "file:///" + encoded.replace(/^\/+/, "");
}

/** 视频首帧缩略图：带 #t 让 Chromium 定位取帧，否则多半是黑屏 */
export function localVideoThumbUrl(filePath) {
  const url = localFileUrl(filePath);
  return url ? `${url}#t=0.5` : "";
}
