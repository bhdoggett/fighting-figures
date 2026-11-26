import { coinsForLevels, newProfile, type Profile } from './progression';
import { PERSONALITIES, STARTER_PERSONALITIES } from './data/personalities';

export const SAVE_KEY = 'fighting-figures.save';

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

/** Validate unknown data into a Profile, or null if it is not a usable v1 save. */
export function parseProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;
  if (typeof r.level !== 'number' || typeof r.xp !== 'number') return null;
  const owned = r.owned as Record<string, unknown> | undefined;
  const loadout = r.loadout as Record<string, unknown> | undefined;
  if (!owned || !loadout) return null;
  if (!isStringArray(owned.weapons) || !isStringArray(owned.cosmetics) || !isStringArray(owned.personalities)) return null;
  const armor = isStringArray(owned.armor) ? owned.armor : [];

  const base = newProfile();
  const personalities = owned.personalities.filter((id) => id in PERSONALITIES) as Profile['owned']['personalities'];
  // Fighters added later as starters are unlocked for existing saves too.
  if (personalities.length) for (const id of STARTER_PERSONALITIES) if (!personalities.includes(id)) personalities.push(id);
  const p: Profile = {
    version: 1,
    level: Math.max(1, Math.min(30, Math.floor(r.level))),
    xp: Math.max(0, Math.floor(r.xp)),
    trophies: typeof r.trophies === 'number' ? r.trophies : 0,
    battles: typeof r.battles === 'number' ? r.battles : 0,
    wins: typeof r.wins === 'number' ? r.wins : 0,
    coins: typeof r.coins === 'number' && r.coins >= 0 ? Math.floor(r.coins) : 0,
    coinsBackPaid: true,
    redeemedCodes: Array.isArray(r.redeemedCodes) ? r.redeemedCodes.filter((c): c is string => typeof c === 'string') : [],
    pendingPrizes: Array.isArray(r.pendingPrizes)
      ? r.pendingPrizes.filter((n): n is number => typeof n === 'number' && n >= 2 && n <= 30).slice(0, 30)
      : [],
    owned: {
      weapons: owned.weapons.length ? owned.weapons : base.owned.weapons,
      cosmetics: owned.cosmetics.length ? owned.cosmetics : base.owned.cosmetics,
      personalities: personalities.length ? personalities : base.owned.personalities,
      armor,
    },
    loadout: { ...base.loadout },
  };

  // Repair loadout so it only uses owned things.
  const pick = <T extends string>(v: unknown, ownedList: T[], fallback: T): T =>
    typeof v === 'string' && (ownedList as string[]).includes(v) ? (v as T) : fallback;
  p.loadout.personality = pick(loadout.personality, p.owned.personalities, p.owned.personalities[0]);
  p.loadout.weapon = pick(loadout.weapon, p.owned.weapons, p.owned.weapons[0]);
  p.loadout.skin = pick(loadout.skin, p.owned.cosmetics, base.loadout.skin);
  if (typeof loadout.hat === 'string' && p.owned.cosmetics.includes(loadout.hat)) p.loadout.hat = loadout.hat;
  if (typeof loadout.cape === 'string' && p.owned.cosmetics.includes(loadout.cape)) p.loadout.cape = loadout.cape;
  if (typeof loadout.armor === 'string' && p.owned.armor.includes(loadout.armor)) p.loadout.armor = loadout.armor;
  // Saves from before the shop: pay the coins for every level already reached, one time.
  if (r.coinsBackPaid !== true) {
    const levels = Array.from({ length: p.level - 1 }, (_, i) => i + 2);
    p.coins += coinsForLevels(levels);
  }
  return p;
}

export function loadProfile(storage: Storage): Profile {
  try {
    const text = storage.getItem(SAVE_KEY);
    if (!text) return newProfile();
    return parseProfile(JSON.parse(text)) ?? newProfile();
  } catch {
    return newProfile();
  }
}

export function saveProfile(storage: Storage, p: Profile): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    // Storage full or blocked: progress for this session still lives in memory.
  }
}

export function exportProfile(p: Profile): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
}

export function importProfile(code: string): Profile | null {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    return parseProfile(JSON.parse(json));
  } catch {
    return null;
  }
}
