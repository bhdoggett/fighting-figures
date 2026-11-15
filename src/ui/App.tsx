import { useCallback, useEffect, useState } from 'react';
import type { Loadout } from '../game/types';
import { claimPrize, finishBattle, offerPrizes, type BattleResult, type Prize, type Profile } from '../game/progression';
import { loadProfile, saveProfile } from '../game/save';
import { botLoadoutForLevel, difficultyForLevel } from '../game/ai';
import { winnerOf, type MatchState } from '../game/match';
import { PickScreen } from './PickScreen';
import { FightView } from './FightView';
import { ResultsScreen, type ResultsInfo } from './ResultsScreen';
import { PrizePopup } from './PrizePopup';

type Screen =
  | { kind: 'pick' }
  | { kind: 'fight'; bot: Loadout; difficulty: number; key: number }
  | { kind: 'results'; info: ResultsInfo }
  | { kind: 'prize'; level: number; offers: Prize[] };

function prizeScreenFor(p: Profile): Screen {
  const level = p.pendingPrizes[0];
  if (level === undefined) return { kind: 'pick' };
  return { kind: 'prize', level, offers: offerPrizes(p, level, Math.random) };
}

function matchDuration(): number {
  const dur = Number(new URLSearchParams(window.location.search).get('dur'));
  return Number.isFinite(dur) && dur > 0 ? dur : 180;
}

export function App() {
  const [profile, setProfile] = useState<Profile>(() => loadProfile(window.localStorage));
  // Unclaimed prizes from a closed tab are offered first thing.
  const [screen, setScreen] = useState<Screen>(() => prizeScreenFor(profile));

  useEffect(() => {
    saveProfile(window.localStorage, profile);
  }, [profile]);

  const startFight = useCallback(() => {
    const bot = botLoadoutForLevel(profile.level, Math.random);
    setScreen({ kind: 'fight', bot, difficulty: difficultyForLevel(profile.level), key: Date.now() });
  }, [profile.level]);

  const finishFight = useCallback(
    (m: MatchState) => {
      const w = winnerOf(m);
      const result: BattleResult = {
        won: w === 0,
        draw: w === 'draw',
        kos: m.kos[0],
        supersLanded: m.supersLanded[0],
      };
      const before = profile;
      const { profile: leveled, xp } = finishBattle(profile, result);
      setProfile(leveled);
      setScreen({
        kind: 'results',
        info: {
          result,
          xp,
          botKos: m.kos[1],
          botName: m.fighters[1].personality.name,
          levelBefore: before.level,
          xpBefore: before.xp,
          levelAfter: leveled.level,
          xpAfter: leveled.xp,
        },
      });
    },
    [profile],
  );

  const afterResults = useCallback(() => setScreen(prizeScreenFor(profile)), [profile]);

  const pickPrize = useCallback(
    (prize: Prize) => {
      const next = claimPrize(profile, prize);
      setProfile(next);
      setScreen(prizeScreenFor(next));
    },
    [profile],
  );

  switch (screen.kind) {
    case 'pick':
      return <PickScreen profile={profile} onChange={setProfile} onFight={startFight} />;
    case 'fight':
      return (
        <FightView
          key={screen.key}
          player={profile.loadout}
          bot={screen.bot}
          difficulty={screen.difficulty}
          duration={matchDuration()}
          level={profile.level}
          onDone={finishFight}
          onQuit={() => setScreen({ kind: 'pick' })}
        />
      );
    case 'results':
      return <ResultsScreen info={screen.info} onContinue={afterResults} />;
    case 'prize':
      return <PrizePopup level={screen.level} offers={screen.offers} onPick={pickPrize} />;
  }
}
