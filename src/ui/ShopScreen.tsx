import { useState } from 'react';
import type { Profile } from '../game/progression';
import { buyItem } from '../game/progression';
import { SHOP_ITEMS, type ShopItem } from '../game/data/shop';
import { ItemIcon } from './PrizeIcon';
import { redeemCode } from '../game/codes';
import shared from './shared.module.css';
import styles from './ShopScreen.module.css';

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
  onBack: () => void;
}

type Tab = 'armor' | 'weapon';

function owns(p: Profile, item: ShopItem): boolean {
  return item.kind === 'armor' ? p.owned.armor.includes(item.id) : p.owned.weapons.includes(item.id);
}

function equipped(p: Profile, item: ShopItem): boolean {
  return item.kind === 'armor' ? p.loadout.armor === item.id : p.loadout.weapon === item.id;
}

export function ShopScreen({ profile, onChange, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('armor');
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ text: string; good: boolean } | null>(null);

  const tryCode = () => {
    const r = redeemCode(profile, code);
    if (r.ok) {
      onChange(r.profile);
      setCode('');
      const who = r.bundle.personalities?.length ? ' Ready to fight on the main screen!' : '';
      setCodeMsg({ text: `Unlocked: ${r.bundle.name}!${who}`, good: true });
    } else {
      setCodeMsg({ text: r.reason === 'used' ? 'You already used that code!' : "Hmm, that code doesn't work. Check the spelling!", good: false });
    }
  };
  const items = SHOP_ITEMS.filter((i) => i.kind === tab);

  const buy = (item: ShopItem) => {
    const next = buyItem(profile, item.id);
    if (!next) return;
    onChange(next);
    setMsg(`You got the ${item.name}! It's equipped.`);
  };

  const equip = (item: ShopItem) => {
    const loadout = item.kind === 'armor' ? { ...profile.loadout, armor: item.id } : { ...profile.loadout, weapon: item.id };
    onChange({ ...profile, loadout });
    setMsg(`${item.name} equipped!`);
  };

  return (
    <div className={shared.screen}>
      <div className={styles.layout}>
        <header className={styles.header}>
          <button className={shared.small} onClick={onBack}>
            ◀ Back
          </button>
          <h1 className={shared.title}>Shop</h1>
          <div className={styles.coins}>
            <span className={styles.coinIcon} aria-hidden="true" />
            {profile.coins} Figure Coins
          </div>
        </header>

        <p className={styles.tip}>Earn coins by leveling up — big bonus at level 10 and level 20! Every item has a catch, so pick what fits how you fight.</p>

        <form
          className={styles.codeBox}
          onSubmit={(e) => {
            e.preventDefault();
            tryCode();
          }}
        >
          <label className={styles.codeLabel} htmlFor="secret-code">
            Have a secret code?
          </label>
          <input
            id="secret-code"
            className={styles.codeInput}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Type it here"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button className={shared.small} type="submit" disabled={!code.trim()}>
            Unlock
          </button>
          {codeMsg && <span className={codeMsg.good ? styles.codeGood : styles.codeBad}>{codeMsg.text}</span>}
        </form>

        <div className={styles.tabs}>
          <button className={tab === 'armor' ? styles.tabOn : styles.tab} onClick={() => setTab('armor')}>
            Armor
          </button>
          <button className={tab === 'weapon' ? styles.tabOn : styles.tab} onClick={() => setTab('weapon')}>
            Special Weapons
          </button>
          {import.meta.env.DEV && (
            <button className={styles.dev} onClick={() => onChange({ ...profile, coins: profile.coins + 1000 })}>
              +1000 coins (dev only)
            </button>
          )}
        </div>

        {msg && <div className={styles.msg}>{msg}</div>}

        <div className={styles.grid}>
          {items.map((item) => {
            const have = owns(profile, item);
            const on = equipped(profile, item);
            const afford = profile.coins >= item.price;
            return (
              <div key={item.id} className={have ? styles.cardOwned : styles.card}>
                <ItemIcon kind={item.kind} id={item.id} />
                <div className={styles.name}>{item.name}</div>
                <div className={styles.good}>👍 {item.good}</div>
                <div className={styles.bad}>👎 {item.bad}</div>
                {have ? (
                  <button className={shared.small} onClick={() => equip(item)} disabled={on}>
                    {on ? 'Equipped' : 'Equip'}
                  </button>
                ) : (
                  <button className={afford ? styles.buy : styles.buyLocked} onClick={() => buy(item)} disabled={!afford}>
                    <span className={styles.coinIcon} aria-hidden="true" />
                    {item.price}
                  </button>
                )}
                {!have && !afford && <div className={styles.need}>Need {item.price - profile.coins} more</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
