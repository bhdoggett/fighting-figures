import { useEffect, useRef, useState } from 'react';
import type { Loadout } from '../game/types';
import { createMatch, openingTaunts, runFrame, type MatchState } from '../game/match';
import { botIntent, createBotBrain } from '../game/ai';
import { TUNING } from '../game/fighter';
import { GameRenderer } from '../render/scene';
import { InputController } from '../input/input';
import { Hud, type HudData } from './Hud';
import shared from './shared.module.css';
import styles from './FightView.module.css';

interface Props {
  player: Loadout;
  bot: Loadout;
  difficulty: number;
  duration: number;
  onDone: (m: MatchState) => void;
  onQuit: () => void;
}

const COUNTDOWN = ['3', '2', '1', 'GO!'];
const STEP_SEC = 0.8;
const END_HOLD_SEC = 2.5;
const HUD_INTERVAL = 1 / 20;

export function FightView({ player, bot, difficulty, duration, onDone, onQuit }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<HudData | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const inputRef = useRef<InputController | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const setPausedBoth = (v: boolean) => {
    pausedRef.current = v;
    setPaused(v);
    if (inputRef.current) {
      inputRef.current.enabled = !v;
      inputRef.current.reset();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const renderer = new GameRenderer(canvas);
    renderer.setLoadouts(player, bot);
    const input = new InputController(canvas);
    inputRef.current = input;
    const match = createMatch(player, bot, duration);
    const brain = createBotBrain();
    input.cameraYaw = 0;

    const resize = () => renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let hudTimer = 0;
    let endTimer = 0;
    let done = false;
    let wasLocked = false;
    let tauntsSaid = false;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (match.over) return;
        setPausedBoth(!pausedRef.current);
      }
    };
    const onLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      if (wasLocked && !locked && !match.over && !pausedRef.current) setPausedBoth(true);
      wasLocked = locked;
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerlockchange', onLockChange);

    const getIntents = () => {
      const [p1, p2] = match.fighters;
      return [input.intent(p1, p2), botIntent(brain, p2, p1, difficulty, Math.random, 1 / 60)] as [ReturnType<typeof input.intent>, ReturnType<typeof input.intent>];
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (pausedRef.current) {
        renderer.render(match, input.cameraYaw, input.cameraPitch, 0);
        return;
      }

      clock += dt;
      const countdownLen = STEP_SEC * (COUNTDOWN.length - 1);
      const fighting = clock >= countdownLen;
      if (fighting && !tauntsSaid) {
        openingTaunts(match);
        tauntsSaid = true;
      }
      if (fighting && !match.over) runFrame(match, getIntents, dt);
      if (match.over) {
        endTimer += dt;
        if (endTimer >= END_HOLD_SEC && !done) {
          done = true;
          onDoneRef.current(match);
          return;
        }
      }
      renderer.render(match, input.cameraYaw, input.cameraPitch, dt);

      hudTimer += dt;
      if (hudTimer >= HUD_INTERVAL) {
        hudTimer = 0;
        const [p1, p2] = match.fighters;
        const stepIdx = Math.floor(clock / STEP_SEC);
        let banner: string | null = null;
        if (stepIdx < COUNTDOWN.length) banner = COUNTDOWN[stepIdx];
        if (match.over) banner = "TIME'S UP!";
        setHud({
          time: match.time,
          kos: [...match.kos] as [number, number],
          names: [p1.personality.name, p2.personality.name],
          hp: [p1.hp / p1.maxHp, p2.hp / p2.maxHp],
          koed: [p1.action === 'ko', p2.action === 'ko'],
          power: 1 - p1.cooldowns.power / TUNING.powerCooldown,
          dash: 1 - p1.cooldowns.dash / TUNING.dashCooldown,
          superCharge: p1.superCharge,
          banner,
          showMouseHint: !wasLocked && fighting && clock < countdownLen + 6,
        });
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerlockchange', onLockChange);
      ro.disconnect();
      input.dispose();
      inputRef.current = null;
      renderer.dispose();
    };
    // The match is created once per mount; the parent remounts with a new key for a new fight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
      {hud && <Hud data={hud} />}
      {paused && (
        <div className={styles.pause}>
          <div className={`${shared.panel} ${styles.pausePanel}`}>
            <h2 className={shared.title}>Paused</h2>
            <button
              className={shared.big}
              onClick={() => {
                setPausedBoth(false);
                inputRef.current?.requestLock();
              }}
            >
              Keep playing
            </button>
            <button className={shared.small} onClick={onQuit}>
              Quit to menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
