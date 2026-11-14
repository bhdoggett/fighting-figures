import * as THREE from 'three';
import type { Loadout } from '../game/types';
import { createFighter } from '../game/fighter';
import { getPersonality } from '../game/data/personalities';
import { getWeapon } from '../game/data/weapons';
import { FighterModel } from './fighterModel';

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
    this.camera.position.set(0, 1.6, 5.2);
    this.camera.lookAt(0, 1.0, 0);
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
      this.fighter.facing = this.time * 0.8;
      this.fighter.superCharge = 0;
      this.model.update(this.fighter, dt, this.time);
      this.model.root.rotation.y = this.time * 0.8;
      this.pedestal.rotation.y = this.time * 0.8;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.model?.dispose();
    this.renderer.dispose();
  }
}
