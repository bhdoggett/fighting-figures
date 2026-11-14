import { describe, expect, it } from 'vitest';
import { createMatch, runFrame, stepMatch, FIXED_DT, RESPAWN_SEC } from './match';
import { emptyIntent } from './fighter';
import type { Loadout } from './types';

const L1: Loadout = { personality: 'hothead', weapon: 'sword-wood', skin: 'skin-blue' };
const L2: Loadout = { personality: 'tank', weapon: 'sword-wood', skin: 'skin-red' };
const idle = () => [emptyIntent(), emptyIntent()] as [ReturnType<typeof emptyIntent>, ReturnType<typeof emptyIntent>];

describe('match', () => {
  it('counts down and ends', () => {
    const m = createMatch(L1, L2, 1);
    for (let i = 0; i < 59; i++) stepMatch(m, idle(), FIXED_DT);
    expect(m.over).toBe(false);
    expect(m.time).toBeCloseTo(1 - 59 * FIXED_DT, 5);
    stepMatch(m, idle(), FIXED_DT);
    stepMatch(m, idle(), FIXED_DT);
    expect(m.over).toBe(true);
    expect(m.time).toBe(0);
  });

  it('credits a KO and respawns the target with full health', () => {
    const m2 = createMatch(L1, L2, 300);
    const [a, b] = m2.fighters;
    a.invulnT = b.invulnT = 0;
    b.pos = { x: 0, z: 1.5 };
    a.pos = { x: 0, z: 0 };
    a.facing = 0;
    a.superCharge = 1;
    const intents = idle();
    intents[0].super = true;
    stepMatch(m2, intents, FIXED_DT);
    for (let i = 0; i < 80; i++) stepMatch(m2, idle(), FIXED_DT);
    expect(m2.kos[0]).toBe(1);
    expect(m2.supersLanded[0]).toBe(1);
    expect(m2.fighters[1].action).toBe('ko');
    expect(m2.events.some((e) => e.type === 'ko')).toBe(true);
    for (let i = 0; i < RESPAWN_SEC * 60 + 2; i++) stepMatch(m2, idle(), FIXED_DT);
    expect(m2.fighters[1].action).not.toBe('ko');
    expect(m2.fighters[1].hp).toBe(m2.fighters[1].maxHp);
  });

  it('credits both fighters when they KO each other on the same tick', () => {
    const m = createMatch(L1, L2, 300);
    const [a, b] = m.fighters;
    a.invulnT = b.invulnT = 0;
    a.pos = { x: 0, z: 0 };
    b.pos = { x: 0, z: 1.5 };
    a.facing = 0;
    b.facing = Math.PI;
    a.superCharge = 1;
    b.superCharge = 1;
    const intents = idle();
    intents[0].super = true;
    intents[1].super = true;
    for (let i = 0; i < 80; i++) stepMatch(m, i === 0 ? intents : idle(), FIXED_DT);
    expect(m.kos).toEqual([1, 1]);
  });

  it('clamps a huge frame so the clock does not jump', () => {
    const m = createMatch(L1, L2, 300);
    runFrame(m, idle, 5);
    expect(m.time).toBeGreaterThan(299.85);
  });

  it('keeps fighters inside the arena', () => {
    const m = createMatch(L1, L2, 300);
    const intents = idle();
    intents[0].move = { x: 1, z: 0 };
    for (let i = 0; i < 600; i++) stepMatch(m, intents, FIXED_DT);
    expect(m.fighters[0].pos.x).toBeLessThanOrEqual(12);
  });

  it('winner is decided by KOs', async () => {
    const { winnerOf } = await import('./match');
    const m = createMatch(L1, L2, 1);
    m.kos = [2, 1];
    expect(winnerOf(m)).toBe(0);
    m.kos = [1, 1];
    expect(winnerOf(m)).toBe('draw');
  });
});
