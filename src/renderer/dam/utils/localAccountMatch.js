/**
 * 「媒体平台管理」账号 ↔ 服务端发布账号 的比对规则（纯函数，方便单测）。
 *
 * 为什么要比对：DAM 服务端那张 publish_targets 早期是给 version1 发布机用的，
 * 里面混着历史账号；管理员在矩媒「媒体平台管理」里真正添加的账号才是有效账号。
 */

/**
 * DAM 平台编码 → 本机「媒体平台管理」里的平台名（account 数据里的 pt）。
 *
 * 两边叫法不一致：DAM 用编码，矩媒用中文名（B 站在矩媒里叫「哔哩哔哩」）。
 * 定义在这里而不是 format.js，是为了让本模块能被 Node 直接当 ESM 加载跑单测
 * （format.js 里还有大量 UI 字典，引进来会牵连一堆无关代码）。
 */
export const MM_PT_NAME = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  wechat_channels: "视频号",
  kuaishou: "快手",
  bilibili: "哔哩哔哩",
  toutiao: "头条",
  baijiahao: "百家号",
  fanqie: "番茄视频"
};

/** 矩媒平台中文名 → DAM 平台编码（MM_PT_NAME 的反查表） */
export const PT_TO_CODE = Object.keys(MM_PT_NAME).reduce((map, code) => {
  map[MM_PT_NAME[code]] = code;
  return map;
}, {});

/** 服务端账号 → 本机账号的比对 key；缺字段时返回空串（一定匹配不上） */
export function targetLocalKey(target) {
  const phone = String((target && target.mmPhone) || "").trim();
  const pt = MM_PT_NAME[(target && target.platformCode) || ""] || "";
  if (!phone || !pt) return "";
  return `${phone}|${pt}`;
}

/**
 * 只保留「媒体平台管理」里确实存在的账号。
 *
 * keys 为 null 表示本机账号读不到，此时原样返回 —— 宁可多显示，
 * 也不能因为本地服务没起来就把发布中心清空。
 */
export function filterTargetsByLocalAccounts(targets, keys) {
  const list = Array.isArray(targets) ? targets : [];
  if (!keys) return list;
  return list.filter((target) => {
    const key = targetLocalKey(target);
    return key ? keys.has(key) : false;
  });
}

/** 本机有、服务端账号表里没有的账号（`分组|平台`） */
export function missingLocalAccounts(targets, keys) {
  if (!keys) return [];
  const known = new Set(
    (Array.isArray(targets) ? targets : []).map((target) => targetLocalKey(target)).filter(Boolean)
  );
  return [...keys].filter((key) => !known.has(key));
}

/** `分组|平台` → 可直接提交给服务端的账号描述；平台不认识时返回 null */
export function parseLocalKey(key) {
  const text = String(key || "");
  const index = text.indexOf("|");
  if (index <= 0) return null;
  const phone = text.slice(0, index).trim();
  const pt = text.slice(index + 1).trim();
  const platformCode = PT_TO_CODE[pt];
  if (!phone || !platformCode) return null;
  return { phone, pt, platformCode };
}
