import { isTouchDevice } from './device';
import styles from './RotateHint.module.css';

/** "Turn your device sideways" cover, shown only on touch screens held upright (CSS decides). */
export function RotateHint() {
  if (!isTouchDevice()) return null;
  return (
    <div className={styles.hint} role="alert">
      <div className={styles.phone} aria-hidden="true" />
      <p className={styles.text}>Turn your device sideways to play!</p>
    </div>
  );
}
