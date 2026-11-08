import { ARMOR_CONSTANT } from "./constants.js";

const EFFECTIVE_ARMOR = "effectiveArmor must be a finite number greater than or equal to 0";

export function saturatingHyperbolic(effectiveArmor) {
  if (isNonNegativeFinite(effectiveArmor) === false) {
    throw new RangeError(EFFECTIVE_ARMOR);
  }
  if (effectiveArmor === 0) {
    return 0;
  }
  if (effectiveArmor >= ARMOR_CONSTANT) {
    return 1;
  }
  const hyperbolic = effectiveArmor / (effectiveArmor + ARMOR_CONSTANT);
  const scale = ARMOR_CONSTANT / (ARMOR_CONSTANT + ARMOR_CONSTANT);
  const uncapped = hyperbolic / scale;
  if (uncapped > 1) {
    return 1;
  }
  if (uncapped < 0) {
    return 0;
  }
  return uncapped;
}

function isNonNegativeFinite(value) {
  return typeof value === "number" && Number.isFinite(value) === true && value >= 0;
}
