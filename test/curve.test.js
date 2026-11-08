import assert from "node:assert/strict";
import test from "node:test";
import { ARMOR_CONSTANT, saturatingHyperbolic } from "../src/index.js";

const EFFECTIVE = "effectiveArmor must be a finite number greater than or equal to 0";

test("named points on the saturating hyperbolic curve are exact", () => {
  assert.equal(ARMOR_CONSTANT, 100);
  assert.equal(saturatingHyperbolic(0), 0);
  assert.equal(Object.is(saturatingHyperbolic(-0), 0), true);
  assert.equal(Object.is(saturatingHyperbolic(-0), -0), false);
  assert.equal(saturatingHyperbolic(20), 1 / 3);
  assert.equal(saturatingHyperbolic(25), 0.4);
  assert.equal(saturatingHyperbolic(40), 4 / 7);
  assert.equal(saturatingHyperbolic(50), 2 / 3);
  assert.equal(saturatingHyperbolic(60), 0.75);
  assert.equal(saturatingHyperbolic(80), 8 / 9);
  assert.equal(saturatingHyperbolic(100), 1);
  assert.equal(saturatingHyperbolic(100.5), 1);
  assert.equal(saturatingHyperbolic(101), 1);
  assert.equal(saturatingHyperbolic(1000), 1);
  assert.equal(saturatingHyperbolic(Number.MAX_SAFE_INTEGER), 1);
  assert.equal(saturatingHyperbolic(Number.MAX_VALUE), 1);
});

test("the curve diminishes until the armor constant and then stays at 1", () => {
  let previous = saturatingHyperbolic(0);
  let previousGain = Number.POSITIVE_INFINITY;
  for (let armor = 1; armor <= ARMOR_CONSTANT; armor += 1) {
    const next = saturatingHyperbolic(armor);
    const gain = next - previous;
    assert.equal(next > previous, true, String(armor));
    assert.equal(gain < previousGain, true, String(armor));
    assert.equal(next <= 1, true, String(armor));
    previous = next;
    previousGain = gain;
  }
  assert.equal(previous, 1);
  assert.equal(saturatingHyperbolic(ARMOR_CONSTANT + 1) - saturatingHyperbolic(ARMOR_CONSTANT), 0);
  const samples = [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  for (let index = 1; index < samples.length; index += 1) {
    const earlier = saturatingHyperbolic(samples[index - 1]);
    const later = saturatingHyperbolic(samples[index]);
    assert.equal(later > earlier, true, String(samples[index]));
  }
});

test("the curve rejects values that are not finite armor", () => {
  for (const value of [
    undefined,
    null,
    -1,
    -0.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "25",
    "",
    true,
    false,
    [],
    {},
    1n,
    Object(25)
  ]) {
    assert.throws(() => saturatingHyperbolic(value), {
      name: "RangeError",
      message: EFFECTIVE
    });
  }
  assert.throws(() => saturatingHyperbolic(), {
    name: "RangeError",
    message: EFFECTIVE
  });
});

test("repeated curve calls return the same number", () => {
  const first = saturatingHyperbolic(25);
  for (let count = 0; count < 20; count += 1) {
    assert.equal(saturatingHyperbolic(25), first);
  }
});
