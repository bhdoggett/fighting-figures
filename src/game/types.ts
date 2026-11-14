export type PersonalityId = 'hothead' | 'ninja' | 'tank' | 'trickster' | 'robot' | 'wizard';

export type PowerMoveKind = 'firePunch' | 'teleportSlash' | 'groundPound' | 'doubleHit' | 'laserSpin' | 'zapBolt';

export interface Personality {
  id: PersonalityId;
  name: string;
  blurb: string;
  speed: number;
  power: number;
  health: number;
  superChargeSec: number;
  /** 'ko' = instant KO on hit, number = fraction of target max health */
  superDamage: 'ko' | number;
  powerMove: PowerMoveKind;
  powerMoveName: string;
  lines: { taunt: string[]; hit: string[]; ko: string[]; win: string[] };
  color: number;
}

export type WeaponFamily = 'sword' | 'hammer' | 'daggers' | 'spear';
export type Tier = 'wood' | 'stone' | 'iron' | 'gold' | 'diamond';

export interface Weapon {
  id: string;
  family: WeaponFamily;
  tier: Tier;
  name: string;
  damageMul: number;
  swingTimeMul: number;
  reach: number;
  color: number;
}

export type CosmeticSlot = 'hat' | 'cape' | 'skin';

export interface Cosmetic {
  id: string;
  slot: CosmeticSlot;
  name: string;
  color: number;
  /** hats only: which shape to build */
  shape?: 'cap' | 'crown' | 'pirate' | 'tophat' | 'helmet' | 'bunny';
}

export interface Loadout {
  personality: PersonalityId;
  weapon: string;
  skin: string;
  hat?: string;
  cape?: string;
}

export interface Rank {
  name: string;
  minLevel: number;
  color: string;
}
