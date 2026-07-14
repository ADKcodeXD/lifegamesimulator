import test from "node:test";
import assert from "node:assert/strict";
import { getDirectionChoices } from "./directionModel.js";
import { buildLifeDomainField } from "./lifeDomainModel.js";
import { deriveTalentPathways } from "./talentPathways.js";

const exceptionalChild = {
  startAge: 10,
  freedomLevel: "high",
  family: "modest",
  talents: { 颜值: 50, 运动: 95, 智力: 58, 天赋: 90, 财商: 45, 社交: 68 },
  traits: { 决策风格: 44, 家庭: 50, 好奇: 60 },
};

test("exceptional childhood abilities unlock non-academic pathways", () => {
  const pathways = deriveTalentPathways(exceptionalChild, 10);
  assert.equal(pathways[0].key, "athletic");
  assert.equal(pathways[0].prodigy, true);
  assert.ok(pathways.some((item) => item.key === "gifted"));
});

test("a prodigy pathway outweighs the default learning domain", () => {
  const field = buildLifeDomainField(exceptionalChild, [], 10, () => 0.99);
  assert.ok(field.weights.talent > field.weights.learning);
  assert.equal(field.selected.key, "talent");
  assert.match(field.selected.guidance, /体育竞技与身体专项/);
});

test("child direction choices include the strongest real talent track", () => {
  const field = getDirectionChoices({
    age: 10,
    settings: exceptionalChild,
    state: { assets: {} },
    relations: [],
    resume: {},
  });
  const choice = field.choices.find((item) => item.id === "talent_track");
  assert.ok(choice);
  assert.match(choice.label, /体育竞技与身体专项/);
  assert.ok(choice.fit > 70);
});
