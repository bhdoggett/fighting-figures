import type { Profile } from './progression';
import type { PersonalityId } from './types';

/** What a code gives you. */
export interface Bundle {
  name: string;
  personalities?: PersonalityId[];
  weapons?: string[];
  cosmetics?: string[];
  armor?: string[];
  coins?: number;
}

/**
 * Secret codes, keyed by a scrambled form so the code text isn't sitting in the page.
 * (Not real security: anyone determined can still find what a bundle contains.)
 * To add a code: run scrambleCode('yourcode') once and add its result here.
 */
export const CODES: Record<string, Bundle> = {
  // robrob
  '5793097d': { name: 'Robstruction', personalities: ['robstruction'] },
};

function normalize(code: string): string {
  return code.toLowerCase().replace(/\s+/g, '');
}

/** FNV-1a hash of the normalized code, salted with the game name. */
export function scrambleCode(code: string): string {
  let h = 0x811c9dc5;
  for (const c of `fighting-figures:${normalize(code)}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export type RedeemResult = { ok: true; profile: Profile; bundle: Bundle } | { ok: false; reason: 'unknown' | 'used' };

/** Try a code. Gives its bundle once per save, and switches to a new fighter if it has one. */
export function redeemCode(p: Profile, input: string): RedeemResult {
  if (!normalize(input)) return { ok: false, reason: 'unknown' };
  const key = scrambleCode(input);
  const bundle = CODES[key];
  if (!bundle) return { ok: false, reason: 'unknown' };
  if (p.redeemedCodes.includes(key)) return { ok: false, reason: 'used' };
  const add = <T,>(have: T[], more: T[] = []) => [...have, ...more.filter((x) => !have.includes(x))];
  const owned = {
    personalities: add(p.owned.personalities, bundle.personalities),
    weapons: add(p.owned.weapons, bundle.weapons),
    cosmetics: add(p.owned.cosmetics, bundle.cosmetics),
    armor: add(p.owned.armor, bundle.armor),
  };
  const loadout = bundle.personalities?.length ? { ...p.loadout, personality: bundle.personalities[0] } : p.loadout;
  return {
    ok: true,
    bundle,
    profile: { ...p, owned, loadout, coins: p.coins + (bundle.coins ?? 0), redeemedCodes: [...p.redeemedCodes, key] },
  };
}
