import { emptyIntent, type FighterState, type Intent, type Vec2 } from '../game/fighter';

export type KeyAction =
  | 'move-forward'
  | 'move-back'
  | 'move-left'
  | 'move-right'
  | 'dodge-left'
  | 'dodge-right'
  | 'dodge-forward'
  | 'duck'
  | 'super'
  | 'power'
  | 'quick'
  | 'dash';

const KEYS: Record<string, KeyAction> = {
  ArrowUp: 'move-forward',
  ArrowDown: 'move-back',
  ArrowLeft: 'move-left',
  ArrowRight: 'move-right',
  KeyW: 'dodge-forward',
  KeyA: 'dodge-left',
  KeyD: 'dodge-right',
  KeyS: 'duck',
  KeyE: 'quick',
  Space: 'power',
  KeyQ: 'dash',
  KeyF: 'super',
  Enter: 'super',
  NumpadEnter: 'super',
};

/** Map a keyboard code (KeyboardEvent.code) to a game action. */
export function mapKey(code: string): KeyAction | null {
  return KEYS[code] ?? null;
}

const BACK_SPEED = 0.8;

/** Camera-relative movement from held arrow keys. Yaw 0 looks along +z. */
export function moveFromKeys(held: Set<KeyAction>, yaw: number): Vec2 {
  let f = 0;
  let r = 0;
  if (held.has('move-forward')) f += 1;
  if (held.has('move-back')) f -= BACK_SPEED;
  if (held.has('move-right')) r += 1;
  if (held.has('move-left')) r -= 1;
  if (f === 0 && r === 0) return { x: 0, z: 0 };
  const fw = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const right = { x: -Math.cos(yaw), z: Math.sin(yaw) };
  let x = fw.x * f + right.x * r;
  let z = fw.z * f + right.z * r;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return { x, z };
}

const EDGE_ACTIONS = new Set<KeyAction>(['dodge-left', 'dodge-right', 'dodge-forward', 'super', 'power', 'quick', 'dash']);
const INPUT_BUFFER_MS = 250;
/** How quickly the lock-on camera catches up to the angle to the opponent (per second). */
const LOCK_ON_RATE = 10;

function angleTo(self: FighterState, foe: FighterState): number | null {
  const dx = foe.pos.x - self.pos.x;
  const dz = foe.pos.z - self.pos.z;
  if (Math.hypot(dx, dz) < 0.05) return null;
  return Math.atan2(dx, dz);
}

/**
 * Keyboard-only, lock-on controls. The camera and the player always face the opponent;
 * arrows move relative to that view. The mouse is never grabbed.
 */
export class InputController {
  cameraYaw = 0;
  readonly cameraPitch = 0.25;
  enabled = true;
  private held = new Set<KeyAction>();
  /** Edge-triggered presses waiting to be consumed, with the time they were pressed. */
  private pending = new Map<KeyAction, number>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const action = mapKey(e.code);
    if (!action) return;
    e.preventDefault();
    if (!this.enabled) return;
    if (EDGE_ACTIONS.has(action)) {
      if (!e.repeat) this.pending.set(action, performance.now());
    } else {
      this.held.add(action);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const action = mapKey(e.code);
    if (action) this.held.delete(action);
  };

  private onBlur = () => this.reset();

  /** Keep the camera locked on to the opponent. Holds still while they're KO'd. */
  updateCamera(self: FighterState, foe: FighterState, dt: number) {
    if (foe.action === 'ko' || self.action === 'ko') return;
    const target = angleTo(self, foe);
    if (target === null) return;
    const diff = Math.atan2(Math.sin(target - this.cameraYaw), Math.cos(target - this.cameraYaw));
    this.cameraYaw += diff * Math.min(1, dt * LOCK_ON_RATE);
  }

  /** Build this step's intent and consume pending presses. */
  intent(self: FighterState, foe: FighterState): Intent {
    const it = emptyIntent();
    if (!this.enabled) return it;
    const now = performance.now();
    for (const [k, t] of this.pending) if (now - t > INPUT_BUFFER_MS) this.pending.delete(k);

    const facing = foe.action === 'ko' ? null : angleTo(self, foe);
    it.facing = facing ?? this.cameraYaw;
    it.move = moveFromKeys(this.held, it.facing);
    it.duck = this.held.has('duck');
    it.quick = this.pending.has('quick');
    it.power = this.pending.has('power');
    it.dash = this.pending.has('dash');
    it.super = this.pending.has('super');
    if (this.pending.has('dodge-left')) it.dodge = 'left';
    else if (this.pending.has('dodge-right')) it.dodge = 'right';
    else if (this.pending.has('dodge-forward')) it.dodge = 'forward';

    // While busy (mid-swing, stunned), keep presses so they fire as soon as you're free.
    // Also keep them while ducking or standing up, so an attack fires right after you stand.
    const free = (self.action === 'idle' || self.action === 'walk') && !self.ducking && self.standUpT <= 0;
    if (free) this.pending.clear();
    return it;
  }

  /** Clear held keys and pending presses (pausing, window blur). */
  reset() {
    this.held.clear();
    this.pending.clear();
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
