import type { RankWeights, ScoreBreakdown } from '../types';

export interface ScoringInput {
  roleMatchScore: number;
  locationMatchScore: number;
  companyRatingScore: number;
  salaryMatchScore: number;
  recencyScore: number;
}

/**
 * Normalizes weights so they sum to exactly 1.0.
 * Accepts any non-negative numbers (e.g. slider values 0-100)
 * and converts them to proportional weights.
 *
 * Example: { roleMatch: 60, locationMatch: 40, ... } →
 *          { roleMatch: 0.3, locationMatch: 0.2, ... }
 *
 * If all weights are 0, falls back to equal distribution.
 */
export function normalizeWeights(raw: RankWeights): RankWeights {
  const keys: (keyof RankWeights)[] = [
    'roleMatch',
    'locationMatch',
    'companyRating',
    'salaryMatch',
    'recency',
  ];
  const sum = keys.reduce((acc, k) => acc + Math.max(0, raw[k]), 0);

  if (sum === 0) {
    const equal = 1 / keys.length;
    return Object.fromEntries(keys.map((k) => [k, equal])) as unknown as RankWeights;
  }

  return Object.fromEntries(keys.map((k) => [k, Math.max(0, raw[k]) / sum])) as unknown as RankWeights;
}

/**
 * Calculates weighted ranking score (0-100) and breakdown.
 * Each input score should be 0-100. Weights are auto-normalized.
 */
export function calculateRankScore(
  input: ScoringInput,
  weights: RankWeights,
): { score: number; breakdown: ScoreBreakdown } {
  const w = normalizeWeights(weights);

  const breakdown: ScoreBreakdown = {
    roleMatch: Math.round(input.roleMatchScore * w.roleMatch),
    locationMatch: Math.round(input.locationMatchScore * w.locationMatch),
    companyRating: Math.round(input.companyRatingScore * w.companyRating),
    salaryMatch: Math.round(input.salaryMatchScore * w.salaryMatch),
    recency: Math.round(input.recencyScore * w.recency),
  };

  const score =
    breakdown.roleMatch +
    breakdown.locationMatch +
    breakdown.companyRating +
    breakdown.salaryMatch +
    breakdown.recency;

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown,
  };
}

/** Default weights (already normalized, sum = 1.0) */
export const DEFAULT_WEIGHTS: RankWeights = {
  roleMatch: 0.3,
  locationMatch: 0.2,
  companyRating: 0.2,
  salaryMatch: 0.15,
  recency: 0.15,
};

/**
 * Converts normalized weights (0-1, sum=1) to slider-friendly
 * integer percentages (0-100, sum=100) for UI display.
 */
export function weightsToSliders(weights: RankWeights): Record<keyof RankWeights, number> {
  const keys: (keyof RankWeights)[] = [
    'roleMatch',
    'locationMatch',
    'companyRating',
    'salaryMatch',
    'recency',
  ];
  const raw = keys.map((k) => Math.round(weights[k] * 100));

  // Adjust rounding so total is exactly 100
  const diff = 100 - raw.reduce((a, b) => a + b, 0);
  if (diff !== 0) {
    const maxIdx = raw.indexOf(Math.max(...raw));
    raw[maxIdx] += diff;
  }

  return Object.fromEntries(keys.map((k, i) => [k, raw[i]])) as Record<
    keyof RankWeights,
    number
  >;
}

/**
 * Converts slider integer percentages (0-100) back to
 * normalized weights (0-1). Always safe — handles any input.
 */
export function slidersToWeights(sliders: Record<keyof RankWeights, number>): RankWeights {
  return normalizeWeights(sliders as RankWeights);
}
