import * as THREE from 'three';
import type { ProceduralTextureSet } from './ProceduralTextures';
import { createThermalPhaseMaterial, type ThermalPhaseMaterial } from './PhaseMaterials';
import type { EnemySpawn } from './Arenas';

export interface ThermoEnemy {
  id: string;
  archetype: EnemySpawn['archetype'];
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  ringMeshes: THREE.Mesh[];
  materials: ThermalPhaseMaterial[];
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  kelvin: number;
  maxIntegrity: number;
  integrity: number;
  shockCracks: number;
  radius: number;
  height: number;
  isBoss: boolean;
  alive: boolean;
  attackCooldown: number;
  hoverHeight: number;
  phaseAngle: number;
}

export interface ShatterShard {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export function buildThermoEnemy(
  spawn: EnemySpawn,
  index: number,
  textures: ProceduralTextureSet
): ThermoEnemy {
  const group = new THREE.Group();
  group.position.copy(spawn.position);

  const materials: ThermalPhaseMaterial[] = [];
  const ringMeshes: THREE.Mesh[] = [];

  const createMat = (color: number, roughness: number, metalness: number) => {
    const m = createThermalPhaseMaterial({
      baseColor: color,
      roughness,
      metalness,
      map: textures.titaniumAlbedo,
      bumpMap: textures.titaniumBump,
      fractureMap: textures.fractureNoise,
      initialKelvin: spawn.initialKelvin,
    });
    materials.push(m);
    return m;
  };

  let coreMesh: THREE.Mesh;
  let radius = 1.1;
  let height = 2.6;
  let maxIntegrity = 100;
  let hoverHeight = 0;
  const isBoss = spawn.archetype === 'leviathan';

  if (spawn.archetype === 'leviathan') {
    // KATMAN 5 BOSS: THE HEAT-DEATH LEVIATHAN (10-part articulated thermodynamic colossus)
    radius = 2.8;
    height = 7.2;
    maxIntegrity = 600;
    hoverHeight = 1.4;

    const coreMat = createMat(0x88331a, 0.25, 0.85);
    coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.75, 1), coreMat);
    coreMesh.position.y = 3.6;
    coreMesh.castShadow = true;
    group.add(coreMesh);

    const armorMat = createMat(0x3a4654, 0.35, 0.9);
    const copperMat = createMat(0xb8663a, 0.28, 0.92);

    // Sculpted upper crown carapace + 4 articulated dorsal heatsink fins
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.1, 1.4, 8), armorMat);
    crown.position.y = 5.4;
    crown.castShadow = true;
    group.add(crown);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.2, 1.1), copperMat);
      fin.position.set(Math.cos(a) * 2.1, 4.1, Math.sin(a) * 2.1);
      fin.rotation.y = -a;
      fin.rotation.z = 0.22;
      fin.castShadow = true;
      group.add(fin);
    }

    // 3 Counter-rotating superconducting entropy rings orbiting the Leviathan core
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.6 + r * 0.55, 0.18, 10, 36),
        r === 1 ? copperMat : armorMat
      );
      ring.position.y = 3.6;
      ring.rotation.x = r * 0.7;
      ring.rotation.y = r * 0.9;
      group.add(ring);
      ringMeshes.push(ring);
    }
  } else if (spawn.archetype === 'plasma-sentinel') {
    // 6-part Overheated Plasma Sentinel (heavy biped/monolith with glowing copper chest core)
    radius = 1.05;
    height = 2.8;
    maxIntegrity = 110;

    const hullMat = createMat(0x4b5563, 0.38, 0.85);
    const coreMat = createMat(0xc2410c, 0.22, 0.7);

    // Pedestal / legs assembly (bottom-center grounded at y = 0)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.82, 0.9, 8), hullMat);
    base.position.y = 0.45;
    base.castShadow = true;
    group.add(base);

    // Chest reactor core
    coreMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), coreMat);
    coreMesh.position.y = 1.65;
    coreMesh.castShadow = true;
    group.add(coreMesh);

    // Shoulder heatsink pauldrons
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.95, 0.75), hullMat);
      pauldron.position.set(side * 0.88, 1.85, 0);
      pauldron.rotation.z = side * -0.18;
      pauldron.castShadow = true;
      group.add(pauldron);
    }

    // Rotating thermal containment ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 8, 24), coreMat);
    ring.position.y = 1.65;
    ring.rotation.x = Math.PI / 2.6;
    group.add(ring);
    ringMeshes.push(ring);

    // Head sensor visor
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.48, 6), hullMat);
    head.position.y = 2.52;
    group.add(head);
  } else if (spawn.archetype === 'flux-drone') {
    // 5-part Levitating Maglev Flux Drone
    radius = 0.9;
    height = 1.8;
    maxIntegrity = 80;
    hoverHeight = 2.4;

    const shellMat = createMat(0x64748b, 0.25, 0.92);
    const coilMat = createMat(0xb45309, 0.3, 0.85);

    coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 16), coilMat);
    coreMesh.position.y = 0;
    coreMesh.castShadow = true;
    group.add(coreMesh);

    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.09, 8, 24), shellMat);
      ring.rotation.x = i === 0 ? Math.PI / 2 : 0.4;
      group.add(ring);
      ringMeshes.push(ring);
    }

    // Ventral magnetic emitter spike
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.75, 8), shellMat);
    spike.rotation.x = Math.PI;
    spike.position.y = -0.68;
    group.add(spike);
  } else {
    // Cryo-Conductor (agile armored blade-construct)
    radius = 0.95;
    height = 2.5;
    maxIntegrity = 100;

    const alloyMat = createMat(0x52657a, 0.28, 0.88);
    const conduitMat = createMat(0x0369a1, 0.22, 0.75);

    const chassis = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.56, 1.35, 8), alloyMat);
    chassis.position.y = 0.68;
    chassis.castShadow = true;
    group.add(chassis);

    coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), conduitMat);
    coreMesh.position.y = 1.65;
    coreMesh.castShadow = true;
    group.add(coreMesh);

    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, 0.42), conduitMat);
      fin.position.set(side * 0.65, 1.5, 0);
      fin.rotation.z = side * 0.25;
      group.add(fin);
    }

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.06, 8, 20), alloyMat);
    halo.position.y = 1.65;
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
    ringMeshes.push(halo);
  }

  return {
    id: `${spawn.archetype}-${index}`,
    archetype: spawn.archetype,
    group,
    coreMesh,
    ringMeshes,
    materials,
    position: spawn.position.clone(),
    velocity: new THREE.Vector3(),
    kelvin: spawn.initialKelvin,
    maxIntegrity,
    integrity: maxIntegrity,
    shockCracks: 0,
    radius,
    height,
    isBoss,
    alive: true,
    attackCooldown: 1.5 + Math.random() * 1.5,
    hoverHeight,
    phaseAngle: Math.random() * Math.PI * 2,
  };
}
