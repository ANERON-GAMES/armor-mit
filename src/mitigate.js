import { saturatingHyperbolic } from "./curve.js";
import { readMitigation } from "./read.js";

export function mitigate(options) {
  const input = readMitigation(options);
  const effectiveArmor = subtractArmor(input.armor, input.penetration);
  const uncapped = saturatingHyperbolic(effectiveArmor);
  const mitigation = applyCap(uncapped, input.cap);
  const taken = takenDamage(input.damage, mitigation);
  const absorbed = absorbedDamage(input.damage, taken);
  return Object.freeze({
    taken,
    absorbed,
    raw: input.damage,
    armor: input.armor,
    penetration: input.penetration,
    effectiveArmor,
    uncapped,
    mitigation,
    cap: input.cap
  });
}

function subtractArmor(armor, penetration) {
  const value = armor - penetration;
  if (value > 0) {
    return value;
  }
  return 0;
}

function applyCap(uncapped, cap) {
  if (uncapped < cap) {
    return uncapped;
  }
  return cap;
}

function takenDamage(raw, mitigation) {
  const value = raw * (1 - mitigation);
  if (value > 0) {
    return value;
  }
  return 0;
}

function absorbedDamage(raw, taken) {
  const value = raw - taken;
  if (value > 0) {
    return value;
  }
  return 0;
}
