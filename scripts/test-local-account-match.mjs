import assert from "node:assert/strict";
import test from "node:test";

import {
  filterTargetsByLocalAccounts,
  missingLocalAccounts,
  parseLocalKey,
  targetLocalKey
} from "../src/renderer/dam/utils/localAccountMatch.js";

test("targetLocalKey 用分组名 + 矩媒平台中文名", () => {
  assert.equal(
    targetLocalKey({ platformCode: "xiaohongshu", mmPhone: "测试小红书" }),
    "测试小红书|小红书"
  );
  // B 站在矩媒里叫「哔哩哔哩」，不能拿 DAM 的「B站」去比
  assert.equal(
    targetLocalKey({ platformCode: "bilibili", mmPhone: "13800138000-1" }),
    "13800138000-1|哔哩哔哩"
  );
  // 缺字段一律空串，避免「空字段相互匹配」把无关账号放进来
  assert.equal(targetLocalKey({ platformCode: "douyin", mmPhone: "" }), "");
  assert.equal(targetLocalKey({ platformCode: "unknown", mmPhone: "abc" }), "");
});

test("读不到本机账号（keys 为 null）时不过滤", () => {
  const targets = [{ id: 1, platformCode: "douyin", mmPhone: "a" }];
  assert.deepEqual(filterTargetsByLocalAccounts(targets, null), targets);
});

test("只保留媒体平台管理里存在的账号", () => {
  const targets = [
    { id: 1, platformCode: "xiaohongshu", mmPhone: "测试小红书" },
    { id: 2, platformCode: "douyin", mmPhone: "v1发布机老号" },
    { id: 3, platformCode: "douyin", mmPhone: "" }
  ];
  const keys = new Set(["测试小红书|小红书"]);
  const kept = filterTargetsByLocalAccounts(targets, keys);
  assert.deepEqual(
    kept.map((item) => item.id),
    [1]
  );
});

test("本机读到空集合时结果为空（提示先去添加账号）", () => {
  const targets = [{ id: 2, platformCode: "douyin", mmPhone: "v1发布机老号" }];
  assert.deepEqual(filterTargetsByLocalAccounts(targets, new Set()), []);
});

test("missingLocalAccounts 只报本机有、服务端没有的账号", () => {
  const targets = [{ id: 1, platformCode: "xiaohongshu", mmPhone: "测试小红书" }];
  const keys = new Set(["测试小红书|小红书", "新号|抖音"]);
  assert.deepEqual(missingLocalAccounts(targets, keys), ["新号|抖音"]);
  assert.deepEqual(missingLocalAccounts(targets, null), []);
});

test("parseLocalKey 能还原平台编码，未知平台返回 null", () => {
  assert.deepEqual(parseLocalKey("测试小红书|小红书"), {
    phone: "测试小红书",
    pt: "小红书",
    platformCode: "xiaohongshu"
  });
  assert.deepEqual(parseLocalKey("13800138000-1|哔哩哔哩"), {
    phone: "13800138000-1",
    pt: "哔哩哔哩",
    platformCode: "bilibili"
  });
  assert.equal(parseLocalKey("测试|不存在的平台"), null);
  assert.equal(parseLocalKey("没有分隔符"), null);
});
