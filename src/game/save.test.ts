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
});
