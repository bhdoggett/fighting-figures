import type { Rank } from '../types';

export const RANKS: Rank[] = [
  { name: 'Wood', minLevel: 1, color: '#a0703c' },
  { name: 'Stone', minLevel: 5, color: '#9a9a9a' },
  { name: 'Iron', minLevel: 10, color: '#d8d8e0' },
  { name: 'Gold', minLevel: 15, color: '#ffc93c' },
  { name: 'Diamond', minLevel: 20, color: '#5ce1e6' },
  { name: 'Obsidian', minLevel: 25, color: '#4b2a6b' },
];

export const MAX_LEVEL = 30;

export function rankForLevel(level: number): Rank {
  let rank = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) rank = r;
  return rank;
}

export function isRankUpLevel(level: number): boolean {
  return RANKS.some((r) => r.minLevel === level && level > 1);
}
