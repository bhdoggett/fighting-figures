import { useEffect, useRef } from 'react';
import type { Prize } from '../game/progression';
import { getWeapon } from '../game/data/weapons';
import { getCosmetic } from '../game/data/cosmetics';
import { getPersonality } from '../game/data/personalities';
import type { PersonalityId } from '../game/types';
import { getArmor } from '../game/data/shop';
import styles from './PrizeIcon.module.css';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const INK = '#1d1b2f';
const WOOD = '#8a5a2b';
const SKIN = '#f2c79b';

type Px = (x: number, y: number, w: number, h: number, c: string) => void;

function drawWeapon(px: Px, id: string) {
  const w = getWeapon(id);
  const c = hex(w.color);
  switch (w.family) {
    case 'sword':
      for (let i = 0; i < 9; i++) px(4 + i, 11 - i, 2, 2, c);
      px(3, 9, 5, 2, '#666');
      px(2, 12, 2, 2, WOOD);
      px(1, 13, 2, 2, WOOD);
      break;
    case 'hammer':
      for (let i = 0; i < 9; i++) px(3 + i, 13 - i, 2, 2, WOOD);
      px(8, 1, 7, 5, c);
      px(8, 1, 7, 1, INK);
      break;
    case 'daggers':
      for (let i = 0; i < 5; i++) px(3 + i, 10 - i, 2, 2, c);
      px(1, 12, 2, 2, WOOD);
      for (let i = 0; i < 5; i++) px(11 - i, 10 - i, 2, 2, c);
      px(13, 12, 2, 2, WOOD);
      break;
    case 'spear':
      for (let i = 0; i < 11; i++) px(1 + i, 14 - i, 2, 2, WOOD);
      px(11, 1, 4, 4, c);
      px(12, 0, 2, 2, c);
      break;
    case 'mace':
      for (let i = 0; i < 7; i++) px(2 + i, 13 - i, 2, 2, WOOD);
      px(8, 2, 6, 6, c);
      px(10, 0, 2, 2, '#5a5a66');
      px(14, 4, 2, 2, '#5a5a66');
      px(6, 4, 2, 2, '#5a5a66');
      px(10, 8, 2, 2, '#5a5a66');
      break;
    case 'darts':
      for (const [x, y] of [[2, 10], [6, 8], [10, 6]]) {
        px(x, y, 4, 1, c);
        px(x + 4, y, 1, 1, '#ffffff');
        px(x - 1, y - 1, 1, 3, '#ff4d6d');
      }
      break;
    case 'flamesword':
      for (let i = 0; i < 9; i++) px(4 + i, 11 - i, 2, 2, c);
      for (let i = 0; i < 9; i += 2) px(5 + i, 9 - i, 2, 2, '#ffd23f');
      px(3, 9, 5, 2, '#7a1f1f');
      px(1, 13, 2, 2, WOOD);
      break;
    case 'frosthammer':
      for (let i = 0; i < 9; i++) px(3 + i, 13 - i, 2, 2, '#5a7a9a');
      px(8, 1, 7, 5, c);
      px(9, 2, 2, 1, '#ffffff');
      break;
    case 'candycane':
      for (let i = 0; i < 10; i++) px(3 + i, 14 - i, 2, 2, i % 2 ? '#fffaf0' : '#e63946');
      px(12, 2, 2, 2, '#fffaf0');
      px(13, 0, 2, 2, '#e63946');
      px(15, 2, 1, 3, '#fffaf0');
      break;
    case 'cornsword':
      px(1, 13, 2, 2, '#55a630');
      px(0, 11, 2, 1, '#7ac943');
      px(3, 13, 2, 1, '#7ac943');
      for (let i = 0; i < 8; i++) px(3 + i, 11 - i, 3, 3, i % 2 ? '#f2b600' : '#ffd23f');
      px(12, 1, 2, 2, '#ffd23f');
      break;
    case 'thunderspear':
      for (let i = 0; i < 11; i++) px(1 + i, 14 - i, 2, 2, '#3a3a55');
      px(11, 0, 3, 2, c);
      px(12, 2, 3, 2, c);
      px(11, 4, 3, 2, c);
      break;
  }
}

function drawArmor(px: Px, id: string) {
  const a = getArmor(id);
  if (!a) return;
  const c = hex(a.color);
  px(3, 3, 10, 11, c);
  px(1, 3, 3, 4, c);
  px(12, 3, 3, 4, c);
  px(6, 3, 4, 2, '#fffaf0');
  px(3, 13, 10, 1, '#1d1b2f');
}

function drawFigure(px: Px, body: string) {
  px(5, 1, 6, 5, SKIN);
  px(6, 3, 1, 1, INK);
  px(9, 3, 1, 1, INK);
  px(4, 6, 8, 5, body);
  px(2, 6, 2, 5, body);
  px(12, 6, 2, 5, body);
  px(5, 11, 3, 4, INK);
  px(8, 11, 3, 4, INK);
}

function drawPrize(g: CanvasRenderingContext2D, prize: Prize) {
  const px: Px = (x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  g.clearRect(0, 0, 16, 16);
  if (prize.kind === 'weapon') return drawWeapon(px, prize.id);
  if (prize.kind === 'trophy') {
    px(4, 2, 8, 6, '#ffc93c');
    px(2, 3, 2, 3, '#ffc93c');
    px(12, 3, 2, 3, '#ffc93c');
    px(7, 8, 2, 3, '#e0a800');
    px(5, 11, 6, 2, '#e0a800');
    px(4, 13, 8, 2, WOOD);
    return;
  }
  if (prize.kind === 'personality') {
    const p = getPersonality(prize.id as PersonalityId);
    drawFigure(px, hex(p.color));
    px(1, 0, 1, 1, '#ffd23f');
    px(14, 1, 1, 1, '#ffd23f');
    px(0, 8, 1, 1, '#ffd23f');
    return;
  }
  const c = getCosmetic(prize.id);
  if (!c) return;
  const color = hex(c.color);
  if (c.style === 'gingerbread') {
    drawFigure(px, color);
    px(5, 1, 6, 5, color);
    px(6, 3, 1, 1, '#fffaf0');
    px(9, 3, 1, 1, '#fffaf0');
    px(7, 7, 2, 1, '#e63946');
    px(7, 9, 2, 1, '#2ec27e');
    px(2, 10, 2, 1, '#fffaf0');
    px(12, 10, 2, 1, '#fffaf0');
    return;
  }
  if (c.slot === 'skin') return drawFigure(px, color);
  if (c.style === 'turkey') {
    const fan = ['#8a5a2b', '#ff8c42', '#c0392b', '#ffd23f', '#c0392b', '#ff8c42', '#8a5a2b'];
    fan.forEach((col, i) => px(1 + i * 2, 2 + Math.abs(3 - i), 2, 9 - Math.abs(3 - i), col));
    px(6, 10, 4, 4, '#8a5a2b');
    return;
  }
  if (c.slot === 'cape') {
    px(5, 2, 6, 2, INK);
    px(4, 4, 8, 10, color);
    px(3, 10, 10, 4, color);
    return;
  }
  // hats
  px(4, 9, 8, 6, SKIN);
  px(5, 11, 1, 1, INK);
  px(10, 11, 1, 1, INK);
  switch (c.shape) {
    case 'crown':
      px(3, 5, 10, 4, color);
      px(3, 3, 2, 2, color);
      px(7, 3, 2, 2, color);
      px(11, 3, 2, 2, color);
      px(7, 6, 2, 2, '#ff3b6b');
      break;
    case 'tophat':
      px(2, 8, 12, 1, color);
      px(4, 1, 8, 7, color);
      px(4, 6, 8, 1, '#e63946');
      break;
    case 'bunny':
      px(4, 1, 2, 8, color);
      px(10, 1, 2, 8, color);
      px(5, 2, 1, 6, '#ffa6c9');
      px(10, 2, 1, 6, '#ffa6c9');
      break;
    case 'pirate':
      px(1, 6, 14, 3, color);
      px(4, 3, 8, 3, color);
      px(7, 4, 2, 2, '#ffffff');
      break;
    case 'reindeer':
      px(3, 1, 1, 8, '#8a5a2b');
      px(1, 3, 3, 1, '#8a5a2b');
      px(12, 1, 1, 8, '#8a5a2b');
      px(12, 3, 3, 1, '#8a5a2b');
      px(7, 12, 2, 2, '#ff2a2a');
      break;
    case 'pilgrim':
      px(2, 8, 12, 1, color);
      px(4, 2, 8, 6, color);
      px(4, 6, 8, 1, '#5a3b1f');
      px(7, 6, 2, 1, '#ffc93c');
      break;
    case 'helmet':
      px(3, 4, 10, 6, color);
      px(7, 1, 2, 3, '#e63946');
      px(4, 8, 8, 1, INK);
      break;
    default:
      px(3, 6, 10, 3, color);
      px(10, 8, 5, 1, color);
  }
}

/** Pixel icon for a shop item (armor or weapon). */
export function ItemIcon({ kind, id }: { kind: 'armor' | 'weapon'; id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    const px: Px = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    g.clearRect(0, 0, 16, 16);
    if (kind === 'armor') drawArmor(px, id);
    else drawWeapon(px, id);
  }, [kind, id]);
  return <canvas ref={ref} width={16} height={16} className={styles.icon} aria-hidden="true" />;
}

export function PrizeIcon({ prize }: { prize: Prize }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (g) drawPrize(g, prize);
  }, [prize]);
  return <canvas ref={ref} width={16} height={16} className={styles.icon} aria-hidden="true" />;
}
