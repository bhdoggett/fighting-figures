/** True on phones and tablets (or with ?touch=1 in the address, for testing). */
export function isTouchDevice(): boolean {
  if (new URLSearchParams(window.location.search).get('touch') === '1') return true;
  return window.matchMedia?.('(pointer: coarse)').matches === true || navigator.maxTouchPoints > 0;
}
