import * as THREE from 'three';
import type { Loadout } from '../game/types';
import { createFighter, emptyIntent, stepFighter } from '../game/fighter';
import { getPersonality } from '../game/data/personalities';
import { getWeapon } from '../game/data/weapons';
import { FighterModel } from './fighterModel';
import { disposeTree } from './arena';
import { Effects } from './effects';
import { previewIntent, type PreviewMove } from './previewMoves';

/** Small spinning 3D preview of a fighter for the pick screen. */
export class PreviewRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  private model: FighterModel | null = null;
  private fighter: ReturnType<typeof createFighter> | null = null;
  private raf = 0;
  private last = performance.now();
  private time = 0;
  private pedestal: THREE.Mesh;
  private effects: Effects;
  private queued: PreviewMove | null = null;
  private ducking = false;
  private spin = 0;
  private accumulator = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x5a7a3a, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(3, 6, 5);
    this.scene.add(sun);
    this.pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.6), new THREE.MeshLambertMaterial({ color: 0x5cbf3a }));
    this.pedestal.position.y = -0.2;
    this.scene.add(this.pedestal);
    this.camera.position.set(0, 1.7, 6.2);
    this.camera.lookAt(0, 1.15, 0);
    this.effects = new Effects(this.scene);
    this.loop();
  }

  setLoadout(l: Loadout) {
    if (this.model) {
      this.scene.remove(this.model.root);
      this.model.dispose();
    }
    this.model = new FighterModel(l);
    this.fighter = createFighter('p1', getPersonality(l.personality), getWeapon(l.weapon), { x: 0, z: 0 });
    this.fighter.invulnT = 0;
    this.scene.add(this.model.root);
  }

  /** Show off a move on the pedestal (menu key press or click). */
  play(move: PreviewMove) {
    this.queued = move;
  }

  /** Hold or release a duck. */
  setDucking(down: boolean) {
    this.ducking = down;
  }

  setSize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    if (this.model && this.fighter) {
      const f = this.fighter;
      const showingOff = f.action !== 'idle' && f.action !== 'walk';
      // Stop spinning during a move, turned three-quarters toward the camera.
      if (!showingOff && !this.ducking && this.queued === null) this.spin += dt * 0.8;
      else this.spin += Math.atan2(Math.sin(0.6 - this.spin), Math.cos(0.6 - this.spin)) * Math.min(1, dt * 8);
      f.facing = this.spin;

      this.accumulator += dt;
      while (this.accumulator >= 1 / 60) {
        this.accumulator -= 1 / 60;
        const intent = this.queued ? previewIntent(this.queued) : emptyIntent();
        intent.duck = intent.duck || this.ducking;
        intent.facing = this.spin;
        if (this.queued === 'super') f.superCharge = 1;
        if (this.queued === 'power') this.effects.popText('!', new THREE.Vector3(0, 0.4, 0), '#ff4d6d', 1);
        if (this.queued === 'super') this.effects.ring(new THREE.Vector3(0, 0, 0), 0xffd23f, 3);
        if (this.queued === 'power' || this.queued === 'quick' || this.queued === 'dash') {
          // Let every move play right away on the menu.
          f.cooldowns.power = f.cooldowns.dash = f.cooldowns.quick = 0;
        }
        if (this.queued === 'dodge-forward' || this.queued === 'dodge-left' || this.queued === 'dodge-right') f.cooldowns.dodge = 0;
        stepFighter(f, intent, 1 / 60);
        f.pos = { x: 0, z: 0 };
        f.invulnT = 0;
        if (this.queued && (f.action !== 'idle' && f.action !== 'walk' || this.queued === 'duck')) this.queued = null;
      }
      this.model.update(f, dt, this.time);
      this.pedestal.rotation.y = this.spin;
      this.effects.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.effects.dispose();
    this.model?.dispose();
    disposeTree(this.scene);
    this.renderer.dispose();
  }
}
