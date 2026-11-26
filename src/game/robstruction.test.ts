import { describe, expect, it } from 'vitest';
import { PERSONALITIES, STARTER_PERSONALITIES } from './data/personalities';
import { getWeapon } from './data/weapons';
import { createMatch } from './match';
import { newProfile } from './progression';
import { loadProfile, saveProfile, SAVE_KEY } from './save';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('Robstruction', () => {
  const r = PERSONALITIES.robstruction;

  it('is a full fighter with 10 stat points and a claw flurry', () => {
    expect(r.name).toBe('Robstruction');
    expect(r.speed + r.power + r.health).toBe(10);
    expect(r.powerMove).toBe('clawFlurry');
    expect(r.signatureWeapon).toBe('sig-claws');
  });

  it('fights with his own claws and arm knives', () => {
    const w = getWeapon('sig-claws');
    expect(w.name).toBe('Claws & Arm Knives');
    expect(w.family).toBe('claws');
    expect(w.swingTimeMul).toBeLessThan(1);
  });

  it('always uses his claws in a match, whatever weapon is picked', () => {
    const m = createMatch(
      { personality: 'robstruction', weapon: 'hammer-diamond', skin: 'skin-blue' },
      { personality: 'tank', weapon: 'sword-wood', skin: 'skin-red' },
    );
    expect(m.fighters[0].weapon.id).toBe('sig-claws');
    expect(m.fighters[1].weapon.id).toBe('sword-wood');
  });

  it('is unlocked for everyone, including old saves', () => {
    expect(STARTER_PERSONALITIES).toContain('robstruction');
    expect(newProfile().owned.personalities).toContain('robstruction');
    const s = new MemStorage();
    const p = newProfile();
    p.owned.personalities = ['hothead', 'ninja'];
    saveProfile(s, p);
    expect(loadProfile(s).owned.personalities).toContain('robstruction');
    void SAVE_KEY;
  });

  it('lines stay friendly', () => {
    const all = [...r.lines.taunt, ...r.lines.hit, ...r.lines.ko, ...r.lines.win];
    for (const line of all) expect(line).not.toMatch(/kill|die|dead|death|blood/i);
  });
});
