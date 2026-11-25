import type { Profile } from './progression';
import { getCosmetic } from './data/cosmetics';
import { getWeapon } from './data/weapons';

export const THANKSGIVING_ITEMS = ['hat-pilgrim', 'cape-turkey', 'event-cornsword'];
const WINDOW_DAYS = 5;

/** US Thanksgiving: the fourth Thursday of November (local date). */
export function thanksgivingDate(year: number): Date {
  const nov1 = new Date(year, 10, 1);
  const firstThursday = 1 + ((4 - nov1.getDay() + 7) % 7);
  return new Date(year, 10, firstThursday + 21);
}

function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** True from 5 days before through 5 days after Thanksgiving. */
export function isThanksgivingWindow(now: Date): boolean {
  const diff = dayNumber(now) - dayNumber(thanksgivingDate(now.getFullYear()));
  return Math.abs(diff) <= WINDOW_DAYS;
}

export interface SeasonalGift {
  id: string;
  name: string;
}

/** Give any holiday items the player should have today. Returns what was newly given. */
export function grantSeasonal(p: Profile, now: Date): { profile: Profile; granted: SeasonalGift[] } {
  if (!isThanksgivingWindow(now)) return { profile: p, granted: [] };
  const granted: SeasonalGift[] = [];
  const cosmetics = [...p.owned.cosmetics];
  const weapons = [...p.owned.weapons];
  for (const id of THANKSGIVING_ITEMS) {
    const cosmetic = getCosmetic(id);
    if (cosmetic && !cosmetics.includes(id)) {
      cosmetics.push(id);
      granted.push({ id, name: cosmetic.name });
    } else if (!cosmetic && !weapons.includes(id)) {
      weapons.push(id);
      granted.push({ id, name: getWeapon(id).name });
    }
  }
  if (granted.length === 0) return { profile: p, granted };
  return { profile: { ...p, owned: { ...p.owned, cosmetics, weapons } }, granted };
}
