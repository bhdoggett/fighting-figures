import { describe, expect, it } from 'vitest';
import { botIntent, botLoadoutForLevel, createBotBrain, difficultyForLevel } from './ai';
import { createFighter } from './fighter';
import { getPersonality } from './data/personalities';
import { getWeapon } from './data/weapons';

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function countAttacks(difficulty: number) {
  const self = createFighter('p2', getPersonality('trickster'), getWeapon('sword-wood'), { x: 0, z: 1.5 });
  const foe = createFighter('p1', getPersonality('trickster'), getWeapon('sword-wood'), { x: 0, z: 0 });
  const brain = createBotBrain();
  const rng = mulberry(42);
  let attacks = 0;
  for (let i = 0; i < 600; i++) {
    const it = botIntent(brain, self, foe, difficulty, rng, 1 / 60);
    if (it.quick || it.power || it.dash) attacks++;
  }
  return attacks;
}

describe('ai', () => {
  it('difficulty ramps with level and caps at 1', () => {
    expect(difficultyForLevel(1)).toBeCloseTo(0.18);
    expect(difficultyForLevel(10)).toBeGreaterThan(difficultyForLevel(1));
    expect(difficultyForLevel(30)).toBe(1);
  });

  it('easy bot attacks less often than hard bot', () => {
    expect(countAttacks(0.15)).toBeLessThan(countAttacks(1));
  });

  it('bot walks toward a far opponent', () => {
    const self = createFighter('p2', getPersonality('ninja'), getWeapon('sword-wood'), { x: 0, z: 10 });
    const foe = createFighter('p1', getPersonality('ninja'), getWeapon('sword-wood'), { x: 0, z: 0 });
    const brain = createBotBrain();
    const rng = mulberry(1);
    let it = botIntent(brain, self, foe, 0.5, rng, 1 / 60);
    for (let i = 0; i < 60; i++) it = botIntent(brain, self, foe, 0.5, rng, 1 / 60);
    expect(it.move.z).toBeLessThan(0);
  });

  it('bot loadout uses better gear at higher levels', () => {
    const low = botLoadoutForLevel(1, mulberry(3));
    const high = botLoadoutForLevel(25, mulberry(3));
    expect(low.weapon).toMatch(/-wood$/);
    expect(high.weapon).not.toMatch(/-wood$/);
  });

  it('bot wears armor from level 8 and sometimes brings a shop weapon later', () => {
    expect(botLoadoutForLevel(5, mulberry(4)).armor).toBeUndefined();
    expect(botLoadoutForLevel(8, mulberry(4)).armor).toBe('armor-leather');
    expect(botLoadoutForLevel(22, mulberry(4)).armor).toBe('armor-plate');
    let shop = 0;
    for (let i = 0; i < 40; i++) if (botLoadoutForLevel(20, mulberry(i)).weapon.startsWith('shop-')) shop++;
    expect(shop).toBeGreaterThan(0);
    expect(shop).toBeLessThan(40);
    for (let i = 0; i < 20; i++) expect(botLoadoutForLevel(10, mulberry(i)).weapon.startsWith('shop-')).toBe(false);
  });
});
