import { RankBadge } from './RankBadge';
import styles from './Hud.module.css';

export interface HudData {
  time: number;
  kos: [number, number];
  names: [string, string];
  hp: [number, number];
  koed: [boolean, boolean];
  power: number;
  dash: number;
  superCharge: number;
  banner: string | null;
  showHint: boolean;
  level: number;
}

function clock(t: number): string {
  const s = Math.ceil(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Side({ name, kos, hp, koed, who, level }: { name: string; kos: number; hp: number; koed: boolean; who: 'you' | 'bot'; level?: number }) {
  return (
    <div className={who === 'you' ? styles.sideYou : styles.sideBot}>
      <div className={styles.nameRow}>
        <span className={styles.name}>{who === 'you' ? `You (${name})` : `Bot (${name})`}</span>
        <span className={styles.kos}>{kos} KO</span>
      </div>
      {level !== undefined && <RankBadge level={level} size="sm" />}
      <progress className={hp < 0.3 ? styles.hpLow : styles.hp} value={koed ? 0 : hp} max={1} />
    </div>
  );
}

export function Hud({ data, onPause }: { data: HudData; onPause: () => void }) {
  const superReady = data.superCharge >= 1;
  return (
    <div className={styles.hud}>
      <div className={styles.top}>
        <Side who="you" name={data.names[0]} kos={data.kos[0]} hp={data.hp[0]} koed={data.koed[0]} level={data.level} />
        <div className={data.time <= 30 ? styles.clockHurry : styles.clock}>{clock(data.time)}</div>
        <Side who="bot" name={data.names[1]} kos={data.kos[1]} hp={data.hp[1]} koed={data.koed[1]} />
      </div>

      <button className={styles.pauseButton} onClick={onPause} aria-label="Pause (P)">
        <span className={styles.pauseIcon} aria-hidden="true" />
        Pause <kbd className={styles.pauseKey}>P</kbd>
      </button>

      {data.banner && (
        <div key={data.banner} className={styles.banner}>
          {data.banner}
        </div>
      )}

      {data.koed[0] && !data.banner && <div className={styles.respawn}>Bouncing back...</div>}

      {data.showHint && <div className={styles.hint}>Arrows move · W A D dodge · S duck</div>}

      <div className={styles.bottom}>
        <div className={styles.meter}>
          <span className={styles.meterLabel}>Dash · R</span>
          <progress className={data.dash >= 1 ? styles.readyBar : styles.chargeBar} value={data.dash} max={1} />
        </div>
        <div className={styles.meter}>
          <span className={styles.meterLabel}>Power · Space</span>
          <progress className={data.power >= 1 ? styles.readyBar : styles.chargeBar} value={data.power} max={1} />
        </div>
        <div className={superReady ? styles.superReady : styles.superMeter}>
          <span className={styles.meterLabel}>{superReady ? 'SUPER READY! Press F' : 'Super · F'}</span>
          <progress className={styles.superBar} value={data.superCharge} max={1} />
        </div>
      </div>
    </div>
  );
}
