const DEFAULT_PLATES = [45, 35, 25, 10, 5, 2.5];

export function calculatePlates(targetWeight: number, barbellWeight: number) {
  if (targetWeight <= barbellWeight) {
    return [];
  }

  const perSide = (targetWeight - barbellWeight) / 2;
  let remaining = perSide;
  const plates: number[] = [];

  for (const plate of DEFAULT_PLATES) {
    while (remaining >= plate - 0.001) {
      plates.push(plate);
      remaining = Number((remaining - plate).toFixed(2));
    }
  }

  return plates;
}
