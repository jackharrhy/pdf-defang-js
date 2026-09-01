export type Level = 'strict' | 'balanced';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

export type SanitizeOptions = {
  level?: Level;
  returnReport?: boolean;
};

export function parseLevel(level: string | undefined = 'strict'): Level {
  const value = level ?? 'strict';
  if (value === 'strict' || value === 'balanced') {
    return value;
  }
  throw new Error(`level must be 'strict' or 'balanced', got ${JSON.stringify(level)}`);
}
