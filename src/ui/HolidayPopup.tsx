import type { SeasonalGift } from '../game/seasonal';
import { getCosmetic } from '../game/data/cosmetics';
import { ItemIcon, PrizeIcon } from './PrizeIcon';
import shared from './shared.module.css';
import styles from './HolidayPopup.module.css';

interface Props {
  gifts: SeasonalGift[];
  onWear: () => void;
  onClose: () => void;
}

export function HolidayPopup({ gifts, onWear, onClose }: Props) {
  return (
    <div className={styles.cover}>
      <div className={`${shared.panel} ${styles.box}`}>
        <h2 className={shared.title}>Happy Thanksgiving!</h2>
        <p className={styles.sub}>A holiday gift, just for playing this week. It's yours to keep!</p>
        <div className={styles.gifts}>
          {gifts.map((g) => (
            <div key={g.id} className={styles.gift}>
              {getCosmetic(g.id) ? (
                <PrizeIcon prize={{ kind: 'cosmetic', id: g.id, label: g.name, detail: '' }} />
              ) : (
                <ItemIcon kind="weapon" id={g.id} />
              )}
              <span className={styles.name}>{g.name}</span>
            </div>
          ))}
        </div>
        <div className={styles.buttons}>
          <button className={shared.big} onClick={onWear}>
            Wear it all!
          </button>
          <button className={shared.small} onClick={onClose}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
