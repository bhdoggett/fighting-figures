import { describe, expect, it } from 'vitest';
import { grantSeasonal, isThanksgivingWindow, thanksgivingDate, THANKSGIVING_ITEMS } from './seasonal';
import { newProfile, offerPrizes } from './progression';
import { SHOP_ITEMS } from './data/shop';
import { getWeapon } from './data/weapons';
import { getCosmetic } from './data/cosmetics';

const d = (s: string) => new Date(`${s}T12:00:00`);

describe('thanksgiving', () => {
  it('is the fourth Thursday of November', () => {
    expect(thanksgivingDate(2026).getDate()).toBe(26);
    expect(thanksgivingDate(2027).getDate()).toBe(25);
    expect(thanksgivingDate(2028).getDate()).toBe(23);
  });

  it('window is 5 days before through 5 days after', () => {
    expect(isThanksgivingWindow(d('2026-11-20'))).toBe(false);
    expect(isThanksgivingWindow(d('2026-11-21'))).toBe(true);
    expect(isThanksgivingWindow(d('2026-11-26'))).toBe(true);
    expect(isThanksgivingWindow(d('2026-12-01'))).toBe(true);
    expect(isThanksgivingWindow(d('2026-12-02'))).toBe(false);
    expect(isThanksgivingWindow(d('2026-07-04'))).toBe(false);
  });

  it('grants the outfit once during the window', () => {
    const { profile, granted } = grantSeasonal(newProfile(), d('2026-11-25'));
    expect(granted.map((g) => g.id).sort()).toEqual([...THANKSGIVING_ITEMS].sort());
    expect(profile.owned.cosmetics).toEqual(expect.arrayContaining(['hat-pilgrim', 'cape-turkey']));
    expect(profile.owned.weapons).toContain('event-cornsword');
    expect(grantSeasonal(profile, d('2026-11-27')).granted).toEqual([]);
  });

  it('grants nothing outside the window', () => {
    expect(grantSeasonal(newProfile(), d('2026-10-01')).granted).toEqual([]);
  });

  it('items are real and never offered as prizes or in the shop', () => {
    expect(getWeapon('event-cornsword').name).toBe('Cornstalk Sword');
    expect(getCosmetic('hat-pilgrim')?.name).toBe('Pilgrim Hat');
    expect(getCosmetic('cape-turkey')?.name).toBe('Turkey Cape');
    for (let i = 0; i < 100; i++) {
      for (const prize of offerPrizes(newProfile(), 2 + (i % 28), Math.random)) {
        expect(THANKSGIVING_ITEMS).not.toContain(prize.id);
      }
    }
    expect(SHOP_ITEMS.map((s) => s.id)).not.toEqual(expect.arrayContaining(['event-cornsword']));
  });
});
