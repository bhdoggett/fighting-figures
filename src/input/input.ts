import { emptyIntent, type FighterState, type Intent, type Vec2 } from '../game/fighter';

export type KeyAction =
  | 'move-forward'
  | 'move-back'
  | 'move-left'
  | 'move-right'
  | 'dodge-left'
  | 'dodge-right'
  | 'dodge-forward'
  | 'dodge-back'
  | 'duck'
  | 'super'
  | 'power'
  | 'quick';

const MOVE_KEYS: Record<string, KeyAction> = {
  KeyW: 'move-forward',
  KeyS: 'move-back',
  KeyA: 'move-left',
  KeyD: 'move-right',
};

const SHIFT_DODGE: Record<string, KeyAction> = {
  KeyW: 'dodge-forward',
  KeyS: 'dodge-back',
  KeyA: 'dodge-left',
  KeyD: 'dodge-right',
};

const OTHER_KEYS: Record<string, KeyAction> = {
  ArrowLeft: 'dodge-left',
  ArrowRight: 'dodge-right',
  ArrowUp: 'dodge-forward',
  ArrowDown: 'duck',
  KeyC: 'duck',
  KeyF: 'super',
  Enter: 'super',
  NumpadEnter: 'super',
  Space: 'power',
  KeyE: 'quick',
};

/** Map a keyboard code (KeyboardEvent.code) to a game action. */
export function mapKey(code: string, shift: boolean): KeyAction | null {
  if (shift && SHIFT_DODGE[code]) return SHIFT_DODGE[code];
  return MOVE_KEYS[code] ?? OTHER_KEYS[code] ?? null;
}

/** Camera-relative movement from held move keys. Yaw 0 looks along +z. */
export function moveFromKeys(held: Set<KeyAction>, yaw: number): Vec2 {
  let f = 0;
  let r = 0;
  if (held.has('move-forward')) f += 1;
  if (held.has('move-back')) f -= 1;
  if (held.has('move-right')) r += 1;
  if (held.has('move-left')) r -= 1;
  if (f === 0 && r === 0) return { x: 0, z: 0 };
  const fw = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const right = { x: -Math.cos(yaw), z: Math.sin(yaw) };
  const x = fw.x * f + right.x * r;
  const z = fw.z * f + right.z * r;
  const len = Math.hypot(x, z);
  return { x: x / len, z: z / len };
}

const EDGE_ACTIONS = new Set<KeyAction>(['dodge-left', 'dodge-right', 'dodge-forward', 'dodge-back', 'super', 'power', 'quick']);
const AUTO_AIM_RANGE = 6;
const MOUSE_SENSITIVITY = 0.0028;
const AUTO_FOLLOW_DELAY_MS = 1200;
const INPUT_BUFFER_MS = 250;
const AUTO_FOLLOW_SPEED = 2.6;

export class InputController {
  cameraYaw = 0;
  cameraPitch = 0.25;
  private held = new Set<KeyAction>();
  /** Edge-triggered presses waiting to be consumed by the next simulation step. */
  private pending = new Map<KeyAction | 'dash', number>();
  private target: HTMLElement;
  private dragging = false;
  enabled = true;
  /** performance.now() of the last camera turn by the mouse */
  lastMouseTurn = -Infinity;

  constructor(target: HTMLElement) {
    this.target = target;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    target.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    target.addEventListener('contextmenu', this.onContextMenu);
  }

  get locked(): boolean {
    return document.pointerLockElement === this.target;
  }

  requestLock() {
    // Some browsers (and automation) refuse pointer lock; dragging still turns the camera.
    try {
      const r = this.target.requestPointerLock?.() as unknown;
      if (r instanceof Promise) r.catch(() => {});
    } catch {
      /* ignore */
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    const action = mapKey(e.code, e.shiftKey);
    if (!action) return;
    e.preventDefault();
    if (EDGE_ACTIONS.has(action)) {
      if (!e.repeat) this.pending.set(action, performance.now());
    } else {
      this.held.add(action);
    }
    // A fresh Shift+WASD press dodges instead of walking; a held W keeps walking.
    if (e.shiftKey && !e.repeat && MOVE_KEYS[e.code]) this.held.delete(MOVE_KEYS[e.code]);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const move = MOVE_KEYS[e.code];
    if (move) this.held.delete(move);
    const other = OTHER_KEYS[e.code];
    if (other) this.held.delete(other);
  };

  private onBlur = () => {
    this.held.clear();
    this.pending.clear();
    this.dragging = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.enabled) return;
    if (e.button === 2) {
      this.pending.set('quick', performance.now());
      return;
    }
    if (e.button !== 0) return;
    if (!this.locked) {
      // First click grabs the mouse instead of attacking.
      this.requestLock();
      this.dragging = true;
      return;
    }
    this.pending.set('dash', performance.now());
  };

  private onMouseUp = () => {
    this.dragging = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.enabled) return;
    if (!this.locked && !this.dragging) return;
    if (e.movementX !== 0) this.lastMouseTurn = performance.now();
    this.cameraYaw -= e.movementX * MOUSE_SENSITIVITY;
    this.cameraPitch = Math.max(-0.1, Math.min(0.9, this.cameraPitch + e.movementY * MOUSE_SENSITIVITY));
  };

  private onContextMenu = (e: Event) => e.preventDefault();

  /** Build this step's intent and consume pending presses. */
  intent(self: FighterState, foe: FighterState): Intent {
    const it = emptyIntent();
    if (!this.enabled) return it;
    const now = performance.now();
    for (const [k, t] of this.pending) if (now - t > INPUT_BUFFER_MS) this.pending.delete(k);
    it.move = moveFromKeys(this.held, this.cameraYaw);
    it.duck = this.held.has('duck');
    it.quick = this.pending.has('quick');
    it.power = this.pending.has('power');
    it.dash = this.pending.has('dash');
    it.super = this.pending.has('super');
    if (this.pending.has('dodge-left')) it.dodge = 'left';
    else if (this.pending.has('dodge-right')) it.dodge = 'right';
    else if (this.pending.has('dodge-forward')) it.dodge = 'forward';
    else if (this.pending.has('dodge-back')) it.dodge = 'back';

    const attacking = it.quick || it.power || it.dash || it.super;
    const dx = foe.pos.x - self.pos.x;
    const dz = foe.pos.z - self.pos.z;
    if (attacking && foe.action !== 'ko' && Math.hypot(dx, dz) < AUTO_AIM_RANGE) {
      it.facing = Math.atan2(dx, dz);
    } else {
      it.facing = this.cameraYaw;
    }
    // While busy (mid-swing, stunned), keep presses so they fire as soon as you're free.
    if (self.action === 'idle' || self.action === 'walk') this.pending.clear();
    return it;
  }

  /**
   * Gently swing the camera toward the opponent when the mouse hasn't been used for a moment,
   * so younger players never lose track of the fight.
   */
  autoFollow(self: FighterState, foe: FighterState, dt: number) {
    if (performance.now() - this.lastMouseTurn < AUTO_FOLLOW_DELAY_MS) return;
    if (foe.action === 'ko' || self.action === 'ko') return;
    const dx = foe.pos.x - self.pos.x;
    const dz = foe.pos.z - self.pos.z;
    if (Math.hypot(dx, dz) < 0.8) return;
    const target = Math.atan2(dx, dz);
    let diff = target - this.cameraYaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const step = Math.sign(diff) * Math.min(Math.abs(diff), AUTO_FOLLOW_SPEED * dt * (0.3 + Math.min(1, Math.abs(diff))));
    this.cameraYaw += step;
  }

  /** Clear held keys (e.g. when pausing). */
  reset() {
    this.held.clear();
    this.pending.clear();
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.target.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.target.removeEventListener('contextmenu', this.onContextMenu);
    if (this.locked) document.exitPointerLock();
  }
}
