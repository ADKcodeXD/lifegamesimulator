import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSettings } from "./setupConfig.js";

test("legacy ability and personality dimensions migrate without duplicate axes", () => {
  const settings = normalizeSettings({
    talents: { 颜值: 50, 运动: 60, 技能: 80, 智力: 70, 天赋: 60, 财商: 40 },
    traits: { 理性: 80, 冒险: 20, 家庭: 55, 好奇: 65 },
  });

  assert.equal(settings.talents.天赋, 70);
  assert.equal(settings.talents.社交, 50);
  assert.equal(settings.traits.决策风格, 80);
  assert.deepEqual(Object.keys(settings.talents), [
    "颜值",
    "运动",
    "智力",
    "天赋",
    "财商",
    "社交",
  ]);
  assert.deepEqual(Object.keys(settings.traits), ["决策风格", "家庭", "好奇"]);
});
