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

export const CHRISTMAS_ITEMS = ['skin-gingerbread', 'hat-reindeer', 'event-candycane'];

/** True in December, starting the day after the Thanksgiving gift window ends. */
export function isChristmasMonth(now: Date): boolean {
  if (now.getMonth() !== 11) return false;
  const thanksgivingEnds = dayNumber(thanksgivingDate(now.getFullYear())) + WINDOW_DAYS;
  return dayNumber(now) > thanksgivingEnds;
}

interface HolidayEvent {
  greeting: string;
  items: string[];
  active: (now: Date) => boolean;
}

const EVENTS: HolidayEvent[] = [
  { greeting: 'Happy Thanksgiving!', items: THANKSGIVING_ITEMS, active: isThanksgivingWindow },
  { greeting: 'Merry Christmas!', items: CHRISTMAS_ITEMS, active: isChristmasMonth },
];

export interface SeasonalGift {
  id: string;
  name: string;
  /** Which holiday it's from, e.g. "Merry Christmas!" */
  event: string;
}

/** Give any holiday items the player should have today. Returns what was newly given. */
export function grantSeasonal(p: Profile, now: Date): { profile: Profile; granted: SeasonalGift[] } {
  const granted: SeasonalGift[] = [];
  const cosmetics = [...p.owned.cosmetics];
  const weapons = [...p.owned.weapons];
  for (const ev of EVENTS) {
    if (!ev.active(now)) continue;
    for (const id of ev.items) {
      const cosmetic = getCosmetic(id);
      if (cosmetic && !cosmetics.includes(id)) {
        cosmetics.push(id);
        granted.push({ id, name: cosmetic.name, event: ev.greeting });
      } else if (!cosmetic && !weapons.includes(id)) {
        weapons.push(id);
        granted.push({ id, name: getWeapon(id).name, event: ev.greeting });
      }
    }
  }
  if (granted.length === 0) return { profile: p, granted };
  return { profile: { ...p, owned: { ...p.owned, cosmetics, weapons } }, granted };
}
