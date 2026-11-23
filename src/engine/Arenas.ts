import * as THREE from 'three';
import type { ArenaId } from '../types/thermodynamics';
import type { ProceduralTextureSet } from './ProceduralTextures';
import { createThermalPhaseMaterial, type ThermalPhaseMaterial } from './PhaseMaterials';

export interface WalkablePlatform {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  isSuperfluid?: boolean;
  active: boolean;
}

export interface ThermalBridge {
  id: string;
  mesh: THREE.Mesh;
  material: ThermalPhaseMaterial;
  platform: WalkablePlatform;
  kelvin: number;
  shockCracks: number; // 0..1
  collapsed: boolean;
  collapseVelY: number;
  mode: 'shock-collapsible' | 'freeze-walkable';
  center: THREE.Vector3;
}

export interface CryoValve {
  id: string;
  group: THREE.Group;
  wheel: THREE.Mesh;
  position: THREE.Vector3;
  isOpen: boolean;
  openProgress: number;
  jetMesh: THREE.Mesh;
  targetBridgeId?: string;
}

export interface MaglevCoil {
  mesh: THREE.Object3D;
  center: THREE.Vector3;
  radius: number;
  polarity: 1 | -1;
  spinSpeed: number;
}

export interface EnemySpawn {
  position: THREE.Vector3;
  archetype: 'plasma-sentinel' | 'flux-drone' | 'cryo-conductor' | 'leviathan';
  initialKelvin: number;
}

export interface ArenaBuildResult {
  group: THREE.Group;
  platforms: WalkablePlatform[];
  thermalBridges: ThermalBridge[];
  cryoValves: CryoValve[];
  maglevCoils: MaglevCoil[];
  animatedNodes: Array<{ mesh: THREE.Object3D; update: (elapsed: number, dt: number) => void }>;
  enemySpawns: EnemySpawn[];
  playerSpawn: THREE.Vector3;
  fogColor: number;
  fogDensity: number;
  keyLightColor: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
}

function buildPressureTank(
  textures: ProceduralTextureSet,
  radius: number,
  height: number,
  tint = 0x7a8b9c
): THREE.Group {
  const g = new THREE.Group();
  const profile = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(radius * 0.82, 0),
    new THREE.Vector2(radius, height * 0.12),
    new THREE.Vector2(radius, height * 0.85),
    new THREE.Vector2(radius * 0.72, height * 0.96),
    new THREE.Vector2(radius * 0.25, height),
    new THREE.Vector2(0.01, height),
  ];
  const bodyGeo = new THREE.LatheGeometry(profile, 24);
  const steelMat = new THREE.MeshStandardMaterial({
    color: tint,
    map: textures.titaniumAlbedo,
    bumpMap: textures.titaniumBump,
    bumpScale: 0.02,
    metalness: 0.88,
    roughness: 0.26,
  });
  const body = new THREE.Mesh(bodyGeo, steelMat);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Copper cryogenic collar bands
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb8663a,
    map: textures.copperCapillary,
    metalness: 0.92,
    roughness: 0.3,
  });
  for (const hFrac of [0.22, 0.55, 0.82]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.02, radius * 0.06, 10, 24), copperMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = height * hFrac;
    g.add(band);
  }
  return g;
}

function buildCopperPipe(
  points: THREE.Vector3[],
  radius: number,
  textures: ProceduralTextureSet
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 36, radius, 12, false);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc26d3e,
    map: textures.copperCapillary,
    bumpMap: textures.copperBump,
    bumpScale: 0.02,
    metalness: 0.92,
    roughness: 0.28,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildValveUnit(
  id: string,
  pos: THREE.Vector3,
  textures: ProceduralTextureSet,
  targetBridgeId?: string
): CryoValve {
  const group = new THREE.Group();
  group.position.copy(pos);

  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 1.35, 12),
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      map: textures.titaniumAlbedo,
      metalness: 0.8,
      roughness: 0.35,
    })
  );
  stand.position.y = 0.675;
  stand.castShadow = true;
  group.add(stand);

  const wheelGroup = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.055, 10, 20),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      metalness: 0.75,
      roughness: 0.25,
    })
  );
  wheelGroup.position.set(0, 1.42, 0.14);
  group.add(wheelGroup);

  // Spokes inside handwheel
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0xb8663a, metalness: 0.9, roughness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.66, 8), spokeMat);
    spoke.rotation.z = (i * Math.PI) / 3;
    wheelGroup.add(spoke);
  }

  // Cryo jet plume (invisible until valve opened)
  const jetMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const jetMesh = new THREE.Mesh(new THREE.ConeGeometry(0.85, 7.5, 16, 1, true), jetMat);
  jetMesh.position.set(0, 1.2, -3.9);
  jetMesh.rotation.x = Math.PI / 2;
  jetMesh.visible = false;
  group.add(jetMesh);

  return {
    id,
    group,
    wheel: wheelGroup,
    position: pos.clone(),
    isOpen: false,
    openProgress: 0,
    jetMesh,
    targetBridgeId,
  };
}

export function buildArena(arenaId: ArenaId, textures: ProceduralTextureSet): ArenaBuildResult {
  const group = new THREE.Group();
  const platforms: WalkablePlatform[] = [];
  const thermalBridges: ThermalBridge[] = [];
  const cryoValves: CryoValve[] = [];
  const maglevCoils: MaglevCoil[] = [];
  const animatedNodes: Array<{ mesh: THREE.Object3D; update: (elapsed: number, dt: number) => void }> = [];
  const enemySpawns: EnemySpawn[] = [];

  const floorBaseMat = createThermalPhaseMaterial({
    baseColor: 0x2a3442,
    roughness: 0.45,
    metalness: 0.72,
    map: textures.titaniumAlbedo,
    bumpMap: textures.titaniumBump,
    fractureMap: textures.fractureNoise,
    initialKelvin: 220,
  });

  const siliconTowerMat = new THREE.MeshStandardMaterial({
    color: 0x162436,
    map: textures.siliconWafer,
    emissive: 0x0ea5e9,
    emissiveMap: textures.siliconWafer,
    emissiveIntensity: 0.45,
    metalness: 0.65,
    roughness: 0.25,
  });

  // Helper to add sculpted platform slab
  const addPlatform = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material = floorBaseMat,
    isSuperfluid = false
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y - h * 0.5, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
    platforms.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      y,
      isSuperfluid,
      active: true,
    });
    return mesh;
  };

  // =========================================================================
  // KATMAN 1: SIVI AZOT ÇAĞLAYANLARI (The Cryo-Cascades)
  // =========================================================================
  if (arenaId === 'cryo-cascades') {
    addPlatform(0, 0, 0, 48, 2, 48, floorBaseMat);
    // Elevated processor terrace & catwalk
    addPlatform(0, 3.6, -15, 22, 1.0, 10, floorBaseMat);
    addPlatform(-14, 2.2, 4, 10, 1.0, 14, floorBaseMat);
    addPlatform(14, 2.2, 4, 10, 1.0, 14, floorBaseMat);

    // Thermal-shockable steel bridge spanning center pit/processor trench
    const bridgeMat = createThermalPhaseMaterial({
      baseColor: 0x7c3e26,
      roughness: 0.4,
      metalness: 0.85,
      map: textures.titaniumAlbedo,
      fractureMap: textures.fractureNoise,
      initialKelvin: 820, // Superheated steel bridge ready for Thermal Shock!
    });
    const bridgeMesh = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.7, 13), bridgeMat);
    bridgeMesh.position.set(0, 3.25, -3.5);
    bridgeMesh.castShadow = true;
    bridgeMesh.receiveShadow = true;
    group.add(bridgeMesh);
    const bridgePlat: WalkablePlatform = {
      minX: -3.75,
      maxX: 3.75,
      minZ: -10,
      maxZ: 3,
      y: 3.6,
      active: true,
    };
    platforms.push(bridgePlat);
    thermalBridges.push({
      id: 'cascade-bridge',
      mesh: bridgeMesh,
      material: bridgeMat,
      platform: bridgePlat,
      kelvin: 820,
      shockCracks: 0.15,
      collapsed: false,
      collapseVelY: 0,
      mode: 'shock-collapsible',
      center: new THREE.Vector3(0, 3.3, -3.5),
    });

    // Colossal copper siphon pipes & glowing Liquid Nitrogen Waterfalls
    const fallMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.72,
      roughness: 0.12,
    });
    for (const side of [-1, 1]) {
      const pipe = buildCopperPipe(
        [
          new THREE.Vector3(side * 22, 20, -18),
          new THREE.Vector3(side * 16, 15, -14),
          new THREE.Vector3(side * 10, 14, -10),
        ],
        1.15,
        textures
      );
      group.add(pipe);

      // Liquid Nitrogen cascade sheet hitting hot silicon monolith below
      const fall = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.45, 14, 16, 8, true), fallMat);
      fall.position.set(side * 10, 7, -10);
      group.add(fall);
      animatedNodes.push({
        mesh: fall,
        update: (elapsed) => {
          fall.scale.x = 1 + Math.sin(elapsed * 8 + side) * 0.06;
          fall.scale.z = 1 + Math.cos(elapsed * 7 + side) * 0.06;
        },
      });

      // Superheated Silicon Processor Monolith at base of waterfall
      const tower = new THREE.Mesh(new THREE.BoxGeometry(5.5, 11, 5.5), siliconTowerMat);
      tower.position.set(side * 18, 5.5, -16);
      tower.castShadow = true;
      group.add(tower);

      const tank = buildPressureTank(textures, 2.2, 8.5, 0x64748b);
      tank.position.set(side * 19, 0, 14);
      group.add(tank);
    }

    // Superconducting Meissner floor rail down center
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.25, 28),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.4,
        metalness: 0.85,
        roughness: 0.2,
      })
    );
    rail.position.set(0, 0.13, 8);
    group.add(rail);
    maglevCoils.push({
      mesh: rail,
      center: new THREE.Vector3(0, 0.5, 8),
      radius: 14,
      polarity: 1,
      spinSpeed: 0,
    });

    enemySpawns.push(
      { position: new THREE.Vector3(-6, 0, -4), archetype: 'plasma-sentinel', initialKelvin: 1380 },
      { position: new THREE.Vector3(6, 0, -5), archetype: 'plasma-sentinel', initialKelvin: 1420 },
      { position: new THREE.Vector3(0, 3.6, -15), archetype: 'cryo-conductor', initialKelvin: 280 },
      { position: new THREE.Vector3(-13, 4.0, 4), archetype: 'flux-drone', initialKelvin: 950 }
    );

    return {
      group,
      platforms,
      thermalBridges,
      cryoValves,
      maglevCoils,
      animatedNodes,
      enemySpawns,
      playerSpawn: new THREE.Vector3(0, 0, 18),
      fogColor: 0x0b1624,
      fogDensity: 0.017,
      keyLightColor: 0xdbeafe,
      hemiSkyColor: 0x38bdf8,
      hemiGroundColor: 0x1e293b,
    };
  }

  // =========================================================================
  // KATMAN 2: MANYETİK LEVİTASYON KÖPRÜLERİ (The Maglev Chasm)
  // =========================================================================
  if (arenaId === 'maglev-chasm') {
    // Entry & Far Sanctuary Islands over abyss
    addPlatform(0, 0, 18, 18, 2.2, 14, floorBaseMat);
    addPlatform(0, 2.8, -18, 20, 2.2, 16, floorBaseMat);
    addPlatform(-14, 1.5, 0, 10, 1.5, 10, floorBaseMat);
    addPlatform(14, 1.5, 0, 10, 1.5, 10, floorBaseMat);

    // Floating superconducting stepping plates (no pillars!)
    for (let i = 0; i < 3; i++) {
      const z = 7 - i * 7;
      addPlatform(0, 1.0 + i * 0.55, z, 7.5, 0.65, 5.2, floorBaseMat);
    }

    // Colossal rotating superconducting Maglev Rings suspended in mid-air
    const coilMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      map: textures.titaniumAlbedo,
      emissive: 0x2563eb,
      emissiveIntensity: 0.9,
      metalness: 0.92,
      roughness: 0.18,
    });
    const ringConfigs = [
      { pos: new THREE.Vector3(0, 4.5, 0), r: 8.5, speed: 0.45, pol: 1 as const },
      { pos: new THREE.Vector3(-14, 5.0, 0), r: 5.5, speed: -0.7, pol: -1 as const },
      { pos: new THREE.Vector3(14, 5.0, 0), r: 5.5, speed: 0.7, pol: 1 as const },
      { pos: new THREE.Vector3(0, 6.5, -18), r: 10.5, speed: -0.35, pol: -1 as const },
    ];
    ringConfigs.forEach((cfg, idx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, 0.48, 14, 48), coilMat.clone());
      ring.position.copy(cfg.pos);
      ring.rotation.x = Math.PI / 2 + (idx % 2 === 0 ? 0.12 : -0.12);
      group.add(ring);
      maglevCoils.push({
        mesh: ring,
        center: cfg.pos.clone(),
        radius: cfg.r + 3.5,
        polarity: cfg.pol,
        spinSpeed: cfg.speed,
      });
      animatedNodes.push({
        mesh: ring,
        update: (elapsed, dt) => {
          ring.rotation.z += cfg.speed * dt;
          const flip = Math.sin(elapsed * 0.55 + idx) > 0 ? 1 : -1;
          const mat = ring.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(flip > 0 ? 0x38bdf8 : 0xf97316);
        },
      });
    });

    // Deep abyss magnetic flux glow plane far below
    const abyss = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshBasicMaterial({ color: 0x040b18 })
    );
    abyss.rotation.x = -Math.PI / 2;
    abyss.position.y = -24;
    group.add(abyss);

    enemySpawns.push(
      { position: new THREE.Vector3(-14, 3.8, 0), archetype: 'flux-drone', initialKelvin: 640 },
      { position: new THREE.Vector3(14, 3.8, 0), archetype: 'flux-drone', initialKelvin: 680 },
      { position: new THREE.Vector3(0, 2.8, -15), archetype: 'plasma-sentinel', initialKelvin: 1450 },
      { position: new THREE.Vector3(4, 2.8, -21), archetype: 'cryo-conductor', initialKelvin: 190 }
    );

    return {
      group,
      platforms,
      thermalBridges,
      cryoValves,
      maglevCoils,
      animatedNodes,
      enemySpawns,
      playerSpawn: new THREE.Vector3(0, 0, 19),
      fogColor: 0x060d1c,
      fogDensity: 0.015,
      keyLightColor: 0xc7d2fe,
      hemiSkyColor: 0x60a5fa,
      hemiGroundColor: 0x0f172a,
    };
  }

  // =========================================================================
  // KATMAN 3: SÜPERAKIŞKAN HELYUM LABİRENTİ (The Superfluid Vaults)
  // =========================================================================
  if (arenaId === 'superfluid-vaults') {
    const superfluidMat = new THREE.MeshStandardMaterial({
      color: 0x1a3852,
      map: textures.titaniumAlbedo,
      emissive: 0x0284c7,
      emissiveIntensity: 0.22,
      metalness: 0.9,
      roughness: 0.08, // Mirror-smooth zero-viscosity surface
    });

    // Zero-friction superfluid floor & vaulted channels
    addPlatform(0, 0, 0, 52, 2, 52, superfluidMat, true);

    // Sculpted curved vault walls with creeping Onnes superfluid helium film ribbons
    const vaultWallPositions = [
      { x: -12, z: -6, w: 2.2, h: 9, d: 24 },
      { x: 12, z: -6, w: 2.2, h: 9, d: 24 },
      { x: 0, z: -18, w: 26, h: 9, d: 2.2 },
      { x: 0, z: 6, w: 12, h: 6, d: 2.2 },
    ];
    vaultWallPositions.forEach((w) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w.w, w.h, w.d),
        new THREE.MeshStandardMaterial({
          color: 0x4b5c6e,
          map: textures.titaniumAlbedo,
          metalness: 0.92,
          roughness: 0.16,
        })
      );
      wall.position.set(w.x, w.h * 0.5, w.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);

      // Luminous superfluid helium film climbing the stainless wall
      const film = new THREE.Mesh(
        new THREE.BoxGeometry(w.w + 0.12, 1.6, w.d + 0.12),
        new THREE.MeshStandardMaterial({
          color: 0xa5f3fc,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.9,
          transparent: true,
          opacity: 0.55,
          roughness: 0.05,
        })
      );
      film.position.set(w.x, 1.2, w.z);
      group.add(film);
      animatedNodes.push({
        mesh: film,
        update: (elapsed) => {
          film.position.y = 1.6 + Math.sin(elapsed * 2.2 + w.x) * 0.85;
        },
      });
    });

    // Overhead copper cryogenic distribution manifolds
    group.add(
      buildCopperPipe(
        [
          new THREE.Vector3(-22, 10, -20),
          new THREE.Vector3(0, 12, -10),
          new THREE.Vector3(22, 10, -20),
        ],
        0.95,
        textures
      )
    );
    for (const sx of [-20, 20]) {
      const tank = buildPressureTank(textures, 2.5, 10, 0x8fa3b8);
      tank.position.set(sx, 0, 16);
      group.add(tank);
    }

    maglevCoils.push({
      mesh: group,
      center: new THREE.Vector3(0, 0.5, -6),
      radius: 10,
      polarity: 1,
      spinSpeed: 0,
    });

    enemySpawns.push(
      { position: new THREE.Vector3(-6, 0, -10), archetype: 'cryo-conductor', initialKelvin: 110 },
      { position: new THREE.Vector3(6, 0, -10), archetype: 'cryo-conductor', initialKelvin: 130 },
      { position: new THREE.Vector3(0, 0, -14), archetype: 'plasma-sentinel', initialKelvin: 1350 },
      { position: new THREE.Vector3(-18, 2.5, 0), archetype: 'flux-drone', initialKelvin: 520 }
    );

    return {
      group,
      platforms,
      thermalBridges,
      cryoValves,
      maglevCoils,
      animatedNodes,
      enemySpawns,
      playerSpawn: new THREE.Vector3(0, 0, 18),
      fogColor: 0x071828,
      fogDensity: 0.016,
      keyLightColor: 0xe0f2fe,
      hemiSkyColor: 0x7dd3fc,
      hemiGroundColor: 0x0c4a6e,
    };
  }

  // =========================================================================
  // KATMAN 4: TERMAL KAÇAK FIRINLARI (The Thermal Runaway Core)
  // =========================================================================
  if (arenaId === 'thermal-runaway') {
    const hotFloorMat = createThermalPhaseMaterial({
      baseColor: 0x3b2318,
      roughness: 0.5,
      metalness: 0.78,
      map: textures.copperCapillary,
      fractureMap: textures.fractureNoise,
      initialKelvin: 660,
    });
    // Two main safe obsidian/copper platforms separated by a molten silicon trench!
    addPlatform(0, 0, 16, 36, 2.2, 16, hotFloorMat);
    addPlatform(0, 0, -16, 36, 2.2, 16, hotFloorMat);

    // Glowing molten silicon sea beneath the trench
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xff4500,
      emissive: 0xff5a1f,
      emissiveIntensity: 2.2,
      roughness: 0.25,
    });
    const moltenPool = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), lavaMat);
    moltenPool.rotation.x = -Math.PI / 2;
    moltenPool.position.y = -3.5;
    group.add(moltenPool);

    // 2 Molten Silicon Bridges that solidify into walkable Ice Paths when Cryo-Valves are opened or sprayed with E!
    for (const [idx, bx] of [-7, 7].entries()) {
      const bridgeId = `molten-bridge-${idx}`;
      const bMat = createThermalPhaseMaterial({
        baseColor: 0x993311,
        roughness: 0.3,
        metalness: 0.6,
        map: textures.titaniumAlbedo,
        fractureMap: textures.fractureNoise,
        initialKelvin: 1220, // Starts molten (> 680K), must be cooled < 220K to walk safely!
      });
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.75, 16), bMat);
      bMesh.position.set(bx, -0.4, 0);
      bMesh.receiveShadow = true;
      group.add(bMesh);

      const plat: WalkablePlatform = {
        minX: bx - 2.75,
        maxX: bx + 2.75,
        minZ: -8,
        maxZ: 8,
        y: 0.0,
        active: false, // Becomes walkable once cooled below 320 K!
      };
      platforms.push(plat);
      thermalBridges.push({
        id: bridgeId,
        mesh: bMesh,
        material: bMat,
        platform: plat,
        kelvin: 1220,
        shockCracks: 0.35,
        collapsed: false,
        collapseVelY: 0,
        mode: 'freeze-walkable',
        center: new THREE.Vector3(bx, 0, 0),
      });

      // Manual Cryogenic Relief Valve beside each molten bridge
      const valve = buildValveUnit(`valve-${idx}`, new THREE.Vector3(bx, 0, 9.2), textures, bridgeId);
      group.add(valve.group);
      cryoValves.push(valve);
    }

    // Colossal glowing copper heatsink fins framing the runaway furnace
    const finMat = createThermalPhaseMaterial({
      baseColor: 0xa84b24,
      roughness: 0.35,
      metalness: 0.88,
      map: textures.copperCapillary,
      fractureMap: textures.fractureNoise,
      initialKelvin: 1080,
    });
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 15, 6), finMat);
      fin.position.set(i * 6.5, 7.5, -25);
      fin.castShadow = true;
      group.add(fin);
    }

    enemySpawns.push(
      { position: new THREE.Vector3(-8, 0, 12), archetype: 'plasma-sentinel', initialKelvin: 1550 },
      { position: new THREE.Vector3(8, 0, -12), archetype: 'plasma-sentinel', initialKelvin: 1620 },
      { position: new THREE.Vector3(-6, 0, -16), archetype: 'plasma-sentinel', initialKelvin: 1480 },
      { position: new THREE.Vector3(0, 3.0, -13), archetype: 'flux-drone', initialKelvin: 920 }
    );

    return {
      group,
      platforms,
      thermalBridges,
      cryoValves,
      maglevCoils,
      animatedNodes,
      enemySpawns,
      playerSpawn: new THREE.Vector3(0, 0, 20),
      fogColor: 0x1e0b05,
      fogDensity: 0.018,
      keyLightColor: 0xffb37a,
      hemiSkyColor: 0xf97316,
      hemiGroundColor: 0x431407,
    };
  }

  // =========================================================================
  // KATMAN 5: MUTLAK SIFIR ÇEKİRDEĞİ (The Bose-Einstein Condensate Throne)
  // =========================================================================
  const becFloorMat = createThermalPhaseMaterial({
    baseColor: 0x263c52,
    roughness: 0.16,
    metalness: 0.82,
    map: textures.titaniumAlbedo,
    fractureMap: textures.fractureNoise,
    initialKelvin: 1.4,
  });
  addPlatform(0, 0, 0, 56, 2.5, 56, becFloorMat, true);

  // Coherent Quantum Wave-Function Concentric Condensate Rings
  for (let i = 1; i <= 4; i++) {
    const waveRing = new THREE.Mesh(
      new THREE.TorusGeometry(i * 6.2, 0.18, 12, 64),
      new THREE.MeshStandardMaterial({
        color: 0xa5f3fc,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0.7,
      })
    );
    waveRing.rotation.x = Math.PI / 2;
    waveRing.position.y = 0.08;
    group.add(waveRing);
    animatedNodes.push({
      mesh: waveRing,
      update: (elapsed) => {
        waveRing.position.y = 0.14 + Math.sin(elapsed * 1.4 - i * 0.9) * 0.12;
      },
    });
  }

  // 6 Monumental Cryo-Silica Pillars surrounding the Throne
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const px = Math.cos(angle) * 23;
    const pz = Math.sin(angle) * 23;
    const pillar = buildPressureTank(textures, 1.8, 16, 0x7dd3fc);
    pillar.position.set(px, 0, pz);
    group.add(pillar);
  }

  maglevCoils.push({
    mesh: group,
    center: new THREE.Vector3(0, 1.5, 0),
    radius: 20,
    polarity: 1,
    spinSpeed: 0,
  });

  enemySpawns.push(
    { position: new THREE.Vector3(0, 0, -10), archetype: 'leviathan', initialKelvin: 1450 },
    { position: new THREE.Vector3(-12, 3.2, -6), archetype: 'flux-drone', initialKelvin: 780 },
    { position: new THREE.Vector3(12, 3.2, -6), archetype: 'flux-drone', initialKelvin: 780 }
  );

  return {
    group,
    platforms,
    thermalBridges,
    cryoValves,
    maglevCoils,
    animatedNodes,
    enemySpawns,
    playerSpawn: new THREE.Vector3(0, 0, 21),
    fogColor: 0x05101d,
    fogDensity: 0.013,
    keyLightColor: 0xe0f2fe,
    hemiSkyColor: 0xbae6fd,
    hemiGroundColor: 0x082f49,
  };
}
