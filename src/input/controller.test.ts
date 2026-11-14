// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputController } from './input';
import { createFighter } from '../game/fighter';
import { getPersonality } from '../game/data/personalities';
import { getWeapon } from '../game/data/weapons';

function setup() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const input = new InputController(el);
  const self = createFighter('p1', getPersonality('ninja'), getWeapon('sword-wood'), { x: 0, z: 0 });
  const foe = createFighter('p2', getPersonality('tank'), getWeapon('sword-wood'), { x: 0, z: 20 });
  return { input, self, foe };
}

const key = (type: 'keydown' | 'keyup', code: string, opts: KeyboardEventInit = {}) =>
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, ...opts }));

afterEach(() => vi.restoreAllMocks());

describe('InputController', () => {
  it('keeps walking when Shift is pressed while W is held', () => {
    const { input, self, foe } = setup();
    key('keydown', 'KeyW');
    key('keydown', 'KeyW', { shiftKey: true, repeat: true });
    expect(input.intent(self, foe).move.z).toBeCloseTo(1);
    input.dispose();
  });

  it('remembers a press made mid-swing for a moment', () => {
    const { input, self, foe } = setup();
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    self.action = 'quick';
    key('keydown', 'KeyF');
    expect(input.intent(self, foe).super).toBe(true);
    now += 80;
    expect(input.intent(self, foe).super).toBe(true);
    self.action = 'idle';
    expect(input.intent(self, foe).super).toBe(true);
    expect(input.intent(self, foe).super).toBe(false);
    input.dispose();
  });

  it('forgets old presses', () => {
    const { input, self, foe } = setup();
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    self.action = 'hitstun';
    key('keydown', 'Space');
    input.intent(self, foe);
    now += 400;
    expect(input.intent(self, foe).power).toBe(false);
    input.dispose();
  });
});
