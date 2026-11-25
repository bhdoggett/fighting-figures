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
import { isTouchDevice } from './device';
import { loadSettings, saveSettings, type Settings } from '../game/settings';
import { RotateHint } from './RotateHint';
import { ShopScreen } from './ShopScreen';
import { HolidayPopup } from './HolidayPopup';
import { grantSeasonal, type SeasonalGift } from '../game/seasonal';

/** Today, or ?today=YYYY-MM-DD while developing (to test holiday gifts). */
function today(): Date {
  const override = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('today') : null;
  return override ? new Date(`${override}T12:00:00`) : new Date();
}

type Screen =
  | { kind: 'pick' }
  | { kind: 'shop' }
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

function Screens() {
  const [start] = useState(() => grantSeasonal(loadProfile(window.localStorage), today()));
  const [profile, setProfile] = useState<Profile>(start.profile);
  const [gifts, setGifts] = useState<SeasonalGift[]>(start.granted);
  const [settings, setSettings] = useState<Settings>(() => loadSettings(window.localStorage));
  const [touch] = useState(isTouchDevice);

  useEffect(() => {
    saveSettings(window.localStorage, settings);
  }, [settings]);
  // Unclaimed prizes from a closed tab are offered first thing.
  const [screen, setScreen] = useState<Screen>(() => prizeScreenFor(profile));

  useEffect(() => {
    saveProfile(window.localStorage, profile);
  }, [profile]);

  const startFight = useCallback(() => {
    // The game may have been left open overnight into the holiday window.
    const { profile: gifted, granted } = grantSeasonal(profile, today());
    if (granted.length > 0) {
      setProfile(gifted);
      setGifts(granted);
      return;
    }
    const bot = botLoadoutForLevel(profile.level, Math.random);
    setScreen({ kind: 'fight', bot, difficulty: difficultyForLevel(profile.level), key: Date.now() });
  }, [profile]);

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
      const { profile: leveled, xp, coins } = finishBattle(profile, result);
      setProfile(leveled);
      setScreen({
        kind: 'results',
        info: {
          result,
          xp,
          coins,
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

  const view = (() => {
  switch (screen.kind) {
    case 'pick':
      return (
        <PickScreen
          profile={profile}
          onChange={setProfile}
          onFight={startFight}
          onShop={() => setScreen({ kind: 'shop' })}
          touch={touch}
          leftie={settings.leftie}
          onLeftie={(leftie) => setSettings({ ...settings, leftie })}
        />
      );
    case 'fight':
      return (
        <FightView
          key={screen.key}
          player={profile.loadout}
          bot={screen.bot}
          difficulty={screen.difficulty}
          duration={matchDuration()}
          level={profile.level}
          touch={touch}
          leftie={settings.leftie}
          onDone={finishFight}
          onQuit={() => setScreen({ kind: 'pick' })}
        />
      );
    case 'shop':
      return <ShopScreen profile={profile} onChange={setProfile} onBack={() => setScreen({ kind: 'pick' })} />;
    case 'results':
      return <ResultsScreen info={screen.info} onContinue={afterResults} />;
    case 'prize':
      return <PrizePopup level={screen.level} offers={screen.offers} onPick={pickPrize} />;
  }
  })();

  const wearGifts = () => {
    const loadout = { ...profile.loadout };
    for (const g of gifts) {
      if (g.id.startsWith('skin-')) loadout.skin = g.id;
      else if (g.id.startsWith('hat-')) loadout.hat = g.id;
      else if (g.id.startsWith('cape-')) loadout.cape = g.id;
      else loadout.weapon = g.id;
    }
    setProfile({ ...profile, loadout });
    setGifts([]);
  };

  return (
    <>
      {view}
      {gifts.length > 0 && <HolidayPopup gifts={gifts} onWear={wearGifts} onClose={() => setGifts([])} />}
    </>
  );
}

export function App() {
  return (
    <>
      <Screens />
      <RotateHint />
    </>
  );
}
