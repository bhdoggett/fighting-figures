import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  spin: THREE.Vector3;
  gravity: number;
}

interface PopText {
  sprite: THREE.Sprite;
  life: number;
  maxLife: number;
}

interface Ring {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

const CONFETTI = [0xff4d6d, 0xffd23f, 0x3a86ff, 0x2ec27e, 0x8338ec, 0xff8c42];

function textTexture(text: string, color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.font = '110px "Lilita One", "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 18;
  g.strokeStyle = '#1d1b2f';
  g.strokeText(text, 256, 84);
  g.fillStyle = color;
  g.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function bubbleTexture(text: string): { tex: THREE.CanvasTexture; aspect: number } {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const font = '800 44px "Nunito", system-ui, sans-serif';
  g.font = font;
  const w = Math.min(900, Math.ceil(g.measureText(text).width) + 60);
  c.width = w;
  c.height = 120;
  g.font = font;
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#1d1b2f';
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(4, 4, w - 8, 86, 16);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(w / 2 - 16, 88);
  g.lineTo(w / 2, 114);
  g.lineTo(w / 2 + 16, 88);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillRect(w / 2 - 12, 82, 24, 10);
  g.fillStyle = '#1d1b2f';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, 48, w - 40);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / 120 };
}

/** Speech bubble that follows a fighter's head. */
export class SpeechBubble {
  readonly sprite: THREE.Sprite;
  life = 0;

  constructor() {
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
    this.sprite.renderOrder = 11;
    this.sprite.visible = false;
    this.sprite.position.y = 2.9;
  }

  say(text: string, seconds = 2.4) {
    const { tex, aspect } = bubbleTexture(text);
    this.sprite.material.map?.dispose();
    this.sprite.material.map = tex;
    this.sprite.material.needsUpdate = true;
    const h = 0.55;
    this.sprite.scale.set(h * aspect, h, 1);
    this.life = seconds;
    this.sprite.visible = true;
  }

  update(dt: number) {
    if (this.life <= 0) return;
    this.life -= dt;
    this.sprite.material.opacity = Math.min(1, this.life * 4);
    if (this.life <= 0) this.sprite.visible = false;
  }

  dispose() {
    this.sprite.material.map?.dispose();
    this.sprite.material.dispose();
  }
}

export class Effects {
  private group = new THREE.Group();
  private particles: Particle[] = [];
  private texts: PopText[] = [];
  private rings: Ring[] = [];
  private cube = new THREE.BoxGeometry(1, 1, 1);

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  private spawnCube(pos: THREE.Vector3, color: number, size: number, vel: THREE.Vector3, life: number, gravity = 12) {
    const mesh = new THREE.Mesh(this.cube, new THREE.MeshLambertMaterial({ color, transparent: true }));
    mesh.scale.setScalar(size);
    mesh.position.copy(pos);
    this.group.add(mesh);
    this.particles.push({
      mesh,
      vel,
      life,
      maxLife: life,
      gravity,
      spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
    });
  }

  /** Cartoon "BONK!" pop text that floats up and fades. */
  popText(text: string, pos: THREE.Vector3, color = '#ffd23f', scale = 1) {
    const mat = new THREE.SpriteMaterial({ map: textTexture(text, color), transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos).add(new THREE.Vector3(0, 2.4, 0));
    sprite.scale.set(2.4 * scale, 0.75 * scale, 1);
    sprite.renderOrder = 10;
    this.group.add(sprite);
    this.texts.push({ sprite, life: 0.9, maxLife: 0.9 });
  }

  /** Little star bits on a hit. */
  sparks(pos: THREE.Vector3, big: boolean) {
    const n = big ? 14 : 6;
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6);
      this.spawnCube(pos.clone().add(new THREE.Vector3(0, 1.2, 0)), i % 2 ? 0xffffff : 0xffd23f, 0.12, v, 0.45);
    }
  }

  /** A small rising bubble or spark (poison / fire). */
  puff(pos: THREE.Vector3, color: number) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.2 + Math.random(), (Math.random() - 0.5) * 0.6);
    const start = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 0.6));
    this.spawnCube(start, color, 0.12, v, 0.7, 0);
  }

  /** KO poof: the fighter bursts into blocks and confetti. */
  poof(pos: THREE.Vector3, colors: number[]) {
    for (let i = 0; i < 26; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 8, 3 + Math.random() * 6, (Math.random() - 0.5) * 8);
      const start = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 1.6, (Math.random() - 0.5) * 0.6));
      this.spawnCube(start, colors[i % colors.length], 0.28, v, 1.4);
    }
    for (let i = 0; i < 40; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 10, 5 + Math.random() * 6, (Math.random() - 0.5) * 10);
      this.spawnCube(pos.clone().add(new THREE.Vector3(0, 1, 0)), CONFETTI[i % CONFETTI.length], 0.1, v, 1.8, 6);
    }
    this.ring(pos, 0xffffff, 4);
  }

  /** Expanding ring on the ground (super moves, ground pound, respawn). */
  ring(pos: THREE.Vector3, color: number, size = 3) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.9, 4, 1),
      new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.PI / 4;
    mesh.position.copy(pos).setY(0.05);
    mesh.userData.size = size;
    this.group.add(mesh);
    this.rings.push({ mesh, life: 0.6, maxLife: 0.6 });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.vel.multiplyScalar(0.5);
        p.vel.y = Math.abs(p.vel.y) * 0.3;
      }
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      (p.mesh.material as THREE.MeshLambertMaterial).opacity = Math.min(1, (p.life / p.maxLife) * 2);
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      const k = 1 - t.life / t.maxLife;
      t.sprite.position.y += dt * 1.5;
      const pop = k < 0.15 ? 0.5 + (k / 0.15) * 0.7 : 1.2 - Math.min(0.2, (k - 0.15) * 0.6);
      t.sprite.scale.set(2.4 * pop, 0.75 * pop, 1);
      t.sprite.material.opacity = Math.min(1, (t.life / t.maxLife) * 3);
      if (t.life <= 0) {
        this.group.remove(t.sprite);
        t.sprite.material.map?.dispose();
        t.sprite.material.dispose();
        this.texts.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - r.life / r.maxLife;
      r.mesh.scale.setScalar(1 + k * (r.mesh.userData.size as number));
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      if (r.life <= 0) {
        this.group.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
      }
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.cube.dispose();
  }
}
