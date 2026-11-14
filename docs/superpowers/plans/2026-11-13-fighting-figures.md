# Fighting Figures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable, kid-friendly, blocky 3D 1v1 fighting game in the browser with personalities, weapons, XP, levels, ranks, and prizes.

**Architecture:** Pure TypeScript game logic (`src/game/`) runs a fixed-timestep simulation with no rendering dependencies and is unit-tested with Vitest. Three.js (`src/render/`) reads simulation state each frame and draws it. React (`src/ui/`) owns screens and the HUD and drives an app state machine (pick → fight → results → prize).

**Tech Stack:** Vite, React 19, TypeScript (strict), Three.js, Vitest, CSS modules with `:root` design tokens.

**Spec:** `docs/superpowers/specs/2026-11-13-fighting-figures-design.md`

## Global Constraints

- No player-visible "kill", "die", "dead", "death". Use "KO".
- Tone goofy, not graphic: no blood; KO = block/confetti poof; hit = "BONK!" pop text.
- Match: 5 minutes (300 s), most KOs wins, tie = draw, respawn after a short delay.
- Personalities spread exactly 10 points across speed/power/health.
- Super charge: Tank 90 s instant KO, Hothead 60 s instant KO, Trickster 40 s 60% max health, Ninja 25 s 40% max health.
- Ranks: Wood 1–4, Stone 5–9, Iron 10–14, Gold 15–19, Diamond 20–24, Obsidian 25+. Level cap 30.
- Every battle grants XP, including losses.
- Save in `localStorage`, versioned, with export/import.
- Controls: WASD walk, mouse camera, click dash, E/right-click quick attack, Space power attack, Shift+W/A/D or arrows dodge, C or Down duck, F or Enter super.
- No inline styles, no Tailwind. CSS modules only.

## Review Focus

1. Corrupt or old-version save data in `localStorage` → game starts with a fresh save instead of crashing. (Task 3 test)
2. Pressing super before it is charged → nothing happens; charge is not consumed. (Task 4 test)
3. Both fighters KO'd on the same tick → both respawn, both scorers credited. (Task 5 test)
4. Browser tab hidden then shown (huge `dt`) → simulation clamps steps; no teleporting or skipped clock. (Task 5 test)
5. Level-up past cap or multiple levels in one battle → one prize pick per level gained, never above 30. (Task 3 test)

---

### Task 1: Scaffold project

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/ui/App.tsx`, `src/ui/tokens.css`, `.gitignore`.

- [ ] Scaffold Vite React TS manually; add `three`, `@types/three`, `vitest`.
- [ ] Scripts: `dev`, `build` (`tsc -b && vite build`), `test` (`vitest run`).
- [ ] `tokens.css` holds `:root` colors, fonts, spacing; imported once in `main.tsx`.
- [ ] Verify: `npm run build` succeeds; `npm test` runs (no tests yet passes with `--passWithNoTests`).
- [ ] Commit `chore: scaffold vite react three project`.

### Task 2: Game data

**Files:** Create `src/game/types.ts`, `src/game/data/personalities.ts`, `src/game/data/weapons.ts`, `src/game/data/ranks.ts`, `src/game/data/cosmetics.ts`. Test `src/game/data/data.test.ts`.

**Interfaces — Produces:**
- `type PersonalityId = 'hothead' | 'ninja' | 'tank' | 'trickster'`
- `interface Personality { id; name; speed; power; health; superChargeSec; superDamage: 'ko' | number /* fraction of max hp */; powerMove: PowerMoveKind; lines: { taunt: string[]; hit: string[]; ko: string[]; win: string[] }; color: number }`
- `type WeaponFamily = 'sword' | 'hammer' | 'daggers' | 'spear'`; `type Tier = 'wood' | 'stone' | 'iron' | 'gold' | 'diamond'`
- `interface Weapon { id: string; family; tier; name; damageMul; swingTimeMul; reach }`; `getWeapon(id): Weapon`
- `RANKS: { name; minLevel; color }[]`, `rankForLevel(level): Rank`
- `interface Cosmetic { id; slot: 'hat' | 'cape' | 'skin'; name; color: number }`

- [ ] Test: every personality's `speed + power + health === 10`; superChargeSec values per Global Constraints; `rankForLevel(1|4|5|24|25|30).name` = Wood, Wood, Stone, Diamond, Obsidian, Obsidian; no line in any personality contains /kill|die|dead|death/i; hammer `damageMul > 1` and `swingTimeMul > 1`, daggers both `< 1`, spear reach greatest.
- [ ] Implement data. Tiers multiply damage by `1 + 0.06 * tierIndex` (modest).
- [ ] Commit `feat: add personalities, weapons, ranks, cosmetics data`.

### Task 3: Progression and save

**Files:** Create `src/game/progression.ts`, `src/game/save.ts`, `src/game/data/prizes.ts`. Tests `src/game/progression.test.ts`, `src/game/save.test.ts`.

**Interfaces — Produces:**
- `xpForBattle(r: { won: boolean; draw: boolean; kos: number; supersLanded: number }): number` — base 40, win +60, draw +25, +15 per KO, +10 per super landed.
- `xpToNext(level): number` — `100 + 25 * (level - 1)`.
- `applyXp(p: Profile, xp): { profile: Profile; levelsGained: number[] }` — caps at 30, leftover XP discarded at cap.
- `type Prize = { kind: 'weapon' | 'cosmetic' | 'personality'; id: string; label: string }`
- `offerPrizes(p: Profile, level: number, rng: () => number): Prize[]` — 3 distinct unowned options; rank-up levels (5,10,…) offer a locked personality first if any; when nothing unowned remains, offer recolor cosmetics.
- `interface Profile { version: 1; level; xp; owned: { weapons: string[]; cosmetics: string[]; personalities: PersonalityId[] }; loadout: { personality; weapon; hat?; cape?; skin } }`
- `newProfile(): Profile` — owns hothead, ninja, tank, trickster; locked extra personalities `'robot' | 'wizard'` unlock at rank-ups. Starter weapon `sword-wood`; starter skin `skin-blue`.
- `loadProfile(storage: Storage): Profile`, `saveProfile(storage, p)`, `exportProfile(p): string` (base64 JSON), `importProfile(s): Profile | null`.

- [ ] Tests: loss gives xp > 0; multi-level gain returns each level; cap at 30; offerPrizes returns 3 distinct unowned; corrupt JSON / wrong version / missing key → `newProfile()`; export→import round-trips; garbage import → null.
- [ ] Implement. Add `robot` and `wizard` personalities to data (10 points each).
- [ ] Commit `feat: add xp, levels, prizes, and save system`.

### Task 4: Fighter combat rules

**Files:** Create `src/game/fighter.ts`. Test `src/game/fighter.test.ts`.

**Interfaces — Produces:**
- `interface FighterState { id: 'p1' | 'p2'; pos: {x;z}; facing: number; vel: {x;z}; hp; maxHp; action: Action; actionT: number; cooldowns: { power: number; dash: number; dodge: number }; superCharge: number /* 0..1 */; ducking: boolean; invulnT: number; koTimer: number; personality; weapon }`
- `type Action = 'idle' | 'walk' | 'quick' | 'power' | 'dash' | 'dodge' | 'super' | 'hitstun' | 'ko'`
- `interface Intent { move: {x;z} /* camera-relative already resolved to world */; facing: number; quick; power; dash; dodge: null | 'left' | 'right' | 'back'; duck; super }`
- `createFighter(id, personality, weapon, spawn): FighterState`
- `stepFighter(f, intent, dt): FighterState` (mutates and returns)
- `resolveAttacks(a, b): HitEvent[]` where `HitEvent = { attacker; target; damage; kind: Action; ko: boolean }`

Values: maxHp = 60 + 12*health; move speed = 3 + 0.6*speed m/s; quick dmg 6, power dmg 16 (cooldown 2.5 s), dash dmg 9 (cooldown 1.2 s, 6 m lunge over 0.25 s), all × (0.7 + 0.1*power) × weapon.damageMul. Dodge: 0.3 s invulnerable roll, cooldown 0.8 s. Duck: quick and dash attacks miss a ducking target; power and super hit. Super charges at `dt / superChargeSec`; firing requires charge ≥ 1; a missed super still resets charge. Respawn invuln 1.5 s.

- [ ] Tests: hp per personality; super ignored when charge < 1 and charge unchanged; super with 'ko' sets hp 0; Ninja super deals 40% maxHp; dodging target takes no damage; ducking target dodges quick but not power; power cooldown blocks a second power within 2.5 s.
- [ ] Implement. Hit test: target within weapon reach + 0.6 and inside ±60° arc of attacker facing, during the active window of the attack (middle third of action time). Each attack hits at most once.
- [ ] Commit `feat: add fighter combat rules`.

### Task 5: Match simulation and bot AI

**Files:** Create `src/game/match.ts`, `src/game/ai.ts`. Tests `src/game/match.test.ts`, `src/game/ai.test.ts`.

**Interfaces — Produces:**
- `interface MatchState { time: number /* remaining sec */; fighters: [FighterState, FighterState]; kos: [number, number]; supersLanded: [number, number]; events: MatchEvent[]; over: boolean }`
- `type MatchEvent = { type: 'hit' | 'ko' | 'super' | 'line'; who: 0 | 1; text?: string; at: {x;z} }`
- `createMatch(p1: Loadout, p2: Loadout, duration = 300): MatchState`
- `stepMatch(m, intents: [Intent, Intent], dt): MatchState` — fixed step 1/60; caller accumulates.
- `runFrame(m, getIntents, frameDt): MatchState` — clamps frameDt to 0.1 s, steps fixed.
- `botIntent(self, foe, difficulty: number /* 0..1 */, rng): Intent`
- `botLoadoutForLevel(level, rng): Loadout`; `difficultyForLevel(level): number` = `min(1, 0.15 + level * 0.03)`.
- Arena: square ±12 m, positions clamped.

- [ ] Tests: time counts down and `over` at 0; KO increments scorer and respawns target after 2 s; simultaneous KO credits both; `runFrame` with 5 s frame advances time by only 0.1 s; bot at difficulty 0.15 attacks less often than at 1 over 600 steps (count attack intents).
- [ ] Implement. Bot: approach to reach, random reaction delay `0.6 - 0.45*difficulty` s, dodge chance on incoming power/super `0.1 + 0.6*difficulty`, uses super when charged at range.
- [ ] Commit `feat: add match simulation and bot ai`.

### Task 6: Renderer

**Files:** Create `src/render/scene.ts`, `src/render/fighterModel.ts`, `src/render/arena.ts`, `src/render/effects.ts`, `src/render/camera.ts`.

**Interfaces — Produces:**
- `class GameRenderer { constructor(canvas: HTMLCanvasElement); setLoadouts(l1, l2); render(m: MatchState, cameraYaw: number, dt: number); dispose() }`
- Fighter = box head, body, arms, legs (Minecraft proportions) colored by skin; hat and cape boxes; weapon mesh by family. Animate walk swing, attack arm swing, duck squash, dodge roll, KO poof (hide model, spawn cube/confetti particles).
- Arena = grass-block floor tiles, low block walls, a few trees and crates outside the bounds, sky color, hemisphere + directional light.
- Effects: "BONK!" / "POW!" sprite pop text at hit events, speech bubbles via HUD (not here).

- [ ] Verify by running dev server and screenshot (Task 8 does full verification).
- [ ] Commit `feat: add three.js renderer with blocky fighters and arena`.

### Task 7: Input

**Files:** Create `src/input/input.ts`. Test `src/input/input.test.ts`.

**Interfaces — Produces:**
- `class InputController { constructor(target: HTMLElement); intent(self: FighterState): Intent; cameraYaw: number; dispose() }` — edge-triggered actions (quick/power/dash/dodge/super consumed once per press). Movement relative to camera yaw. Pointer lock on canvas click.
- `mapKey(code: string, shift: boolean): KeyAction | null` (pure, tested).

- [ ] Test `mapKey`: ArrowLeft→dodge-left, ShiftLeft+KeyA→dodge-left, KeyA→move-left, KeyC/ArrowDown→duck, KeyF/Enter→super, Space→power, KeyE→quick.
- [ ] Implement. First canvas click only requests pointer lock (does not dash).
- [ ] Commit `feat: add keyboard and mouse input`.

### Task 8: UI screens and game loop

**Files:** Create `src/ui/App.tsx`, `src/ui/PickScreen.tsx`, `src/ui/FightView.tsx`, `src/ui/Hud.tsx`, `src/ui/ResultsScreen.tsx`, `src/ui/PrizePopup.tsx`, matching `*.module.css`.

- App state machine: `pick → fight → results → prize (once per level gained) → pick`. Profile loaded on start, saved after every change.
- PickScreen: cyclers for personality (owned only, stat bars), weapon, skin, hat, cape; rank badge + level + XP bar; controls cheat sheet; export/import save buttons; big FIGHT button.
- FightView: canvas + `GameRenderer` + `InputController`, rAF loop calling `runFrame`; "3-2-1 GO!" countdown; Esc pauses.
- Hud: clock m:ss, KO scores with names, health bars, power cooldown, super meter ("SUPER READY! press F"), speech bubbles from `line` events.
- Results: "YOU WIN!" / "BOT WINS!" / "DRAW!", KOs, XP earned, XP bar animation.
- PrizePopup: "LEVEL UP!" / "RANK UP!", 3 big cards, pick one.

- [ ] Verify end to end in browser: play a shortened match (dev URL flag `?dur=20`), see results, level up, pick prize, confirm it appears on pick screen after reload.
- [ ] Commit `feat: add screens, hud, and game loop`.

### Task 9: Playtest polish

- [ ] Play several matches with browser automation; fix bugs; tune bot so level 1 is beatable.
- [ ] Grep built UI text for banned words.
- [ ] Add `README.md` with how to run.
- [ ] Commit `chore: polish and tune`.
