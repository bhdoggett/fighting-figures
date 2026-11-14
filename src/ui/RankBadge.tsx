import { rankForLevel } from '../game/data/ranks';
import styles from './RankBadge.module.css';

export function RankBadge({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' }) {
  const rank = rankForLevel(level);
  return (
    <div className={size === 'sm' ? styles.small : styles.badge} data-rank={rank.name}>
      <span className={styles.block} data-rank={rank.name} />
      <span className={styles.name}>{rank.name}</span>
    </div>
  );
}
