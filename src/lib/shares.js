export const computeShares = (amountCents, weights) => {
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!entries.length || totalWeight <= 0) {
    throw new Error("Percentuali non valide.");
  }

  let allocated = 0;
  const shares = {};
  const remainders = [];
  entries.forEach(([memberId, weight], index) => {
    const raw = (amountCents * weight) / totalWeight;
    const base = Math.floor(raw);
    shares[memberId] = base;
    allocated += base;
    remainders.push({ remainder: raw - base, index, memberId });
  });

  let residual = amountCents - allocated;
  if (residual > 0) {
    remainders.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let i = 0; i < residual; i += 1) {
      shares[remainders[i % remainders.length].memberId] += 1;
    }
  }

  return shares;
};
