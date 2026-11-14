import type { Personality, Weapon } from './types';

export interface Vec2 {
  x: number;
  z: number;
}

export type Action = 'idle' | 'walk' | 'quick' | 'power' | 'dash' | 'dodge' | 'super' | 'hitstun' | 'ko';
export type DodgeDir = 'left' | 'right' | 'back' | 'forward';

export interface Intent {
  /** World-space move direction, length 0..1 */
  move: Vec2;
  /** Desired facing in radians (0 = +z), or null to keep current/face movement */
  facing: number | null;
  quick: boolean;
  power: boolean;
  dash: boolean;
  dodge: DodgeDir | null;
  duck: boolean;
  super: boolean;
}

export interface FighterState {
  id: 'p1' | 'p2';
  pos: Vec2;
  facing: number;
  hp: number;
  maxHp: number;
  action: Action;
  actionT: number;
  actionDur: number;
  /** Hits already landed by the current attack */
  hitsLanded: number;
  /** World-space velocity applied during dash / dodge / knockback */
  push: Vec2;
  cooldowns: { power: number; dash: number; dodge: number; quick: number };
  superCharge: number;
  ducking: boolean;
  invulnT: number;
  koTimer: number;
  /** Consecutive hits taken without a break; the third bounces you free. */
  comboHits: number;
  comboT: number;
  moveSpeed: number;
  personality: Personality;
  weapon: Weapon;
}

export interface HitEvent {
  attacker: 'p1' | 'p2';
  target: 'p1' | 'p2';
  damage: number;
  kind: Action;
  ko: boolean;
  at: Vec2;
}

export const TUNING = {
  quickDur: 0.35,
  quickDamage: 6,
  powerDur: 0.7,
  powerDamage: 16,
  powerCooldown: 2.5,
  dashDur: 0.25,
  dashDistance: 6,
  dashDamage: 9,
  dashCooldown: 1.2,
  dodgeDur: 0.3,
  dodgeDistance: 3.5,
  dodgeCooldown: 0.8,
  superDur: 1.0,
  hitstunDur: 0.35,
  /** Quick hits only make you flinch briefly, so mashing can't lock someone down. */
  quickStunDur: 0.15,
  quickRecovery: 0.2,
  comboWindow: 1.2,
  comboBreakHits: 3,
  comboBreakInvuln: 0.7,
  comboBreakKnockback: 11,
  knockback: 5,
  respawnInvuln: 1.5,
  duckSpeedMul: 0.35,
};

export function emptyIntent(): Intent {
  return { move: { x: 0, z: 0 }, facing: null, quick: false, power: false, dash: false, dodge: null, duck: false, super: false };
}

export function createFighter(id: 'p1' | 'p2', personality: Personality, weapon: Weapon, spawn: Vec2): FighterState {
  const maxHp = 60 + 12 * personality.health;
  return {
    id,
    pos: { ...spawn },
    facing: id === 'p1' ? 0 : Math.PI,
    hp: maxHp,
    maxHp,
    action: 'idle',
    actionT: 0,
    actionDur: 0,
    hitsLanded: 0,
    push: { x: 0, z: 0 },
    cooldowns: { power: 0, dash: 0, dodge: 0, quick: 0 },
    superCharge: 0,
    ducking: false,
    invulnT: TUNING.respawnInvuln,
    koTimer: 0,
    comboHits: 0,
    comboT: 0,
    moveSpeed: 3 + 0.6 * personality.speed,
    personality,
    weapon,
  };
}

function forward(facing: number): Vec2 {
  return { x: Math.sin(facing), z: Math.cos(facing) };
}

function isBusy(f: FighterState): boolean {
  return f.action !== 'idle' && f.action !== 'walk';
}

function startAction(f: FighterState, action: Action, dur: number) {
  f.action = action;
  f.actionT = 0;
  f.actionDur = dur;
  f.hitsLanded = 0;
  f.push = { x: 0, z: 0 };
}

/** Advance one fighter by dt. Mutates and returns the fighter. */
export function stepFighter(f: FighterState, intent: Intent, dt: number): FighterState {
  f.cooldowns.power = Math.max(0, f.cooldowns.power - dt);
  f.cooldowns.dash = Math.max(0, f.cooldowns.dash - dt);
  f.cooldowns.dodge = Math.max(0, f.cooldowns.dodge - dt);
  f.cooldowns.quick = Math.max(0, f.cooldowns.quick - dt);
  f.invulnT = Math.max(0, f.invulnT - dt);
  f.comboT = Math.max(0, f.comboT - dt);
  if (f.comboT <= 0) f.comboHits = 0;

  if (f.action === 'ko') {
    f.koTimer = Math.max(0, f.koTimer - dt);
    return f;
  }

  f.superCharge = Math.min(1, f.superCharge + dt / f.personality.superChargeSec);

  // Start new actions only when free.
  if (!isBusy(f)) {
    if (intent.facing !== null) f.facing = intent.facing;
    // Faster fighters also swing faster: speed 5 = 0.9x, speed 1 = 1.1x.
    const swing = f.weapon.swingTimeMul * (1.15 - 0.05 * f.personality.speed);
    if (intent.super && f.superCharge >= 1) {
      f.superCharge = 0;
      startAction(f, 'super', TUNING.superDur);
    } else if (intent.dodge && f.cooldowns.dodge <= 0) {
      startAction(f, 'dodge', TUNING.dodgeDur);
      f.cooldowns.dodge = TUNING.dodgeCooldown;
      f.invulnT = Math.max(f.invulnT, TUNING.dodgeDur);
      const fw = forward(f.facing);
      const right = { x: -fw.z, z: fw.x };
      const dirs = {
        left: { x: -right.x, z: -right.z },
        right,
        back: { x: -fw.x, z: -fw.z },
        forward: fw,
      };
      const dir = dirs[intent.dodge];
      const speed = TUNING.dodgeDistance / TUNING.dodgeDur;
      f.push = { x: dir.x * speed, z: dir.z * speed };
    } else if (intent.dash && f.cooldowns.dash <= 0) {
      startAction(f, 'dash', TUNING.dashDur);
      f.cooldowns.dash = TUNING.dashCooldown;
      const fw = forward(f.facing);
      const speed = TUNING.dashDistance / TUNING.dashDur;
      f.push = { x: fw.x * speed, z: fw.z * speed };
    } else if (intent.power && f.cooldowns.power <= 0) {
      startAction(f, 'power', TUNING.powerDur * swing);
      f.cooldowns.power = TUNING.powerCooldown;
      const fw = forward(f.facing);
      if (f.personality.powerMove === 'teleportSlash') {
        // A super-fast zip forward; body collision stops it at the target.
        const speed = 3.5 / (TUNING.powerDur * swing * 0.4);
        f.push = { x: fw.x * speed, z: fw.z * speed };
      } else if (f.personality.powerMove === 'firePunch') {
        const speed = 2.5 / (TUNING.powerDur * swing * 0.4);
        f.push = { x: fw.x * speed, z: fw.z * speed };
      }
    } else if (intent.quick && f.cooldowns.quick <= 0) {
      startAction(f, 'quick', TUNING.quickDur * swing);
      // Short breather after each quick hit so mashing has a rhythm, not a stun-lock.
      f.cooldowns.quick = TUNING.quickDur * swing + TUNING.quickRecovery;
    }
  }

  f.ducking = intent.duck && !isBusy(f);

  if (!isBusy(f)) {
    const len = Math.hypot(intent.move.x, intent.move.z);
    if (len > 0.01) {
      const m = Math.min(1, len);
      const speed = f.moveSpeed * (f.ducking ? TUNING.duckSpeedMul : 1) * m;
      f.pos.x += (intent.move.x / len) * speed * dt;
      f.pos.z += (intent.move.z / len) * speed * dt;
      if (intent.facing === null) f.facing = Math.atan2(intent.move.x, intent.move.z);
      f.action = 'walk';
    } else {
      f.action = 'idle';
    }
    return f;
  }

  // Busy: advance the action.
  f.actionT += dt;
  const pushActive =
    f.action === 'dash' ||
    f.action === 'dodge' ||
    f.action === 'hitstun' ||
    (f.action === 'power' && f.actionT < f.actionDur * 0.4);
  if (pushActive) {
    f.pos.x += f.push.x * dt;
    f.pos.z += f.push.z * dt;
  }
  if (f.action === 'hitstun') {
    f.push.x *= 0.85;
    f.push.z *= 0.85;
  }
  if (f.actionT >= f.actionDur) {
    f.action = 'idle';
    f.actionT = 0;
    f.push = { x: 0, z: 0 };
  }
  return f;
}

interface AttackShape {
  range: number;
  /** half-angle in radians; Math.PI = all around */
  arc: number;
  /** active windows as fractions of action duration */
  windows: [number, number][];
  damage: (target: FighterState) => number;
  /** Ducking targets avoid this attack */
  duckable: boolean;
}

const deg = (d: number) => (d * Math.PI) / 180;

function powerMul(f: FighterState): number {
  return (0.7 + 0.1 * f.personality.power) * f.weapon.damageMul;
}

export function attackShape(f: FighterState): AttackShape | null {
  const reach = f.weapon.reach;
  const mul = powerMul(f);
  switch (f.action) {
    case 'quick':
      return { range: reach + 0.5, arc: deg(60), windows: [[0.33, 0.66]], damage: () => TUNING.quickDamage * mul, duckable: true };
    case 'dash':
      return { range: reach + 0.4, arc: deg(60), windows: [[0, 1]], damage: () => TUNING.dashDamage * mul, duckable: true };
    case 'super': {
      const sd = f.personality.superDamage;
      return {
        range: reach + 3,
        arc: deg(75),
        windows: [[0.45, 0.65]],
        damage: (t) => (sd === 'ko' ? t.hp : sd * t.maxHp),
        duckable: false,
      };
    }
    case 'power': {
      const base = TUNING.powerDamage * mul;
      switch (f.personality.powerMove) {
        case 'firePunch':
          return { range: reach + 0.8, arc: deg(50), windows: [[0.25, 0.6]], damage: () => base, duckable: false };
        case 'teleportSlash':
          return { range: reach + 0.7, arc: deg(75), windows: [[0.15, 0.45]], damage: () => base, duckable: false };
        case 'groundPound':
          return { range: reach + 1.8, arc: Math.PI, windows: [[0.5, 0.7]], damage: () => base, duckable: false };
        case 'doubleHit':
          return {
            range: reach + 0.5,
            arc: deg(70),
            windows: [[0.2, 0.38], [0.55, 0.75]],
            damage: () => base * 0.6,
            duckable: false,
          };
        case 'laserSpin':
          return { range: reach + 1.0, arc: Math.PI, windows: [[0.3, 0.75]], damage: () => base, duckable: false };
        case 'zapBolt':
          return { range: 7, arc: deg(15), windows: [[0.45, 0.6]], damage: () => base, duckable: false };
      }
    }
  }
  return null;
}

interface PendingHit {
  attacker: FighterState;
  target: FighterState;
  windowIdx: number;
  /** null = swing spent but avoided (dodge, duck, invulnerable) */
  damage: number | null;
  kind: Action;
  dist: number;
  dx: number;
  dz: number;
}

/** Pure check: would a's current attack connect with b this tick? */
function checkHit(a: FighterState, b: FighterState): PendingHit | null {
  if (b.action === 'ko' || a.action === 'ko') return null;
  const shape = attackShape(a);
  if (!shape) return null;
  const frac = a.actionDur > 0 ? a.actionT / a.actionDur : 0;
  const windowIdx = shape.windows.findIndex(([s, e]) => frac >= s && frac <= e);
  if (windowIdx < 0 || a.hitsLanded > windowIdx) return null;

  const dx = b.pos.x - a.pos.x;
  const dz = b.pos.z - a.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > shape.range) return null;
  if (shape.arc < Math.PI && dist > 0.01) {
    const angleTo = Math.atan2(dx, dz);
    let diff = Math.abs(angleTo - a.facing) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > shape.arc) return null;
  }
  const avoided = b.invulnT > 0 || (shape.duckable && b.ducking);
  return { attacker: a, target: b, windowIdx, damage: avoided ? null : shape.damage(b), kind: a.action, dist, dx, dz };
}

function applyHit(h: PendingHit): HitEvent | null {
  const { attacker: a, target: b } = h;
  a.hitsLanded = h.windowIdx + 1;
  if (h.damage === null || b.action === 'ko') return null;
  const damage = Math.min(b.hp, h.damage);
  b.hp = Math.max(0, b.hp - damage);
  const ko = b.hp <= 0;
  if (ko) {
    b.action = 'ko';
    b.actionT = 0;
    b.push = { x: 0, z: 0 };
  } else {
    const nx = h.dist > 0.01 ? h.dx / h.dist : 0;
    const nz = h.dist > 0.01 ? h.dz / h.dist : 1;
    b.comboHits += 1;
    b.comboT = TUNING.comboWindow;
    const attacking = b.action === 'quick' || b.action === 'power' || b.action === 'dash';
    if (b.comboHits >= TUNING.comboBreakHits) {
      // Combo breaker: bounce free and get a moment of safety.
      b.comboHits = 0;
      startAction(b, 'hitstun', TUNING.quickStunDur);
      b.push = { x: nx * TUNING.comboBreakKnockback, z: nz * TUNING.comboBreakKnockback };
      b.invulnT = Math.max(b.invulnT, TUNING.comboBreakInvuln);
    } else if (b.action === 'super') {
      // Supers can't be interrupted, so a charged super is never wasted by a poke.
    } else if (h.kind === 'quick' && attacking) {
      // Quick hits don't cancel an attack that's already swinging.
    } else {
      const stun = h.kind === 'quick' ? TUNING.quickStunDur : TUNING.hitstunDur;
      startAction(b, 'hitstun', stun);
      const kb = h.kind === 'quick' ? TUNING.knockback * 0.6 : TUNING.knockback;
      b.push = { x: nx * kb, z: nz * kb };
    }
  }
  return { attacker: a.id, target: b.id, damage, kind: h.kind, ko, at: { x: b.pos.x, z: b.pos.z } };
}

/** Check both fighters' attacks against each other. Both are checked before either applies, so trades are fair. */
export function resolveAttacks(a: FighterState, b: FighterState): HitEvent[] {
  const pending = [checkHit(a, b), checkHit(b, a)].filter((h): h is PendingHit => h !== null);
  const events: HitEvent[] = [];
  for (const h of pending) {
    const e = applyHit(h);
    if (e) events.push(e);
  }
  return events;
}

export const BODY_RADIUS = 0.45;

/** Push overlapping fighters apart so they can't walk or lunge through each other. */
export function separate(a: FighterState, b: FighterState): void {
  if (a.action === 'ko' || b.action === 'ko') return;
  const dx = b.pos.x - a.pos.x;
  const dz = b.pos.z - a.pos.z;
  const dist = Math.hypot(dx, dz);
  const min = BODY_RADIUS * 2;
  if (dist >= min) return;
  const nx = dist > 0.001 ? dx / dist : 1;
  const nz = dist > 0.001 ? dz / dist : 0;
  const overlap = (min - dist) / 2;
  a.pos.x -= nx * overlap;
  a.pos.z -= nz * overlap;
  b.pos.x += nx * overlap;
  b.pos.z += nz * overlap;
}
