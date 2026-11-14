import { useEffect, useState } from 'react';

/**
 * Becomes true after a short delay. Buttons use it so keys still being mashed
 * from the fight (Space, Enter) can't skip the next screen.
 */
export function useArmed(delayMs = 900): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);
  return armed;
}
