import { attackShape, createFighter, landHit, quickDamage, resolveAttacks, separate, stepFighter, TUNING, type FighterState, type HitEvent, type Intent, type Vec2 } from './fighter';
import { getArmor } from './data/shop';
import { getPersonality } from './data/personalities';
import { getWeapon } from './data/weapons';
import type { Loadout } from './types';

export const FIXED_DT = 1 / 60;
export const MAX_FRAME = 0.1;
export const ARENA_HALF = 12;
export const RESPAWN_SEC = 2;
const LINE_COOLDOWN = 2.5;
const SPAWNS: Vec2[] = [
  { x: 0, z: -6 },
  { x: 0, z: 6 },
  { x: -7, z: 0 },
  { x: 7, z: 0 },
];

export type Side = 0 | 1;

export type MatchEvent =
  | { id: number; type: 'hit'; who: Side; target: Side; damage: number; at: Vec2; big: boolean; zap?: boolean }
  | { id: number; type: 'ko'; who: Side; target: Side; at: Vec2; super: boolean }
  | { id: number; type: 'super'; who: Side; at: Vec2 }
  | { id: number; type: 'power'; who: Side; at: Vec2 }
  | { id: number; type: 'line'; who: Side; text: string }
  | { id: number; type: 'respawn'; who: Side; at: Vec2 };

/** A thrown poison dart in flight. */
export interface Projectile {
  id: number;
  owner: Side;
  pos: Vec2;
  dir: Vec2;
  life: number;
  damage: number;
}

const DART_SPEED = 20;
const DART_LIFE = 0.55;
const DART_HIT_RADIUS = 0.6;

type NewEvent = MatchEvent extends infer E ? (E extends MatchEvent ? Omit<E, 'id'> : never) : never;

export interface MatchState {
  time: number;
  duration: number;
  fighters: [FighterState, FighterState];
  loadouts: [Loadout, Loadout];
  kos: [number, number];
  supersLanded: [number, number];
  events: MatchEvent[];
  nextEventId: number;
  over: boolean;
  accumulator: number;
  /** Fighter positions before the latest step, for smooth drawing between steps. */
  prevPos: [Vec2, Vec2];
  projectiles: Projectile[];
  nextProjectileId: number;
  lineCooldown: [number, number];
  rng: () => number;
}

export function createMatch(p1: Loadout, p2: Loadout, duration = 180, rng: () => number = Math.random): MatchState {
  const per1 = getPersonality(p1.personality);
  const per2 = getPersonality(p2.personality);
  // Fighters with their own built-in weapon (Robstruction's claws) always use it.
  const f1 = createFighter('p1', per1, getWeapon(per1.signatureWeapon ?? p1.weapon), SPAWNS[0], getArmor(p1.armor));
  const f2 = createFighter('p2', per2, getWeapon(per2.signatureWeapon ?? p2.weapon), SPAWNS[1], getArmor(p2.armor));
  return {
    time: duration,
    duration,
    fighters: [f1, f2],
    loadouts: [p1, p2],
    kos: [0, 0],
    supersLanded: [0, 0],
    events: [],
    nextEventId: 1,
    over: false,
    accumulator: 0,
    prevPos: [{ ...f1.pos }, { ...f2.pos }],
    projectiles: [],
    nextProjectileId: 1,
    lineCooldown: [0, 0],
    rng,
  };
}

function emit(m: MatchState, e: NewEvent) {
  m.events.push({ ...e, id: m.nextEventId++ } as MatchEvent);
  if (m.events.length > 60) m.events.splice(0, m.events.length - 60);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function say(m: MatchState, who: Side, kind: 'taunt' | 'hit' | 'ko' | 'win', force = false) {
  if (!force && m.lineCooldown[who] > 0) return;
  const lines = m.fighters[who].personality.lines[kind];
  emit(m, { type: 'line', who, text: pick(lines, m.rng) });
  m.lineCooldown[who] = LINE_COOLDOWN;
}

function clampToArena(f: FighterState) {
  const lim = ARENA_HALF - 0.5;
  f.pos.x = Math.max(-lim, Math.min(lim, f.pos.x));
  f.pos.z = Math.max(-lim, Math.min(lim, f.pos.z));
}

function respawn(m: MatchState, side: Side) {
  const f = m.fighters[side];
  const other = m.fighters[side === 0 ? 1 : 0];
  let best = SPAWNS[0];
  let bestD = -1;
  for (const s of SPAWNS) {
    const d = Math.hypot(s.x - other.pos.x, s.z - other.pos.z);
    if (d > bestD) {
      bestD = d;
      best = s;
    }
  }
  f.pos = { ...best };
  f.hp = f.maxHp;
  f.action = 'idle';
  f.actionT = 0;
  f.push = { x: 0, z: 0 };
  f.invulnT = TUNING.respawnInvuln;
  f.status = { burn: 0, poison: 0, slow: 0, from: null };
  f.facing = Math.atan2(other.pos.x - f.pos.x, other.pos.z - f.pos.z);
  emit(m, { type: 'respawn', who: side, at: { ...f.pos } });
}

/** Advance the match by exactly one fixed step. */
export function stepMatch(m: MatchState, intents: [Intent, Intent], dt: number = FIXED_DT): MatchState {
  if (m.over) return m;
  m.time = Math.max(0, m.time - dt);
  m.lineCooldown[0] = Math.max(0, m.lineCooldown[0] - dt);
  m.lineCooldown[1] = Math.max(0, m.lineCooldown[1] - dt);

  const [a, b] = m.fighters;
  m.prevPos = [{ ...a.pos }, { ...b.pos }];
  const before: [string, string] = [a.action, b.action];
  stepFighter(a, intents[0], dt);
  stepFighter(b, intents[1], dt);
  separate(a, b);
  clampToArena(a);
  clampToArena(b);

  ([0, 1] as Side[]).forEach((side) => {
    const f = m.fighters[side];
    if (f.action === 'super' && before[side] !== 'super') {
      emit(m, { type: 'super', who: side, at: { ...f.pos } });
    }
    if (f.action === 'power' && before[side] !== 'power') {
      emit(m, { type: 'power', who: side, at: { ...f.pos } });
    }
  });

  spawnDarts(m);
  const hits = [...resolveAttacks(a, b), ...moveDarts(m, dt)];
  tickBurnAndPoison(m, dt);

  for (const hit of hits) {
    const who: Side = hit.attacker === 'p1' ? 0 : 1;
    const target: Side = who === 0 ? 1 : 0;
    if (hit.ko) {
      m.kos[who] += 1;
      const isSuper = hit.kind === 'super';
      if (isSuper) m.supersLanded[who] += 1;
      m.fighters[target].koTimer = RESPAWN_SEC;
      emit(m, { type: 'ko', who, target, at: hit.at, super: isSuper });
      say(m, who, 'ko', true);
    } else {
      const big = hit.kind === 'power' || hit.kind === 'super';
      if (hit.kind === 'super') m.supersLanded[who] += 1;
      emit(m, { type: 'hit', who, target, damage: hit.damage, at: hit.at, big, zap: hit.zap });
      if (m.rng() < 0.35) say(m, target, 'hit');
    }
  }

  ([0, 1] as Side[]).forEach((side) => {
    const f = m.fighters[side];
    if (f.action === 'ko' && f.koTimer <= 0 && before[side] === 'ko') respawn(m, side);
  });

  if (m.time <= 0) {
    m.over = true;
    const w = winnerOf(m);
    if (w !== 'draw') say(m, w, 'win', true);
  }
  return m;
}

/** Advance by a real frame time using fixed steps. Large frames (tab hidden) are clamped. */
export function runFrame(m: MatchState, getIntents: () => [Intent, Intent], frameDt: number): MatchState {
  m.accumulator += Math.min(MAX_FRAME, Math.max(0, frameDt));
  while (m.accumulator >= FIXED_DT && !m.over) {
    stepMatch(m, getIntents(), FIXED_DT);
    m.accumulator -= FIXED_DT;
  }
  return m;
}

export function winnerOf(m: MatchState): Side | 'draw' {
  if (m.kos[0] > m.kos[1]) return 0;
  if (m.kos[1] > m.kos[0]) return 1;
  return 'draw';
}

export function openingTaunts(m: MatchState) {
  say(m, 0, 'taunt', true);
  say(m, 1, 'taunt', true);
}

const SNAP_DISTANCE = 3;

/** Where to draw a fighter right now: blended between the last two steps, snapping on big jumps (respawn). */
export function drawPosition(m: MatchState, side: Side): Vec2 {
  const cur = m.fighters[side].pos;
  const prev = m.prevPos[side];
  if (Math.hypot(cur.x - prev.x, cur.z - prev.z) > SNAP_DISTANCE) return { ...cur };
  const t = Math.min(1, Math.max(0, m.accumulator / FIXED_DT));
  return { x: prev.x + (cur.x - prev.x) * t, z: prev.z + (cur.z - prev.z) * t };
}

/** Throw a dart when a darts fighter's quick attack reaches its release point. */
function spawnDarts(m: MatchState) {
  ([0, 1] as Side[]).forEach((side) => {
    const f = m.fighters[side];
    if (!f.weapon.ranged || f.action !== 'quick' || f.hitsLanded > 0 || attackShape(f)) return;
    if (f.actionT < f.actionDur * 0.33) return;
    f.hitsLanded = 1;
    const dir = { x: Math.sin(f.facing), z: Math.cos(f.facing) };
    m.projectiles.push({
      id: m.nextProjectileId++,
      owner: side,
      pos: { x: f.pos.x + dir.x * 0.5, z: f.pos.z + dir.z * 0.5 },
      dir,
      life: DART_LIFE,
      damage: quickDamage(f),
    });
  });
}

/** Fly darts forward and hit whoever they reach (ducking fighters let them fly over). */
function moveDarts(m: MatchState, dt: number): HitEvent[] {
  const events: HitEvent[] = [];
  m.projectiles = m.projectiles.filter((p) => {
    p.life -= dt;
    p.pos.x += p.dir.x * DART_SPEED * dt;
    p.pos.z += p.dir.z * DART_SPEED * dt;
    const shooter = m.fighters[p.owner];
    const target = m.fighters[p.owner === 0 ? 1 : 0];
    if (target.action !== 'ko' && Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z) < DART_HIT_RADIUS) {
      if (target.invulnT > 0 || target.ducking) return p.life > 0;
      const e = landHit(shooter, target, p.damage, 'quick', p.dir.x, p.dir.z);
      if (e) events.push(e);
      return false;
    }
    return p.life > 0 && Math.abs(p.pos.x) < ARENA_HALF && Math.abs(p.pos.z) < ARENA_HALF;
  });
  return events;
}

/** Fire and poison keep hurting for a few seconds. A KO from them counts for whoever caused it. */
function tickBurnAndPoison(m: MatchState, dt: number) {
  ([0, 1] as Side[]).forEach((side) => {
    const f = m.fighters[side];
    const st = f.status;
    if (f.action === 'ko' || (st.burn <= 0 && st.poison <= 0)) return;
    const dps = (st.burn > 0 ? TUNING.burnDps : 0) + (st.poison > 0 ? TUNING.poisonDps : 0);
    st.burn = Math.max(0, st.burn - dt);
    st.poison = Math.max(0, st.poison - dt);
    f.hp = Math.max(0, f.hp - dps * dt);
    if (f.hp > 0) return;
    f.action = 'ko';
    f.actionT = 0;
    f.push = { x: 0, z: 0 };
    f.koTimer = RESPAWN_SEC;
    const who: Side = st.from === 'p1' ? 0 : st.from === 'p2' ? 1 : side === 0 ? 1 : 0;
    m.kos[who] += 1;
    emit(m, { type: 'ko', who, target: side, at: { ...f.pos }, super: false });
    say(m, who, 'ko', true);
  });
}
