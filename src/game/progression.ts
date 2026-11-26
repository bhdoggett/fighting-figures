import type { Loadout, PersonalityId } from './types';
import { LOCKED_PERSONALITIES, PERSONALITIES, STARTER_PERSONALITIES } from './data/personalities';
import { TIERS, WEAPONS, FAMILY_TRADEOFFS, tierIndex } from './data/weapons';
import { COSMETICS } from './data/cosmetics';
import { MAX_LEVEL, isRankUpLevel } from './data/ranks';
import { getShopItem } from './data/shop';

export interface Profile {
  version: 1;
  level: number;
  xp: number;
  trophies: number;
  battles: number;
  wins: number;
  /** Levels whose prize hasn't been picked yet (survives closing the tab). */
  pendingPrizes: number[];
  /** Figure Coins, spent in the shop. */
  coins: number;
  /** True once a pre-shop save has been paid coins for the levels it already had. */
  coinsBackPaid: boolean;
  /** Scrambled codes already used on this save. */
  redeemedCodes: string[];
  owned: { weapons: string[]; cosmetics: string[]; personalities: PersonalityId[]; armor: string[] };
  loadout: Loadout;
}

export interface BattleResult {
  won: boolean;
  draw: boolean;
  kos: number;
  supersLanded: number;
}

export type PrizeKind = 'weapon' | 'cosmetic' | 'personality' | 'trophy';

export interface Prize {
  kind: PrizeKind;
  id: string;
  label: string;
  detail: string;
}

export function newProfile(): Profile {
  return {
    version: 1,
    level: 1,
    xp: 0,
    trophies: 0,
    battles: 0,
    wins: 0,
    pendingPrizes: [],
    coins: 0,
    coinsBackPaid: true,
    redeemedCodes: [],
    owned: {
      weapons: ['sword-wood'],
      cosmetics: ['skin-blue'],
      personalities: [...STARTER_PERSONALITIES],
      armor: [],
    },
    loadout: { personality: 'hothead', weapon: 'sword-wood', skin: 'skin-blue' },
  };
}

export const COINS_PER_LEVEL = 40;
export const COIN_BONUS_LEVELS = [10, 20];
export const COIN_BONUS = 300;

export const XP = { battle: 40, win: 60, draw: 25, perKo: 8, perSuper: 10 } as const;

export function xpForBattle(r: BattleResult): number {
  return XP.battle + (r.won ? XP.win : 0) + (r.draw ? XP.draw : 0) + XP.perKo * r.kos + XP.perSuper * r.supersLanded;
}

/** About 100 typical 3-minute battles (~5 hours) from level 1 to Obsidian at 25. */
export function xpToNext(level: number): number {
  return 100 + 50 * (level - 1);
}

export function applyXp(p: Profile, xp: number): { profile: Profile; levelsGained: number[] } {
  let level = p.level;
  let pool = p.xp + xp;
  const levelsGained: number[] = [];
  while (level < MAX_LEVEL && pool >= xpToNext(level)) {
    pool -= xpToNext(level);
    level += 1;
    levelsGained.push(level);
  }
  if (level >= MAX_LEVEL) pool = 0;
  return { profile: { ...p, level, xp: pool }, levelsGained };
}

/** Highest weapon tier index that can be offered at a level. */
export function maxTierForLevel(level: number): number {
  return Math.min(TIERS.length - 1, Math.floor((level + 1) / 5));
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function offerPrizes(p: Profile, level: number, rng: () => number): Prize[] {
  const out: Prize[] = [];

  if (isRankUpLevel(level)) {
    const locked = LOCKED_PERSONALITIES.filter((id) => !p.owned.personalities.includes(id));
    if (locked.length > 0) {
      const per = PERSONALITIES[locked[0]];
      out.push({ kind: 'personality', id: per.id, label: per.name, detail: per.blurb });
    }
  }

  const maxTier = maxTierForLevel(level);
  const weapons: Prize[] = Object.values(WEAPONS)
    .filter((w) => !p.owned.weapons.includes(w.id) && tierIndex(w.tier) <= maxTier)
    .map((w) => ({
      kind: 'weapon' as const,
      id: w.id,
      label: w.name,
      detail: `${FAMILY_TRADEOFFS[w.family].good}, ${FAMILY_TRADEOFFS[w.family].bad.toLowerCase()}`,
    }));
  const cosmetics: Prize[] = COSMETICS.filter((c) => !c.event && !p.owned.cosmetics.includes(c.id)).map((c) => ({
    kind: 'cosmetic' as const,
    id: c.id,
    label: c.name,
    detail: c.slot === 'skin' ? 'New look' : c.slot === 'hat' ? 'Something to wear on your head' : 'A cape to wear',
  }));

  // Try to mix: one weapon, one cosmetic, then anything.
  const w = shuffle(weapons, rng);
  const c = shuffle(cosmetics, rng);
  if (out.length < 3 && w.length) out.push(w.shift()!);
  if (out.length < 3 && c.length) out.push(c.shift()!);
  for (const prize of shuffle([...w, ...c], rng)) {
    if (out.length >= 3) break;
    out.push(prize);
  }
  let n = 0;
  while (out.length < 3) {
    out.push({ kind: 'trophy', id: `trophy-${level}-${n++}`, label: 'Shiny Trophy', detail: 'Show off on your profile!' });
  }
  return out;
}

export function claimPrize(p: Profile, prize: Prize): Profile {
  const owned = {
    weapons: [...p.owned.weapons],
    cosmetics: [...p.owned.cosmetics],
    personalities: [...p.owned.personalities],
    armor: [...p.owned.armor],
  };
  let trophies = p.trophies;
  const loadout = { ...p.loadout };
  if (prize.kind === 'weapon' && !owned.weapons.includes(prize.id)) {
    owned.weapons.push(prize.id);
    loadout.weapon = prize.id;
  } else if (prize.kind === 'cosmetic' && !owned.cosmetics.includes(prize.id)) {
    owned.cosmetics.push(prize.id);
    const slot = COSMETICS.find((c) => c.id === prize.id)?.slot;
    if (slot) loadout[slot] = prize.id;
  } else if (prize.kind === 'personality' && !owned.personalities.includes(prize.id as PersonalityId)) {
    owned.personalities.push(prize.id as PersonalityId);
    loadout.personality = prize.id as PersonalityId;
  } else if (prize.kind === 'trophy') {
    trophies += 1;
  }
  return { ...p, owned, trophies, loadout, pendingPrizes: p.pendingPrizes.slice(1) };
}

export function recordBattle(p: Profile, r: BattleResult): Profile {
  return { ...p, battles: p.battles + 1, wins: p.wins + (r.won ? 1 : 0) };
}

/** Record a finished battle: stats, XP, levels, and a prize owed for each level gained. */
export function finishBattle(p: Profile, r: BattleResult): { profile: Profile; levelsGained: number[]; xp: number; coins: number } {
  const xp = xpForBattle(r);
  const { profile, levelsGained } = applyXp(recordBattle(p, r), xp);
  const coins = coinsForLevels(levelsGained);
  return {
    profile: { ...profile, coins: profile.coins + coins, pendingPrizes: [...profile.pendingPrizes, ...levelsGained] },
    levelsGained,
    xp,
    coins,
  };
}

/** Coins earned for reaching these levels: some each level, plus a bonus every two rank-ups. */
export function coinsForLevels(levels: number[]): number {
  return levels.reduce((sum, l) => sum + COINS_PER_LEVEL + (COIN_BONUS_LEVELS.includes(l) ? COIN_BONUS : 0), 0);
}

/** Buy a shop item and equip it. Returns null if it can't be bought. */
export function buyItem(p: Profile, id: string): Profile | null {
  const item = getShopItem(id);
  if (!item || p.coins < item.price) return null;
  const owned = item.kind === 'armor' ? p.owned.armor : p.owned.weapons;
  if (owned.includes(id)) return null;
  if (item.kind === 'armor') {
    return { ...p, coins: p.coins - item.price, owned: { ...p.owned, armor: [...p.owned.armor, id] }, loadout: { ...p.loadout, armor: id } };
  }
  return { ...p, coins: p.coins - item.price, owned: { ...p.owned, weapons: [...p.owned.weapons, id] }, loadout: { ...p.loadout, weapon: id } };
}
