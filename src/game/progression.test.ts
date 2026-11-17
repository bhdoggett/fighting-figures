import { describe, expect, it } from 'vitest';
import { applyXp, buyItem, claimPrize, coinsForLevels, finishBattle, newProfile, offerPrizes, xpForBattle, xpToNext } from './progression';
import { MAX_LEVEL } from './data/ranks';
import { WEAPONS } from './data/weapons';
import { COSMETICS } from './data/cosmetics';
import { PERSONALITIES } from './data/personalities';

function seq(...vals: number[]) {
  let i = 0;
  return () => vals[i++ % vals.length];
}

describe('xpForBattle', () => {
  it('gives xp for a loss with nothing', () => {
    expect(xpForBattle({ won: false, draw: false, kos: 0, supersLanded: 0 })).toBe(40);
  });
  it('adds bonuses', () => {
    expect(xpForBattle({ won: true, draw: false, kos: 3, supersLanded: 1 })).toBe(40 + 60 + 24 + 10);
    expect(xpForBattle({ won: false, draw: true, kos: 1, supersLanded: 0 })).toBe(40 + 25 + 8);
  });
});

describe('pacing', () => {
  it('reaching Obsidian (level 25) takes about 100+ typical battles', () => {
    let total = 0;
    for (let l = 1; l < 25; l++) total += xpToNext(l);
    // A typical 3-minute battle: ~9 KOs, wins a bit over half the time.
    const typical = 40 + 0.6 * 60 + 9 * 8 + 10;
    expect(total / typical).toBeGreaterThanOrEqual(100);
    expect(total / typical).toBeLessThanOrEqual(140);
  });
  it('first level-up comes after one battle', () => {
    expect(xpForBattle({ won: false, draw: false, kos: 2, supersLanded: 0 })).toBeGreaterThanOrEqual(xpToNext(1) - 50);
    expect(xpForBattle({ won: true, draw: false, kos: 0, supersLanded: 0 })).toBeGreaterThanOrEqual(xpToNext(1));
  });
});

describe('applyXp', () => {
  it('levels up once', () => {
    const p = newProfile();
    const { profile, levelsGained } = applyXp(p, xpToNext(1));
    expect(profile.level).toBe(2);
    expect(profile.xp).toBe(0);
    expect(levelsGained).toEqual([2]);
  });
  it('reports every level gained in one battle', () => {
    const p = newProfile();
    const { profile, levelsGained } = applyXp(p, xpToNext(1) + xpToNext(2) + 10);
    expect(levelsGained).toEqual([2, 3]);
    expect(profile.level).toBe(3);
    expect(profile.xp).toBe(10);
  });
  it('caps at max level', () => {
    const p = { ...newProfile(), level: MAX_LEVEL - 1 };
    const { profile, levelsGained } = applyXp(p, 1_000_000);
    expect(profile.level).toBe(MAX_LEVEL);
    expect(levelsGained).toEqual([MAX_LEVEL]);
    expect(profile.xp).toBe(0);
  });
  it('does not mutate input', () => {
    const p = newProfile();
    applyXp(p, 500);
    expect(p.level).toBe(1);
  });
});

describe('offerPrizes', () => {
  it('offers 3 distinct unowned prizes', () => {
    const p = newProfile();
    const prizes = offerPrizes(p, 2, seq(0.1, 0.5, 0.9, 0.3, 0.7));
    expect(prizes).toHaveLength(3);
    expect(new Set(prizes.map((x) => x.id)).size).toBe(3);
    for (const prize of prizes) {
      expect([...p.owned.weapons, ...p.owned.cosmetics, ...p.owned.personalities]).not.toContain(prize.id);
    }
  });
  it('offers a locked personality first on rank-up levels', () => {
    const p = newProfile();
    const prizes = offerPrizes(p, 5, Math.random);
    expect(prizes[0].kind).toBe('personality');
  });
  it('still offers 3 when everything is owned', () => {
    const p = newProfile();
    p.owned.weapons = Object.keys(WEAPONS);
    p.owned.cosmetics = COSMETICS.map((c) => c.id);
    p.owned.personalities = Object.keys(PERSONALITIES) as typeof p.owned.personalities;
    const prizes = offerPrizes(p, 29, Math.random);
    expect(prizes).toHaveLength(3);
    expect(prizes.every((x) => x.kind === 'trophy')).toBe(true);
  });
  it('does not offer diamond weapons at low levels', () => {
    const p = newProfile();
    for (let i = 0; i < 50; i++) {
      for (const prize of offerPrizes(p, 2, Math.random)) {
        if (prize.kind === 'weapon') expect(prize.id).toMatch(/-wood$|-stone$/);
      }
    }
  });
});

describe('pending prizes', () => {
  it('finishBattle queues one prize per level gained and saves stats', () => {
    const p = { ...newProfile(), xp: 95 };
    const { profile, levelsGained, xp } = finishBattle(p, { won: true, draw: false, kos: 30, supersLanded: 0 });
    expect(xp).toBe(40 + 60 + 240);
    expect(levelsGained).toEqual([2, 3]);
    expect(profile.pendingPrizes).toEqual([2, 3]);
    expect(profile.battles).toBe(1);
    expect(profile.wins).toBe(1);
  });
  it('claiming a prize removes the first pending level', () => {
    const p = { ...newProfile(), pendingPrizes: [2, 3] };
    const prize = offerPrizes(p, 2, Math.random)[0];
    const next = claimPrize(p, prize);
    expect(next.pendingPrizes).toEqual([3]);
  });
});

describe('figure coins', () => {
  it('pays 40 per level and a 300 bonus at levels 10 and 20', () => {
    expect(coinsForLevels([2])).toBe(40);
    expect(coinsForLevels([2, 3])).toBe(80);
    expect(coinsForLevels([10])).toBe(340);
    expect(coinsForLevels([19, 20, 21])).toBe(420);
  });

  it('finishBattle adds coins for levels gained', () => {
    const p = { ...newProfile(), xp: 95 };
    const { profile, coins } = finishBattle(p, { won: true, draw: false, kos: 30, supersLanded: 0 });
    expect(coins).toBe(80);
    expect(profile.coins).toBe(80);
  });

  it('buys an item when you can afford it and equips it', () => {
    const p = { ...newProfile(), coins: 100 };
    const bought = buyItem(p, 'armor-leather');
    expect(bought?.coins).toBe(25);
    expect(bought?.owned.armor).toContain('armor-leather');
    expect(bought?.loadout.armor).toBe('armor-leather');
    const weapon = buyItem({ ...newProfile(), coins: 150 }, 'shop-mace');
    expect(weapon?.owned.weapons).toContain('shop-mace');
    expect(weapon?.loadout.weapon).toBe('shop-mace');
  });

  it('refuses when too poor or already owned', () => {
    expect(buyItem({ ...newProfile(), coins: 10 }, 'armor-leather')).toBeNull();
    const p = buyItem({ ...newProfile(), coins: 500 }, 'armor-leather')!;
    expect(buyItem(p, 'armor-leather')).toBeNull();
    expect(buyItem({ ...newProfile(), coins: 9999 }, 'not-a-thing')).toBeNull();
  });
});
