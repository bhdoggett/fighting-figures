import { emptyIntent, type FighterState, type Intent } from './fighter';
import { PERSONALITIES } from './data/personalities';
import { FAMILIES, TIERS } from './data/weapons';
import { COSMETICS } from './data/cosmetics';
import { maxTierForLevel } from './progression';
import type { Loadout, PersonalityId, WeaponFamily } from './types';

export interface BotBrain {
  think: number;
  strafe: number;
  lastFoeAction: string;
  reactIn: number;
  wasStunned: boolean;
  plan: 'approach' | 'attack' | 'back' | 'circle';
}

export function createBotBrain(): BotBrain {
  return { think: 0.5, strafe: 1, lastFoeAction: 'idle', reactIn: -1, wasStunned: false, plan: 'approach' };
}

export function difficultyForLevel(level: number): number {
  return Math.min(1, 0.15 + level * 0.03);
}

const THREATS = new Set(['power', 'super', 'dash']);

/** Decide what the computer fighter does this tick. Mutates the brain. */
export function botIntent(brain: BotBrain, self: FighterState, foe: FighterState, difficulty: number, rng: () => number, dt: number): Intent {
  const it = emptyIntent();
  if (self.action === 'ko') return it;

  const dx = foe.pos.x - self.pos.x;
  const dz = foe.pos.z - self.pos.z;
  const dist = Math.hypot(dx, dz) || 0.001;
  const toFoe = Math.atan2(dx, dz);
  const aimError = (1 - difficulty) * 0.35 * (rng() - 0.5);
  it.facing = toFoe + aimError;

  // React to incoming big attacks after a human-ish delay.
  if (foe.action !== brain.lastFoeAction) {
    if (THREATS.has(foe.action) && dist < 6) brain.reactIn = 0.55 - 0.4 * difficulty;
    brain.lastFoeAction = foe.action;
  }
  if (brain.reactIn >= 0) {
    brain.reactIn -= dt;
    if (brain.reactIn < 0 && THREATS.has(foe.action) && rng() < 0.1 + 0.6 * difficulty) {
      it.dodge = rng() < 0.5 ? 'left' : 'right';
      return it;
    }
  }

  // Fight back right after getting bonked: dodge out or swing back.
  const stunned = self.action === 'hitstun';
  if (brain.wasStunned && !stunned) {
    brain.wasStunned = false;
    if (rng() < 0.25 + 0.6 * difficulty) {
      if (rng() < 0.45) it.dodge = 'back';
      else if (self.cooldowns.power <= 0 && rng() < 0.4) it.power = true;
      else it.quick = true;
      return it;
    }
  }
  brain.wasStunned = stunned;

  if (foe.action === 'ko') {
    // Victory lap: wander back to the middle.
    const cx = -self.pos.x;
    const cz = -self.pos.z;
    const len = Math.hypot(cx, cz);
    if (len > 1) it.move = { x: (cx / len) * 0.5, z: (cz / len) * 0.5 };
    it.facing = null;
    return it;
  }

  const reach = self.weapon.reach + 0.3;
  brain.think -= dt;
  if (brain.think <= 0) {
    brain.think = 0.65 - 0.45 * difficulty + rng() * 0.25;
    if (rng() < 0.3) brain.strafe = -brain.strafe;

    const aggression = 0.2 + 0.65 * difficulty;
    if (self.superCharge >= 1 && dist < self.weapon.reach + 2.5 && rng() < 0.4 + 0.5 * difficulty) {
      it.super = true;
    } else if (dist > 3 && dist < 6.5 && self.cooldowns.dash <= 0 && rng() < 0.15 + 0.3 * difficulty) {
      it.dash = true;
    } else if (dist <= reach + 0.4 && rng() < aggression) {
      if (self.cooldowns.power <= 0 && rng() < 0.35) it.power = true;
      else it.quick = true;
    }
    brain.plan = dist > reach ? 'approach' : rng() < 0.25 * (1 - difficulty) ? 'back' : 'circle';
  }

  // Movement
  const nx = dx / dist;
  const nz = dz / dist;
  const side = { x: -nz * brain.strafe, z: nx * brain.strafe };
  if (dist > reach) {
    it.move = { x: nx + side.x * 0.3, z: nz + side.z * 0.3 };
  } else if (brain.plan === 'back') {
    it.move = { x: -nx * 0.6, z: -nz * 0.6 };
  } else {
    it.move = { x: side.x * 0.5, z: side.z * 0.5 };
  }
  // Easy bots dawdle.
  const speedMul = 0.55 + 0.45 * difficulty;
  it.move = { x: it.move.x * speedMul, z: it.move.z * speedMul };
  return it;
}

export function botLoadoutForLevel(level: number, rng: () => number): Loadout {
  const personalities = Object.keys(PERSONALITIES) as PersonalityId[];
  const families = Object.keys(FAMILIES) as WeaponFamily[];
  const tier = TIERS[maxTierForLevel(level)];
  const skins = COSMETICS.filter((c) => c.slot === 'skin');
  const hats = COSMETICS.filter((c) => c.slot === 'hat');
  const capes = COSMETICS.filter((c) => c.slot === 'cape');
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length) % a.length];
  return {
    personality: pick(personalities),
    weapon: `${pick(families)}-${tier}`,
    skin: pick(skins).id,
    hat: level >= 5 ? pick(hats).id : undefined,
    cape: level >= 10 ? pick(capes).id : undefined,
  };
}
