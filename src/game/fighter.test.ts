import { describe, expect, it } from 'vitest';
import { createFighter, emptyIntent, resolveAttacks, separate, stepFighter, type FighterState, type Intent } from './fighter';
import { getPersonality } from './data/personalities';
import { getWeapon } from './data/weapons';
import type { PersonalityId } from './types';

const DT = 1 / 60;

function make(id: 'p1' | 'p2', per: PersonalityId, x = 0, z = 0, weapon = 'sword-wood') {
  return createFighter(id, getPersonality(per), getWeapon(weapon), { x, z });
}

/** p1 at origin facing +z, p2 at 1.5m in front facing -z */
function pair(a: PersonalityId = 'hothead', b: PersonalityId = 'tank') {
  const f1 = make('p1', a, 0, 0);
  const f2 = make('p2', b, 0, 1.5);
  f1.facing = 0;
  f2.facing = Math.PI;
  f1.invulnT = 0;
  f2.invulnT = 0;
  return [f1, f2] as const;
}

function run(f1: FighterState, f2: FighterState, i1: Partial<Intent>, seconds: number, i2: Partial<Intent> = {}) {
  const events = [];
  let first = true;
  for (let t = 0; t < seconds; t += DT) {
    stepFighter(f1, first ? { ...emptyIntent(), ...i1 } : { ...emptyIntent(), duck: i1.duck ?? false }, DT);
    stepFighter(f2, first ? { ...emptyIntent(), ...i2 } : { ...emptyIntent(), duck: i2.duck ?? false }, DT);
    separate(f1, f2);
    events.push(...resolveAttacks(f1, f2));
    first = false;
  }
  return events;
}

describe('fighter', () => {
  it('max hp depends on health stat', () => {
    expect(make('p1', 'tank').maxHp).toBe(60 + 12 * 6);
    expect(make('p1', 'hothead').maxHp).toBe(60 + 12 * 2);
  });

  it('ignores super when not charged and keeps charge', () => {
    const [f1, f2] = pair();
    f1.superCharge = 0.5;
    run(f1, f2, { super: true }, 1 / 60);
    expect(f1.action).not.toBe('super');
    expect(f1.superCharge).toBeGreaterThan(0.5);
  });

  it('charges super over the personality charge time', () => {
    const f = make('p1', 'ninja');
    for (let t = 0; t < 25; t += DT) stepFighter(f, emptyIntent(), DT);
    expect(f.superCharge).toBeCloseTo(1, 1);
  });

  it('instant-KO super sets hp to 0', () => {
    const [f1, f2] = pair('hothead', 'tank');
    f1.superCharge = 1;
    const events = run(f1, f2, { super: true }, 1.2);
    expect(f2.hp).toBe(0);
    expect(events.some((e) => e.kind === 'super' && e.ko)).toBe(true);
    expect(f1.superCharge).toBeLessThan(0.1);
  });

  it('ninja super deals 40% of max hp', () => {
    const [f1, f2] = pair('ninja', 'tank');
    f1.superCharge = 1;
    run(f1, f2, { super: true }, 1.2);
    expect(f2.hp).toBeCloseTo(f2.maxHp * 0.6, 5);
  });

  it('a missed super still uses up the charge', () => {
    const f1 = make('p1', 'hothead', 0, 0);
    const f2 = make('p2', 'tank', 0, 20);
    f1.invulnT = f2.invulnT = 0;
    f1.superCharge = 1;
    run(f1, f2, { super: true }, 1.2);
    expect(f2.hp).toBe(f2.maxHp);
    expect(f1.superCharge).toBeLessThan(0.1);
  });

  it('dodging target takes no damage', () => {
    const [f1, f2] = pair();
    run(f1, f2, { power: true }, 1, { dodge: 'back' });
    expect(f2.hp).toBe(f2.maxHp);
  });

  it('ducking dodges a quick attack but not a power attack', () => {
    let [f1, f2] = pair();
    run(f1, f2, { quick: true }, 0.6, { duck: true });
    expect(f2.hp).toBe(f2.maxHp);
    [f1, f2] = pair();
    run(f1, f2, { power: true }, 1, { duck: true });
    expect(f2.hp).toBeLessThan(f2.maxHp);
  });

  it('quick attack lands once per swing', () => {
    const [f1, f2] = pair();
    const events = run(f1, f2, { quick: true }, 0.6);
    expect(events.filter((e) => e.attacker === 'p1')).toHaveLength(1);
  });

  it('power attack has a cooldown', () => {
    const f = make('p1', 'hothead');
    stepFighter(f, { ...emptyIntent(), power: true }, DT);
    expect(f.action).toBe('power');
    for (let t = 0; t < 1.2; t += DT) stepFighter(f, emptyIntent(), DT);
    stepFighter(f, { ...emptyIntent(), power: true }, DT);
    expect(f.action).not.toBe('power');
  });

  it('hammer hits harder than daggers', () => {
    const h1 = make('p1', 'trickster', 0, 0, 'hammer-wood');
    const h2 = make('p2', 'tank', 0, 1.5);
    const d1 = make('p1', 'trickster', 0, 0, 'daggers-wood');
    const d2 = make('p2', 'tank', 0, 1.2);
    for (const f of [h1, h2, d1, d2]) f.invulnT = 0;
    h2.facing = d2.facing = Math.PI;
    run(h1, h2, { quick: true }, 1);
    run(d1, d2, { quick: true }, 1);
    expect(h2.maxHp - h2.hp).toBeGreaterThan(d2.maxHp - d2.hp);
  });

  it('dash attacks hit a ducking target', () => {
    const [f1, f2] = pair();
    f2.pos = { x: 0, z: 3 };
    run(f1, f2, { dash: true }, 0.5, { duck: true });
    expect(f2.hp).toBeLessThan(f2.maxHp);
  });

  it('cannot attack while ducking', () => {
    const f = make('p1', 'hothead');
    stepFighter(f, { ...emptyIntent(), duck: true }, DT);
    stepFighter(f, { ...emptyIntent(), duck: true, quick: true }, DT);
    expect(f.action).not.toBe('quick');
    stepFighter(f, { ...emptyIntent(), duck: true, power: true }, DT);
    expect(f.action).not.toBe('power');
    stepFighter(f, { ...emptyIntent(), duck: true, dash: true }, DT);
    expect(f.action).not.toBe('dash');
  });

  it('takes a moment to stand up before attacking', () => {
    const f = make('p1', 'hothead');
    stepFighter(f, { ...emptyIntent(), duck: true }, DT);
    stepFighter(f, { ...emptyIntent(), quick: true }, DT);
    expect(f.action).not.toBe('quick');
    for (let t = 0; t < 0.2; t += DT) stepFighter(f, emptyIntent(), DT);
    stepFighter(f, { ...emptyIntent(), quick: true }, DT);
    expect(f.action).toBe('quick');
  });

  it('can still dodge out of a duck', () => {
    const f = make('p1', 'hothead');
    stepFighter(f, { ...emptyIntent(), duck: true }, DT);
    stepFighter(f, { ...emptyIntent(), duck: true, dodge: 'left' }, DT);
    expect(f.action).toBe('dodge');
  });
});
