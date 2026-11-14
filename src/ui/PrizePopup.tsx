import type { Prize } from '../game/progression';
import { isRankUpLevel, rankForLevel } from '../game/data/ranks';
import { getCosmetic } from '../game/data/cosmetics';
import { getWeapon } from '../game/data/weapons';
import { getPersonality } from '../game/data/personalities';
import type { PersonalityId } from '../game/types';
import shared from './shared.module.css';
import styles from './PrizePopup.module.css';

const KIND_LABEL: Record<Prize['kind'], string> = {
  weapon: 'Weapon',
  cosmetic: 'Look',
  personality: 'NEW FIGHTER',
  trophy: 'Trophy',
};

function swatchKey(prize: Prize): string {
  if (prize.kind === 'weapon') return getWeapon(prize.id).tier;
  if (prize.kind === 'cosmetic') return getCosmetic(prize.id)?.slot ?? 'skin';
  if (prize.kind === 'personality') return getPersonality(prize.id as PersonalityId).id;
  return 'trophy';
}

export function PrizePopup({ level, offers, onPick }: { level: number; offers: Prize[]; onPick: (p: Prize) => void }) {
  const rankUp = isRankUpLevel(level);
  return (
    <div className={shared.screen}>
      <div className={styles.center}>
        <h1 className={shared.title}>{rankUp ? 'RANK UP!' : 'LEVEL UP!'}</h1>
        <p className={styles.sub}>
          {rankUp ? `You reached ${rankForLevel(level).name} rank! ` : `You're level ${level}! `}
          Pick one prize:
        </p>
        <div className={styles.cards}>
          {offers.map((prize) => (
            <button key={prize.id} className={prize.kind === 'personality' ? styles.special : styles.card} onClick={() => onPick(prize)}>
              <span className={styles.kind}>{KIND_LABEL[prize.kind]}</span>
              <span className={styles.swatch} data-kind={prize.kind} data-key={swatchKey(prize)} />
              <span className={styles.label}>{prize.label}</span>
              <span className={styles.detail}>{prize.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
