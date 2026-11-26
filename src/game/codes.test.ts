import { describe, expect, it } from 'vitest';
import { CODES, redeemCode } from './codes';
import { newProfile } from './progression';

describe('codes', () => {
  it('robrob unlocks Robstruction and picks him', () => {
    const r = redeemCode(newProfile(), 'robrob');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.owned.personalities).toContain('robstruction');
    expect(r.profile.loadout.personality).toBe('robstruction');
    expect(r.bundle.name).toBe('Robstruction');
  });

  it('ignores capitals and spaces', () => {
    expect(redeemCode(newProfile(), '  Rob Rob ').ok).toBe(true);
  });

  it('rejects unknown codes and codes already used', () => {
    expect(redeemCode(newProfile(), 'nope')).toEqual({ ok: false, reason: 'unknown' });
    expect(redeemCode(newProfile(), '')).toEqual({ ok: false, reason: 'unknown' });
    const first = redeemCode(newProfile(), 'robrob');
    if (!first.ok) throw new Error('expected ok');
    expect(redeemCode(first.profile, 'ROBROB')).toEqual({ ok: false, reason: 'used' });
  });

  it('codes are stored scrambled, not as plain text', () => {
    expect(Object.keys(CODES)).not.toContain('robrob');
  });
});
