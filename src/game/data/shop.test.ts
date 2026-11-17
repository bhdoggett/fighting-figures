import { describe, expect, it } from 'vitest';
import { ARMOR, SHOP_WEAPONS, SHOP_ITEMS, getArmor } from './shop';
import { getWeapon, WEAPONS } from './weapons';
import { COINS_PER_LEVEL } from '../progression';

const BANNED = /kill|die|dead|death/i;

describe('shop data', () => {
  it('one level is not enough for anything, two levels buys the cheapest item', () => {
    const cheapest = Math.min(...SHOP_ITEMS.map((i) => i.price));
    expect(cheapest).toBeGreaterThan(COINS_PER_LEVEL);
    expect(cheapest).toBeLessThanOrEqual(COINS_PER_LEVEL * 2);
  });

  it('better armor costs more and every armor has a speed catch', () => {
    const sorted = [...ARMOR].sort((a, b) => a.price - b.price);
    for (const a of ARMOR) {
      expect(a.hp).toBeGreaterThan(0);
      expect(a.slow).toBeGreaterThan(0);
    }
    const ratio = (a: (typeof ARMOR)[number]) => a.hp / a.slow;
    expect(ratio(sorted[sorted.length - 1])).toBeGreaterThan(ratio(sorted[0]));
  });

  it('shop weapons are real weapons but never level-up prizes', () => {
    for (const id of Object.keys(SHOP_WEAPONS)) {
      expect(getWeapon(id).id).toBe(id);
      expect(id in WEAPONS).toBe(false);
    }
  });

  it('includes maces, flaming swords and poison darts', () => {
    const names = Object.values(SHOP_WEAPONS).map((w) => w.name);
    expect(names).toEqual(expect.arrayContaining(['Mace', 'Flaming Sword', 'Poison Darts']));
    expect(getWeapon('shop-darts').ranged).toBe(true);
    expect(getWeapon('shop-flamesword').effect).toBe('burn');
    expect(getWeapon('shop-darts').effect).toBe('poison');
  });

  it('every item has a name and catch without banned words', () => {
    for (const i of SHOP_ITEMS) {
      expect(`${i.name} ${i.good} ${i.bad}`).not.toMatch(BANNED);
      expect(i.bad.length).toBeGreaterThan(0);
    }
    expect(getArmor('armor-leather')?.name).toBe('Leather Vest');
    expect(getArmor('nope')).toBeUndefined();
  });
});
