import type { Armor, Weapon } from '../types';

export const ARMOR: Armor[] = [
  { id: 'armor-leather', name: 'Leather Vest', price: 75, hp: 10, slow: 0.03, color: 0x8a5a2b },
  { id: 'armor-chain', name: 'Chainmail', price: 200, hp: 25, slow: 0.08, color: 0xb0b6be },
  { id: 'armor-plate', name: 'Knight Plate', price: 450, hp: 45, slow: 0.15, color: 0xe0e4ea },
  { id: 'armor-dragon', name: 'Dragon Scale', price: 900, hp: 50, slow: 0.05, color: 0x2ec27e },
];

/** Shop-only weapons. Not tiered, never offered as level-up prizes. */
export const SHOP_WEAPONS: Record<string, Weapon> = {
  'shop-mace': { id: 'shop-mace', family: 'mace', tier: 'iron', name: 'Mace', damageMul: 1.3, swingTimeMul: 1.3, reach: 1.5, color: 0x9a9aa6, effect: 'dizzy' },
  'shop-darts': { id: 'shop-darts', family: 'darts', tier: 'iron', name: 'Poison Darts', damageMul: 0.6, swingTimeMul: 0.8, reach: 1.0, color: 0x7ed957, effect: 'poison', ranged: true },
  'shop-flamesword': { id: 'shop-flamesword', family: 'flamesword', tier: 'gold', name: 'Flaming Sword', damageMul: 1.05, swingTimeMul: 1.15, reach: 1.6, color: 0xff6b1a, effect: 'burn' },
  'shop-frosthammer': { id: 'shop-frosthammer', family: 'frosthammer', tier: 'diamond', name: 'Frost Hammer', damageMul: 1.4, swingTimeMul: 1.45, reach: 1.7, color: 0x8fe3ff, effect: 'slow' },
  'shop-thunderspear': { id: 'shop-thunderspear', family: 'thunderspear', tier: 'diamond', name: 'Thunder Spear', damageMul: 1.0, swingTimeMul: 1.0, reach: 2.8, color: 0xffe14d, effect: 'zap' },
};

const WEAPON_PRICES: Record<string, number> = {
  'shop-mace': 150,
  'shop-darts': 350,
  'shop-flamesword': 500,
  'shop-frosthammer': 750,
  'shop-thunderspear': 1000,
};

const WEAPON_TEXT: Record<string, { good: string; bad: string }> = {
  'shop-mace': { good: 'Big hits that make foes dizzy', bad: 'Slow swing' },
  'shop-darts': { good: 'Quick hit throws a poison dart', bad: 'Weak up close; duck dodges darts' },
  'shop-flamesword': { good: 'Hits set foes on fire', bad: 'A bit slower than a sword' },
  'shop-frosthammer': { good: 'Huge hits that freeze foes slow', bad: 'Very slow swing' },
  'shop-thunderspear': { good: 'Long reach; every 3rd hit zaps', bad: 'Costs the most' },
};

export type ShopItem = {
  kind: 'armor' | 'weapon';
  id: string;
  name: string;
  price: number;
  good: string;
  bad: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  ...ARMOR.map((a) => ({
    kind: 'armor' as const,
    id: a.id,
    name: a.name,
    price: a.price,
    good: `+${a.hp} health`,
    bad: `${Math.round(a.slow * 100)}% slower`,
  })),
  ...Object.values(SHOP_WEAPONS).map((w) => ({
    kind: 'weapon' as const,
    id: w.id,
    name: w.name,
    price: WEAPON_PRICES[w.id],
    ...WEAPON_TEXT[w.id],
  })),
].sort((a, b) => a.price - b.price);

export function getArmor(id: string | undefined): Armor | undefined {
  return id ? ARMOR.find((a) => a.id === id) : undefined;
}

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}
