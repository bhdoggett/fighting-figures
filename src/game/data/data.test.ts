import { describe, expect, it } from 'vitest';
import { PERSONALITIES, STARTER_PERSONALITIES } from './personalities';
import { WEAPONS, getWeapon } from './weapons';
import { rankForLevel } from './ranks';
import { COSMETICS } from './cosmetics';

const BANNED = /kill|die|dead|death/i;

describe('personalities', () => {
  it('spread exactly 10 points', () => {
    for (const p of Object.values(PERSONALITIES)) {
      expect(p.speed + p.power + p.health, p.id).toBe(10);
    }
  });

  it('have the spec super charge times and damage', () => {
    expect(PERSONALITIES.tank.superChargeSec).toBe(90);
    expect(PERSONALITIES.tank.superDamage).toBe('ko');
    expect(PERSONALITIES.hothead.superChargeSec).toBe(60);
    expect(PERSONALITIES.hothead.superDamage).toBe('ko');
    expect(PERSONALITIES.trickster.superChargeSec).toBe(40);
    expect(PERSONALITIES.trickster.superDamage).toBe(0.6);
    expect(PERSONALITIES.ninja.superChargeSec).toBe(25);
    expect(PERSONALITIES.ninja.superDamage).toBe(0.4);
  });

  it('starters are the four presets', () => {
    expect([...STARTER_PERSONALITIES].sort()).toEqual(['hothead', 'ninja', 'tank', 'trickster']);
  });

  it('never use banned words in lines or names', () => {
    for (const p of Object.values(PERSONALITIES)) {
      const all = [p.name, p.powerMoveName, ...p.lines.taunt, ...p.lines.hit, ...p.lines.ko, ...p.lines.win];
      for (const line of all) expect(line, line).not.toMatch(BANNED);
    }
  });
});

describe('weapons', () => {
  it('have trade-offs', () => {
    const sword = getWeapon('sword-wood');
    const hammer = getWeapon('hammer-wood');
    const daggers = getWeapon('daggers-wood');
    const spear = getWeapon('spear-wood');
    expect(sword.damageMul).toBe(1);
    expect(hammer.damageMul).toBeGreaterThan(1);
    expect(hammer.swingTimeMul).toBeGreaterThan(1);
    expect(daggers.damageMul).toBeLessThan(1);
    expect(daggers.swingTimeMul).toBeLessThan(1);
    expect(spear.reach).toBeGreaterThan(Math.max(sword.reach, hammer.reach, daggers.reach));
  });

  it('higher tiers are modestly stronger', () => {
    const wood = getWeapon('sword-wood');
    const diamond = getWeapon('sword-diamond');
    expect(diamond.damageMul).toBeGreaterThan(wood.damageMul);
    expect(diamond.damageMul).toBeLessThanOrEqual(1.3);
  });

  it('names avoid banned words', () => {
    for (const w of Object.values(WEAPONS)) expect(w.name).not.toMatch(BANNED);
  });
});

describe('ranks', () => {
  it('map levels to ranks', () => {
    expect([1, 4, 5, 24, 25, 30].map((l) => rankForLevel(l).name)).toEqual([
      'Wood', 'Wood', 'Stone', 'Diamond', 'Obsidian', 'Obsidian',
    ]);
  });
});

describe('cosmetics', () => {
  it('have unique ids and a starter skin', () => {
    const ids = COSMETICS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('skin-blue');
  });
});
