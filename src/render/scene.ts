import * as THREE from 'three';
import { drawPosition, type MatchState, type Side } from '../game/match';
import type { Loadout } from '../game/types';
import { getPersonality } from '../game/data/personalities';
import { getCosmetic } from '../game/data/cosmetics';
import { buildArena, disposeTree } from './arena';
import { Effects, SpeechBubble } from './effects';
import { FighterModel } from './fighterModel';

const HIT_WORDS = ['BONK!', 'POW!', 'BOOP!', 'WHACK!', 'ZONK!', 'BOP!'];
const BIG_WORDS = ['KA-POW!', 'KABONK!', 'WHAMMO!'];
const CAMERA_DISTANCE = 6.5;

export class GameRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  private models: [FighterModel, FighterModel] | null = null;
  private effects: Effects;
  private lastEventId = 0;
  private time = 0;
  private camPos = new THREE.Vector3(0, 4, -12);
  private camLook = new THREE.Vector3();
  private shake = 0;
  private loadouts: [Loadout, Loadout] | null = null;
  private bubbles: [SpeechBubble, SpeechBubble] = [new SpeechBubble(), new SpeechBubble()];
  private darts = new Map<number, THREE.Mesh>();
  private dartGeo = new THREE.BoxGeometry(0.08, 0.08, 0.45);
  private dartMat = new THREE.MeshLambertMaterial({ color: 0x7ed957, emissive: 0x2a6a10 });
  private puffTimer = 0;

  /** lowPower: phones/tablets get no shadows and a lower resolution so the fight stays smooth. */
  constructor(canvas: HTMLCanvasElement, lowPower = false) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower });
    this.renderer.setPixelRatio(Math.min(lowPower ? 1.5 : 2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = !lowPower;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = new THREE.Color(0x8fd3ff);
    this.scene.fog = new THREE.Fog(0x8fd3ff, 35, 70);

    const hemi = new THREE.HemisphereLight(0xdff4ff, 0x5a7a3a, 1.6);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(12, 22, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 18;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 60;
    this.scene.add(sun);

    this.scene.add(buildArena());
    for (const b of this.bubbles) this.scene.add(b.sprite);
    this.effects = new Effects(this.scene);
  }

  setLoadouts(l1: Loadout, l2: Loadout) {
    if (this.models) {
      for (const m of this.models) {
        this.scene.remove(m.root);
        m.dispose();
      }
    }
    this.loadouts = [l1, l2];
    this.models = [new FighterModel(l1), new FighterModel(l2)];
    for (const m of this.models) this.scene.add(m.root);
    this.lastEventId = 0;
  }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  private colorsFor(side: Side): number[] {
    const l = this.loadouts?.[side];
    if (!l) return [0xffffff];
    const skin = getCosmetic(l.skin)?.color ?? 0x3a86ff;
    return [skin, getPersonality(l.personality).color, 0xf2c79b];
  }

  private handleEvents(m: MatchState) {
    for (const e of m.events) {
      if (e.id <= this.lastEventId) continue;
      this.lastEventId = e.id;
      switch (e.type) {
        case 'hit': {
          const pos = new THREE.Vector3(e.at.x, 0, e.at.z);
          const words = e.big ? BIG_WORDS : HIT_WORDS;
          this.effects.popText(words[Math.floor(Math.random() * words.length)], pos, e.big ? '#ff8c42' : '#ffd23f', e.big ? 1.3 : 1);
          this.effects.sparks(pos, e.big);
          if (e.zap) {
            this.effects.popText('ZAP!', pos, '#ffe14d', 1.2);
            this.effects.ring(pos, 0xffe14d, 2);
          }
          if (e.big) this.shake = Math.max(this.shake, 0.25);
          break;
        }
        case 'ko': {
          const pos = new THREE.Vector3(e.at.x, 0, e.at.z);
          this.effects.poof(pos, this.colorsFor(e.target));
          this.effects.popText('KO!', pos, '#ff4d6d', 1.8);
          this.shake = 0.5;
          break;
        }
        case 'super': {
          const pos = new THREE.Vector3(e.at.x, 0, e.at.z);
          this.effects.ring(pos, 0xffd23f, 5);
          this.effects.popText('SUPER!', pos, '#ffffff', 1.4);
          break;
        }
        case 'power': {
          // Warning cue: a big "!" over the attacker the instant a power move starts.
          this.effects.popText('!', new THREE.Vector3(e.at.x, 0.4, e.at.z), '#ff4d6d', 1.2);
          break;
        }
        case 'line': {
          this.bubbles[e.who].say(e.text);
          break;
        }
        case 'respawn': {
          this.effects.ring(new THREE.Vector3(e.at.x, 0, e.at.z), 0x8fd3ff, 3);
          break;
        }
      }
    }
  }

  render(m: MatchState, yaw: number, pitch: number, dt: number) {
    this.time += dt;
    if (this.models) {
      this.models[0].update(m.fighters[0], dt, this.time, drawPosition(m, 0));
      this.models[1].update(m.fighters[1], dt, this.time, drawPosition(m, 1));
    }
    this.handleEvents(m);
    this.syncDarts(m);
    this.puffTimer -= dt;
    if (this.puffTimer <= 0) {
      this.puffTimer = 0.08;
      for (const f of m.fighters) {
        if (f.action === 'ko') continue;
        const p = new THREE.Vector3(f.pos.x, 0, f.pos.z);
        if (f.status.poison > 0) this.effects.puff(p, 0x7ed957);
        if (f.status.burn > 0) this.effects.puff(p, Math.random() < 0.5 ? 0xff8c42 : 0xffd23f);
        if (f.status.slow > 0 && Math.random() < 0.5) this.effects.puff(p, 0xbfeaff);
      }
    }
    this.effects.update(dt);
    ([0, 1] as const).forEach((side) => {
      const b = this.bubbles[side];
      const dp = drawPosition(m, side);
      b.sprite.position.set(dp.x, 2.9, dp.z);
      b.update(dt);
    });

    // Over-the-shoulder camera behind player 1.
    const p = drawPosition(m, 0);
    const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));
    const height = 1.6 + pitch * 5;
    const dist = CAMERA_DISTANCE * (1 + pitch * 0.3);
    const desired = new THREE.Vector3(p.x, 0, p.z).addScaledVector(fw, -dist).addScaledVector(right, 1.4).setY(height + 0.9);
    const look = new THREE.Vector3(p.x, 1.4, p.z).addScaledVector(fw, 4).addScaledVector(right, 1.0);
    const k = 1 - Math.exp(-dt * 12);
    this.camPos.lerp(desired, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const a = this.shake * 0.4;
      this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a));
    }
    this.camera.lookAt(this.camLook);
    this.renderer.render(this.scene, this.camera);
  }

  private syncDarts(m: MatchState) {
    const alive = new Set<number>();
    for (const p of m.projectiles) {
      alive.add(p.id);
      let mesh = this.darts.get(p.id);
      if (!mesh) {
        mesh = new THREE.Mesh(this.dartGeo, this.dartMat);
        this.scene.add(mesh);
        this.darts.set(p.id, mesh);
      }
      mesh.position.set(p.pos.x, 1.3, p.pos.z);
      mesh.rotation.y = Math.atan2(p.dir.x, p.dir.z);
    }
    for (const [id, mesh] of this.darts) {
      if (alive.has(id)) continue;
      this.scene.remove(mesh);
      this.darts.delete(id);
    }
  }

  /** Screen position (CSS pixels) above a fighter's head, or null if off-screen. */
  headScreenPosition(side: Side, width: number, height: number): { x: number; y: number } | null {
    if (!this.models) return null;
    const v = this.models[side].headWorldPosition(new THREE.Vector3());
    v.project(this.camera);
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
  }

  dispose() {
    if (this.models) for (const m of this.models) m.dispose();
    this.effects.dispose();
    for (const b of this.bubbles) b.dispose();
    disposeTree(this.scene);
    this.renderer.dispose();
  }
}
