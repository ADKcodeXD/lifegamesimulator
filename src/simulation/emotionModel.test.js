import test from "node:test";
import assert from "node:assert/strict";
import { getDirectionChoices } from "./directionModel.js";
import { calculateOutcomeProbabilities } from "./probabilityModel.js";
import {
  describeEmotion,
  normalizeEmotion,
  reconcileEmotionRiskShifts,
} from "./emotionModel.js";

const settings = {
  startAge: 24,
  monthsPerTurn: 6,
  family: "modest",
  talents: { 颜值: 50, 运动: 50, 智力: 50, 天赋: 50, 财商: 50, 社交: 50 },
  traits: { 决策风格: 50, 家庭: 50, 好奇: 50 },
};

const state = (emotion) => ({
  cash: 10_000,
  debt: 0,
  health: 75,
  emotion,
  career: 50,
  assets: {},
  liabilities: {},
});

test("legacy mood saves migrate into emotion", () => {
  assert.equal(normalizeEmotion({ mood: 31 }), 31);
});

test("very low emotion sharply reduces action drive and exposes crisis risk", () => {
  const low = describeEmotion(8);
  assert.equal(low.crisisLevel, "critical");
  assert.ok(low.actionDrive < 10);
  assert.match(low.selfHarmRisk, /自伤|自杀/);
  assert.equal(reconcileEmotionRiskShifts([], 8)[0].value, 92);
});

test("low emotion adds a recovery direction and lowers favorable outcomes", () => {
  const lowDirections = getDirectionChoices({
    age: 24,
    settings,
    state: state(12),
    relations: [],
    resume: {},
  });
  assert.ok(
    lowDirections.choices.some((choice) => choice.id === "emotional_recovery"),
  );

  const stable = calculateOutcomeProbabilities(settings, state(72), {}, 0, []);
  const low = calculateOutcomeProbabilities(settings, state(12), {}, 0, []);
  assert.ok(low.probabilities.favorable < stable.probabilities.favorable);
  assert.ok(low.probabilities.stagnant > stable.probabilities.stagnant);
});
