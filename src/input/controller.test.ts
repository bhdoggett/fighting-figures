// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputController } from './input';
import { createFighter } from '../game/fighter';
import { getPersonality } from '../game/data/personalities';
import { getWeapon } from '../game/data/weapons';

function setup() {
  const input = new InputController();
  const self = createFighter('p1', getPersonality('ninja'), getWeapon('sword-wood'), { x: 0, z: 0 });
  const foe = createFighter('p2', getPersonality('tank'), getWeapon('sword-wood'), { x: 0, z: 20 });
  return { input, self, foe };
}

const key = (type: 'keydown' | 'keyup', code: string, opts: KeyboardEventInit = {}) =>
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, ...opts }));

afterEach(() => vi.restoreAllMocks());

describe('InputController (lock-on)', () => {
  it('always faces the opponent', () => {
    const { input, self, foe } = setup();
    foe.pos = { x: 10, z: 0 };
    expect(input.intent(self, foe).facing).toBeCloseTo(Math.PI / 2);
    input.dispose();
  });

  it('camera locks on to the opponent', () => {
    const { input, self, foe } = setup();
    foe.pos = { x: -10, z: 0 };
    input.cameraYaw = 0;
    for (let i = 0; i < 60; i++) input.updateCamera(self, foe, 1 / 60);
    expect(input.cameraYaw).toBeCloseTo(-Math.PI / 2, 2);
    input.dispose();
  });

  it('camera holds still while the opponent is KO\'d', () => {
    const { input, self, foe } = setup();
    foe.pos = { x: 10, z: 0 };
    foe.action = 'ko';
    input.cameraYaw = 0.3;
    for (let i = 0; i < 60; i++) input.updateCamera(self, foe, 1 / 60);
    expect(input.cameraYaw).toBe(0.3);
    expect(input.intent(self, foe).facing).toBe(0.3);
    input.dispose();
  });

  it('right arrow moves sideways around the opponent', () => {
    const { input, self, foe } = setup();
    input.cameraYaw = 0;
    key('keydown', 'ArrowRight');
    const it = input.intent(self, foe);
    expect(it.move.x).toBeCloseTo(-1);
    expect(it.move.z).toBeCloseTo(0);
    key('keyup', 'ArrowRight');
    expect(input.intent(self, foe).move.x).toBe(0);
    input.dispose();
  });

  it('W, A, D dodge and S ducks', () => {
    const { input, self, foe } = setup();
    key('keydown', 'KeyA');
    expect(input.intent(self, foe).dodge).toBe('left');
    key('keydown', 'KeyW');
    expect(input.intent(self, foe).dodge).toBe('forward');
    key('keydown', 'KeyS');
    expect(input.intent(self, foe).duck).toBe(true);
    key('keyup', 'KeyS');
    expect(input.intent(self, foe).duck).toBe(false);
    input.dispose();
  });

  it('Q dashes', () => {
    const { input, self, foe } = setup();
    key('keydown', 'KeyQ');
    expect(input.intent(self, foe).dash).toBe(true);
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

  it('does nothing while disabled (paused)', () => {
    const { input, self, foe } = setup();
    input.enabled = false;
    key('keydown', 'KeyE');
    input.enabled = true;
    expect(input.intent(self, foe).quick).toBe(false);
    input.dispose();
  });

  it('touch joystick moves the fighter', () => {
    const { input, self, foe } = setup();
    input.setStick(0, 1);
    expect(input.intent(self, foe).move.z).toBeCloseTo(1);
    input.setStick(0, 0);
    expect(input.intent(self, foe).move.z).toBe(0);
    input.dispose();
  });

  it('touch buttons trigger moves', () => {
    const { input, self, foe } = setup();
    input.tap('power');
    expect(input.intent(self, foe).power).toBe(true);
    input.tap('dodge-left');
    expect(input.intent(self, foe).dodge).toBe('left');
    input.setTouchDuck(true);
    expect(input.intent(self, foe).duck).toBe(true);
    input.setTouchDuck(false);
    expect(input.intent(self, foe).duck).toBe(false);
    input.dispose();
  });
});
