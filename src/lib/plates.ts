import { PlateInventoryItem } from "@/lib/types";

const DEFAULT_PLATE_INVENTORY: PlateInventoryItem[] = [
  { weight: 45, pairs: 99 },
  { weight: 35, pairs: 99 },
  { weight: 25, pairs: 99 },
  { weight: 10, pairs: 99 },
  { weight: 5, pairs: 99 },
  { weight: 2.5, pairs: 99 },
];

export function calculatePlates(
  targetWeight: number,
  barbellWeight: number,
  inventory: PlateInventoryItem[] = DEFAULT_PLATE_INVENTORY,
) {
  if (targetWeight <= barbellWeight) {
    return [];
  }

  const perSide = (targetWeight - barbellWeight) / 2;
  let remaining = perSide;
  const plates: number[] = [];
  const sortedInventory = [...inventory]
    .filter((item) => item.weight > 0 && item.pairs > 0)
    .sort((a, b) => b.weight - a.weight);

  for (const item of sortedInventory) {
    const maxPossible = Math.floor((remaining + 0.001) / item.weight);
    const plateCount = Math.min(maxPossible, item.pairs);
    for (let index = 0; index < plateCount; index += 1) {
      plates.push(item.weight);
      remaining = Number((remaining - item.weight).toFixed(2));
    }
  }

  if (remaining > 0.001) {
    return [];
  }

  return plates;
}
