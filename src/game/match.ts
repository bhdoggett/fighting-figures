import { createFighter, resolveAttacks, separate, stepFighter, TUNING, type FighterState, type Intent, type Vec2 } from './fighter';
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
  | { id: number; type: 'hit'; who: Side; target: Side; damage: number; at: Vec2; big: boolean }
  | { id: number; type: 'ko'; who: Side; target: Side; at: Vec2; super: boolean }
  | { id: number; type: 'super'; who: Side; at: Vec2 }
  | { id: number; type: 'line'; who: Side; text: string }
  | { id: number; type: 'respawn'; who: Side; at: Vec2 };

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
  lineCooldown: [number, number];
  rng: () => number;
}

export function createMatch(p1: Loadout, p2: Loadout, duration = 180, rng: () => number = Math.random): MatchState {
  const f1 = createFighter('p1', getPersonality(p1.personality), getWeapon(p1.weapon), SPAWNS[0]);
  const f2 = createFighter('p2', getPersonality(p2.personality), getWeapon(p2.weapon), SPAWNS[1]);
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
  });

  for (const hit of resolveAttacks(a, b)) {
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
      emit(m, { type: 'hit', who, target, damage: hit.damage, at: hit.at, big });
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
