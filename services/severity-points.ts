export type SeverityLevel = 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO';

export interface PointsRange {
  min: number;
  max: number;
  default: number;
}

export const SEVERITY_POINTS_RANGES: Record<SeverityLevel, PointsRange> = {
  'CRÍTICO': { min: 16, max: 20, default: 18 },
  'IMPORTANTE': { min: 8, max: 12, default: 10 },
  'MODERADO': { min: 5, max: 8, default: 6 },
  'DISCRETO': { min: 1, max: 3, default: 2 },
};

export function getDefaultPointsForLevel(level: SeverityLevel): number {
  return SEVERITY_POINTS_RANGES[level]?.default ?? 10;
}

export function getPointsRangeForLevel(level: SeverityLevel): PointsRange {
  return SEVERITY_POINTS_RANGES[level] ?? { min: 1, max: 20, default: 10 };
}

export function isPointsInRange(level: SeverityLevel, points: number): boolean {
  const range = SEVERITY_POINTS_RANGES[level];
  if (!range) return true;
  return points >= range.min && points <= range.max;
}

export function clampPointsToRange(level: SeverityLevel, points: number): number {
  const range = SEVERITY_POINTS_RANGES[level];
  if (!range) return points;
  return Math.max(range.min, Math.min(range.max, points));
}

export function adjustPointsForLevelChange(currentPoints: number, newLevel: SeverityLevel): number {
  const range = SEVERITY_POINTS_RANGES[newLevel];
  if (!range) return currentPoints;
  
  if (currentPoints >= range.min && currentPoints <= range.max) {
    return currentPoints;
  }
  
  return range.default;
}
