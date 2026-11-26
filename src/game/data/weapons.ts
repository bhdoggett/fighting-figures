import type { BasicFamily, Tier, Weapon, WeaponFamily } from '../types';
import { SHOP_WEAPONS } from './shop';

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

export const FAMILIES: Record<BasicFamily, FamilyBase> = {
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
  mace: { good: 'Heavy, dizzying hits', bad: 'Slow swing' },
  darts: { good: 'Throws poison darts', bad: 'Weak up close' },
  flamesword: { good: 'Hits set foes on fire', bad: 'A bit slow' },
  frosthammer: { good: 'Hits freeze foes slow', bad: 'Very slow swing' },
  thunderspear: { good: 'Long reach, every 3rd hit zaps', bad: 'Pricey!' },
  cornsword: { good: 'Balanced (and very festive)', bad: 'Nothing special' },
  candycane: { good: 'Balanced (and very sweet)', bad: 'Nothing special' },
  claws: { good: 'Super fast, both hands slash', bad: 'Short reach' },
};

function build(): Record<string, Weapon> {
  const out: Record<string, Weapon> = {};
  for (const family of Object.keys(FAMILIES) as BasicFamily[]) {
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
  return WEAPONS[id] ?? SHOP_WEAPONS[id] ?? EVENT_WEAPONS[id] ?? SIGNATURE_WEAPONS[id] ?? WEAPONS['sword-wood'];
}

/** Holiday weapons: given away during events, never prizes or shop items. */
export const EVENT_WEAPONS: Record<string, Weapon> = {
  'event-candycane': { id: 'event-candycane', family: 'candycane', tier: 'wood', name: 'Candy Cane Sword', damageMul: 1, swingTimeMul: 1, reach: 1.6, color: 0xe63946 },
  'event-cornsword': { id: 'event-cornsword', family: 'cornsword', tier: 'wood', name: 'Cornstalk Sword', damageMul: 1, swingTimeMul: 1, reach: 1.6, color: 0xffd23f },
}

export function tierIndex(tier: Tier): number {
  return TIERS.indexOf(tier);
}

/** Fighters' own built-in weapons. */
export const SIGNATURE_WEAPONS: Record<string, Weapon> = {
  'sig-claws': { id: 'sig-claws', family: 'claws', tier: 'iron', name: 'Claws & Arm Knives', damageMul: 0.85, swingTimeMul: 0.7, reach: 1.25, color: 0xc8ccd4 },
};
