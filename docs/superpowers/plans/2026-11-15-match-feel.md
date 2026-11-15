# Match Feel Tweaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3-minute matches with scaled supers, smooth movement, a Q face-opponent key instead of auto camera, and a visible pause button.

**Architecture:** Tuning lives in `src/game` data/progression; interpolation lives in the render layer fed by `MatchState.accumulator`; camera and pause changes live in `src/input` and `src/ui`.

**Tech Stack:** Vite, React, TypeScript, Three.js, Vitest (jsdom for input tests).

**Spec:** `docs/superpowers/specs/2026-11-15-match-feel-design.md`

## Global Constraints

- Match length 180 s. Super charge: Tank 54, Hothead 36, Wizard 42, Robot 30, Trickster 24, Ninja 15.
- XP per KO 8. No automatic camera turning. Q = face opponent. P and Esc = pause.
- No player-visible "kill/die/dead/death". CSS modules only, no inline styles.

## Review Focus

1. Pressing Q while the opponent is KO'd → camera still turns to where they are (no crash, no NaN yaw). (Task 3 test)
2. Q held down → one smooth swing, no repeated jumps. (Task 3 test)
3. Pause button clicked while countdown is showing → game pauses; resume continues countdown. (Task 4 playtest)
4. Interpolation after respawn → fighter appears at spawn, not sliding across the arena. (Task 2: snap when a step moves > 3 m)
5. Old saves → unaffected (no save format change). (existing save tests)

---

### Task 1: Tuning — match length, super charge, XP per KO

**Files:** Modify `src/game/data/personalities.ts`, `src/game/progression.ts`, `src/ui/App.tsx` (`matchDuration` default 180), `src/game/match.ts` (`createMatch` default 180), `src/ui/PickScreen.tsx` copy, `README.md`. Tests: `src/game/data/data.test.ts`, `src/game/progression.test.ts`.

- [ ] Update tests: super charge values per Global Constraints; `xpForBattle({won:true,draw:false,kos:3,supersLanded:1})` = 40+60+24+10; pacing test typical battle uses ~9 KOs (`40 + 0.6*60 + 9*8 + 10`) and still 100–140 battles to level 25.
- [ ] Run tests, expect failures; change values; run, expect pass. Commit `feat: 3-minute matches with scaled supers`.

### Task 2: Smooth rendering

**Files:** Modify `src/render/scene.ts`, `src/render/fighterModel.ts`, `src/game/match.ts`.

**Interfaces:** `MatchState.prevPos: [Vec2, Vec2]` set at the start of each `stepMatch`; renderer draws `lerp(prevPos, pos, m.accumulator / FIXED_DT)`; if a step moved > 3 m (respawn), snap. `FighterModel.update(f, dt, time, drawPos: Vec2)`; walk speed = exponential smoothing of measured speed (rate 10/s).

- [ ] Test in `match.test.ts`: `prevPos` equals positions before the step and after `stepMatch` differs when moving.
- [ ] Implement; verify in browser playtest screenshot; commit `fix: smooth fighter movement between game steps`.

### Task 3: Q face-opponent key, no auto-turn

**Files:** Modify `src/input/input.ts`, `src/ui/FightView.tsx`, `src/ui/PickScreen.tsx`, `src/ui/Hud.tsx` hint, `README.md`. Test `src/input/controller.test.ts`, `src/input/input.test.ts`.

**Interfaces:** `mapKey('KeyQ') → 'face-foe'` (edge). `InputController.updateCamera(self, foe, dt)` replaces `autoFollow`: only turns while a face-foe swing is active; swing rotates toward foe at 9 rad/s until within 0.02 rad, then stops. Mouse movement cancels the swing.

- [ ] Tests: `mapKey('KeyQ', false) === 'face-foe'`; without Q, `updateCamera` over 3 s leaves yaw unchanged; after Q, yaw reaches angle to foe within 0.5 s; foe KO'd still turns toward foe position; repeat keydown doesn't restart.
- [ ] Implement; commit `feat: Q faces the opponent; remove automatic camera turn`.

### Task 4: Pause button

**Files:** Modify `src/ui/Hud.tsx`, `src/ui/Hud.module.css`, `src/ui/FightView.tsx`, `src/ui/FightView.module.css`.

- [ ] HUD gets a "⏸ Pause (P)" button (pointer-events enabled) in the top-right below the bot panel; `onPause` prop. Pause screen adds a compact controls list.
- [ ] Playtest: click Pause during countdown and mid-fight, screenshot pause screen, resume. Commit `feat: on-screen pause button`.
