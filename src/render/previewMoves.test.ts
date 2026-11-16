import { describe, expect, it } from 'vitest';
import { previewCaption, previewIntent, PREVIEW_MOVES } from './previewMoves';
import { getPersonality } from '../game/data/personalities';

describe('preview moves', () => {
  it('turns each move into the matching fight intent', () => {
    expect(previewIntent('quick').quick).toBe(true);
    expect(previewIntent('power').power).toBe(true);
    expect(previewIntent('dash').dash).toBe(true);
    expect(previewIntent('super').super).toBe(true);
    expect(previewIntent('dodge-forward').dodge).toBe('forward');
    expect(previewIntent('dodge-left').dodge).toBe('left');
    expect(previewIntent('dodge-right').dodge).toBe('right');
    expect(previewIntent('duck').duck).toBe(true);
  });

  it("captions use the fighter's own power move name", () => {
    expect(previewCaption('power', getPersonality('tank'))).toBe('Ground Pound!');
    expect(previewCaption('super', getPersonality('ninja'))).toBe('SUPER!');
  });

  it('lists every fight key', () => {
    expect(PREVIEW_MOVES.map((m) => m.key)).toEqual(['W', 'A', 'D', 'S', 'E', 'Space', 'Q', 'F']);
  });
});
