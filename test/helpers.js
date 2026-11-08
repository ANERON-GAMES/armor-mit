export function valid(extra = {}) {
  return {
    damage: 100,
    armor: 0,
    ...extra
  };
}
