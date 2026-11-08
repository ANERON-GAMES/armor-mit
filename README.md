# @aneron/armor-mit

Armor-based damage mitigation with diminishing returns and a mitigation cap.

## Purpose

`@aneron/armor-mit` turns an armor value and a raw damage amount into the damage that gets through. The named formula is saturating hyperbolic. `FORMULA` is `"saturating-hyperbolic"`, and `saturatingHyperbolic` is that curve.

Penetration is subtracted from armor first. The curve maps the remaining effective armor to an uncapped mitigation fraction. The fraction grows quickly at low armor and more slowly as armor rises, and it reaches `1` at `ARMOR_CONSTANT` (`100`). `mitigate` then clamps the fraction with a mitigation cap. The named default is `DEFAULT_MITIGATION_CAP` (`0.75`). While the cap is below `1`, applied mitigation cannot exceed that cap, so armor cannot remove the remaining fraction. A caller sets the cap to `1` to allow effective armor at or above `100` to reduce the damage to zero.

Armor, penetration, and `ARMOR_CONSTANT` share one unit chosen by the caller. Damage shares one unit chosen by the caller. The fraction is not a unit. The module does not convert either unit, and it does not round.

Each call reads its argument and returns a new frozen object. The same input produces the same result. A call does not mutate the argument, read a clock, generate a random number, or perform I/O. The package has no runtime dependencies.

## Install

The package is an ES module. It needs Node.js 20 or newer. It has no runtime dependencies. The package name is `@aneron/armor-mit`. It is not published to the npm registry.

Clone this repository and run the tests:

```bash
git clone https://github.com/ANERON-GAMES/armor-mit.git
cd armor-mit
npm install
npm test
```

`npm test` runs `node --test`. `npm run lint` runs ESLint. `npm run format:check` runs Prettier.

Install it as a dependency from the git repository:

```bash
npm install github:ANERON-GAMES/armor-mit
```

```js
import { mitigate } from "@aneron/armor-mit";
```

Code in this repository imports the same entry point with `./src/index.js`.

## Usage

A hit with no armor passes through unchanged. The default cap is `0.75`, and it does not matter while the curve is `0`.

```js
import { mitigate } from "@aneron/armor-mit";

const open = mitigate({
  damage: 100,
  armor: 0
});
```

`open.taken` is `100`. `open.absorbed` is `0`. `open.mitigation` is `0`. `open.uncapped` is `0`. `open.effectiveArmor` is `0`. `open.penetration` is `0`. `open.cap` is `0.75`. `open.raw` is `100`. `open.armor` is `0`.

Effective armor `25` is below the default cap. The uncapped fraction is `0.4`, so `40` of the `100` is absorbed and `60` gets through.

```js
const partial = mitigate({
  damage: 100,
  armor: 25
});
```

`partial.taken` is `60`. `partial.absorbed` is `40`. `partial.mitigation` is `0.4`. `partial.uncapped` is `0.4`. `partial.effectiveArmor` is `25`. `partial.cap` is `0.75`.

Effective armor `60` is the point where the curve equals the default cap.

```js
const capped = mitigate({
  damage: 100,
  armor: 60
});
```

`capped.taken` is `25`. `capped.absorbed` is `75`. `capped.mitigation` is `0.75`. `capped.uncapped` is `0.75`. `capped.effectiveArmor` is `60`.

Effective armor `100` saturates the curve. The uncapped fraction is `1`. The default cap still holds the applied fraction at `0.75`, so the hit is the same as armor `60`.

```js
const saturated = mitigate({
  damage: 100,
  armor: 100
});
```

`saturated.uncapped` is `1`. `saturated.mitigation` is `0.75`. `saturated.taken` is `25`. `saturated.absorbed` is `75`. `saturated.effectiveArmor` is `100`.

Armor past saturation does not change the result under the default cap.

```js
const piled = mitigate({
  damage: 100,
  armor: 1000
});
```

`piled.taken` is `25`. `piled.mitigation` is `0.75`. `piled.uncapped` is `1`. `piled.effectiveArmor` is `1000`.

Setting the cap to `1` lets saturation reduce the hit to zero.

```js
const blocked = mitigate({
  damage: 100,
  armor: 100,
  cap: 1
});
```

`blocked.taken` is `0`. `blocked.absorbed` is `100`. `blocked.mitigation` is `1`. `blocked.uncapped` is `1`. `blocked.cap` is `1`.

A cap of `1` does not raise mitigation while the curve is still below the cap. Armor `25` stays at `0.4`.

```js
const below = mitigate({
  damage: 100,
  armor: 25,
  cap: 1
});
```

`below.taken` is `60`. `below.mitigation` is `0.4`. `below.uncapped` is `0.4`. `below.cap` is `1`.

A cap of `0.5` is tighter than the saturated curve. Half of the raw damage remains.

```js
const half = mitigate({
  damage: 100,
  armor: 100,
  cap: 0.5
});
```

`half.taken` is `50`. `half.absorbed` is `50`. `half.mitigation` is `0.5`. `half.uncapped` is `1`. `half.cap` is `0.5`.

Penetration reduces armor before the curve. Armor `100` and penetration `75` leave effective armor `25`, which is the same curve point as armor `25` with no penetration.

```js
const pierced = mitigate({
  damage: 100,
  armor: 100,
  penetration: 75
});
```

`pierced.taken` is `60`. `pierced.absorbed` is `40`. `pierced.effectiveArmor` is `25`. `pierced.penetration` is `75`. `pierced.armor` is `100`. `pierced.mitigation` is `0.4`. `pierced.uncapped` is `0.4`.

With the cap at `1`, armor `100` would absorb the whole hit. Penetration `40` leaves effective armor `60`, so the curve stops at `0.75` and `25` gets through.

```js
const opened = mitigate({
  damage: 100,
  armor: 100,
  penetration: 40,
  cap: 1
});
```

`opened.taken` is `25`. `opened.absorbed` is `75`. `opened.effectiveArmor` is `60`. `opened.mitigation` is `0.75`. `opened.uncapped` is `0.75`. `opened.cap` is `1`.

Penetration at least as large as armor leaves effective armor `0`. The curve is `0`, including when the cap is `1`.

```js
const stripped = mitigate({
  damage: 100,
  armor: 100,
  penetration: 100,
  cap: 1
});
```

`stripped.taken` is `100`. `stripped.absorbed` is `0`. `stripped.effectiveArmor` is `0`. `stripped.mitigation` is `0`. `stripped.uncapped` is `0`.

A cap of `0` removes no damage. The uncapped curve is still reported.

```js
const transparent = mitigate({
  damage: 100,
  armor: 500,
  cap: 0
});
```

`transparent.taken` is `100`. `transparent.absorbed` is `0`. `transparent.mitigation` is `0`. `transparent.uncapped` is `1`. `transparent.cap` is `0`.

A raw damage of `0` stays `0`. The fraction is still the fraction for that armor.

```js
const none = mitigate({
  damage: 0,
  armor: 100,
  cap: 1
});
```

`none.taken` is `0`. `none.absorbed` is `0`. `none.mitigation` is `1`. `none.raw` is `0`. `none.uncapped` is `1`.

Fields are read by name. The same numbers in another order return an equal result and a different object.

```js
const left = mitigate({ damage: 100, armor: 25 });
const right = mitigate({ armor: 25, damage: 100 });
```

`left.taken` is `60`. `right.taken` is `60`.

A later edit to the argument is visible only to a later call. The first result keeps the numbers it computed.

```js
const hit = { damage: 100, armor: 25 };
const first = mitigate(hit);
hit.armor = 100;
const second = mitigate(hit);
```

`first.taken` is `60`. `second.taken` is `25`. `hit.damage` is `100`. `hit.armor` is `100`.

## API

`mitigate` and `saturatingHyperbolic` are functions. They have no constructor and no shared state. Each call reads its argument and returns a new value. `mitigate` returns a new object. `saturatingHyperbolic` returns a number.

`mitigate` does not mutate `options`. A call freezes only the result it creates. Own fields are read. Unknown fields are ignored and are not copied onto the result. An omitted optional field, or a field whose value is `undefined`, uses the default. A frozen object, a class instance, and an object with a null prototype are accepted. An array is not accepted. Inherited fields are ignored. Each field that is consulted is read once.

`-0` is accepted on every numeric input and stored as `0`. Comparison with `0` uses ordinary equality before that normalisation. Integer values are not required. `1.0` is the same input as `1`.

### Constants

| Export                   | Value                     | Meaning                                                                                          |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `FORMULA`                | `"saturating-hyperbolic"` | Name of the curve.                                                                               |
| `ARMOR_CONSTANT`         | `100`                     | Effective armor at which the uncapped curve reaches `1`.                                         |
| `DEFAULT_MITIGATION_CAP` | `0.75`                    | Cap used when `cap` is omitted. Applied mitigation cannot exceed this unless the caller sets it. |

`saturatingHyperbolic(0)` is `0`. `saturatingHyperbolic(20)` is `1/3`. `saturatingHyperbolic(25)` is `0.4`. `saturatingHyperbolic(40)` is `4/7`. `saturatingHyperbolic(60)` is `0.75`. `saturatingHyperbolic(80)` is `8/9`. `saturatingHyperbolic(100)` is `1`.

### `saturatingHyperbolic(effectiveArmor)`

```js
saturatingHyperbolic(effectiveArmor);
```

`effectiveArmor` must be a finite number greater than or equal to `0`. Otherwise the function throws `RangeError` with the message `effectiveArmor must be a finite number greater than or equal to 0`. `-0` returns `0`.

The result is a number in the closed interval from `0` through `1`.

Let `a` be the argument after `-0` has been stored as `0`, and let `K` be `ARMOR_CONSTANT`.

1. When `a` is `0`, the result is `0`.
2. When `a` is greater than or equal to `K`, the result is `1`.
3. Otherwise the result is the hyperbola `a / (a + K)`, divided by the hyperbola at `K`. The hyperbola at `K` is `1/2`, so this is `2a / (a + K)`. A value that falls outside `0` through `1` from floating-point rounding is clamped into that interval.

Worked points:

| `a`   | Hyperbola `a / (a + 100)` | Uncapped fraction |
| ----- | ------------------------- | ----------------- |
| `25`  | `25/125 = 0.2`            | `0.4`             |
| `60`  | `60/160 = 0.375`          | `0.75`            |
| `100` |                           | `1`               |

The function does not subtract penetration and does not apply the cap. `mitigate` does both, in that order, and calls this function with the effective armor.

### `mitigate(options)`

```js
mitigate(options);
```

`options` must be an object and must not be an array. Otherwise the function throws `TypeError` with the message `options must be an object`.

Checks run in this order. The first failure wins. A throw returns no result. Later fields are not read.

1. `options` is an object and not an array.
2. `damage` is an own finite number greater than or equal to `0`.
3. `armor` is an own finite number greater than or equal to `0`.
4. `penetration`, when present and not `undefined`, is an own finite number greater than or equal to `0`.
5. `cap`, when present and not `undefined`, is an own finite number from `0` through `1`.

| Field         | Default                  | Accepted values                                                              |
| ------------- | ------------------------ | ---------------------------------------------------------------------------- |
| `damage`      | required                 | Finite number greater than or equal to `0`. This is the incoming raw damage. |
| `armor`       | required                 | Finite number greater than or equal to `0`.                                  |
| `penetration` | `0`                      | Finite number greater than or equal to `0`, or omitted.                      |
| `cap`         | `DEFAULT_MITIGATION_CAP` | Finite number from `0` through `1`, inclusive, or omitted.                   |

`Number.MAX_SAFE_INTEGER` and `Number.MAX_VALUE` are finite and are accepted. `NaN`, `Infinity`, numeric strings, booleans, `null`, and boxed numbers are rejected.

Effective armor is `armor - penetration` when that difference is greater than `0`, and `0` otherwise. Subtraction is IEEE-754. `Number.MAX_VALUE - 1` is `Number.MAX_VALUE`, so a penetration of `1` does not change armor at the top of the finite range. `Number.MAX_VALUE - Number.MAX_VALUE` is `0`, so those two inputs cancel.

The uncapped fraction is `saturatingHyperbolic(effectiveArmor)`. Applied mitigation is the uncapped fraction when that fraction is lower than `cap`, and `cap` otherwise.

`taken` is `raw * (1 - mitigation)` when that product is greater than `0`, and `0` otherwise. `absorbed` is `raw - taken` when that difference is greater than `0`, and `0` otherwise. `-0` results are stored as `0`.

While `cap` is below `1`, `mitigation` is at most `cap`, so the remaining fraction is at least `1 - cap`. `taken` is greater than `0` for a positive `raw` when `raw * (1 - mitigation)` is a positive finite value. `Number.MIN_VALUE` with the default cap underflows, and `taken` is then `0`. A cap of `1` and effective armor greater than or equal to `ARMOR_CONSTANT` make `taken` `0` and `absorbed` equal to `raw`.

### Result

The return value is a frozen object. The fields are numbers.

| Field            | Meaning                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| `taken`          | Damage that gets through.                                                      |
| `absorbed`       | Damage removed.                                                                |
| `raw`            | Incoming damage used for this call.                                            |
| `armor`          | Armor used for this call.                                                      |
| `penetration`    | Penetration used for this call. `0` when the field was omitted.                |
| `effectiveArmor` | Armor after penetration. Never below `0`.                                      |
| `uncapped`       | `saturatingHyperbolic(effectiveArmor)`, before the cap.                        |
| `mitigation`     | Fraction removed after the cap. In the closed interval from `0` through `cap`. |
| `cap`            | Cap used for this call.                                                        |

The result does not share object references with the input or with another call. `JSON` can carry the result because every field is a number.

### Errors

| When the check fails                                                          | Error        | Message                                                             |
| ----------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------- |
| `options` is missing, `null`, an array, or not an object                      | `TypeError`  | `options must be an object`                                         |
| `damage` is missing or not a finite number greater than or equal to `0`       | `RangeError` | `damage must be a finite number greater than or equal to 0`         |
| `armor` is missing or not a finite number greater than or equal to `0`        | `RangeError` | `armor must be a finite number greater than or equal to 0`          |
| `penetration` is present and not a finite number greater than or equal to `0` | `RangeError` | `penetration must be a finite number greater than or equal to 0`    |
| `cap` is present and not a finite number from `0` through `1`                 | `RangeError` | `cap must be a finite number from 0 through 1`                      |
| `saturatingHyperbolic` receives a value that is not a finite number `>= 0`    | `RangeError` | `effectiveArmor must be a finite number greater than or equal to 0` |

## Design notes

The curve is the hyperbola `a / (a + K)` with `K` at `100`, divided by its value at `100`. That value is `1/2`, so armor `100` is full uncapped mitigation and every smaller armor keeps the hyperbola's shape. The derivative of `2a / (a + 100)` is `200 / (a + 100)^2`. It is positive below `100` and it falls as armor rises, so each added point of armor removes less damage than the previous point. From `0` to `25` the fraction moves from `0` to `0.4`. From `25` to `60` it moves from `0.4` to `0.75`. From `60` to `100` it moves from `0.75` to `1`. Past `100` the fraction stays at `1`.

The cap is a second limit, applied after the curve. The default is `0.75`, which is the curve's value at effective armor `60`. Further armor does not raise mitigation above that default. The remaining fraction is `0.25`. For a normal positive raw damage, that remainder stays positive. A caller who wants a saturated hit to be removed sets `cap` to `1`. A caller who wants armor to do nothing sets `cap` to `0`. The uncapped field still reports the curve, so the cap can be audited without running the formula again.

Penetration is a count of armor points in the same unit as armor. It is applied to the armor value, and the curve sees only what remains. That order is what lets penetration pull a saturated hit back under the cap: armor `100`, penetration `75`, and the default cap take `60`, the same as armor `25`. Penetration larger than or equal to armor clears the armor for that call. The next call can pass a different penetration. Nothing is stored.

The constant is part of the named formula. It is not an argument. Callers who keep armor in another scale convert it into this unit before the call, where `100` means full uncapped mitigation.

The result is a pure reduction of the numbers the caller already has. Inputs stay mutable for the caller. Two calls do not share result objects, so freezing one result cannot change the next call. A non-finite number is rejected rather than treated as zero armor or as full mitigation. `Infinity` is not a damage amount and not an armor amount.

## License

MIT. Copyright (c) 2026 Vadim Gubin. The full text is in [LICENSE](LICENSE).
