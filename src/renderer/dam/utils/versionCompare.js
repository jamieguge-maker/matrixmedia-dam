/**
 * 版本比较与「要不要提示升级」的判定（纯函数，方便单测）。
 *
 * 版本形如 0.12.9-dam.8 / 1.8.33 / v2.0.0。
 * 按 . - + 切段：两边都是数字就按数值比，否则按字典序 ——
 * 这样 dam.8 < dam.10 不会因为字符串比较而判错。
 */

export function compareVersion(left, right) {
  const a = String(left || "")
    .replace(/^v/i, "")
    .trim()
    .split(/[.+-]/)
    .filter(Boolean);
  const b = String(right || "")
    .replace(/^v/i, "")
    .trim()
    .split(/[.+-]/)
    .filter(Boolean);

  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = Number(x);
    const ny = Number(y);
    if (Number.isFinite(nx) && Number.isFinite(ny)) {
      if (nx !== ny) return nx > ny ? 1 : -1;
      continue;
    }
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

/**
 * 判断当前客户端是否需要升级。
 *
 * 服务端可给「最低版本」或「最新版本」。比较放在客户端做，
 * 最新版本用于提醒；最低版本用于强制升级拦截。
 *
 * @param {string} currentVersion 本机版本（app.getVersion()）
 * @param {{minVersion?:string, latestVersion?:string, downloadUrl?:string,
 *          notes?:string, force?:boolean}} policy 服务端策略
 */
export function evaluateUpgrade(currentVersion, policy) {
  const minVersion = String((policy && policy.minVersion) || "").trim();
  const latestVersion = String((policy && policy.latestVersion) || "").trim();
  const current = String(currentVersion || "").trim();

  // 本机版本读不到时不提示，避免误拦截用户
  if (!current) {
    return { needUpgrade: false, force: false, minVersion, latestVersion, currentVersion: current };
  }

  const belowMinimum = Boolean(minVersion) && compareVersion(current, minVersion) < 0;
  const behindLatest = Boolean(latestVersion) && compareVersion(current, latestVersion) < 0;
  const outdated = belowMinimum || behindLatest;
  return {
    needUpgrade: outdated,
    // 服务端可将最低版本提醒设为可稍后处理；默认仍按强制升级处理
    force: outdated ? (policy && policy.force) !== false : false,
    minVersion,
    latestVersion,
    currentVersion: current
  };
}
