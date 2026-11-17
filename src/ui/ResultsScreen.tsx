import type { BattleResult } from '../game/progression';
import { XP, xpToNext } from '../game/progression';
import { MAX_LEVEL } from '../game/data/ranks';
import { RankBadge } from './RankBadge';
import { useArmed } from './useArmed';
import shared from './shared.module.css';
import styles from './ResultsScreen.module.css';

export interface ResultsInfo {
  result: BattleResult;
  xp: number;
  coins: number;
  botKos: number;
  botName: string;
  levelBefore: number;
  xpBefore: number;
  levelAfter: number;
  xpAfter: number;
}

export function ResultsScreen({ info, onContinue }: { info: ResultsInfo; onContinue: () => void }) {
  const { result } = info;
  const armed = useArmed();
  const headline = result.won ? 'YOU WIN!' : result.draw ? "IT'S A DRAW!" : 'BOT WINS!';
  const sub = result.won ? 'What a champ!' : result.draw ? 'So close!' : 'Good try! You still earned XP.';
  const leveled = info.levelAfter > info.levelBefore;
  const pct = info.levelAfter >= MAX_LEVEL ? 1 : info.xpAfter / xpToNext(info.levelAfter);

  return (
    <div className={shared.screen}>
      <div className={styles.center}>
        <h1 className={result.won ? styles.win : shared.title}>{headline}</h1>
        <p className={styles.sub}>{sub}</p>
        <div className={`${shared.panel} ${styles.card}`}>
          <div className={styles.score}>
            <div>
              <div className={styles.scoreNum}>{result.kos}</div>
              <div>Your KOs</div>
            </div>
            <div className={styles.vs}>vs</div>
            <div>
              <div className={styles.scoreNum}>{info.botKos}</div>
              <div>{info.botName}</div>
            </div>
          </div>
          <ul className={styles.xpList}>
            <li>Battle bonus <b>+{XP.battle}</b></li>
            {result.won && <li>Winner bonus <b>+{XP.win}</b></li>}
            {result.draw && <li>Draw bonus <b>+{XP.draw}</b></li>}
            {result.kos > 0 && <li>{result.kos} KO{result.kos > 1 ? 's' : ''} <b>+{result.kos * XP.perKo}</b></li>}
            {result.supersLanded > 0 && <li>Supers landed <b>+{result.supersLanded * XP.perSuper}</b></li>}
            <li className={styles.total}>Total <b>+{info.xp} XP</b></li>
            {info.coins > 0 && <li className={styles.total}>Figure Coins <b>+{info.coins}</b></li>}
          </ul>
          <div className={styles.levelRow}>
            <RankBadge level={info.levelAfter} />
            <span className={styles.level}>Level {info.levelAfter}</span>
          </div>
          <progress className={styles.xpBar} value={pct} max={1} />
          {leveled && <div className={styles.levelUp}>LEVEL UP! Prize time!</div>}
        </div>
        <button className={shared.big} onClick={onContinue} disabled={!armed}>
          {leveled ? 'Get my prize!' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
