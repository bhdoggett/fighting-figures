import type { Tier, Weapon, WeaponFamily } from '../types';

export const TIERS: Tier[] = ['wood', 'stone', 'iron', 'gold', 'diamond'];

const TIER_COLORS: Record<Tier, number> = {
  wood: 0xa0703c,
  stone: 0x9a9a9a,
  iron: 0xd8d8e0,
  gold: 0xffc93c,
  diamond: 0x5ce1e6,
};

const TIER_NAMES: Record<Tier, string> = {
  wood: 'Wooden',
  stone: 'Stone',
  iron: 'Iron',
  gold: 'Golden',
  diamond: 'Diamond',
};

interface FamilyBase {
  name: string;
  damageMul: number;
  swingTimeMul: number;
  reach: number;
}

export const FAMILIES: Record<WeaponFamily, FamilyBase> = {
  sword: { name: 'Sword', damageMul: 1, swingTimeMul: 1, reach: 1.6 },
  hammer: { name: 'Hammer', damageMul: 1.45, swingTimeMul: 1.5, reach: 1.7 },
  daggers: { name: 'Daggers', damageMul: 0.7, swingTimeMul: 0.6, reach: 1.1 },
  spear: { name: 'Spear', damageMul: 0.9, swingTimeMul: 1.1, reach: 2.6 },
};

export const FAMILY_TRADEOFFS: Record<WeaponFamily, { good: string; bad: string }> = {
  sword: { good: 'Balanced', bad: 'Nothing special' },
  hammer: { good: 'Big damage', bad: 'Slow swing' },
  daggers: { good: 'Very fast', bad: 'Short reach' },
  spear: { good: 'Long reach', bad: 'Less damage' },
};

function build(): Record<string, Weapon> {
  const out: Record<string, Weapon> = {};
  for (const family of Object.keys(FAMILIES) as WeaponFamily[]) {
    const base = FAMILIES[family];
    TIERS.forEach((tier, i) => {
      const id = `${family}-${tier}`;
      out[id] = {
        id,
        family,
        tier,
        name: `${TIER_NAMES[tier]} ${base.name}`,
        damageMul: +(base.damageMul * (1 + 0.06 * i)).toFixed(3),
        swingTimeMul: base.swingTimeMul,
        reach: base.reach,
        color: TIER_COLORS[tier],
      };
    });
  }
  return out;
}

export const WEAPONS: Record<string, Weapon> = build();

export function getWeapon(id: string): Weapon {
  return WEAPONS[id] ?? WEAPONS['sword-wood'];
}

export function tierIndex(tier: Tier): number {
  return TIERS.indexOf(tier);
}
