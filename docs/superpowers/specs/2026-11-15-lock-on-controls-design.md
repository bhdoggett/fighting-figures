# Lock-On Keyboard Controls — Design (short)

Date: 2026-11-15 · Status: Approved by owner

## Why
Owner and son prefer arrows for movement and WASD for dodges/duck. Without a mouse hand, a lock-on camera replaces mouse look. The cursor must be available when paused.

## Decisions (owner)
- Lock-on camera: always behind the player, looking at the opponent; player always faces the opponent.
- Arrows: ↑/↓ toward/away, ←/→ circle around the opponent.
- W spin forward, A/D dodge left/right, S duck.
- The game never grabs the mouse; the cursor stays visible (pause button always clickable).

## Designer calls
- E quick hit, Space power, R dash (replaces click), F/Enter super, P/Esc pause.
- Removed: mouse look, click dash, right-click, Q, Shift+direction, C.
- Attacks always aim at the opponent. Backward walk at 80% speed.
- While the opponent is KO'd the camera holds its last angle.

## Approaches
One sensible way: replace camera yaw with the angle to the opponent each frame, and resolve movement relative to that angle in input. Keeping the mouse scheme as an alternative was offered and not chosen.
