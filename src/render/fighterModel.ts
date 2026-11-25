import * as THREE from 'three';
import type { FighterState } from '../game/fighter';
import type { Loadout, PersonalityId } from '../game/types';
import { getPersonality } from '../game/data/personalities';
import { getWeapon } from '../game/data/weapons';
import { getCosmetic } from '../game/data/cosmetics';
import { getArmor } from '../game/data/shop';

const WOOD = 0x8a5a2b;

function mat(color: number, opts: Partial<THREE.MeshLambertMaterialParameters> = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

function box(w: number, h: number, d: number, material: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function shade(color: number, f: number): number {
  const c = new THREE.Color(color);
  c.multiplyScalar(f);
  return c.getHex();
}

/** 8x8 pixel-art face drawn per personality. */
function faceTexture(personality: PersonalityId, skinColor = '#f2c79b'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const g = c.getContext('2d')!;
  g.fillStyle = skinColor;
  g.fillRect(0, 0, 8, 8);
  const px = (x: number, y: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(x, y, 1, 1);
  };
  // eyes
  const eye = (x: number) => {
    px(x, 3, '#ffffff');
    px(x + 1, 3, '#1d1b2f');
  };
  eye(1);
  eye(5);
  switch (personality) {
    case 'hothead':
      px(1, 2, '#5a2d0c');
      px(2, 2, '#5a2d0c');
      px(5, 2, '#5a2d0c');
      px(6, 2, '#5a2d0c');
      g.fillStyle = '#7a1f1f';
      g.fillRect(2, 6, 4, 1);
      break;
    case 'ninja':
      g.fillStyle = '#2b2d42';
      g.fillRect(0, 0, 8, 2);
      g.fillRect(0, 4, 8, 4);
      break;
    case 'tank':
      g.fillStyle = '#5a3b1f';
      g.fillRect(1, 2, 2, 1);
      g.fillRect(5, 2, 2, 1);
      g.fillStyle = '#7a4a2a';
      g.fillRect(2, 6, 4, 1);
      break;
    case 'trickster':
      px(2, 6, '#7a1f1f');
      px(3, 7, '#7a1f1f');
      px(4, 7, '#7a1f1f');
      px(5, 6, '#7a1f1f');
      px(6, 5, '#7a1f1f');
      break;
    case 'robot':
      g.fillStyle = '#b8c4cc';
      g.fillRect(0, 0, 8, 8);
      g.fillStyle = '#ff3b3b';
      g.fillRect(1, 3, 2, 1);
      g.fillRect(5, 3, 2, 1);
      g.fillStyle = '#1d1b2f';
      g.fillRect(2, 6, 4, 1);
      break;
    case 'wizard':
      g.fillStyle = '#e8e8e8';
      g.fillRect(1, 5, 6, 3);
      px(1, 2, '#e8e8e8');
      px(2, 2, '#e8e8e8');
      px(5, 2, '#e8e8e8');
      px(6, 2, '#e8e8e8');
      break;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildWeapon(weaponId: string): THREE.Group {
  const w = getWeapon(weaponId);
  const g = new THREE.Group();
  const blade = mat(w.color);
  const handle = mat(WOOD);
  switch (w.family) {
    case 'sword': {
      g.add(box(0.1, 0.3, 0.1, handle));
      const guard = box(0.35, 0.08, 0.12, mat(shade(w.color, 0.7)));
      guard.position.y = 0.18;
      g.add(guard);
      const b = box(0.14, 0.9, 0.06, blade);
      b.position.y = 0.66;
      g.add(b);
      break;
    }
    case 'hammer': {
      const h = box(0.1, 1.0, 0.1, handle);
      h.position.y = 0.35;
      g.add(h);
      const head = box(0.6, 0.38, 0.38, blade);
      head.position.y = 0.95;
      g.add(head);
      break;
    }
    case 'daggers': {
      g.add(box(0.08, 0.2, 0.08, handle));
      const b = box(0.1, 0.45, 0.05, blade);
      b.position.y = 0.32;
      g.add(b);
      break;
    }
    case 'spear': {
      const s = box(0.08, 2.0, 0.08, handle);
      s.position.y = 0.6;
      g.add(s);
      const tip = box(0.16, 0.36, 0.08, blade);
      tip.position.y = 1.75;
      tip.rotation.y = Math.PI / 4;
      g.add(tip);
      break;
    }
    case 'mace': {
      const h = box(0.1, 0.8, 0.1, handle);
      h.position.y = 0.3;
      g.add(h);
      const head = box(0.4, 0.4, 0.4, blade);
      head.position.y = 0.8;
      g.add(head);
      for (const [x, y, z] of [[0.24, 0.8, 0], [-0.24, 0.8, 0], [0, 0.8, 0.24], [0, 0.8, -0.24], [0, 1.04, 0]]) {
        const spike = box(0.1, 0.1, 0.1, mat(0x5a5a66));
        spike.position.set(x, y, z);
        g.add(spike);
      }
      break;
    }
    case 'darts': {
      // A little pouch of darts; one held ready to throw.
      g.add(box(0.06, 0.18, 0.06, handle));
      const b = box(0.05, 0.3, 0.05, blade);
      b.position.y = 0.22;
      g.add(b);
      const fin = box(0.14, 0.08, 0.02, mat(0xff4d6d));
      fin.position.y = -0.06;
      g.add(fin);
      break;
    }
    case 'flamesword': {
      g.add(box(0.1, 0.3, 0.1, handle));
      const guard = box(0.35, 0.08, 0.12, mat(0x7a1f1f));
      guard.position.y = 0.18;
      g.add(guard);
      const b = box(0.16, 0.95, 0.06, new THREE.MeshLambertMaterial({ color: w.color, emissive: 0xff3300, emissiveIntensity: 0.8 }));
      b.position.y = 0.68;
      g.add(b);
      const flame = box(0.24, 0.5, 0.12, new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.55 }));
      flame.position.y = 0.85;
      flame.userData.flicker = true;
      g.add(flame);
      break;
    }
    case 'frosthammer': {
      const h = box(0.1, 1.0, 0.1, mat(0x5a7a9a));
      h.position.y = 0.35;
      g.add(h);
      const head = box(0.62, 0.4, 0.4, new THREE.MeshLambertMaterial({ color: w.color, emissive: 0x2aa9ff, emissiveIntensity: 0.4 }));
      head.position.y = 0.95;
      g.add(head);
      break;
    }
    case 'candycane': {
      // Red-and-white striped cane with a hook on top.
      const red = mat(0xe63946);
      const white = mat(0xfffaf0);
      for (let i = 0; i < 9; i++) {
        const seg = box(0.12, 0.13, 0.12, i % 2 ? white : red);
        seg.position.y = 0.05 + i * 0.13;
        g.add(seg);
      }
      const hook = [
        [0.08, 1.22],
        [0.2, 1.3],
        [0.32, 1.26],
        [0.38, 1.14],
      ];
      hook.forEach(([x, y], i) => {
        const seg = box(0.13, 0.13, 0.12, i % 2 ? red : white);
        seg.position.set(x, y, 0);
        g.add(seg);
      });
      break;
    }
    case 'cornsword': {
      // A green cornstalk handle with a big corn cob for a blade.
      g.add(box(0.1, 0.32, 0.1, mat(0x55a630)));
      for (const side of [-1, 1]) {
        const leaf = box(0.3, 0.06, 0.12, mat(0x7ac943));
        leaf.position.set(side * 0.16, 0.2, 0);
        leaf.rotation.z = side * -0.5;
        g.add(leaf);
      }
      const cob = box(0.18, 0.85, 0.12, mat(0xffd23f));
      cob.position.y = 0.66;
      g.add(cob);
      for (let i = 0; i < 4; i++) {
        const kernelRow = box(0.2, 0.05, 0.14, mat(0xf2b600));
        kernelRow.position.y = 0.38 + i * 0.18;
        g.add(kernelRow);
      }
      const tip = box(0.1, 0.14, 0.08, mat(0xffd23f));
      tip.position.y = 1.15;
      g.add(tip);
      break;
    }
    case 'thunderspear': {
      const sh = box(0.08, 2.1, 0.08, mat(0x3a3a55));
      sh.position.y = 0.65;
      g.add(sh);
      const tip = box(0.2, 0.4, 0.08, new THREE.MeshLambertMaterial({ color: w.color, emissive: 0xffe14d, emissiveIntensity: 0.6 }));
      tip.position.y = 1.85;
      tip.rotation.z = 0.3;
      g.add(tip);
      const bolt = box(0.12, 0.3, 0.06, new THREE.MeshLambertMaterial({ color: w.color, emissive: 0xffe14d, emissiveIntensity: 0.6 }));
      bolt.position.set(0.06, 1.6, 0);
      bolt.rotation.z = -0.4;
      g.add(bolt);
      break;
    }
  }
  return g;
}

function buildArmor(armorId: string | undefined): THREE.Group | null {
  const a = getArmor(armorId);
  if (!a) return null;
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: a.color });
  const chest = box(0.56, 0.6, 0.34, m);
  chest.position.y = 1.18;
  g.add(chest);
  if (a.id !== 'armor-leather') {
    for (const x of [-0.36, 0.36]) {
      const pad = box(0.3, 0.16, 0.32, m);
      pad.position.set(x, 1.5, 0);
      g.add(pad);
    }
  }
  if (a.id === 'armor-dragon') {
    for (let i = 0; i < 3; i++) {
      const scale = box(0.12, 0.08, 0.04, new THREE.MeshLambertMaterial({ color: 0x1b8a57 }));
      scale.position.set(-0.15 + i * 0.15, 1.2, 0.18);
      g.add(scale);
    }
  }
  return g;
}

function buildHat(hatId: string | undefined): THREE.Group | null {
  const hat = getCosmetic(hatId);
  if (!hat) return null;
  const g = new THREE.Group();
  const m = mat(hat.color);
  switch (hat.shape) {
    case 'cap': {
      g.add(box(0.54, 0.16, 0.54, m));
      const brim = box(0.5, 0.05, 0.3, m);
      brim.position.set(0, -0.05, 0.38);
      g.add(brim);
      break;
    }
    case 'pirate': {
      g.add(box(0.7, 0.12, 0.5, m));
      const top = box(0.5, 0.22, 0.4, m);
      top.position.y = 0.15;
      g.add(top);
      const skull = box(0.12, 0.12, 0.02, mat(0xffffff));
      skull.position.set(0, 0.15, 0.21);
      g.add(skull);
      break;
    }
    case 'crown': {
      g.add(box(0.54, 0.14, 0.54, m));
      for (const [x, z] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21], [0, 0.21]]) {
        const spike = box(0.1, 0.16, 0.1, m);
        spike.position.set(x, 0.14, z);
        g.add(spike);
      }
      const gem = box(0.08, 0.08, 0.02, mat(0xff3b6b));
      gem.position.set(0, 0, 0.28);
      g.add(gem);
      break;
    }
    case 'tophat': {
      g.add(box(0.7, 0.05, 0.7, m));
      const t = box(0.44, 0.5, 0.44, m);
      t.position.y = 0.27;
      g.add(t);
      const band = box(0.46, 0.08, 0.46, mat(0xe63946));
      band.position.y = 0.08;
      g.add(band);
      break;
    }
    case 'helmet': {
      const h = box(0.58, 0.3, 0.58, m);
      h.position.y = -0.06;
      g.add(h);
      const plume = box(0.08, 0.25, 0.3, mat(0xe63946));
      plume.position.y = 0.2;
      g.add(plume);
      break;
    }
    case 'pilgrim': {
      g.add(box(0.72, 0.05, 0.72, m));
      const crown = box(0.46, 0.46, 0.46, m);
      crown.position.y = 0.25;
      g.add(crown);
      const band = box(0.48, 0.1, 0.48, mat(0x5a3b1f));
      band.position.y = 0.08;
      g.add(band);
      const buckle = box(0.16, 0.12, 0.02, mat(0xffc93c));
      buckle.position.set(0, 0.08, 0.25);
      g.add(buckle);
      break;
    }
    case 'reindeer': {
      // Rudolph: branching antlers and a glowing red nose.
      const antler = mat(0x8a5a2b);
      for (const side of [-1, 1]) {
        const main = box(0.07, 0.42, 0.07, antler);
        main.position.set(side * 0.18, 0.18, 0);
        main.rotation.z = side * -0.3;
        g.add(main);
        const branch1 = box(0.22, 0.06, 0.06, antler);
        branch1.position.set(side * 0.3, 0.26, 0);
        g.add(branch1);
        const branch2 = box(0.06, 0.18, 0.06, antler);
        branch2.position.set(side * 0.38, 0.34, 0);
        g.add(branch2);
      }
      const nose = box(0.12, 0.12, 0.08, new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xff0000, emissiveIntensity: 0.8 }));
      nose.position.set(0, -0.42, 0.28);
      g.add(nose);
      break;
    }
    case 'bunny': {
      for (const x of [-0.13, 0.13]) {
        const ear = box(0.1, 0.45, 0.06, m);
        ear.position.set(x, 0.2, 0);
        g.add(ear);
        const inner = box(0.05, 0.35, 0.01, mat(0xffa6c9));
        inner.position.set(x, 0.2, 0.035);
        g.add(inner);
      }
      break;
    }
  }
  return g;
}

/** A blocky fighter built from boxes, animated from simulation state. */
export class FighterModel {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private head: THREE.Mesh;
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private cape: THREE.Mesh | null = null;
  private aura: THREE.Mesh;
  private materials: THREE.MeshLambertMaterial[] = [];
  private walkPhase = 0;
  private lastPos = new THREE.Vector3();
  private smoothSpeed = 0;
  private drawFacing: number | null = null;
  private family: string;
  private weaponMaterials: THREE.MeshLambertMaterial[] = [];

  private collectWeaponMaterials(weapon: THREE.Object3D) {
    weapon.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshLambertMaterial) this.weaponMaterials.push(mesh.material);
    });
  }

  constructor(loadout: Loadout) {
    const personality = getPersonality(loadout.personality);
    const skinItem = getCosmetic(loadout.skin);
    const gingerbread = skinItem?.style === 'gingerbread';
    const skin = skinItem?.color ?? 0x3a86ff;
    this.family = getWeapon(loadout.weapon).family;

    const shirt = mat(skin);
    const pants = mat(gingerbread ? skin : shade(skin, 0.55));
    const skinTone = mat(gingerbread ? skin : personality.id === 'robot' ? 0xb8c4cc : 0xf2c79b);
    const accent = mat(personality.color);
    this.materials.push(shirt, pants, skinTone, accent);

    // Legs pivot at the hip (y = 0.75)
    for (const [leg, x] of [[this.legL, -0.13], [this.legR, 0.13]] as const) {
      leg.position.set(x, 0.75, 0);
      const mesh = box(0.25, 0.75, 0.25, pants);
      mesh.position.y = -0.375;
      leg.add(mesh);
      this.body.add(leg);
    }
    const torso = box(0.5, 0.75, 0.28, shirt);
    torso.position.y = 1.125;
    this.body.add(torso);
    const belt = box(0.52, 0.1, 0.3, accent);
    belt.position.y = 0.8;
    this.body.add(belt);

    // Arms pivot at the shoulder (y = 1.45)
    for (const [arm, x] of [[this.armL, -0.375], [this.armR, 0.375]] as const) {
      arm.position.set(x, 1.45, 0);
      const sleeve = box(0.24, 0.4, 0.24, shirt);
      sleeve.position.y = -0.2;
      arm.add(sleeve);
      const hand = box(0.22, 0.35, 0.22, skinTone);
      hand.position.y = -0.55;
      arm.add(hand);
      this.body.add(arm);
    }

    // Head with a pixel face on the front (+z) side
    const faceMat = new THREE.MeshLambertMaterial({ map: faceTexture(personality.id, gingerbread ? '#b5651d' : undefined) });
    const headMats = [skinTone, skinTone, skinTone, skinTone, faceMat, skinTone];
    if (personality.id === 'ninja') {
      const wrap = mat(0x2b2d42);
      headMats.splice(0, 4, wrap, wrap, wrap, wrap);
      headMats[5] = wrap;
    }
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMats);
    this.head.castShadow = true;
    this.head.position.y = 1.75;
    this.body.add(this.head);

    if (gingerbread) {
      // White icing squiggles on wrists and ankles, plus gumdrop buttons.
      const icing = mat(0xfffaf0);
      for (const arm of [this.armL, this.armR]) {
        const cuff = box(0.25, 0.06, 0.25, icing);
        cuff.position.y = -0.42;
        arm.add(cuff);
      }
      for (const leg of [this.legL, this.legR]) {
        const cuff = box(0.27, 0.06, 0.27, icing);
        cuff.position.y = -0.62;
        leg.add(cuff);
      }
      [0xe63946, 0x2ec27e, 0xe63946].forEach((c, i) => {
        const gum = box(0.1, 0.1, 0.06, mat(c));
        gum.position.set(0, 1.35 - i * 0.2, 0.16);
        this.body.add(gum);
      });
      const brow = box(0.4, 0.04, 0.02, icing);
      brow.position.set(0, 0.17, 0.26);
      this.head.add(brow);
    }
    if (personality.id === 'wizard' && !loadout.hat) {
      const hatMat = mat(0x3a0ca3);
      const brim = box(0.7, 0.06, 0.7, hatMat);
      brim.position.y = 0.28;
      const cone1 = box(0.42, 0.3, 0.42, hatMat);
      cone1.position.y = 0.45;
      const cone2 = box(0.24, 0.3, 0.24, hatMat);
      cone2.position.y = 0.72;
      this.head.add(brim, cone1, cone2);
    }

    const hat = buildHat(loadout.hat);
    if (hat) {
      hat.position.y = 0.3;
      this.head.add(hat);
    }

    const armorMesh = buildArmor(loadout.armor);
    if (armorMesh) this.body.add(armorMesh);

    const capeInfo = getCosmetic(loadout.cape);
    if (capeInfo?.style === 'turkey') {
      // Turkey tail: a fan of feathers sticking up behind the shoulders.
      const fan = new THREE.Group();
      const colors = [0x8a5a2b, 0xff8c42, 0xc0392b, 0xffd23f, 0x8a5a2b, 0xff8c42, 0xc0392b];
      const mid = (colors.length - 1) / 2;
      colors.forEach((c, i) => {
        const angle = (i - mid) * 0.32;
        // Each feather sits at its own depth (middle one at the back) so overlapping
        // feathers never share a plane — that sharing is what made the colors flicker.
        const depth = -Math.abs(i - mid) * 0.03 + i * 0.002;
        const feather = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.03).translate(0, 0.4, 0), mat(c));
        feather.castShadow = true;
        feather.rotation.z = angle;
        feather.position.z = -depth;
        fan.add(feather);
        // Tip is thicker than the feather so it shows from the front and the back.
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.07), mat(0xfffaf0));
        tip.position.set(-Math.sin(angle) * 0.74, Math.cos(angle) * 0.74, -depth);
        tip.rotation.z = angle;
        fan.add(tip);
      });
      fan.position.set(0, 1.05, -0.2);
      fan.rotation.x = -0.25;
      this.body.add(fan);
    } else if (capeInfo) {
      const capeGeo = new THREE.BoxGeometry(0.5, 1.0, 0.04);
      capeGeo.translate(0, -0.5, 0);
      this.cape = new THREE.Mesh(capeGeo, mat(capeInfo.color));
      this.cape.castShadow = true;
      this.cape.position.set(0, 1.48, -0.17);
      this.body.add(this.cape);
    }

    const weapon = buildWeapon(loadout.weapon);
    this.collectWeaponMaterials(weapon);
    weapon.position.set(0, -0.62, 0.05);
    weapon.rotation.x = Math.PI / 2;
    this.armR.add(weapon);
    if (this.family === 'daggers') {
      const second = buildWeapon(loadout.weapon);
      this.collectWeaponMaterials(second);
      second.position.set(0, -0.62, 0.05);
      second.rotation.x = Math.PI / 2;
      this.armL.add(second);
    }

    this.aura = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.3, 1.1),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.aura.position.y = 1.1;
    this.body.add(this.aura);

    this.root.add(this.body);
  }

  /** drawPos: where to draw this frame (blended between game steps); defaults to the fighter's position. */
  update(f: FighterState, dt: number, time: number, drawPos: { x: number; z: number } = f.pos) {
    const jumped = Math.hypot(drawPos.x - this.root.position.x, drawPos.z - this.root.position.z) > 3;
    this.root.position.set(drawPos.x, 0, drawPos.z);

    // Turn smoothly instead of snapping between game steps.
    if (this.drawFacing === null || jumped) this.drawFacing = f.facing;
    const diff = Math.atan2(Math.sin(f.facing - this.drawFacing), Math.cos(f.facing - this.drawFacing));
    this.drawFacing += diff * Math.min(1, dt * 25);
    this.root.rotation.y = this.drawFacing;

    const moved = this.lastPos.distanceTo(this.root.position);
    this.lastPos.copy(this.root.position);
    const rawSpeed = dt > 0 && !jumped ? moved / dt : 0;
    // Smooth the measured speed so the walk cycle doesn't flicker.
    this.smoothSpeed += (rawSpeed - this.smoothSpeed) * Math.min(1, dt * 10);
    const speed = this.smoothSpeed;

    // Reset pose
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.body.scale.set(1, 1, 1);
    this.armL.rotation.set(0, 0, 0);
    this.armR.rotation.set(0, 0, 0);
    this.legL.rotation.set(0, 0, 0);
    this.legR.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);

    this.root.visible = f.action !== 'ko';
    if (f.invulnT > 0 && f.action !== 'dodge') this.root.visible = Math.floor(time * 12) % 2 === 0;

    const p = f.actionDur > 0 ? Math.min(1, f.actionT / f.actionDur) : 0;
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);

    // Walk cycle
    if (f.action === 'walk' || (speed > 0.5 && f.action === 'idle')) {
      this.walkPhase += dt * (6 + speed * 1.2);
      const s = Math.sin(this.walkPhase) * Math.min(1, speed / 4) * 0.9;
      this.legL.rotation.x = s;
      this.legR.rotation.x = -s;
      this.armL.rotation.x = -s * 0.8;
      this.armR.rotation.x = s * 0.8;
      this.body.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.06;
    } else {
      this.body.position.y = Math.sin(time * 2.5) * 0.02;
      this.armR.rotation.x = -0.25;
    }

    switch (f.action) {
      case 'quick': {
        this.armR.rotation.x = -2.4 + ease(p) * 2.8;
        this.armR.rotation.z = -0.3;
        this.body.rotation.y = 0.4 - p * 0.8;
        if (this.family === 'daggers') this.armL.rotation.x = -2.4 + ease(Math.max(0, p - 0.2)) * 2.8;
        break;
      }
      case 'dash': {
        this.body.rotation.x = 0.35;
        this.armR.rotation.x = -1.6;
        this.armL.rotation.x = 0.6;
        this.legL.rotation.x = 0.7;
        this.legR.rotation.x = -0.7;
        break;
      }
      case 'power': {
        this.animatePower(f, p, ease);
        break;
      }
      case 'super': {
        const wind = Math.min(1, p / 0.45);
        this.body.scale.setScalar(1 + wind * 0.25);
        this.armR.rotation.x = p < 0.45 ? -3 * wind : -3 + ease((p - 0.45) / 0.55) * 3.6;
        this.armL.rotation.x = p < 0.45 ? -3 * wind : 0.3;
        this.body.position.y = p < 0.45 ? wind * 0.4 : 0.4 * (1 - (p - 0.45) / 0.55);
        break;
      }
      case 'dodge': {
        // A quick hop-and-twirl reads clearly as "dodged!" from any angle.
        this.body.position.y = Math.sin(p * Math.PI) * 0.45;
        this.body.rotation.y = ease(p) * Math.PI * 2;
        this.body.scale.set(1.05, 0.8 + 0.2 * Math.abs(Math.cos(p * Math.PI)), 1.05);
        this.armL.rotation.z = -1.3;
        this.armR.rotation.z = 1.3;
        break;
      }
      case 'hitstun': {
        this.body.rotation.x = -0.4 * (1 - p);
        this.head.rotation.z = Math.sin(p * 20) * 0.3;
        this.armL.rotation.z = -1.2;
        this.armR.rotation.z = 1.2;
        break;
      }
    }

    if (f.ducking) {
      this.body.scale.set(1.1, 0.6, 1.1);
      this.armL.rotation.x = -1.2;
      this.armR.rotation.x = -1.2;
    }

    if (this.cape) {
      this.cape.rotation.x = 0.15 + Math.min(1.1, speed * 0.12) + Math.sin(time * 6) * 0.05;
    }

    // Flash white when hit; glow when super is ready.
    const flash = f.action === 'hitstun' ? 1 - p : 0;
    // Status tints: orange flicker when burning, green when poisoned, icy blue when slowed.
    const st = f.status;
    let r = flash;
    let gr = flash;
    let bl = flash;
    if (st.burn > 0) {
      const k = 0.35 + Math.sin(time * 25) * 0.15;
      r += k;
      gr += k * 0.35;
    }
    if (st.poison > 0) gr += 0.3 + Math.sin(time * 8) * 0.1;
    if (st.slow > 0) {
      bl += 0.4;
      gr += 0.2;
    }
    for (const m of this.materials) m.emissive.setRGB(r, gr, bl);
    this.root.traverse((o) => {
      if (o.userData.flicker) o.scale.y = 0.8 + Math.sin(time * 30) * 0.25;
    });
    // Weapon glows red during a power move so it's easy to see coming.
    const glow = f.action === 'power' ? 0.6 + Math.sin(time * 30) * 0.3 : 0;
    for (const m of this.weaponMaterials) m.emissive.setRGB(glow, 0, 0);
    const auraMat = this.aura.material as THREE.MeshBasicMaterial;
    const ready = f.superCharge >= 1;
    auraMat.opacity = f.action === 'super' ? 0.45 : ready ? 0.12 + Math.sin(time * 6) * 0.08 : 0;
    auraMat.color.setHex(f.action === 'super' ? 0xffffff : 0xffd23f);
  }

  private animatePower(f: FighterState, p: number, ease: (x: number) => number) {
    switch (f.personality.powerMove) {
      case 'firePunch':
        this.armR.rotation.x = p < 0.3 ? -0.5 - p * 3 : -1.6;
        this.body.rotation.x = 0.3;
        break;
      case 'teleportSlash':
        this.body.scale.setScalar(p < 0.12 ? p / 0.12 : 1);
        this.armR.rotation.x = -2.6 + ease(p) * 3;
        this.body.rotation.y = -p * Math.PI * 2;
        break;
      case 'groundPound':
        this.body.position.y = p < 0.5 ? Math.sin((p / 0.5) * Math.PI * 0.5) * 1.2 : Math.max(0, 1.2 - ((p - 0.5) / 0.1) * 1.2);
        this.armL.rotation.x = p < 0.5 ? -3 : -1;
        this.armR.rotation.x = p < 0.5 ? -3 : -1;
        if (p > 0.6) this.body.scale.set(1.15, 0.85, 1.15);
        break;
      case 'doubleHit':
        this.armR.rotation.x = p < 0.45 ? -2.4 + ease(p / 0.45) * 2.8 : -1;
        this.armL.rotation.x = p >= 0.45 ? -2.4 + ease((p - 0.45) / 0.55) * 2.8 : 0;
        this.body.rotation.y = p < 0.45 ? 0.5 : -0.5;
        break;
      case 'laserSpin':
        this.body.rotation.y = ease(p) * Math.PI * 4;
        this.armL.rotation.z = -1.5;
        this.armR.rotation.z = 1.5;
        break;
      case 'zapBolt':
        this.armR.rotation.x = -1.6;
        this.armL.rotation.x = -1.6;
        this.body.rotation.x = -0.1;
        break;
    }
  }

  /** World position of the top of the head, for speech bubbles. */
  headWorldPosition(target: THREE.Vector3): THREE.Vector3 {
    return this.head.getWorldPosition(target).add(new THREE.Vector3(0, 0.6, 0));
  }

  dispose() {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          (m as THREE.MeshLambertMaterial).map?.dispose();
          m.dispose();
        }
      }
    });
  }
}
