export type SeverityLevel = 'CRÍTICO' | 'CRITICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO';

export interface PointsRange {
  min: number;
  max: number;
  default: number;
}

export const SEVERITY_POINTS_RANGES: Record<string, PointsRange> = {
  'CRÍTICO': { min: 16, max: 20, default: 18 },
  'CRITICO': { min: 16, max: 20, default: 18 },
  'IMPORTANTE': { min: 8, max: 12, default: 10 },
  'MODERADO': { min: 5, max: 8, default: 6 },
  'DISCRETO': { min: 1, max: 3, default: 2 },
};

export function getPointsRangeForLevel(level: string): PointsRange {
  const normalizedLevel = level.toUpperCase();
  return SEVERITY_POINTS_RANGES[normalizedLevel] ?? { min: 1, max: 20, default: 10 };
}

export function isPointsInRange(level: string, points: number): boolean {
  const range = getPointsRangeForLevel(level);
  return points >= range.min && points <= range.max;
}

export function clampPointsToRange(level: string, points: number): number {
  const range = getPointsRangeForLevel(level);
  return Math.max(range.min, Math.min(range.max, points));
}

export function validateAndAdjustPoints(level: string, points: number): { 
  adjustedPoints: number; 
  wasAdjusted: boolean;
  range: PointsRange;
} {
  const range = getPointsRangeForLevel(level);
  const adjustedPoints = clampPointsToRange(level, points);
  return {
    adjustedPoints,
    wasAdjusted: adjustedPoints !== points,
    range
  };
}
