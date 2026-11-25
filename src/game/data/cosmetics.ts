import type { Cosmetic } from '../types';

export const COSMETICS: Cosmetic[] = [
  { id: 'skin-blue', slot: 'skin', name: 'Blue Buddy', color: 0x3a86ff },
  { id: 'skin-red', slot: 'skin', name: 'Red Rocket', color: 0xff4d6d },
  { id: 'skin-green', slot: 'skin', name: 'Creeper Green', color: 0x2ec27e },
  { id: 'skin-yellow', slot: 'skin', name: 'Banana Yellow', color: 0xffd23f },
  { id: 'skin-pink', slot: 'skin', name: 'Bubblegum', color: 0xff8fd8 },
  { id: 'skin-orange', slot: 'skin', name: 'Pumpkin', color: 0xff8c42 },
  { id: 'skin-white', slot: 'skin', name: 'Snowball', color: 0xf1f1f1 },
  { id: 'skin-black', slot: 'skin', name: 'Midnight', color: 0x2b2d42 },
  { id: 'hat-cap', slot: 'hat', name: 'Baseball Cap', color: 0xff4d6d, shape: 'cap' },
  { id: 'hat-pirate', slot: 'hat', name: 'Pirate Hat', color: 0x1d1b2f, shape: 'pirate' },
  { id: 'hat-crown', slot: 'hat', name: 'Royal Crown', color: 0xffc93c, shape: 'crown' },
  { id: 'hat-tophat', slot: 'hat', name: 'Fancy Top Hat', color: 0x2b2d42, shape: 'tophat' },
  { id: 'hat-helmet', slot: 'hat', name: 'Knight Helmet', color: 0xc0c0c8, shape: 'helmet' },
  { id: 'hat-bunny', slot: 'hat', name: 'Bunny Ears', color: 0xffffff, shape: 'bunny' },
  { id: 'cape-red', slot: 'cape', name: 'Hero Cape', color: 0xe63946 },
  { id: 'cape-blue', slot: 'cape', name: 'Ocean Cape', color: 0x1d70d6 },
  { id: 'cape-purple', slot: 'cape', name: 'Wizard Cape', color: 0x7b2cbf },
  { id: 'cape-gold', slot: 'cape', name: 'Golden Cape', color: 0xffc93c },
  { id: 'cape-green', slot: 'cape', name: 'Leafy Cape', color: 0x55a630 },
  { id: 'hat-pilgrim', slot: 'hat', name: 'Pilgrim Hat', color: 0x1d1b2f, shape: 'pilgrim', event: true },
  { id: 'cape-turkey', slot: 'cape', name: 'Turkey Cape', color: 0x8a5a2b, style: 'turkey', event: true },
];

export function getCosmetic(id: string | undefined): Cosmetic | undefined {
  if (!id) return undefined;
  return COSMETICS.find((c) => c.id === id);
}
