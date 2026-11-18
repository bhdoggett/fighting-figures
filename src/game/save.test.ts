import { describe, expect, it } from 'vitest';
import { exportProfile, importProfile, loadProfile, saveProfile, SAVE_KEY } from './save';
import { newProfile } from './progression';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('save', () => {
  it('returns a fresh profile when nothing saved', () => {
    expect(loadProfile(new MemStorage())).toEqual(newProfile());
  });
  it('round-trips', () => {
    const s = new MemStorage();
    const p = { ...newProfile(), level: 7, xp: 33 };
    saveProfile(s, p);
    expect(loadProfile(s)).toEqual(p);
  });
  it('survives corrupt json', () => {
    const s = new MemStorage();
    s.setItem(SAVE_KEY, '{not json');
    expect(loadProfile(s)).toEqual(newProfile());
  });
  it('survives wrong version or missing keys', () => {
    const s = new MemStorage();
    s.setItem(SAVE_KEY, JSON.stringify({ version: 99, level: 3 }));
    expect(loadProfile(s)).toEqual(newProfile());
    s.setItem(SAVE_KEY, JSON.stringify({ version: 1, level: 3 }));
    expect(loadProfile(s)).toEqual(newProfile());
  });
  it('repairs a loadout pointing at something not owned', () => {
    const s = new MemStorage();
    const p = newProfile();
    p.loadout.weapon = 'hammer-diamond';
    saveProfile(s, p);
    expect(loadProfile(s).loadout.weapon).toBe('sword-wood');
  });
  it('export/import round-trips and rejects garbage', () => {
    const p = { ...newProfile(), level: 12 };
    expect(importProfile(exportProfile(p))).toEqual(p);
    expect(importProfile('hello there')).toBeNull();
    expect(importProfile('')).toBeNull();
  });
  it('keeps unclaimed prizes across reloads', () => {
    const s = new MemStorage();
    saveProfile(s, { ...newProfile(), level: 3, pendingPrizes: [2, 3] });
    expect(loadProfile(s).pendingPrizes).toEqual([2, 3]);
  });
  it('older saves without pending prizes load with none', () => {
    const s = new MemStorage();
    const { pendingPrizes: _drop, ...old } = newProfile();
    void _drop;
    s.setItem(SAVE_KEY, JSON.stringify({ ...old, level: 4 }));
    const p = loadProfile(s);
    expect(p.level).toBe(4);
    expect(p.pendingPrizes).toEqual([]);
  });
  it('keeps coins and armor', () => {
    const s = new MemStorage();
    const p = newProfile();
    p.coins = 321;
    p.owned.armor = ['armor-chain'];
    p.loadout.armor = 'armor-chain';
    saveProfile(s, p);
    const loaded = loadProfile(s);
    expect(loaded.coins).toBe(321);
    expect(loaded.loadout.armor).toBe('armor-chain');
  });
  it('old saves get back-paid the coins for levels already reached, once', () => {
    const s = new MemStorage();
    const { coins: _c, coinsBackPaid: _b, ...rest } = newProfile();
    void _c;
    void _b;
    const old = { ...rest, level: 12, owned: { weapons: ['sword-wood'], cosmetics: ['skin-blue'], personalities: ['hothead'] } };
    s.setItem(SAVE_KEY, JSON.stringify(old));
    const p = loadProfile(s);
    // Levels 2..12 = 11 levels x 40, plus the level-10 bonus of 300.
    expect(p.coins).toBe(11 * 40 + 300);
    expect(p.owned.armor).toEqual([]);
    saveProfile(s, { ...p, coins: 5 });
    expect(loadProfile(s).coins).toBe(5);
  });

  it('level-1 old saves get nothing extra', () => {
    const s = new MemStorage();
    const { coins: _c, coinsBackPaid: _b, ...rest } = newProfile();
    void _c;
    void _b;
    s.setItem(SAVE_KEY, JSON.stringify(rest));
    expect(loadProfile(s).coins).toBe(0);
  });

  it('saves made with coins but before back-pay also get it once', () => {
    const s = new MemStorage();
    const { coinsBackPaid: _b, ...rest } = newProfile();
    void _b;
    s.setItem(SAVE_KEY, JSON.stringify({ ...rest, level: 3, coins: 10 }));
    expect(loadProfile(s).coins).toBe(10 + 80);
  });
});
