import { describe, expect, it } from 'vitest';
import { createMatch, stepMatch, FIXED_DT } from './match';
import { botIntent, createBotBrain, difficultyForLevel } from './ai';
import { emptyIntent, type Intent } from './fighter';
import type { Loadout, PersonalityId } from './types';

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(p1: PersonalityId, p2: PersonalityId, d1: number, d2: number, seed: number, duration = 300) {
  const rng = mulberry(seed);
  const l1: Loadout = { personality: p1, weapon: 'sword-wood', skin: 'skin-blue' };
  const l2: Loadout = { personality: p2, weapon: 'sword-wood', skin: 'skin-red' };
  const m = createMatch(l1, l2, duration, rng);
  const b1 = createBotBrain();
  const b2 = createBotBrain();
  while (!m.over) {
    const [f1, f2] = m.fighters;
    stepMatch(m, [botIntent(b1, f1, f2, d1, rng, FIXED_DT), botIntent(b2, f2, f1, d2, rng, FIXED_DT)], FIXED_DT);
  }
  return m.kos;
}

describe('balance', () => {
  it('a so-so player beats the level-1 bot most of the time', () => {
    let wins = 0;
    let totalKos = 0;
    for (let s = 1; s <= 6; s++) {
      const [a, b] = simulate('hothead', 'trickster', 0.45, difficultyForLevel(1), s);
      if (a > b) wins++;
      totalKos += a + b;
    }
    expect(wins).toBeGreaterThanOrEqual(4);
    // A 5-minute match should have plenty of KOs to keep it exciting.
    expect(totalKos / 6).toBeGreaterThanOrEqual(6);
  });

  it('no starter personality dominates the others in mirror-skill fights', () => {
    const ids: PersonalityId[] = ['hothead', 'ninja', 'tank', 'trickster'];
    const score: Record<string, number> = { hothead: 0, ninja: 0, tank: 0, trickster: 0 };
    let seed = 100;
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        const [ka, kb] = simulate(a, b, 0.7, 0.7, seed++, 180);
        score[a] += ka - kb;
        score[b] += kb - ka;
      }
    }
    const vals = Object.values(score);
    expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(40);
  });

  it('mashing quick attack does not beat a level-15 bot', () => {
    let masherKos = 0;
    let botKos = 0;
    for (const per of ['hothead', 'tank', 'ninja', 'trickster'] as PersonalityId[]) {
      const rng = mulberry(7);
      const l1: Loadout = { personality: per, weapon: 'sword-wood', skin: 'skin-blue' };
      const l2: Loadout = { personality: 'trickster', weapon: 'sword-gold', skin: 'skin-red' };
      const m = createMatch(l1, l2, 180, rng);
      const brain = createBotBrain();
      let tick = 0;
      while (!m.over) {
        const [f1, f2] = m.fighters;
        const dx = f2.pos.x - f1.pos.x;
        const dz = f2.pos.z - f1.pos.z;
        const len = Math.hypot(dx, dz) || 1;
        const masher: Intent = { ...emptyIntent(), move: { x: dx / len, z: dz / len }, facing: Math.atan2(dx, dz), quick: tick % 12 === 0 };
        stepMatch(m, [masher, botIntent(brain, f2, f1, difficultyForLevel(15), rng, FIXED_DT)], FIXED_DT);
        tick++;
      }
      masherKos += m.kos[0];
      botKos += m.kos[1];
    }
    expect(masherKos).toBeLessThanOrEqual(botKos * 1.2);
  });
});
