import { describe, expect, it } from 'vitest';
import { loadSettings, saveSettings, SETTINGS_KEY } from './settings';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('settings', () => {
  it('defaults to right-handed', () => {
    expect(loadSettings(new MemStorage())).toEqual({ leftie: false });
  });
  it('remembers leftie', () => {
    const s = new MemStorage();
    saveSettings(s, { leftie: true });
    expect(loadSettings(s).leftie).toBe(true);
  });
  it('survives garbage', () => {
    const s = new MemStorage();
    s.setItem(SETTINGS_KEY, '{nope');
    expect(loadSettings(s)).toEqual({ leftie: false });
  });
});
