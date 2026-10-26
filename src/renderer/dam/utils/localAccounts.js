/**
 * 本机「媒体平台管理」账号（矩媒 account 数据）。
 *
 * 为什么需要它：DAM（古希奥素材系统）里的「社媒账号」应当以管理员在矩媒
 * 「媒体平台管理」里真正添加过的账号为准，而不是服务端发布账号表里的历史遗留行。
 * 服务端那套表早期给 version1 发布机用过，里面有一批与矩媒无关的账号。
 *
 * 匹配口径：分组名（phone）+ 平台中文名（pt）。
 *   - target.mmPhone 就是矩媒里的分组名
 *   - target.platformCode 是 DAM 编码，用 MM_PT_NAME 换成矩媒里的中文名
 *
 * 纯比对逻辑放在 localAccountMatch.js（有单测），这里只负责读写。
 */

import dataRequest from "@/utils/dataRequest";
import { createTarget } from "../api/publish";
import { missingLocalAccounts, parseLocalKey } from "./localAccountMatch";

export {
  filterTargetsByLocalAccounts,
  missingLocalAccounts,
  targetLocalKey
} from "./localAccountMatch";

/**
 * 读本机账号，返回可用于比对的 key 集合。
 *
 * 三种结果要区分清楚：
 *   - `null`：读取失败（本地服务没起来 / 接口报错）→ 调用方**不要过滤**，避免把账号全藏了
 *   - 空 Set：读到了，但本机确实一个账号都没添加 → 调用方应过滤成空，并提示先去添加
 *   - 非空 Set：正常匹配
 */
export async function loadLocalAccountKeys() {
  try {
    const res = await dataRequest({
      type: "get",
      fileName: "account",
      pageSize: 9999
    });
    const raw = res && res.data && typeof res.data === "object" ? res.data : null;
    if (!raw) return null;

    const keys = new Set();
    Object.keys(raw).forEach((group) => {
      const list = raw[group];
      if (!Array.isArray(list)) return;
      list.forEach((item) => {
        const phone = String((item && item.phone) || "").trim();
        const pt = String((item && item.pt) || "").trim();
        if (!phone || !pt) return;
        keys.add(`${phone}|${pt}`);
      });
    });
    return keys;
  } catch (_) {
    return null;
  }
}

/** 服务端账号 → 本机账号的比对 key；缺字段时返回空串（一定匹配不上） */
// targetLocalKey 由 localAccountMatch.js 提供，这里只做转出

/**
 * 把「媒体平台管理」里有、服务端还没登记的账号补登记进去。
 *
 * 为什么需要：矩媒的账号存在本机（account 数据），服务端账号表是另一套。
 * 管理员在媒体平台管理里加了账号后，服务端并不知道，发布中心就会一个都看不到。
 * 这里按「分组名 + 平台」幂等补登记：已经存在的不动，只补缺的。
 *
 * 只有管理员调用（服务端 POST /targets 需要 admin/operator 权限）。
 * 任何一条失败都静默跳过，不能因为补登记失败就挡住发布。
 */
export async function syncLocalAccountsToServer(targets, keys) {
  if (!keys || !keys.size) return 0;
  const missing = missingLocalAccounts(targets, keys);
  if (!missing.length) return 0;

  let created = 0;
  for (const key of missing) {
    const parsed = parseLocalKey(key);
    if (!parsed) continue;
    try {
      await createTarget({
        platformCode: parsed.platformCode,
        accountName: parsed.phone,
        channel: "matrixmedia",
        mmPhone: parsed.phone,
        enabled: true,
        remark: "由矩媒「媒体平台管理」自动登记"
      });
      created += 1;
    } catch (_) {
      /* 权限不足 / 网络异常：跳过，不影响其余账号 */
    }
  }
  return created;
}
