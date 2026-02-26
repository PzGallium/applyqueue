import type { RankWeights, ScoreBreakdown } from '../types';

export interface ScoringInput {
  roleMatchScore: number;
  locationMatchScore: number;
  companyRatingScore: number;
  salaryMatchScore: number;
  recencyScore: number;
}

/**
 * Calculates weighted ranking score (0-100) and breakdown.
 * Each input score should be 0-100. Weights should sum to ~1.0.
 */
export function calculateRankScore(
  input: ScoringInput,
  weights: RankWeights,
): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    roleMatch: Math.round(input.roleMatchScore * weights.roleMatch),
    locationMatch: Math.round(input.locationMatchScore * weights.locationMatch),
    companyRating: Math.round(input.companyRatingScore * weights.companyRating),
    salaryMatch: Math.round(input.salaryMatchScore * weights.salaryMatch),
    recency: Math.round(input.recencyScore * weights.recency),
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

export const DEFAULT_WEIGHTS: RankWeights = {
  roleMatch: 0.3,
  locationMatch: 0.2,
  companyRating: 0.2,
  salaryMatch: 0.15,
  recency: 0.15,
};
