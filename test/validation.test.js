import assert from "node:assert/strict";
import test from "node:test";
import { mitigate } from "../src/index.js";
import { valid } from "./helpers.js";

const OPTIONS = "options must be an object";
const DAMAGE = "damage must be a finite number greater than or equal to 0";
const ARMOR = "armor must be a finite number greater than or equal to 0";
const PENETRATION = "penetration must be a finite number greater than or equal to 0";
const CAP = "cap must be a finite number from 0 through 1";

const BAD_NUMBERS = [
  null,
  -1,
  -0.1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  "100",
  "",
  true,
  false,
  [],
  {},
  1n,
  Object(1)
];

test("options must be a non-array object", () => {
  for (const options of [undefined, null, 0, 1, "hit", true, false, [], () => {}, Symbol("hit")]) {
    assert.throws(() => mitigate(options), {
      name: "TypeError",
      message: OPTIONS
    });
  }
  const row = [1];
  row.damage = 100;
  row.armor = 25;
  assert.throws(() => mitigate(row), {
    name: "TypeError",
    message: OPTIONS
  });
  assert.throws(() => mitigate(), {
    name: "TypeError",
    message: OPTIONS
  });
});

test("damage and armor are required finite numbers", () => {
  for (const damage of [undefined, ...BAD_NUMBERS]) {
    assert.throws(() => mitigate(valid({ damage })), {
      name: "RangeError",
      message: DAMAGE
    });
  }
  const omittedDamage = valid();
  delete omittedDamage.damage;
  assert.throws(() => mitigate(omittedDamage), {
    name: "RangeError",
    message: DAMAGE
  });
  for (const armor of [undefined, ...BAD_NUMBERS]) {
    assert.throws(() => mitigate(valid({ armor })), {
      name: "RangeError",
      message: ARMOR
    });
  }
  const omittedArmor = valid();
  delete omittedArmor.armor;
  assert.throws(() => mitigate(omittedArmor), {
    name: "RangeError",
    message: ARMOR
  });
  const inherited = Object.create({ damage: 100, armor: 25 });
  assert.throws(() => mitigate(inherited), {
    name: "RangeError",
    message: DAMAGE
  });
  const inheritedArmor = Object.create({ armor: 25 });
  inheritedArmor.damage = 100;
  assert.throws(() => mitigate(inheritedArmor), {
    name: "RangeError",
    message: ARMOR
  });
});

test("penetration and cap are optional and bounded", () => {
  for (const penetration of BAD_NUMBERS) {
    assert.throws(() => mitigate(valid({ penetration })), {
      name: "RangeError",
      message: PENETRATION
    });
  }
  assert.equal(mitigate(valid({ penetration: undefined })).penetration, 0);
  assert.equal(mitigate(valid({ armor: 25 })).penetration, 0);
  for (const cap of [...BAD_NUMBERS, 1.1, 2, 1 + Number.EPSILON, -Number.EPSILON]) {
    assert.throws(() => mitigate(valid({ cap })), {
      name: "RangeError",
      message: CAP
    });
  }
  assert.equal(mitigate(valid({ cap: undefined })).cap, 0.75);
  assert.equal(mitigate(valid({ armor: 100, cap: 0 })).mitigation, 0);
  assert.equal(mitigate(valid({ armor: 100, cap: 1 })).taken, 0);
  assert.equal(mitigate(valid({ armor: 100, cap: 1.0 })).taken, 0);
  assert.equal(mitigate(valid({ cap: Number.MIN_VALUE })).cap, Number.MIN_VALUE);
  const whole = mitigate(valid({ damage: 1.0, armor: 1.0, penetration: 1.0, cap: 1.0 }));
  assert.equal(whole.raw, 1);
  assert.equal(whole.armor, 1);
  assert.equal(whole.penetration, 1);
  assert.equal(whole.effectiveArmor, 0);
  assert.equal(whole.cap, 1);
});

test("the first failing check wins and later fields are not read", () => {
  let armorReads = 0;
  const badDamage = {};
  Object.defineProperty(badDamage, "damage", {
    enumerable: true,
    get() {
      return "nope";
    }
  });
  Object.defineProperty(badDamage, "armor", {
    enumerable: true,
    get() {
      armorReads += 1;
      return 0;
    }
  });
  assert.throws(() => mitigate(badDamage), {
    name: "RangeError",
    message: DAMAGE
  });
  assert.equal(armorReads, 0);

  let penetrationReads = 0;
  const badArmor = {
    damage: 10,
    armor: -1,
    get penetration() {
      penetrationReads += 1;
      return 0;
    }
  };
  assert.throws(() => mitigate(badArmor), {
    name: "RangeError",
    message: ARMOR
  });
  assert.equal(penetrationReads, 0);

  let capReads = 0;
  const badPenetration = {
    damage: 10,
    armor: 10,
    penetration: -1,
    get cap() {
      capReads += 1;
      return 1;
    }
  };
  assert.throws(() => mitigate(badPenetration), {
    name: "RangeError",
    message: PENETRATION
  });
  assert.equal(capReads, 0);

  assert.throws(() => mitigate(valid({ damage: -1, armor: -1, penetration: -1, cap: 2 })), {
    name: "RangeError",
    message: DAMAGE
  });
  assert.throws(() => mitigate(valid({ armor: -1, penetration: -1, cap: 2 })), {
    name: "RangeError",
    message: ARMOR
  });
  assert.throws(() => mitigate(valid({ penetration: -1, cap: 2 })), {
    name: "RangeError",
    message: PENETRATION
  });
  assert.throws(() => mitigate(valid({ cap: 2 })), {
    name: "RangeError",
    message: CAP
  });
});

test("each consulted field is read once", () => {
  const reads = { damage: 0, armor: 0, penetration: 0, cap: 0 };
  const options = {
    get damage() {
      reads.damage += 1;
      return 100;
    },
    get armor() {
      reads.armor += 1;
      return 25;
    },
    get penetration() {
      reads.penetration += 1;
      return 0;
    },
    get cap() {
      reads.cap += 1;
      return 0.75;
    }
  };
  const result = mitigate(options);
  assert.equal(result.taken, 60);
  assert.deepEqual(reads, { damage: 1, armor: 1, penetration: 1, cap: 1 });
});

test("unknown getters are ignored and inherited optionals stay at the defaults", () => {
  let noteReads = 0;
  const options = {
    damage: 100,
    armor: 0
  };
  Object.defineProperty(options, "note", {
    enumerable: true,
    get() {
      noteReads += 1;
      return 1;
    }
  });
  const result = mitigate(options);
  assert.equal(result.taken, 100);
  assert.equal(noteReads, 0);

  const proto = { penetration: 80, cap: 0, note: "no" };
  const child = Object.create(proto);
  child.damage = 100;
  child.armor = 100;
  const inherited = mitigate(child);
  assert.equal(inherited.penetration, 0);
  assert.equal(inherited.cap, 0.75);
  assert.equal(inherited.taken, 25);

  const blank = Object.create(null);
  blank.damage = 100;
  blank.armor = 25;
  assert.equal(mitigate(blank).taken, 60);

  class Hit {
    constructor() {
      this.damage = 100;
      this.armor = 25;
      this.label = "hit";
    }
  }
  const instance = new Hit();
  assert.equal(mitigate(instance).taken, 60);
  assert.equal(instance.label, "hit");

  const hidden = {};
  Object.defineProperty(hidden, "damage", { value: 100 });
  Object.defineProperty(hidden, "armor", { value: 60 });
  assert.equal(mitigate(hidden).taken, 25);
});

test("a failed call leaves the input in place and the next call still works", () => {
  const bad = Object.freeze({
    damage: 100,
    armor: Number.NaN
  });
  assert.throws(() => mitigate(bad), {
    name: "RangeError",
    message: ARMOR
  });
  assert.equal(Object.isFrozen(bad), true);
  assert.equal(bad.damage, 100);
  const result = mitigate({ damage: 100, armor: 25 });
  assert.equal(result.taken, 60);
});
