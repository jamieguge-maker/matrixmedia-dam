#!/usr/bin/env node
/**
 * DAM 薄壳锚点校验 / 应用脚本。
 *
 * 用法：
 *   node scripts/dam-anchors.mjs --check    校验锚点（缺失、重复、内容变化都会失败）
 *   node scripts/dam-anchors.mjs --apply    对干净的上游源码幂等插入锚点
 *   node scripts/dam-anchors.mjs --report   打印锚点位置，便于人工复核
 *
 * 设计意图：上游发版后只允许在下面 3 个文件里出现冲突。
 * 任何锚点被上游改掉时，本脚本会立刻失败，而不是让壳在运行时静默失效。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ANCHORS = [
  {
    id: "A1",
    file: "src/main/index.js",
    summary: "引入壳主进程模块",
    insertAfter: 'import { reportUsageTelemetry } from "./services/usageTelemetry";',
    body: ['import "./dam";']
  },
  {
    id: "A2",
    file: "src/renderer/main.js",
    summary: "引入壳渲染层模块",
    insertAfter: 'import "windi.css";',
    body: ['import "./dam";']
  },
  {
    id: "A3-1",
    file: "src/renderer/layout/components/Navbar.vue",
    summary: "顶部导航增加 DAM 入口",
    comment: "html",
    insertAfter: '<el-menu-item index="/project-detail">项目详情</el-menu-item>',
    body: ['        <el-menu-item index="/dam">DAM</el-menu-item>']
  },
  {
    id: "A3-2",
    file: "src/renderer/layout/components/Navbar.vue",
    summary: "路由切换时把 isRoute 切到 dam",
    insertBefore: 'if (parts[0] === "accountManager") {',
    body: [
      '      if (parts[0] === "dam") {',
      '        useAppStore().setData("isRoute", "dam");',
      "        return;",
      "      }"
    ]
  },
  {
    id: "A3-3",
    file: "src/renderer/layout/components/Navbar.vue",
    summary: "顶部菜单高亮映射到 /dam",
    insertBefore: '      } else if (p.startsWith("/accountManager") && this.getAccoutIndex) {',
    body: [
      '      } else if (p.startsWith("/dam")) {',
      '        this.activeIndex = "/dam";'
    ]
  }
];

const args = new Set(process.argv.slice(2));
const mode = args.has("--apply") ? "apply" : args.has("--report") ? "report" : "check";

function startMarker(id) {
  return `>>> DAM-SHELL ${id}`;
}

function endMarker(id) {
  return `<<< DAM-SHELL ${id}`;
}

function readFile(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf-8");
}

function writeFile(relative, content) {
  fs.writeFileSync(path.join(ROOT, relative), content, "utf-8");
}

/** 返回锚点块的起止行号（1 基）与块内内容 */
function locate(content, anchor) {
  const lines = content.split(/\r?\n/);
  const startToken = startMarker(anchor.id);
  const endToken = endMarker(anchor.id);
  const starts = [];
  const ends = [];
  lines.forEach((line, index) => {
    if (line.includes(startToken)) starts.push(index);
    if (line.includes(endToken)) ends.push(index);
  });
  if (!starts.length && !ends.length) return { found: false, starts, ends };
  return {
    found: true,
    starts,
    ends,
    start: starts[0],
    end: ends[0],
    body: starts.length === 1 && ends.length === 1 ? lines.slice(starts[0] + 1, ends[0]) : []
  };
}

function checkAnchor(anchor) {
  const content = readFile(anchor.file);
  const hit = locate(content, anchor);

  if (!hit.found) {
    return { ok: false, reason: "锚点缺失" };
  }
  if (hit.starts.length !== 1 || hit.ends.length !== 1) {
    return { ok: false, reason: `标记重复（start=${hit.starts.length} end=${hit.ends.length}）` };
  }
  if (hit.end < hit.start) {
    return { ok: false, reason: "结束标记在开始标记之前" };
  }

  const normalized = hit.body.map((line) => line.trim());
  const expected = anchor.body.map((line) => line.trim());
  const missing = expected.filter((line) => !normalized.includes(line));
  if (missing.length) {
    return { ok: false, reason: `块内内容与预期不一致：缺少 ${missing.map((x) => JSON.stringify(x)).join("、")}` };
  }

  return { ok: true, line: hit.start + 1, file: anchor.file };
}

function applyAnchor(anchor) {
  const content = readFile(anchor.file);
  const hit = locate(content, anchor);
  if (hit.found) {
    return { skipped: true, reason: "已存在" };
  }

  const lines = content.split(/\r?\n/);
  const open =
    anchor.comment === "html" ? `<!-- ${startMarker(anchor.id)} -->` : `// ${startMarker(anchor.id)}`;
  const close =
    anchor.comment === "html" ? `<!-- ${endMarker(anchor.id)} -->` : `// ${endMarker(anchor.id)}`;
  const block = [open, ...anchor.body, close];

  if (anchor.insertAfter) {
    const index = lines.findIndex((line) => line.trim() === anchor.insertAfter.trim());
    if (index < 0) {
      return { ok: false, reason: `找不到插入点：${anchor.insertAfter}` };
    }
    lines.splice(index + 1, 0, ...block);
  } else if (anchor.insertBefore) {
    const index = lines.findIndex((line) => line.trim() === anchor.insertBefore.trim());
    if (index < 0) {
      return { ok: false, reason: `找不到插入点：${anchor.insertBefore}` };
    }
    lines.splice(index, 0, ...block);
  } else {
    return { ok: false, reason: "锚点既没有 insertAfter 也没有 insertBefore" };
  }

  writeFile(anchor.file, lines.join("\n"));
  return { ok: true, applied: true };
}

let failed = 0;

for (const anchor of ANCHORS) {
  if (mode === "apply") {
    const result = applyAnchor(anchor);
    if (result.ok === false) {
      failed += 1;
      console.error(`✗ ${anchor.id} ${anchor.file}：${result.reason}`);
    } else {
      console.log(`✓ ${anchor.id} ${anchor.file}：${result.skipped ? "已存在，跳过" : "已插入"}`);
    }
    continue;
  }

  const result = checkAnchor(anchor);
  if (!result.ok) {
    failed += 1;
    console.error(`✗ ${anchor.id} ${anchor.file}：${result.reason}`);
  } else if (mode === "report") {
    console.log(`✓ ${anchor.id} ${anchor.file}:${result.line}  ${anchor.summary}`);
  }
}

if (mode !== "apply") {
  console.log(
    failed === 0
      ? `\n锚点检查通过（${ANCHORS.length} 个）`
      : `\n锚点检查失败：${failed} 个需要处理`
  );
}

process.exit(failed === 0 ? 0 : 1);
