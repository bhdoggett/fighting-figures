import { useEffect, useRef } from 'react';
import type { InputController, TouchAction } from '../input/input';
import styles from './TouchControls.module.css';

interface Props {
  input: InputController;
  leftie: boolean;
  powerReady: boolean;
  dashReady: boolean;
  superCharge: number;
}

const STICK_SIZE = 160;

/** Joystick drawn on a canvas so the knob can follow the thumb every frame. */
function Joystick({ input }: { input: InputController }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = STICK_SIZE * dpr;
    canvas.height = STICK_SIZE * dpr;
    const g = canvas.getContext('2d')!;
    g.scale(dpr, dpr);
    let pointer: number | null = null;

    const draw = (kx: number, ky: number) => {
      const c = STICK_SIZE / 2;
      g.clearRect(0, 0, STICK_SIZE, STICK_SIZE);
      g.fillStyle = 'rgba(255, 250, 240, 0.55)';
      g.strokeStyle = '#1d1b2f';
      g.lineWidth = 4;
      g.beginPath();
      g.roundRect(4, 4, STICK_SIZE - 8, STICK_SIZE - 8, 22);
      g.fill();
      g.stroke();
      g.fillStyle = '#ffd23f';
      g.beginPath();
      g.roundRect(c + kx * 46 - 30, c - ky * 46 - 30, 60, 60, 10);
      g.fill();
      g.stroke();
    };
    draw(0, 0);

    const update = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2 - 20);
      const dy = -(e.clientY - (r.top + r.height / 2)) / (r.height / 2 - 20);
      const len = Math.hypot(dx, dy);
      const k = len > 1 ? 1 / len : 1;
      input.setStick(dx * k, dy * k);
      draw(dx * k, dy * k);
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      pointer = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      update(e);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId === pointer) update(e);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      input.setStick(0, 0);
      draw(0, 0);
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      input.setStick(0, 0);
    };
  }, [input]);

  return <canvas ref={ref} className={styles.stick} aria-label="Move joystick" />;
}

function ActionButton({ input, action, label, className, dim }: { input: InputController; action: TouchAction; label: string; className: string; dim?: boolean }) {
  return (
    <button
      className={dim ? `${className} ${styles.dim}` : className}
      onPointerDown={(e) => {
        e.preventDefault();
        input.tap(action);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export function TouchControls({ input, leftie, powerReady, dashReady, superCharge }: Props) {
  const ready = superCharge >= 1;
  return (
    <div className={leftie ? styles.leftie : styles.controls}>
      <Joystick input={input} />
      <div className={styles.buttons}>
        <ActionButton input={input} action="dash" label="Dash" className={styles.dash} dim={!dashReady} />
        <ActionButton input={input} action="quick" label="Hit" className={styles.hit} />
        <ActionButton input={input} action="dodge-left" label="◀" className={styles.left} />
        <ActionButton input={input} action="dodge-forward" label="Spin" className={styles.spin} />
        <ActionButton input={input} action="dodge-right" label="▶" className={styles.right} />
        <ActionButton input={input} action="power" label="POWER" className={styles.power} dim={!powerReady} />
        <button
          className={styles.duck}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
            input.setTouchDuck(true);
          }}
          onPointerUp={() => input.setTouchDuck(false)}
          onPointerCancel={() => input.setTouchDuck(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          Duck
        </button>
        <button
          className={ready ? styles.superReady : styles.super}
          onPointerDown={(e) => {
            e.preventDefault();
            input.tap('super');
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          SUPER
          <progress className={styles.superBar} value={superCharge} max={1} />
        </button>
      </div>
    </div>
  );
}
