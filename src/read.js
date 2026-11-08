import { DEFAULT_MITIGATION_CAP } from "./constants.js";

const DAMAGE = "damage must be a finite number greater than or equal to 0";
const ARMOR = "armor must be a finite number greater than or equal to 0";
const PENETRATION = "penetration must be a finite number greater than or equal to 0";
const CAP = "cap must be a finite number from 0 through 1";

export function readMitigation(options) {
  if (isRecord(options) === false) {
    throw new TypeError("options must be an object");
  }
  const damage = readRequired(options, "damage", DAMAGE);
  const armor = readRequired(options, "armor", ARMOR);
  const penetration = readOptional(options, "penetration", 0, PENETRATION, isNonNegativeFinite);
  const cap = readOptional(options, "cap", DEFAULT_MITIGATION_CAP, CAP, isCap);
  return {
    damage,
    armor,
    penetration,
    cap
  };
}

function readRequired(options, key, message) {
  if (Object.hasOwn(options, key) === false) {
    throw new RangeError(message);
  }
  const value = options[key];
  if (isNonNegativeFinite(value) === false) {
    throw new RangeError(message);
  }
  return normalizeZero(value);
}

function readOptional(options, key, fallback, message, accept) {
  if (Object.hasOwn(options, key) === false) {
    return fallback;
  }
  const value = options[key];
  if (value === undefined) {
    return fallback;
  }
  if (accept(value) === false) {
    throw new RangeError(message);
  }
  return normalizeZero(value);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && Array.isArray(value) === false;
}

function isNonNegativeFinite(value) {
  return typeof value === "number" && Number.isFinite(value) === true && value >= 0;
}

function isCap(value) {
  return typeof value === "number" && Number.isFinite(value) === true && value >= 0 && value <= 1;
}

function normalizeZero(value) {
  if (value === 0) {
    return 0;
  }
  return value;
}
