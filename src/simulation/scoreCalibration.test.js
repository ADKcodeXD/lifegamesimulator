import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAbilityOpportunity,
  describeAbilityScore,
  describeScore,
} from "./scoreCalibration.js";

test("50 is the population mean and has a neutral multiplier", () => {
  const score = describeScore(50);
  assert.ok(Math.abs(score.percentile - 50) < 0.01);
  assert.equal(score.level, "普通平均");
  assert.equal(score.multiplier, 1);
});

test("42 remains explicitly below the population average", () => {
  const score = describeScore(42);
  assert.equal(score.level, "略低于平均");
  assert.ok(score.percentile > 29 && score.percentile < 31);
  assert.ok(score.multiplier < 1);
});

test("90 talent and 95 athleticism are treated as prodigy-level outliers", () => {
  const talent = describeAbilityScore("天赋", 90);
  const athletic = describeAbilityScore("运动", 95);
  assert.equal(talent.levelKey, "prodigy");
  assert.equal(athletic.levelKey, "prodigy");
  assert.ok(talent.percentile > 99.5);
  assert.ok(athletic.percentile > 99.8);
  assert.ok(talent.multiplier > 3);
  assert.ok(athletic.multiplier > 3.4);
});

test("exceptional ability materially raises favorable outcome weight", () => {
  const averageModel = Object.fromEntries(
    ["appearance", "athletic", "intelligence", "talent", "financial", "social"].map(
      (key) => [key, { multiplier: 1 }],
    ),
  );
  const exceptionalModel = {
    ...averageModel,
    athletic: describeAbilityScore("运动", 95),
    talent: describeAbilityScore("天赋", 90),
  };
  assert.equal(calculateAbilityOpportunity(averageModel), 0);
  assert.ok(calculateAbilityOpportunity(exceptionalModel) > 0.1);
});
