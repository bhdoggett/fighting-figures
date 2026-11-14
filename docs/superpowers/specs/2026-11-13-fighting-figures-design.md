# Fighting Figures — Design

Date: 2026-11-13
Status: Ready for owner approval

## Intent

A full 3D fighting game set in a blocky, Minecraft-style world. You make a fighter, battle a computer opponent 1v1, and earn XP, levels, ranks, and prizes (new weapons and things to wear) as you play. The fun is twofold: fights that feel good moment to moment, and a steady stream of rewards that make your fighter more *yours* over time.

The owner will not read the code. Everything must be playable and checkable by running the game.

### Audience and tone

- The first player is a 9-year-old.
- The tone is **goofy, not graphic**. No blood, no gore, and no realistic violence.
- Never use the word "kill" (or "die", "dead", "death") anywhere the player can see. Use **KO** instead: "most KOs wins", "instant KO".
- A KO'd fighter poofs into a burst of blocks, stars, or confetti, then respawns. Hits look like cartoon bonks (squash, wobble, "BONK!" pop text), not wounds.
- Personality lines are silly and friendly trash talk, never mean or scary.
- Screens use short words and big text, readable by a 9-year-old.
- The level-1 computer opponent is beatable by a 9-year-old new to the game. Difficulty ramps gently from there.

## Goals

- A 3D, third-person 1v1 fight against a computer opponent in a blocky arena.
- Timed matches: 5 minutes, most KOs wins, fighters respawn after a knockout.
- Distinct preset personalities with different stats, lines, special moves, and super-move charge times.
- Progression that saves: XP from every battle, levels, ranks every 5 levels, and a prize at every level-up.
- Weapons with real trade-offs, so no weapon is simply best.
- Runs in a desktop web browser, offline, shareable by link.

## Non-goals (for now)

- Online multiplayer, accounts, matchmaking, or servers. Computer opponents only.
- Typed or AI-generated personalities. Personalities are presets.
- Open-world exploration. The world is a single arena.
- Mobile/touch controls and gamepad support.
- Purchases or real money of any kind.

## Anti-goals (failure even if it "works")

- One dominant choice: a personality, weapon, or tactic (e.g. spamming spacebar, or waiting out the super timer) that always wins.
- Fights that become trivially easy as the player levels up.
- Losing progress (XP, unlocks) unexpectedly.
- Non-blocky art that breaks the Minecraft-like feel.

## Constraints

- Desktop browser, keyboard + mouse/trackpad.
- No backend. Save data lives in browser `localStorage`.
- Built and verified by an agent: it must run headlessly enough to screenshot and drive with browser automation.

## Approaches considered

| Approach | Trade-offs | Outcome |
|---|---|---|
| **A. Three.js + React + Vite (TypeScript)** | Browser-based, shareable by link; agent can run, screenshot, and test it directly. More pieces hand-built (hit detection, animation wiring), which is fine for one arena and a 1v1. | **Chosen** |
| B. Babylon.js | More built in (physics, animation, GUI), but heavier, and its GUI overlaps with React. Extra features unneeded for one arena. | Rejected |
| C. Godot / Unity | Best tooling for large 3D games, but editor-centric (hard for an agent to drive and verify), download not a link. | Rejected |

The owner handed over the "how" and does not plan to read the code. A was chosen because it is the option the builder can verify most reliably by running it.

## The game, as decided

### Match

- 1 player vs 1 computer fighter.
- 5-minute clock. Most KOs at time-up wins. A tie at time-up is a draw (builder's call; see below).
- Knocked-out fighters respawn after a short delay (a few seconds) at a spawn point.
- Small arena, about the size of a Minecraft house plus yard, so fighters are never searching for each other.

### Controls

| Input | Action |
|---|---|
| W A S D | Walk |
| Mouse | Turn camera |
| Click / trackpad tap | Dash forward with weapon (a lunge attack) |
| E or right-click | Quick, weak attack |
| Spacebar | Powerful attack, with a short cooldown |
| Shift + W/A/D, **or** Left / Right / Up arrow | Dodge in that direction (both work; owner's choice) |
| C, **or** Down arrow | Duck (C added by designer so the left hand can duck) |
| F, **or** Enter | Super move, once charged (F added by designer for the same reason) |

Both key sets work at all times: the left-hand set for mouse players, and the arrow keys plus Enter as the owner originally described.

### Camera

Third-person, over the shoulder, so the player sees their skin and weapon.

### Super move (Enter)

- Charges over time; each personality has its own charge time.
- Long charge = instant KO on hit. Short charge = big damage, not a KO.
- The super can miss and can be dodged. The computer opponent has one too.

### Personalities (presets)

Picked before each battle. Each spreads the same 10 points across Speed, Power, and Health, has its own spacebar move, its own lines, and its own super charge.

| Personality | Speed | Power | Health | Spacebar move | Super charge | Super hit | Sample line |
|---|---|---|---|---|---|---|---|
| Hothead | 3 | 5 | 2 | Charging fire punch | 60 s | Instant KO | "You want some?!" |
| Ninja | 5 | 2 | 3 | Teleport slash | 25 s | 40% of health | "Too slow." |
| Tank | 1 | 3 | 6 | Ground-pound shockwave | 90 s | Instant KO | "I'm not moving." |
| Trickster | 4 | 3 | 3 | Fake-out double hit | 40 s | 60% of health | "Hehe, over here!" |

Names, lines, moves, and numbers are starting values to tune by playtesting. Lines appear as on-screen speech bubbles (taunts, on hit, on KO, on win). More personalities can be unlocked as rank-up prizes.

### Weapons

Each weapon trades one strength for a weakness. Weapons stack with personality stats.

| Weapon | Good at | Bad at |
|---|---|---|
| Wooden sword (starter) | Balanced | Nothing special |
| Hammer | Big damage | Slow swing |
| Daggers | Very fast | Short reach, low damage |
| Spear | Long reach | Weak up close |

Better versions of each (e.g. iron, gold, diamond tiers) can be prizes. Upgrades are modest so that skill matters more than gear.

### Skins and wearables

- Skin: base look of the blocky fighter (color/texture variants).
- Wearables: hats, capes, armor pieces. Cosmetic only.
- Chosen on the pick screen before battle.

### Progression

- **XP:** every battle grants XP, including losses. Bonus XP for winning, for each KO, and for landing a super.
- **Levels:** enough XP raises your level.
- **Ranks:** milestones at levels 5, 10, 15, 20, 25. Proposed names: Wood (1–4), Stone (5–9), Iron (10–14), Gold (15–19), Diamond (20–24), Obsidian (25+). The rank badge shows on the pick screen and in the fight HUD.
- **Level-up prize:** pick 1 of 3 offered prizes (a wearable, a weapon or weapon upgrade, or a skin variant).
- **Rank-up prize:** a bigger prize, such as a new personality.
- **Opponent scaling:** the computer opponent gets smarter and better equipped as the player levels, so fights stay challenging.
- **Saving:** all progress saves automatically to `localStorage`.

### Screens

1. **Pick screen:** skin, wearables, personality (with stat bars), weapon, rank badge, FIGHT button.
2. **Fight:** 3D arena, HUD with clock, KO scores, health, spacebar cooldown, super charge meter.
3. **Results:** winner, KOs, XP gained, level bar.
4. **Level-up / rank-up:** pick-1-of-3 prize popup.

```
 ┌──────────────────────────────┐
 │ 4:12        You 3 · Bot 2   │
 │        [bot]                 │
 │          ▲ YOU (back view)   │
 │ HP ■■■■□  SPACE ■■□  SUPER ▓▓▓░ │
 └──────────────────────────────┘
```

## Technical direction

- Vite + React + TypeScript. React draws all menus and the HUD; CSS modules with design tokens in `:root`.
- Three.js draws the arena and fighters. Fighters built from boxes (blocky, Minecraft-like), animated in code.
- Custom lightweight combat: hitboxes as simple shapes, fixed-timestep game loop, flat arena so no full physics engine.
- Game logic (combat rules, stats, XP math, opponent AI) kept separate from rendering so it can be unit-tested.
- Save data versioned in `localStorage` so future updates don't wipe progress.

## Calls made by the designer (owner to check)

- **"Offline" means no server.** The game is a static site. Making it installable or cached for no-internet play (a PWA) is out of scope for now. Hosting and deployment are not part of the first plan; the game runs locally first.
- **Save backup:** add a simple "export save / import save" button on the pick screen. Progress lives in each browser, and clearing browser data would otherwise wipe it.
- **Progression length:** reaching Obsidian (level 25) should take roughly 10 hours of play. Levels cap at 30. Each personality, weapon line, and wearable slot gets enough prizes to fill that range: about 30 level-up prizes plus 5 rank-up prizes. After everything is unlocked, levels still grant XP and the rank badge, and prizes repeat as color variants.

## Left to the builder

- Exact damage, health, cooldown, dash distance, respawn time, and XP curve values.
- Opponent AI design and how difficulty scales with level.
- Arena layout and decoration within the blocky style.
- The full prize list and which prizes are offered at which levels.
- Visual design of menus and HUD within the blocky theme.
- Draw handling at time-up (proposed: draw, with XP for both).
- Sound and music (nice to have, not required for the first playable version).

## Suggested build order

1. Playable core: arena, one fighter, one bot, walk/dodge/duck, quick attack, KOs, respawn, 5-minute clock.
2. Full move set: dash, spacebar move, super with charge meter.
3. Personalities and weapons with their stats and trade-offs.
4. Pick screen, results screen, saving.
5. XP, levels, ranks, prizes, opponent scaling.
6. Skins, wearables, polish.
