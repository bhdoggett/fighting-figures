import { useEffect, useRef, useState } from 'react';
import type { Profile } from '../game/progression';
import { xpToNext } from '../game/progression';
import { exportProfile, importProfile } from '../game/save';
import { getPersonality } from '../game/data/personalities';
import { FAMILY_TRADEOFFS, getWeapon } from '../game/data/weapons';
import { COSMETICS, getCosmetic } from '../game/data/cosmetics';
import { MAX_LEVEL } from '../game/data/ranks';
import type { CosmeticSlot } from '../game/types';
import { PreviewRenderer } from '../render/preview';
import { PREVIEW_MOVES, previewCaption, type PreviewMove } from '../render/previewMoves';
import { mapKey } from '../input/input';
import { RankBadge } from './RankBadge';
import shared from './shared.module.css';
import styles from './PickScreen.module.css';

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
  onFight: () => void;
  touch: boolean;
  leftie: boolean;
  onLeftie: (leftie: boolean) => void;
}

const TOUCH_LABELS: Record<PreviewMove, string> = {
  'dodge-forward': 'Spin',
  'dodge-left': '◀ Dodge',
  'dodge-right': 'Dodge ▶',
  duck: 'Duck',
  quick: 'Hit',
  power: 'Power',
  dash: 'Dash',
  super: 'SUPER',
};

function cycle<T>(list: T[], current: T, dir: 1 | -1): T {
  const i = list.indexOf(current);
  return list[(i + dir + list.length) % list.length];
}

function Bars({ value, max = 6, label }: { value: number; max?: number; label: string }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.bars}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={i < value ? styles.barOn : styles.barOff} />
        ))}
      </span>
    </div>
  );
}

function Cycler({ label, value, sub, onPrev, onNext, count }: { label: string; value: string; sub?: string; onPrev: () => void; onNext: () => void; count: number }) {
  return (
    <div className={styles.cycler}>
      <div className={styles.cyclerLabel}>{label}</div>
      <div className={styles.cyclerRow}>
        <button className={shared.small} onClick={onPrev} disabled={count < 2} aria-label={`Previous ${label}`}>
          ◀
        </button>
        <div className={styles.cyclerValue}>
          <div>{value}</div>
          {sub && <div className={styles.cyclerSub}>{sub}</div>}
        </div>
        <button className={shared.small} onClick={onNext} disabled={count < 2} aria-label={`Next ${label}`}>
          ▶
        </button>
      </div>
    </div>
  );
}

export function PickScreen({ profile, onChange, onFight, touch, leftie, onLeftie }: Props) {
  const previewHostRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<PreviewRenderer | null>(null);
  const [saveMode, setSaveMode] = useState<'none' | 'export' | 'import'>('none');
  const [importText, setImportText] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [caption, setCaption] = useState<{ text: string; id: number } | null>(null);
  const captionTimer = useRef(0);
  const { loadout } = profile;
  const loadoutRef = useRef(loadout);
  loadoutRef.current = loadout;

  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;
    const canvas = document.createElement('canvas');
    canvas.className = styles.previewCanvas;
    host.appendChild(canvas);
    const preview = new PreviewRenderer(canvas);
    previewRef.current = preview;
    preview.setLoadout(loadoutRef.current);
    const ro = new ResizeObserver(() => preview.setSize(canvas.clientWidth, canvas.clientHeight));
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      preview.dispose();
      canvas.remove();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    previewRef.current?.setLoadout(loadout);
  }, [loadout]);

  const personalityRef = useRef(getPersonality(loadout.personality));
  personalityRef.current = getPersonality(loadout.personality);

  const showCaption = (move: PreviewMove) => {
    setCaption({ text: previewCaption(move, personalityRef.current), id: Date.now() });
    window.clearTimeout(captionTimer.current);
    captionTimer.current = window.setTimeout(() => setCaption(null), 1200);
  };

  const tryMove = (move: PreviewMove) => {
    const preview = previewRef.current;
    if (!preview) return;
    if (move === 'duck') {
      preview.setDucking(true);
      window.setTimeout(() => preview.setDucking(false), 800);
    } else {
      preview.play(move);
    }
    showCaption(move);
  };

  // Fight keys show off moves on the menu (but not while typing a save code).
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement;
    const toMove = (code: string): PreviewMove | null => {
      const a = mapKey(code);
      if (!a || a.startsWith('move-')) return null;
      return a as PreviewMove;
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      // Let Enter/Space press a menu button that was reached with Tab.
      if (e.target instanceof HTMLButtonElement && (e.code === 'Enter' || e.code === 'Space')) return;
      const move = toMove(e.code);
      if (!move) return;
      e.preventDefault();
      if (e.repeat) return;
      const preview = previewRef.current;
      if (move === 'duck') {
        preview?.setDucking(true);
        showCaption('duck');
      } else {
        preview?.play(move);
        showCaption(move);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (toMove(e.code) === 'duck') previewRef.current?.setDucking(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.clearTimeout(captionTimer.current);
    };
    // showCaption only touches refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const personality = getPersonality(loadout.personality);
  const weapon = getWeapon(loadout.weapon);
  const owned = profile.owned;

  const setLoadout = (patch: Partial<Profile['loadout']>) => onChange({ ...profile, loadout: { ...loadout, ...patch } });

  const ownedSlot = (slot: CosmeticSlot) => COSMETICS.filter((c) => c.slot === slot && owned.cosmetics.includes(c.id)).map((c) => c.id);
  const skins = ownedSlot('skin');
  const hats: (string | undefined)[] = [undefined, ...ownedSlot('hat')];
  const capes: (string | undefined)[] = [undefined, ...ownedSlot('cape')];

  const xpNeed = xpToNext(profile.level);
  const xpPct = profile.level >= MAX_LEVEL ? 100 : Math.round((profile.xp / xpNeed) * 100);

  const doImport = () => {
    const p = importProfile(importText);
    if (!p) {
      setSaveMsg("Hmm, that code didn't work. Check it and try again!");
      return;
    }
    onChange(p);
    setSaveMode('none');
    setImportText('');
    setSaveMsg('Save loaded!');
  };

  const code = saveMode === 'export' ? exportProfile(profile) : '';

  return (
    <div className={shared.screen}>
      <div className={styles.layout}>
        <header className={styles.header}>
          <h1 className={shared.title}>Fighting Figures</h1>
          <div className={`${shared.panel} ${styles.profile}`}>
            <RankBadge level={profile.level} />
            <div className={styles.level}>Level {profile.level}</div>
            <div className={styles.xpBar} title={`${profile.xp} / ${xpNeed} XP`}>
              <progress className={styles.xpFill} value={xpPct} max={100} />
            </div>
            <div className={styles.record}>
              {profile.battles} battles · {profile.wins} wins{profile.trophies > 0 ? ` · ${profile.trophies} trophies` : ''}
            </div>
          </div>
        </header>

        <section className={`${shared.panel} ${styles.previewPanel}`}>
          <div className={styles.previewWrap}>
            <div ref={previewHostRef} className={styles.preview} />
            {caption && (
              <div key={caption.id} className={styles.caption}>
                {caption.text}
              </div>
            )}
          </div>
          <div className={styles.fighterName}>{personality.name}</div>
          <div className={styles.blurb}>{personality.blurb}</div>
          <div className={styles.quote}>“{personality.lines.taunt[0]}”</div>
        </section>

        <section className={`${shared.panel} ${styles.options}`}>
          <Cycler
            label="Fighter"
            value={personality.name}
            sub={`Space: ${personality.powerMoveName}`}
            count={owned.personalities.length}
            onPrev={() => setLoadout({ personality: cycle(owned.personalities, loadout.personality, -1) })}
            onNext={() => setLoadout({ personality: cycle(owned.personalities, loadout.personality, 1) })}
          />
          <div className={styles.stats}>
            <Bars label="Speed" value={personality.speed} />
            <Bars label="Power" value={personality.power} />
            <Bars label="Health" value={personality.health} />
            <div className={styles.superInfo}>
              Super: charges in <b>{personality.superChargeSec}s</b> ·{' '}
              {personality.superDamage === 'ko' ? <b>instant KO!</b> : <b>{Math.round(personality.superDamage * 100)}% damage</b>}
            </div>
          </div>
          <Cycler
            label="Weapon"
            value={weapon.name}
            sub={`👍 ${FAMILY_TRADEOFFS[weapon.family].good} · 👎 ${FAMILY_TRADEOFFS[weapon.family].bad}`}
            count={owned.weapons.length}
            onPrev={() => setLoadout({ weapon: cycle(owned.weapons, loadout.weapon, -1) })}
            onNext={() => setLoadout({ weapon: cycle(owned.weapons, loadout.weapon, 1) })}
          />
          <Cycler
            label="Skin"
            value={getCosmetic(loadout.skin)?.name ?? 'Blue Buddy'}
            count={skins.length}
            onPrev={() => setLoadout({ skin: cycle(skins, loadout.skin, -1) })}
            onNext={() => setLoadout({ skin: cycle(skins, loadout.skin, 1) })}
          />
          <Cycler
            label="Hat"
            value={getCosmetic(loadout.hat)?.name ?? 'No hat'}
            sub={hats.length < 2 ? 'Win prizes to get hats!' : undefined}
            count={hats.length}
            onPrev={() => setLoadout({ hat: cycle(hats, loadout.hat, -1) })}
            onNext={() => setLoadout({ hat: cycle(hats, loadout.hat, 1) })}
          />
          <Cycler
            label="Cape"
            value={getCosmetic(loadout.cape)?.name ?? 'No cape'}
            sub={capes.length < 2 ? 'Win prizes to get capes!' : undefined}
            count={capes.length}
            onPrev={() => setLoadout({ cape: cycle(capes, loadout.cape, -1) })}
            onNext={() => setLoadout({ cape: cycle(capes, loadout.cape, 1) })}
          />
        </section>

        <div className={styles.side}>
        <button className={`${shared.big} ${styles.fight}`} onClick={onFight}>
          FIGHT!
        </button>
        {touch ? (
        <section className={`${shared.panel} ${styles.controls}`}>
          <h2 className={styles.h2}>Controls</h2>
          <p className={styles.tryIt}>Left thumb: drag the stick to move. Right thumb: tap buttons to fight. Tap one below to try it!</p>
          <div className={styles.touchMoves}>
            {PREVIEW_MOVES.map(({ move }) => (
              <button key={move} className={shared.small} onClick={() => tryMove(move)}>
                {TOUCH_LABELS[move]}
              </button>
            ))}
          </div>
          <label className={styles.leftieToggle}>
            <input type="checkbox" checked={leftie} onChange={(e) => onLeftie(e.target.checked)} />
            <span>Leftie: buttons on the left, stick on the right</span>
          </label>
          <p className={styles.goal}>Most KOs in 3 minutes wins!</p>
        </section>
        ) : (
        <section className={`${shared.panel} ${styles.controls}`}>
          <h2 className={styles.h2}>Controls</h2>
          <p className={styles.tryIt}>Press a key (or click it) to try the move!</p>
          <ul className={styles.keys}>
            <li><kbd>↑</kbd> <kbd>↓</kbd> move closer / back up</li>
            <li><kbd>←</kbd> <kbd>→</kbd> circle around</li>
            {PREVIEW_MOVES.map(({ move, key, label }) => (
              <li key={move}>
                <button className={styles.keyButton} onMouseDown={(e) => e.preventDefault()} onClick={() => tryMove(move)}>
                  <kbd>{key}</kbd>
                  {key === 'F' && <> / <kbd>Enter</kbd></>} {label}
                </button>
              </li>
            ))}
            <li><kbd>P</kbd> / <kbd>Esc</kbd> pause</li>
          </ul>
          <p className={styles.goal}>Most KOs in 3 minutes wins!</p>
        </section>
        )}

          <div className={styles.saveButtons}>
            <button className={shared.small} onClick={() => { setSaveMode(saveMode === 'export' ? 'none' : 'export'); setSaveMsg(''); }}>
              Save code
            </button>
            <button className={shared.small} onClick={() => { setSaveMode(saveMode === 'import' ? 'none' : 'import'); setSaveMsg(''); }}>
              Load code
            </button>
            {saveMsg && <span className={styles.saveMsg}>{saveMsg}</span>}
          </div>
        </div>

        {saveMode !== 'none' && (
          <section className={`${shared.panel} ${styles.saveBox}`}>
            {saveMode === 'export' ? (
              <>
                <p>Copy this code to keep your progress safe:</p>
                <textarea className={styles.code} readOnly value={code} onFocus={(e) => e.currentTarget.select()} />
                <button
                  className={shared.small}
                  onClick={() => {
                    navigator.clipboard?.writeText(code).then(() => setSaveMsg('Copied!'), () => setSaveMsg('Select the code and copy it.'));
                  }}
                >
                  Copy
                </button>
              </>
            ) : (
              <>
                <p>Paste a save code:</p>
                <textarea className={styles.code} value={importText} onChange={(e) => setImportText(e.target.value)} />
                <button className={shared.small} onClick={doImport}>
                  Load it!
                </button>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
