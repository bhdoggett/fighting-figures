import { describe, expect, it } from 'vitest';
import { createFighter, emptyIntent, resolveAttacks, separate, stepFighter, type FighterState, type Intent } from './fighter';
import { createMatch, stepMatch, FIXED_DT } from './match';
import { getPersonality } from './data/personalities';
import { getWeapon } from './data/weapons';
import { getArmor } from './data/shop';
import type { Loadout } from './types';

const DT = 1 / 60;

function duel(weapon: string) {
  const a = createFighter('p1', getPersonality('trickster'), getWeapon(weapon), { x: 0, z: 0 });
  const b = createFighter('p2', getPersonality('tank'), getWeapon('sword-wood'), { x: 0, z: 1.4 });
  a.invulnT = b.invulnT = 0;
  a.facing = 0;
  b.facing = Math.PI;
  return [a, b] as const;
}

function swing(a: FighterState, b: FighterState, intent: Partial<Intent>, seconds: number) {
  let first = true;
  for (let t = 0; t < seconds; t += DT) {
    stepFighter(a, first ? { ...emptyIntent(), ...intent } : emptyIntent(), DT);
    stepFighter(b, emptyIntent(), DT);
    separate(a, b);
    resolveAttacks(a, b);
    first = false;
  }
}

const idle = () => [emptyIntent(), emptyIntent()] as [Intent, Intent];

describe('armor', () => {
  it('adds health and slows you down', () => {
    const plain = createFighter('p1', getPersonality('ninja'), getWeapon('sword-wood'), { x: 0, z: 0 });
    const armored = createFighter('p1', getPersonality('ninja'), getWeapon('sword-wood'), { x: 0, z: 0 }, getArmor('armor-plate'));
    expect(armored.maxHp).toBe(plain.maxHp + 45);
    expect(armored.hp).toBe(armored.maxHp);
    expect(armored.moveSpeed).toBeCloseTo(plain.moveSpeed * 0.85);
  });

  it('a match uses the loadout armor', () => {
    const l1: Loadout = { personality: 'ninja', weapon: 'sword-wood', skin: 'skin-blue', armor: 'armor-chain' };
    const l2: Loadout = { personality: 'ninja', weapon: 'sword-wood', skin: 'skin-red' };
    const m = createMatch(l1, l2, 60);
    expect(m.fighters[0].maxHp).toBe(m.fighters[1].maxHp + 25);
  });
});

describe('shop weapon effects', () => {
  it('flaming sword sets the target on fire, which keeps hurting', () => {
    const [a, b] = duel('shop-flamesword');
    swing(a, b, { quick: true }, 0.5);
    expect(b.status.burn).toBeGreaterThan(0);
    const before = b.hp;
    for (let t = 0; t < 1; t += DT) stepFighter(b, emptyIntent(), DT);
    expect(b.hp).toBe(before);
  });

  it('burn damage is applied by the match and a burn KO counts for the attacker', () => {
    const l1: Loadout = { personality: 'trickster', weapon: 'shop-flamesword', skin: 'skin-blue' };
    const l2: Loadout = { personality: 'tank', weapon: 'sword-wood', skin: 'skin-red' };
    const m = createMatch(l1, l2, 60);
    const target = m.fighters[1];
    target.invulnT = 0;
    target.hp = 2;
    target.status = { burn: 3, poison: 0, slow: 0, from: 'p1' };
    for (let i = 0; i < 90; i++) stepMatch(m, idle(), FIXED_DT);
    expect(m.kos[0]).toBe(1);
  });

  it('frost hammer slows the target', () => {
    const [a, b] = duel('shop-frosthammer');
    swing(a, b, { quick: true }, 0.8);
    expect(b.status.slow).toBeGreaterThan(0);
  });

  it('thunder spear zaps for extra damage on every third hit', () => {
    const [a, b] = duel('shop-thunderspear');
    const hits: number[] = [];
    for (let i = 0; i < 3; i++) {
      const before = b.hp;
      b.invulnT = 0;
      b.comboHits = 0;
      b.pos = { x: 0, z: 1.4 };
      a.cooldowns.quick = 0;
      swing(a, b, { quick: true }, 0.7);
      hits.push(before - b.hp);
    }
    expect(hits[2]).toBeGreaterThan(hits[0] + 5);
  });

  it('poison darts are thrown: they hit from far away and poison', () => {
    const l1: Loadout = { personality: 'trickster', weapon: 'shop-darts', skin: 'skin-blue' };
    const l2: Loadout = { personality: 'tank', weapon: 'sword-wood', skin: 'skin-red' };
    const m = createMatch(l1, l2, 60);
    const [a, b] = m.fighters;
    a.invulnT = b.invulnT = 0;
    a.pos = { x: 0, z: 0 };
    b.pos = { x: 0, z: 6 };
    const intents = idle();
    intents[0] = { ...emptyIntent(), quick: true, facing: 0 };
    stepMatch(m, intents, FIXED_DT);
    for (let i = 0; i < 60; i++) stepMatch(m, idle(), FIXED_DT);
    expect(b.hp).toBeLessThan(b.maxHp);
    expect(b.status.poison).toBeGreaterThan(0);
  });

  it('ducking makes darts fly over you', () => {
    const l1: Loadout = { personality: 'trickster', weapon: 'shop-darts', skin: 'skin-blue' };
    const l2: Loadout = { personality: 'tank', weapon: 'sword-wood', skin: 'skin-red' };
    const m = createMatch(l1, l2, 60);
    const [a, b] = m.fighters;
    a.invulnT = b.invulnT = 0;
    a.pos = { x: 0, z: 0 };
    b.pos = { x: 0, z: 6 };
    const duck = { ...emptyIntent(), duck: true };
    stepMatch(m, [{ ...emptyIntent(), quick: true, facing: 0 }, duck], FIXED_DT);
    for (let i = 0; i < 60; i++) stepMatch(m, [emptyIntent(), duck], FIXED_DT);
    expect(b.hp).toBe(b.maxHp);
  });
});
