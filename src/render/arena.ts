import * as THREE from 'three';
import { ARENA_HALF } from '../game/match';

/** Deterministic pseudo-random so the arena looks the same every match. */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildArena(): THREE.Group {
  const g = new THREE.Group();
  const r = rand(7);
  const cube = new THREE.BoxGeometry(1, 1, 1);

  // Grass floor: one block per tile, with a little color variation.
  const tiles = ARENA_HALF * 2 + 16;
  const floor = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial({ color: 0xffffff }), tiles * tiles);
  floor.receiveShadow = true;
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  let i = 0;
  for (let x = 0; x < tiles; x++) {
    for (let z = 0; z < tiles; z++) {
      const wx = x - tiles / 2 + 0.5;
      const wz = z - tiles / 2 + 0.5;
      m.makeTranslation(wx, -0.5, wz);
      floor.setMatrixAt(i, m);
      const inside = Math.abs(wx) < ARENA_HALF && Math.abs(wz) < ARENA_HALF;
      const checker = (x + z) % 2 === 0 ? 1 : 0.94;
      if (inside) color.setHSL(0.29, 0.55, (0.42 + r() * 0.05) * checker);
      else color.setHSL(0.27, 0.45, 0.34 + r() * 0.05);
      floor.setColorAt(i, color);
      i++;
    }
  }
  g.add(floor);

  // Low fence of wood and stone blocks around the arena.
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const wallPositions: THREE.Vector3[] = [];
  for (let k = -ARENA_HALF; k <= ARENA_HALF; k++) {
    wallPositions.push(new THREE.Vector3(k, 0.5, -ARENA_HALF - 0.5));
    wallPositions.push(new THREE.Vector3(k, 0.5, ARENA_HALF + 0.5));
    if (k > -ARENA_HALF - 1 && k < ARENA_HALF + 1) {
      wallPositions.push(new THREE.Vector3(-ARENA_HALF - 0.5, 0.5, k));
      wallPositions.push(new THREE.Vector3(ARENA_HALF + 0.5, 0.5, k));
    }
  }
  const walls = new THREE.InstancedMesh(cube, wallMat, wallPositions.length);
  walls.castShadow = true;
  walls.receiveShadow = true;
  wallPositions.forEach((p, idx) => {
    m.makeTranslation(p.x, p.y, p.z);
    walls.setMatrixAt(idx, m);
    const corner = Math.abs(p.x) > ARENA_HALF && Math.abs(p.z) > ARENA_HALF;
    color.setHex(idx % 3 === 0 || corner ? 0x9a9a9a : 0xa0703c).multiplyScalar(0.9 + r() * 0.15);
    walls.setColorAt(idx, color);
  });
  g.add(walls);

  // Corner torches (just glowing blocks on posts).
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), new THREE.MeshLambertMaterial({ color: 0x6b4423 }));
    post.position.set(x * (ARENA_HALF + 0.5), 1.6, z * (ARENA_HALF + 0.5));
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshBasicMaterial({ color: 0xffb703 }));
    flame.position.set(0, 0.75, 0);
    post.add(flame);
    g.add(post);
  }

  // Trees outside the fence.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f29 });
  const treeSpots: [number, number][] = [];
  for (let t = 0; t < 22; t++) {
    const angle = r() * Math.PI * 2;
    const dist = ARENA_HALF + 3 + r() * 6;
    treeSpots.push([Math.round(Math.cos(angle) * dist), Math.round(Math.sin(angle) * dist)]);
  }
  for (const [x, z] of treeSpots) {
    const tree = new THREE.Group();
    const height = 3 + Math.floor(r() * 3);
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1, height, 1), trunkMat);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    tree.add(trunk);
    const leaves = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), leafMat);
    leaves.position.y = height + 0.5;
    leaves.castShadow = true;
    tree.add(leaves);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 1.8), leafMat);
    top.position.y = height + 2;
    top.castShadow = true;
    tree.add(top);
    tree.position.set(x, 0, z);
    g.add(tree);
  }

  // A few crates and flowers inside for decoration (flat, so they don't block anyone).
  const flowerColors = [0xff4d6d, 0xffd23f, 0xffffff, 0x8338ec];
  for (let f = 0; f < 30; f++) {
    const fx = (r() - 0.5) * (ARENA_HALF * 2 - 2);
    const fz = (r() - 0.5) * (ARENA_HALF * 2 - 2);
    const flower = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      new THREE.MeshLambertMaterial({ color: flowerColors[f % flowerColors.length] }),
    );
    flower.position.set(fx, 0.08, fz);
    g.add(flower);
  }

  // Blocky clouds.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 });
  for (let c = 0; c < 10; c++) {
    const cloud = new THREE.Mesh(new THREE.BoxGeometry(4 + r() * 6, 1, 2 + r() * 4), cloudMat);
    cloud.position.set((r() - 0.5) * 80, 18 + r() * 6, (r() - 0.5) * 80);
    g.add(cloud);
  }

  return g;
}

/** Free every geometry, material, and texture under an object. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    for (const m of Array.isArray(mat) ? mat : [mat]) {
      const withMap = m as THREE.Material & { map?: THREE.Texture | null };
      withMap.map?.dispose();
      m.dispose();
    }
  });
}
