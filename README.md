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
| W A S D | Walk |
| Mouse | Look around (click the game first to grab the mouse; Esc to let go) |
| Click | Dash attack |
| E or right-click | Quick hit |
| Space | Power move (each fighter has their own) |
| Shift + W/A/S/D, or arrow keys | Dodge |
| C or down arrow | Duck (quick hits and dashes miss you) |
| F or Enter | Super move, once the meter is full |
| Esc or P | Pause |

If you don't touch the mouse for a moment, the camera turns toward your opponent on its own.

## Fighters

| Fighter | Speed | Power | Health | Super |
|---|---|---|---|---|
| Hothead | 3 | 5 | 2 | 36 s charge, instant KO |
| Ninja | 5 | 2 | 3 | 15 s charge, 40% damage |
| Tank | 1 | 3 | 6 | 54 s charge, instant KO |
| Trickster | 4 | 3 | 3 | 24 s charge, 60% damage |
| Robo-Bonk (rank-up prize) | 2 | 4 | 4 | 30 s charge, 75% damage |
| Grumpy Wizard (rank-up prize) | 2 | 5 | 3 | 42 s charge, instant KO |

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
