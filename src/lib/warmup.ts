export function generateWarmupSets(targetWeight: number, barbellWeight: number) {
  if (targetWeight <= barbellWeight) {
    return [{ weight: barbellWeight, reps: 5 }];
  }

  const percentages = [0.2, 0.4, 0.6, 0.8];
  const reps = [5, 5, 3, 2];

  return percentages.map((pct, idx) => {
    const computed = Math.max(barbellWeight, roundToNearest5(targetWeight * pct));
    return { weight: computed, reps: reps[idx] };
  });
}

function roundToNearest5(weight: number) {
  return Math.round(weight / 5) * 5;
}
