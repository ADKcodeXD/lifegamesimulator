import test from "node:test";
import assert from "node:assert/strict";
import { buildExternalDisturbanceField } from "./externalDisturbanceModel.js";

const payload = (financial, athletic) => ({
  settings: {
    monthsPerTurn: 6,
    talents: { 财商: financial, 运动: athletic },
  },
  turn: { riskShifts: [] },
});

test("disturbances stay generic and relevant abilities only reduce matching risks", () => {
  const average = buildExternalDisturbanceField(payload(50, 50), () => 1);
  const protectedFinancial = buildExternalDisturbanceField(
    payload(95, 50),
    () => 1,
  );
  const averageFinancial = average.find((item) => item.key === "financial");
  const strongFinancial = protectedFinancial.find(
    (item) => item.key === "financial",
  );
  assert.ok(strongFinancial.probability < averageFinancial.probability);
  assert.equal(
    protectedFinancial.find((item) => item.key === "health").probability,
    average.find((item) => item.key === "health").probability,
  );
});
