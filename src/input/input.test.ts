import { describe, expect, it } from 'vitest';
import { mapKey, moveFromKeys } from './input';

describe('mapKey', () => {
  it('maps the spec controls', () => {
    expect(mapKey('ArrowLeft', false)).toBe('dodge-left');
    expect(mapKey('ArrowRight', false)).toBe('dodge-right');
    expect(mapKey('ArrowUp', false)).toBe('dodge-forward');
    expect(mapKey('KeyA', true)).toBe('dodge-left');
    expect(mapKey('KeyD', true)).toBe('dodge-right');
    expect(mapKey('KeyW', true)).toBe('dodge-forward');
    expect(mapKey('KeyS', true)).toBe('dodge-back');
    expect(mapKey('KeyA', false)).toBe('move-left');
    expect(mapKey('KeyW', false)).toBe('move-forward');
    expect(mapKey('KeyC', false)).toBe('duck');
    expect(mapKey('ArrowDown', false)).toBe('duck');
    expect(mapKey('KeyF', false)).toBe('super');
    expect(mapKey('Enter', false)).toBe('super');
    expect(mapKey('Space', false)).toBe('power');
    expect(mapKey('KeyE', false)).toBe('quick');
    expect(mapKey('KeyQ', false)).toBe('face-foe');
    expect(mapKey('KeyZ', false)).toBeNull();
  });
});

describe('moveFromKeys', () => {
  it('moves forward along camera yaw', () => {
    const m = moveFromKeys(new Set(['move-forward']), 0);
    expect(m.x).toBeCloseTo(0);
    expect(m.z).toBeCloseTo(1);
  });
  it('moves right relative to camera', () => {
    const m = moveFromKeys(new Set(['move-right']), 0);
    expect(m.x).toBeCloseTo(-1);
    expect(m.z).toBeCloseTo(0);
  });
  it('normalizes diagonals', () => {
    const m = moveFromKeys(new Set(['move-forward', 'move-right']), 0);
    expect(Math.hypot(m.x, m.z)).toBeCloseTo(1);
  });
});
