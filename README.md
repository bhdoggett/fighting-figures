# Fighting Figures

A goofy, blocky 3D fighting game for the browser. Pick a fighter, grab a weapon, and bonk a computer opponent. The fighter with the most KOs after 3 minutes wins. Every battle earns XP, every level-up gives you a prize to pick, and every 5 levels you rank up (Wood, Stone, Iron, Gold, Diamond, Obsidian).

## Play

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

Add `?dur=30` to the address for a 30-second match (handy for testing).

## Controls

| Key | What it does |
|---|---|
| ↑ / ↓ | Move toward / away from your opponent |
| ← / → | Circle around your opponent |
| W | Spin forward |
| A / D | Dodge left / right |
| S | Duck: quick hits miss you, but you can't attack until you stand back up |
| E | Quick hit |
| Space | Power move (each fighter has their own) |
| Q | Dash attack |
| F or Enter | Super move, once the meter is full |
| P or Esc | Pause (or click the Pause button) |

The camera stays locked on: you always face your opponent. No mouse needed.

## Fighters

| Fighter | Speed | Power | Health | Super |
|---|---|---|---|---|
| Hothead | 3 | 5 | 2 | 36 s charge, instant KO |
| Ninja | 5 | 2 | 3 | 15 s charge, 40% damage |
| Tank | 1 | 3 | 6 | 54 s charge, instant KO |
| Trickster | 4 | 3 | 3 | 24 s charge, 60% damage |
| Robo-Bonk (rank-up prize) | 2 | 4 | 4 | 30 s charge, 75% damage |
| Grumpy Wizard (rank-up prize) | 2 | 5 | 3 | 42 s charge, instant KO |

## Shop

Every level-up earns **Figure Coins** (40 each), with a 300-coin bonus at level 10 and level 20. Spend them in the **Shop** on the main screen on items you can't win as prizes:

| Item | Coins | Good | Catch |
|---|---|---|---|
| Leather Vest | 75 | +10 health | 3% slower |
| Mace | 150 | Big, dizzying hits | Slow swing |
| Chainmail | 200 | +25 health | 8% slower |
| Poison Darts | 350 | Quick hit throws a poison dart | Weak up close; ducking dodges darts |
| Knight Plate | 450 | +45 health | 15% slower |
| Flaming Sword | 500 | Hits set foes on fire | A bit slower than a sword |
| Frost Hammer | 750 | Huge hits that freeze foes slow | Very slow swing |
| Dragon Scale | 900 | +50 health | 5% slower |
| Thunder Spear | 1000 | Long reach; every 3rd hit zaps | Costs the most |

Bots wear armor from level 8 and sometimes bring shop weapons from level 16, so fights stay fair.

When running `npm run dev`, the shop has a **+1000 coins (dev only)** button for testing. It isn't in the real build.

## Holiday gifts

Open the game from 5 days before to 5 days after US Thanksgiving (the fourth Thursday of November) to get the **Pilgrim Hat**, **Turkey Cape**, and **Cornstalk Sword** for keeps. **December** (starting the day after the Thanksgiving gift ends) gives the **Gingerbread** outfit, **Rudolph Antlers & Nose**, and the **Candy Cane Sword**. Holiday items are never level-up prizes or shop items. While developing, add `?today=2026-11-26` to the address to test any date.

## Saving

Progress saves in the browser automatically. Use **Save code** on the main screen to copy a backup code, and **Load code** to restore it (for example, in another browser).

## Development

```bash
npm test          # game logic, progression, save, input, and balance tests
npm run build     # type-check and production build
npm run playtest  # drives a short match in Chrome and saves screenshots to /tmp/ff-shots (needs `npm run dev` running on port 5179)
```

- `src/game/`: pure game logic (combat, match, bot AI, XP, prizes, saving). No rendering, fully unit-tested.
- `src/render/`: Three.js scene, blocky fighter models, arena, effects.
- `src/input/`: keyboard and mouse handling.
- `src/ui/`: React screens and HUD (CSS modules, design tokens in `src/ui/tokens.css`).
- Design and plan: `docs/superpowers/`.
