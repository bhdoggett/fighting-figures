# Shop & Figure Coins — Design

Date: 2026-11-17 · Status: Owner said "go ahead" (designer calls below)

## Owner's asks
- A shop with special items you can't get from level-up prizes.
- Coins every level-up; one level isn't enough for anything good, two level-ups buys something small.
- Every two rank-ups gives a coin bonus.
- Armor that gives more HP; special weapons (maces, flaming swords, poison darts...). Better items cost more.
- Dev-only way to give yourself coins to see and use the whole shop.

## Designer calls
- 40 coins per level gained; +300 bonus on reaching level 10 and level 20 (every two rank-ups).
- Every item has a catch; pricier = bigger upside, smaller catch.
- Armor (new loadout slot): Leather Vest 75 (+10 HP, -3% speed), Chainmail 200 (+25 HP, -8%), Knight Plate 450 (+45 HP, -15%), Dragon Scale 900 (+50 HP, -5%).
- Shop weapons: Mace 150 (heavy hits, longer stun, slow swing), Poison Darts 350 (quick hits are thrown darts that poison; weak up close), Flaming Sword 500 (hits burn), Frost Hammer 750 (hits slow the target; very slow swing), Thunder Spear 1000 (long reach; every 3rd hit zaps for extra damage).
- Poison/burn deal small damage over a few seconds (green bubbles / orange flicker, nothing gross). A KO from poison/burn counts for the attacker.
- Ducking makes darts fly over you.
- Bot: armor from level 8+, sometimes a shop weapon from level 16+.
- Dev-only "+1000 coins" button (`import.meta.env.DEV`), absent from production builds.
- Old saves load with 0 coins and no armor.

## Non-goals
Special missions (still a later conversation).
