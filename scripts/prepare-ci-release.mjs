import { execFileSync } from "node:child_process";
import fs from "node:fs";

const packagePath = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const match = String(pkg.version || "").match(/^(\d+\.\d+\.\d+)-dam\.(\d+)$/);

if (!match) {
  throw new Error(`期望版本格式为 x.y.z-dam.N，实际为 ${pkg.version}`);
}

let version = process.argv[2];
if (!version) {
  const [, base, currentSequence] = match;
  let maxSequence = Number(currentSequence) || 0;
  try {
    const tags = execFileSync("git", ["tag", "--list", `v${base}-dam.*`], { encoding: "utf8" });
    for (const tag of tags.split(/\r?\n/)) {
      const tagMatch = tag.match(new RegExp(`^v${base.replaceAll(".", "\\.")}-dam\\.(\\d+)$`));
      if (tagMatch) maxSequence = Math.max(maxSequence, Number(tagMatch[1]) || 0);
    }
  } catch (_) {
    // 新仓库尚无标签时从 package.json 版本继续递增。
  }
  version = `${base}-dam.${maxSequence + 1}`;
}

if (!new RegExp(`^${match[1].replaceAll(".", "\\.")}-dam\\.\\d+$`).test(version)) {
  throw new Error(`无效的自动发布版本：${version}`);
}

pkg.version = version;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`, "utf8");
}
console.log(`CI release version: ${version}`);
