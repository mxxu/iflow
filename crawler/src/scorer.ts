// Heat score: time decay with exponential falloff
// lambda = 0.1 → half-life ≈ 7 hours, ~5% remaining after 30 hours
const LAMBDA = 0.1

export function calcHeatScore(publishedAt: Date): number {
  const hoursSincePublished = (Date.now() - publishedAt.getTime()) / 3_600_000
  return Math.exp(-LAMBDA * hoursSincePublished)
}

// When we have engagement signals, plug them in here:
// export function calcHeatScore(publishedAt: Date, clicks = 0): number {
//   const hoursSince = (Date.now() - publishedAt.getTime()) / 3_600_000
//   const baseScore = 1 + Math.log1p(clicks)
//   return baseScore * Math.exp(-LAMBDA * hoursSince)
// }
