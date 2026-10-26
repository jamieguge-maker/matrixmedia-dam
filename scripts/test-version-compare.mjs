import assert from "node:assert/strict";
import test from "node:test";

import { compareVersion, evaluateUpgrade } from "../src/renderer/dam/utils/versionCompare.js";

test("dam.N 按数字比较，不能当成字符串", () => {
  assert.equal(compareVersion("0.12.9-dam.8", "0.12.9-dam.10"), -1);
  assert.equal(compareVersion("0.12.9-dam.10", "0.12.9-dam.8"), 1);
  assert.equal(compareVersion("1.8.33", "1.8.9"), 1);
  assert.equal(compareVersion("v0.12.9-dam.8", "0.12.9-dam.8"), 0);
});

test("没配最低版本时不提示", () => {
  const result = evaluateUpgrade("0.12.9-dam.8", { minVersion: "" });
  assert.equal(result.needUpgrade, false);
});

test("本机版本读不到时不提示（避免把人挡在门外）", () => {
  const result = evaluateUpgrade("", { minVersion: "0.12.9-dam.9" });
  assert.equal(result.needUpgrade, false);
});

test("低于最低版本要提示，默认强制", () => {
  const result = evaluateUpgrade("0.12.9-dam.8", { minVersion: "0.12.9-dam.9" });
  assert.equal(result.needUpgrade, true);
  assert.equal(result.force, true);
});

test("高于等于最低版本不提示", () => {
  assert.equal(
    evaluateUpgrade("0.12.9-dam.10", { minVersion: "0.12.9-dam.9" }).needUpgrade,
    false
  );
  assert.equal(
    evaluateUpgrade("0.12.9-dam.9", { minVersion: "0.12.9-dam.9" }).needUpgrade,
    false
  );
});

test("force=false 时允许稍后提醒", () => {
  const result = evaluateUpgrade("0.12.9-dam.8", {
    minVersion: "0.12.9-dam.9",
    force: false
  });
  assert.equal(result.needUpgrade, true);
  assert.equal(result.force, false);
});
