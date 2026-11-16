import { emptyIntent, type Intent } from '../game/fighter';
import type { Personality } from '../game/types';

export type PreviewMove = 'quick' | 'power' | 'dash' | 'super' | 'dodge-forward' | 'dodge-left' | 'dodge-right' | 'duck';

/** Fight keys that can be shown off on the menu, in controls-list order. */
export const PREVIEW_MOVES: { move: PreviewMove; key: string; label: string }[] = [
  { move: 'dodge-forward', key: 'W', label: 'spin forward' },
  { move: 'dodge-left', key: 'A', label: 'dodge left' },
  { move: 'dodge-right', key: 'D', label: 'dodge right' },
  { move: 'duck', key: 'S', label: "duck (quick hits miss, but you can't attack)" },
  { move: 'quick', key: 'E', label: 'quick hit' },
  { move: 'power', key: 'Space', label: 'power move' },
  { move: 'dash', key: 'Q', label: 'dash attack' },
  { move: 'super', key: 'F', label: 'SUPER!' },
];

export function previewIntent(move: PreviewMove): Intent {
  const it = emptyIntent();
  switch (move) {
    case 'quick':
      it.quick = true;
      break;
    case 'power':
      it.power = true;
      break;
    case 'dash':
      it.dash = true;
      break;
    case 'super':
      it.super = true;
      break;
    case 'dodge-forward':
      it.dodge = 'forward';
      break;
    case 'dodge-left':
      it.dodge = 'left';
      break;
    case 'dodge-right':
      it.dodge = 'right';
      break;
    case 'duck':
      it.duck = true;
      break;
  }
  return it;
}

export function previewCaption(move: PreviewMove, p: Personality): string {
  switch (move) {
    case 'quick':
      return 'Quick hit!';
    case 'power':
      return `${p.powerMoveName}!`;
    case 'dash':
      return 'Dash attack!';
    case 'super':
      return 'SUPER!';
    case 'dodge-forward':
      return 'Spin!';
    case 'dodge-left':
      return 'Dodge left!';
    case 'dodge-right':
      return 'Dodge right!';
    case 'duck':
      return 'Duck!';
  }
}
