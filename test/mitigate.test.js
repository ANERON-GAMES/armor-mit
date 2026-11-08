import assert from "node:assert/strict";
import test from "node:test";
import {
  ARMOR_CONSTANT,
  DEFAULT_MITIGATION_CAP,
  FORMULA,
  mitigate,
  saturatingHyperbolic
} from "../src/index.js";

test("the named constants are the documented formula and cap", () => {
  assert.equal(FORMULA, "saturating-hyperbolic");
  assert.equal(ARMOR_CONSTANT, 100);
  assert.equal(DEFAULT_MITIGATION_CAP, 0.75);
  assert.equal(Object.is(DEFAULT_MITIGATION_CAP, 0.75), true);
});

test("no armor leaves the raw damage unchanged", () => {
  const open = mitigate({
    damage: 100,
    armor: 0
  });
  assert.deepEqual(open, {
    taken: 100,
    absorbed: 0,
    raw: 100,
    armor: 0,
    penetration: 0,
    effectiveArmor: 0,
    uncapped: 0,
    mitigation: 0,
    cap: 0.75
  });
  assert.equal(Object.isFrozen(open), true);
});

test("armor 25 mitigates 0.4 of the hit under the default cap", () => {
  const partial = mitigate({
    damage: 100,
    armor: 25
  });
  assert.equal(partial.taken, 60);
  assert.equal(partial.absorbed, 40);
  assert.equal(partial.mitigation, 0.4);
  assert.equal(partial.uncapped, 0.4);
  assert.equal(partial.effectiveArmor, 25);
  assert.equal(partial.cap, 0.75);
  assert.equal(partial.taken + partial.absorbed, partial.raw);
});

test("armor 60 meets the default cap", () => {
  const capped = mitigate({
    damage: 100,
    armor: 60
  });
  assert.equal(capped.taken, 25);
  assert.equal(capped.absorbed, 75);
  assert.equal(capped.mitigation, 0.75);
  assert.equal(capped.uncapped, 0.75);
  assert.equal(capped.effectiveArmor, 60);
  assert.equal(capped.taken + capped.absorbed, 100);
});

test("saturated armor stays at the default cap", () => {
  const saturated = mitigate({
    damage: 100,
    armor: 100
  });
  assert.equal(saturated.uncapped, 1);
  assert.equal(saturated.mitigation, 0.75);
  assert.equal(saturated.taken, 25);
  assert.equal(saturated.absorbed, 75);
  assert.equal(saturated.effectiveArmor, 100);
  const piled = mitigate({
    damage: 100,
    armor: 1000
  });
  assert.equal(piled.taken, 25);
  assert.equal(piled.mitigation, 0.75);
  assert.equal(piled.uncapped, 1);
  assert.equal(piled.effectiveArmor, 1000);
  assert.deepEqual(mitigate({ damage: 100, armor: 100, cap: DEFAULT_MITIGATION_CAP }), saturated);
});

test("a cap of 1 lets saturation reduce damage to zero", () => {
  const blocked = mitigate({
    damage: 100,
    armor: 100,
    cap: 1
  });
  assert.equal(blocked.taken, 0);
  assert.equal(Object.is(blocked.taken, -0), false);
  assert.equal(blocked.absorbed, 100);
  assert.equal(blocked.mitigation, 1);
  assert.equal(blocked.uncapped, 1);
  assert.equal(blocked.cap, 1);
  const below = mitigate({
    damage: 100,
    armor: 25,
    cap: 1
  });
  assert.equal(below.taken, 60);
  assert.equal(below.mitigation, 0.4);
  assert.equal(below.uncapped, 0.4);
  assert.equal(below.cap, 1);
});

test("a tighter cap clamps a saturated curve", () => {
  const half = mitigate({
    damage: 100,
    armor: 100,
    cap: 0.5
  });
  assert.equal(half.taken, 50);
  assert.equal(half.absorbed, 50);
  assert.equal(half.mitigation, 0.5);
  assert.equal(half.uncapped, 1);
  assert.equal(half.cap, 0.5);
  const transparent = mitigate({
    damage: 100,
    armor: 500,
    cap: 0
  });
  assert.equal(transparent.taken, 100);
  assert.equal(transparent.absorbed, 0);
  assert.equal(transparent.mitigation, 0);
  assert.equal(transparent.uncapped, 1);
  assert.equal(transparent.cap, 0);
});

test("penetration reduces effective armor before the curve", () => {
  const pierced = mitigate({
    damage: 100,
    armor: 100,
    penetration: 75
  });
  const plain = mitigate({
    damage: 100,
    armor: 25
  });
  assert.equal(pierced.taken, 60);
  assert.equal(pierced.absorbed, 40);
  assert.equal(pierced.effectiveArmor, 25);
  assert.equal(pierced.penetration, 75);
  assert.equal(pierced.armor, 100);
  assert.equal(pierced.mitigation, 0.4);
  assert.equal(pierced.uncapped, plain.uncapped);
  assert.equal(pierced.taken, plain.taken);
  const opened = mitigate({
    damage: 100,
    armor: 100,
    penetration: 40,
    cap: 1
  });
  assert.equal(opened.taken, 25);
  assert.equal(opened.absorbed, 75);
  assert.equal(opened.effectiveArmor, 60);
  assert.equal(opened.mitigation, 0.75);
  assert.equal(opened.uncapped, 0.75);
  assert.equal(opened.cap, 1);
  const stripped = mitigate({
    damage: 100,
    armor: 100,
    penetration: 100,
    cap: 1
  });
  assert.equal(stripped.taken, 100);
  assert.equal(stripped.absorbed, 0);
  assert.equal(stripped.effectiveArmor, 0);
  assert.equal(stripped.mitigation, 0);
  assert.equal(stripped.uncapped, 0);
  const over = mitigate({
    damage: 10,
    armor: 40,
    penetration: 1000,
    cap: 1
  });
  assert.equal(over.effectiveArmor, 0);
  assert.equal(over.taken, 10);
});

test("zero raw damage stays zero and still reports the fraction", () => {
  const none = mitigate({
    damage: 0,
    armor: 100,
    cap: 1
  });
  assert.equal(none.taken, 0);
  assert.equal(none.absorbed, 0);
  assert.equal(none.mitigation, 1);
  assert.equal(none.raw, 0);
  assert.equal(none.uncapped, 1);
  const partial = mitigate({
    damage: 0,
    armor: 25
  });
  assert.equal(partial.taken, 0);
  assert.equal(partial.absorbed, 0);
  assert.equal(partial.mitigation, 0.4);
  assert.equal(partial.raw, 0);
});

test("field order does not change the result and calls do not share objects", () => {
  const left = mitigate({ damage: 100, armor: 25 });
  const right = mitigate({ armor: 25, damage: 100 });
  assert.equal(left.taken, 60);
  assert.equal(right.taken, 60);
  assert.deepEqual(left, right);
  assert.notEqual(left, right);
  const again = mitigate({ damage: 100, armor: 25 });
  assert.deepEqual(again, left);
  assert.notEqual(again, left);
});

test("inputs stay mutable and a later edit is a later call", () => {
  const hit = { damage: 100, armor: 25, penetration: 0, cap: 0.75, label: "stay" };
  const snapshot = {
    damage: 100,
    armor: 25,
    penetration: 0,
    cap: 0.75,
    label: "stay"
  };
  const first = mitigate(hit);
  hit.armor = 100;
  const second = mitigate(hit);
  assert.equal(first.taken, 60);
  assert.equal(second.taken, 25);
  assert.equal(hit.damage, 100);
  assert.equal(hit.armor, 100);
  hit.armor = 25;
  assert.deepEqual(hit, snapshot);
  assert.equal(Object.isFrozen(hit), false);
  assert.throws(() => {
    first.taken = 1;
  }, TypeError);
});

test("omitted optional fields default and unknown fields are ignored", () => {
  const omitted = mitigate({ damage: 100, armor: 25 });
  const explicit = mitigate({
    damage: 100,
    armor: 25,
    penetration: undefined,
    cap: undefined
  });
  assert.deepEqual(omitted, explicit);
  assert.equal(explicit.penetration, 0);
  assert.equal(explicit.cap, 0.75);
  const extra = mitigate({
    damage: 100,
    armor: 0,
    note: "ignored",
    formula: "other"
  });
  assert.equal(extra.taken, 100);
  assert.equal(Object.hasOwn(extra, "note"), false);
  assert.equal(Object.hasOwn(extra, "formula"), false);
  assert.deepEqual(Object.keys(extra).sort(), [
    "absorbed",
    "armor",
    "cap",
    "effectiveArmor",
    "mitigation",
    "penetration",
    "raw",
    "taken",
    "uncapped"
  ]);
});

test("negative zero is stored as zero", () => {
  const result = mitigate({
    damage: -0,
    armor: -0,
    penetration: -0,
    cap: -0
  });
  for (const key of Object.keys(result)) {
    assert.equal(Object.is(result[key], 0), true, key);
    assert.equal(Object.is(result[key], -0), false, key);
  }
});

test("the smallest positive raw damage underflows under the default cap", () => {
  const result = mitigate({
    damage: Number.MIN_VALUE,
    armor: 100
  });
  assert.equal(result.mitigation, 0.75);
  assert.equal(result.uncapped, 1);
  assert.equal(result.taken, 0);
  assert.equal(result.absorbed, Number.MIN_VALUE);
  assert.equal(Object.is(result.taken, 0), true);
});

test("fractional and huge finite inputs follow the same rules", () => {
  const fractional = mitigate({
    damage: 10.5,
    armor: 10.5
  });
  assert.equal(fractional.raw, 10.5);
  assert.equal(fractional.effectiveArmor, 10.5);
  assert.equal(fractional.uncapped, saturatingHyperbolic(10.5));
  assert.equal(fractional.taken, 10.5 * (1 - fractional.mitigation));
  const wide = Number.MAX_SAFE_INTEGER + 1;
  const big = mitigate({ damage: wide, armor: 0 });
  assert.equal(big.taken, wide);
  const top = mitigate({
    damage: Number.MAX_VALUE,
    armor: Number.MAX_VALUE
  });
  assert.equal(top.effectiveArmor, Number.MAX_VALUE);
  assert.equal(top.mitigation, 0.75);
  assert.equal(top.taken, Number.MAX_VALUE / 4);
  assert.equal(top.absorbed, Number.MAX_VALUE * 0.75);
  assert.equal(top.taken + top.absorbed, Number.MAX_VALUE);
  const untouched = mitigate({
    damage: 8,
    armor: Number.MAX_VALUE,
    penetration: 1,
    cap: 1
  });
  assert.equal(untouched.effectiveArmor, Number.MAX_VALUE);
  assert.equal(untouched.taken, 0);
  const cancelled = mitigate({
    damage: 5,
    armor: Number.MAX_VALUE,
    penetration: Number.MAX_VALUE,
    cap: 1
  });
  assert.equal(cancelled.effectiveArmor, 0);
  assert.equal(cancelled.taken, 5);
});

test("results stay inside the cap and match the curve", () => {
  const damages = [0, 1, 10.5, 100];
  const armors = [0, 1, 25, 60, 99, 100, 250];
  const penetrations = [0, 1, 25, 40, 75, 100, 500];
  const caps = [0, 0.25, 0.5, 0.75, 1];
  for (const damage of damages) {
    for (const armor of armors) {
      for (const penetration of penetrations) {
        for (const cap of caps) {
          const result = mitigate({ damage, armor, penetration, cap });
          assert.equal(result.raw, damage);
          assert.equal(result.armor, armor);
          assert.equal(result.penetration, penetration);
          assert.equal(result.cap, cap);
          const difference = armor - penetration;
          const effectiveArmor = difference > 0 ? difference : 0;
          assert.equal(result.effectiveArmor, effectiveArmor);
          assert.equal(result.uncapped, saturatingHyperbolic(effectiveArmor));
          const mitigation = result.uncapped < cap ? result.uncapped : cap;
          assert.equal(result.mitigation, mitigation);
          assert.equal(result.mitigation <= cap, true);
          const expectedTaken = damage * (1 - mitigation);
          assert.equal(result.taken, expectedTaken > 0 ? expectedTaken : 0);
          const expectedAbsorbed = damage - result.taken;
          assert.equal(result.absorbed, expectedAbsorbed > 0 ? expectedAbsorbed : 0);
          assert.equal(result.taken >= 0, true);
          assert.equal(result.absorbed >= 0, true);
          if (cap < 1 && damage > 0) {
            assert.equal(result.taken > 0, true);
          }
          if (cap === 1 && effectiveArmor >= ARMOR_CONSTANT) {
            assert.equal(result.taken, 0);
            assert.equal(result.absorbed, damage);
          }
          assert.equal(Object.isFrozen(result), true);
        }
      }
    }
  }
});

test("more armor never increases damage taken and more penetration never decreases it", () => {
  let previousArmor = mitigate({ damage: 100, armor: 0, cap: 1 }).taken;
  for (let armor = 1; armor <= 120; armor += 1) {
    const taken = mitigate({ damage: 100, armor, cap: 1 }).taken;
    assert.equal(taken <= previousArmor, true, String(armor));
    previousArmor = taken;
  }
  assert.equal(mitigate({ damage: 100, armor: 100, cap: 1 }).taken, 0);
  let previousPenetration = mitigate({
    damage: 100,
    armor: 100,
    penetration: 0,
    cap: 1
  }).taken;
  for (let penetration = 1; penetration <= 120; penetration += 1) {
    const taken = mitigate({
      damage: 100,
      armor: 100,
      penetration,
      cap: 1
    }).taken;
    assert.equal(taken >= previousPenetration, true, String(penetration));
    previousPenetration = taken;
  }
  for (let armor = 0; armor <= 200; armor += 1) {
    const result = mitigate({ damage: 100, armor });
    assert.equal(result.taken > 0, true);
    assert.equal(result.taken >= 25, true);
    assert.equal(result.mitigation <= 0.75, true);
  }
});

test("a call does not read the clock, draw a random number, or add global properties", () => {
  const now = Date.now;
  const random = Math.random;
  const before = Object.getOwnPropertyNames(globalThis);
  Date.now = () => {
    throw new Error("clock");
  };
  Math.random = () => {
    throw new Error("random");
  };
  try {
    const result = mitigate({ damage: 100, armor: 60 });
    assert.equal(result.taken, 25);
    assert.equal(saturatingHyperbolic(25), 0.4);
    assert.deepEqual(Object.getOwnPropertyNames(globalThis), before);
  } finally {
    Date.now = now;
    Math.random = random;
  }
});

test("the result can be serialized and a frozen input is accepted", () => {
  const options = Object.freeze({
    damage: 100,
    armor: 25,
    note: "kept"
  });
  const result = mitigate(options);
  assert.equal(result.taken, 60);
  assert.equal(Object.isFrozen(options), true);
  assert.equal(options.note, "kept");
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});
