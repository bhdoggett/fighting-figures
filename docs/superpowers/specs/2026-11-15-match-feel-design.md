# Match Feel Tweaks — Design (short)

Date: 2026-11-15 · Status: Approved by owner

## Why
Playtesting by the owner and their son: 5-minute matches feel long, movement looks jittery, the automatic camera turn is unwelcome, and there is no visible way to pause.

## Decisions (owner)
1. Matches last **3 minutes** (180 s).
2. Super charge times scale **proportionally (×3/5)**: Tank 54 s, Hothead 36 s, Grumpy Wizard 42 s, Robo-Bonk 30 s, Trickster 24 s, Ninja 15 s.
3. **Remove the automatic camera turn.** Add a **face-opponent key: Q**, which smoothly swings the camera to the opponent.
4. A clear on-screen **Pause button** during fights, plus a key: **P** (Esc also pauses).

## Designer calls (owner to check)
- XP per KO raised 5 → 8 so XP per match stays about the same; Obsidian still takes ~100 matches (~5 hours instead of ~9).
- Jitter fix: render fighters at an interpolated position between fixed simulation steps; walk animation uses smoothed speed.
- Pause button sits in the top corner; while the mouse is grabbed (cursor hidden) players use P/Esc. Pause screen adds a controls reminder.

## Approaches
Only one sensible way for each item; all are tuning or small UI changes inside the existing architecture (pure logic in `src/game`, rendering in `src/render`, input in `src/input`, React UI in `src/ui`).

## Non-goals
Special missions, Figure Coins, and a shop (raised by the owner's son) are a separate, later conversation.
