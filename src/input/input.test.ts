import { describe, expect, it } from 'vitest';
import { mapKey, moveFromKeys } from './input';

describe('mapKey', () => {
  it('maps the lock-on keyboard controls', () => {
    expect(mapKey('ArrowUp')).toBe('move-forward');
    expect(mapKey('ArrowDown')).toBe('move-back');
    expect(mapKey('ArrowLeft')).toBe('move-left');
    expect(mapKey('ArrowRight')).toBe('move-right');
    expect(mapKey('KeyW')).toBe('dodge-forward');
    expect(mapKey('KeyA')).toBe('dodge-left');
    expect(mapKey('KeyD')).toBe('dodge-right');
    expect(mapKey('KeyS')).toBe('duck');
    expect(mapKey('KeyE')).toBe('quick');
    expect(mapKey('Space')).toBe('power');
    expect(mapKey('KeyQ')).toBe('dash');
    expect(mapKey('KeyR')).toBeNull();
    expect(mapKey('KeyF')).toBe('super');
    expect(mapKey('Enter')).toBe('super');
    expect(mapKey('KeyC')).toBeNull();
  });
});

describe('moveFromKeys', () => {
  it('moves toward the opponent along the camera yaw', () => {
    const m = moveFromKeys(new Set(['move-forward']), 0);
    expect(m.x).toBeCloseTo(0);
    expect(m.z).toBeCloseTo(1);
  });
  it('circles right relative to the camera', () => {
    const m = moveFromKeys(new Set(['move-right']), 0);
    expect(m.x).toBeCloseTo(-1);
    expect(m.z).toBeCloseTo(0);
  });
  it('walks backward a bit slower', () => {
    const m = moveFromKeys(new Set(['move-back']), 0);
    expect(m.z).toBeCloseTo(-0.8);
  });
  it('caps diagonals at full speed', () => {
    const m = moveFromKeys(new Set(['move-forward', 'move-right']), 0);
    expect(Math.hypot(m.x, m.z)).toBeCloseTo(1);
  });
});
