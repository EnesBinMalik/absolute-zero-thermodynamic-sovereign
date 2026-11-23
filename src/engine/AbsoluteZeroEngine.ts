import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ARENAS, type ArenaId, type CameraMode, type DiegeticTelemetry } from '../types/thermodynamics';
import { CryoAudioEngine } from './CryoAudioEngine';
import { createProceduralTextureSet, type ProceduralTextureSet } from './ProceduralTextures';
import { CryoArmament } from './CryoArmament';
import { buildArena, type ArenaBuildResult } from './Arenas';
import { buildThermoEnemy, type ShatterShard, type ThermoEnemy } from './ThermoEnemies';

// Zero-GC reusable math helpers
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

interface PlasmaWaveEffect {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  radius: number;
  maxRadius: number;
  life: number;
}

interface SteamParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class AbsoluteZeroEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orbitControls: OrbitControls;
  private isSoftwareGl: boolean;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private textures: ProceduralTextureSet;
  private armament: CryoArmament;
  private audio = new CryoAudioEngine();

  private currentArenaId: ArenaId = 'cryo-cascades';
  private arena: ArenaBuildResult | null = null;
  private enemies: ThermoEnemy[] = [];
  private shards: ShatterShard[] = [];
  private plasmaWaves: PlasmaWaveEffect[] = [];
  private particles: SteamParticle[] = [];

  // Visual beam for Entropy Siphon & Cryo Spray
  private siphonBeam: THREE.Mesh;
  private cryoCone: THREE.Mesh;
  private meissnerAura: THREE.Mesh;

  // Player state (First-Person)
  private playerPos = new THREE.Vector3(0, 0, 18);
  private playerVel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private grounded = true;
  private cameraMode: CameraMode = 'first-person';

  // Thermodynamic & Diegetic Telemetry
  private suitKelvin = 290;
  private heliumReserve = 1.0;
  private siphonHeatCharge = 0.28;
  private integrity = 1.0;
  private meissnerActive = false;
  private meissnerTimer = 0;
  private timeDilation = 1.0;
  private shatteredCount = 0;

  // Input flags
  private keys: Record<string, boolean> = {};
  private lmbDown = false;
  private rmbDown = false;
  private sabreCooldown = 0;
  private plasmaCooldown = 0;
  private isPointerLocked = false;
  private contextLost = false;

  // Loop & callbacks
  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameId = 0;
  private disposed = false;
  private onTelemetry: (t: DiegeticTelemetry) => void;
  private onContextEvent?: (lost: boolean) => void;
  private lastTelemetryPush = 0;

  constructor(
    container: HTMLElement,
    onTelemetry: (t: DiegeticTelemetry) => void,
    onContextEvent?: (lost: boolean) => void
  ) {
    this.container = container;
    this.onTelemetry = onTelemetry;
    this.onContextEvent = onContextEvent;

    this.isSoftwareGl = detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1624);
    this.scene.fog = new THREE.FogExp2(0x0b1624, 0.017);

    // Mandatory studio environment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(72, width / height, 0.08, 220);
    this.scene.add(this.camera);

    // OrbitControls (active only in Orbit Inspection mode)
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = !this.isSoftwareGl;
    this.orbitControls.dampingFactor = 0.06;
    this.orbitControls.maxDistance = 68;
    this.orbitControls.minDistance = 4;
    this.orbitControls.enabled = false;

    // 3-Point Studio & Arena Lighting Rig (warm/cool contrast, <= 1 shadow caster)
    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xdbeafe, 2.0);
    this.keyLight.position.set(22, 34, 18);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    const d = 30;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 90;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xff8c42, 0.85);
    this.rimLight.position.set(-20, 16, -24);
    this.scene.add(this.rimLight);

    // Procedural Textures & First-Person Cryo Armament attached to camera
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextureSet(maxAniso);
    this.armament = new CryoArmament(this.textures, this.isSoftwareGl);
    this.camera.add(this.armament.root);

    // Siphon Beam & Liquid Helium Spray Cone
    this.siphonBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.14, 1, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff7b29,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.siphonBeam.visible = false;
    this.scene.add(this.siphonBeam);

    this.cryoCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 5.5, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xa5f3fc,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.cryoCone.rotation.x = -Math.PI / 2;
    this.cryoCone.position.set(-0.32, -0.25, -3.2);
    this.cryoCone.visible = false;
    this.camera.add(this.cryoCone);

    // Meissner Flux-Pinning halo beneath player
    this.meissnerAura = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.04, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
    );
    this.meissnerAura.rotation.x = Math.PI / 2;
    this.meissnerAura.visible = false;
    this.scene.add(this.meissnerAura);

    this.loadArena('cryo-cascades');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.tick();
  }

  public loadArena(arenaId: ArenaId): void {
    this.currentArenaId = arenaId;
    const spec = ARENAS.find((a) => a.id === arenaId) ?? ARENAS[0];

    // Clear previous arena & dynamic actors
    if (this.arena) {
      this.scene.remove(this.arena.group);
    }
    this.enemies.forEach((e) => this.scene.remove(e.group));
    this.enemies = [];
    this.shards.forEach((s) => this.scene.remove(s.mesh));
    this.shards = [];
    this.plasmaWaves.forEach((w) => this.scene.remove(w.mesh));
    this.plasmaWaves = [];
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];

    this.arena = buildArena(arenaId, this.textures);
    this.scene.add(this.arena.group);

    this.scene.background = new THREE.Color(this.arena.fogColor);
    this.scene.fog = new THREE.FogExp2(this.arena.fogColor, this.arena.fogDensity);
    this.keyLight.color.setHex(this.arena.keyLightColor);
    this.hemiLight.color.setHex(this.arena.hemiSkyColor);
    this.hemiLight.groundColor.setHex(this.arena.hemiGroundColor);

    // Spawn handcrafted enemies
    this.arena.enemySpawns.forEach((sp, i) => {
      const enemy = buildThermoEnemy(sp, i, this.textures);
      this.enemies.push(enemy);
      this.scene.add(enemy.group);
    });

    // Reset player physics & diegetic suit state
    this.playerPos.copy(this.arena.playerSpawn);
    this.playerVel.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = -0.05;
    this.suitKelvin = THREE.MathUtils.clamp(spec.ambientKelvin + 190, 95, 420);
    this.heliumReserve = 1.0;
    this.integrity = 1.0;

    if (this.cameraMode === 'orbit') {
      this.camera.position.set(22, 16, 26);
      this.orbitControls.target.set(0, 2, -4);
      this.orbitControls.update();
    } else {
      this.camera.position.set(this.playerPos.x, this.playerPos.y + 1.72, this.playerPos.z);
    }

    this.audio.playCopperGong(0.75);
    this.pushTelemetry();
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    if (mode === 'orbit') {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      this.armament.root.visible = false;
      this.cryoCone.visible = false;
      this.orbitControls.enabled = true;
      this.camera.position.set(22, 15, 25);
      this.orbitControls.target.set(0, 2, -4);
      this.orbitControls.update();
    } else {
      this.orbitControls.enabled = false;
      this.armament.root.visible = true;
      this.camera.position.set(this.playerPos.x, this.playerPos.y + 1.72, this.playerPos.z);
    }
  }

  public requestPointerLock(): void {
    this.audio.init();
    if (this.cameraMode === 'first-person') {
      this.renderer.domElement.requestPointerLock?.();
    }
  }

  public toggleMute(): boolean {
    this.audio.init();
    const next = !this.audio.isMuted();
    this.audio.setMuted(next);
    return next;
  }

  public resetArena(): void {
    this.loadArena(this.currentArenaId);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private onResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
    this.onContextEvent?.(true);
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
    this.onContextEvent?.(false);
  };

  private onPointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.pushTelemetry();
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (e.code === 'KeyQ' && this.cameraMode === 'first-person') {
      this.firePlasmaWave();
    }
    if (e.code === 'ShiftLeft' && this.cameraMode === 'first-person') {
      this.triggerMeissnerDash();
    }
    if (e.code === 'KeyE' && this.cameraMode === 'first-person') {
      this.tryOpenNearbyValve();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isPointerLocked || this.cameraMode !== 'first-person') return;
    const sens = 0.0022;
    this.yaw -= e.movementX * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * sens, -1.35, 1.35);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.cameraMode !== 'first-person') return;
    if (!this.isPointerLocked && e.target === this.renderer.domElement) {
      this.requestPointerLock();
      return;
    }
    if (!this.isPointerLocked) return;
    this.audio.init();
    if (e.button === 0) {
      this.lmbDown = true;
      this.performSabreStrike();
    } else if (e.button === 2) {
      this.rmbDown = true;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.lmbDown = false;
    if (e.button === 2) this.rmbDown = false;
  };

  private triggerMeissnerDash(): void {
    if (!this.arena) return;
    // Check if near any superconducting rail/coil or airborne over Maglev Chasm
    let nearCoil = this.currentArenaId === 'maglev-chasm' || this.currentArenaId === 'bose-einstein-throne';
    for (const c of this.arena.maglevCoils) {
      if (this.playerPos.distanceTo(c.center) < c.radius + 5) {
        nearCoil = true;
        break;
      }
    }
    if (nearCoil || this.heliumReserve > 0.15) {
      this.meissnerActive = true;
      this.meissnerTimer = 0.55;
      this.heliumReserve = Math.max(0, this.heliumReserve - 0.12);

      _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
      this.playerVel.x = _forward.x * 26;
      this.playerVel.z = _forward.z * 26;
      this.playerVel.y = Math.max(this.playerVel.y, 4.5);
      this.audio.playMeissnerFlux();
    }
  }

  private tryOpenNearbyValve(): void {
    if (!this.arena) return;
    for (const v of this.arena.cryoValves) {
      if (!v.isOpen && this.playerPos.distanceTo(v.position) < 4.5) {
        v.isOpen = true;
        v.jetMesh.visible = true;
        this.audio.playValveRelease();
        this.armament.triggerRecoil();
        break;
      }
    }
  }

  private performSabreStrike(): void {
    if (this.sabreCooldown > 0) return;
    this.sabreCooldown = 0.3;
    this.armament.triggerSabreSwing();
    this.audio.playSabreSwing(false);

    _forward.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    // 1. Check enemies in melee reach
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      _v1.copy(enemy.position).addScaledVector(THREE.Object3D.DEFAULT_UP, enemy.height * 0.5);
      const dist = _v1.distanceTo(this.camera.position);
      if (dist < enemy.radius + 4.3) {
        _v2.copy(_v1).sub(this.camera.position).normalize();
        if (_v2.dot(_forward) > 0.42) {
          // If enemy is brittle crystal (< 95 K), a SINGLE strike shatters it into physical shards!
          if (enemy.kelvin < 95) {
            this.shatterEnemy(enemy);
          } else {
            enemy.integrity -= 34;
            enemy.shockCracks = Math.min(1, enemy.shockCracks + 0.35);
            enemy.kelvin = Math.max(1, enemy.kelvin - 45);
            enemy.velocity.addScaledVector(_forward, 7);
            this.audio.playCrystalShatter(0.5);
            if (enemy.integrity <= 0) {
              this.shatterEnemy(enemy);
            }
          }
        }
      }
    }

    // 2. Check thermal-shocked bridges ready to collapse
    if (this.arena) {
      for (const b of this.arena.thermalBridges) {
        if (!b.collapsed && b.mode === 'shock-collapsible') {
          const dist = b.center.distanceTo(this.playerPos);
          if (dist < 8.5 && b.shockCracks >= 0.65) {
            b.collapsed = true;
            b.platform.active = false;
            b.collapseVelY = -2.5;
            this.audio.playCrystalShatter(1.2);
            this.spawnShatterShards(b.center, 18, 0x7dd3fc);
            // Crush enemies beneath the collapsing bridge!
            for (const e of this.enemies) {
              if (e.alive && e.position.distanceTo(b.center) < 7.0) {
                this.shatterEnemy(e);
              }
            }
          }
        }
      }
    }

    // 3. Also spin open nearby valves if struck
    this.tryOpenNearbyValve();
  }

  private firePlasmaWave(): void {
    if (this.plasmaCooldown > 0 || this.siphonHeatCharge < 0.25) return;
    this.plasmaCooldown = 0.6;
    const power = this.siphonHeatCharge;
    this.siphonHeatCharge = 0;

    this.armament.triggerPlasmaWave();
    this.armament.triggerRecoil();
    this.audio.playSabreSwing(true);

    const waveGeo = new THREE.RingGeometry(0.6, 1.35, 32);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0xff6a00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.rotation.x = -Math.PI / 2;
    waveMesh.position.copy(this.playerPos).add(new THREE.Vector3(0, 1.1, 0));
    this.scene.add(waveMesh);

    this.plasmaWaves.push({
      mesh: waveMesh,
      origin: this.playerPos.clone(),
      radius: 1.0,
      maxRadius: 12 + power * 12,
      life: 0.55,
    });

    // Apply superheated plasma wave damage & massive +K thermal shock to enemies in front
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = enemy.position.distanceTo(this.playerPos);
      if (dist < 14 + power * 10) {
        enemy.kelvin = Math.min(1800, enemy.kelvin + 520 * power);
        enemy.shockCracks = 1.0;
        enemy.integrity -= 95 * power;
        if (enemy.integrity <= 0) {
          this.shatterEnemy(enemy);
        }
      }
    }
  }

  private shatterEnemy(enemy: ThermoEnemy): void {
    if (!enemy.alive) return;
    enemy.alive = false;
    this.scene.remove(enemy.group);
    this.shatteredCount += 1;

    const shardColor = enemy.kelvin < 120 ? 0x93c5fd : 0xf97316;
    const count = enemy.isBoss ? 48 : 20;
    const center = enemy.position.clone().add(new THREE.Vector3(0, enemy.height * 0.5, 0));
    this.spawnShatterShards(center, count, shardColor);
    this.audio.playCrystalShatter(enemy.isBoss ? 1.5 : 1.0);
    if (enemy.isBoss) {
      this.audio.playCopperGong(1.0);
    }
  }

  private spawnShatterShards(origin: THREE.Vector3, count: number, colorHex: number): void {
    const geo = new THREE.OctahedronGeometry(0.24, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.45,
      metalness: 0.65,
      roughness: 0.15,
    });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(origin);
      m.scale.setScalar(0.6 + Math.random() * 1.1);
      this.scene.add(m);
      this.shards.push({
        mesh: m,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          3 + Math.random() * 9,
          (Math.random() - 0.5) * 14
        ),
        rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 0,
        maxLife: 2.2 + Math.random() * 1.2,
      });
    }
  }

  private spawnSteamBurst(pos: THREE.Vector3, colorHex: number): void {
    if (this.particles.length > 75) return;
    const m = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.25, 0),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      })
    );
    m.position.copy(pos);
    this.scene.add(m);
    this.particles.push({
      mesh: m,
      vel: new THREE.Vector3((Math.random() - 0.5) * 2.5, 2.5 + Math.random() * 3.5, (Math.random() - 0.5) * 2.5),
      life: 0,
      maxLife: 0.9 + Math.random() * 0.6,
    });
  }

  private tick = (): void => {
    if (this.disposed) return;
    const rawDt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += rawDt;

    if (!this.contextLost) {
      this.updateSimulation(rawDt);
      this.renderer.render(this.scene, this.camera);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateSimulation(dt: number): void {
    const spec = ARENAS.find((a) => a.id === this.currentArenaId) ?? ARENAS[0];
    this.sabreCooldown = Math.max(0, this.sabreCooldown - dt);
    this.plasmaCooldown = Math.max(0, this.plasmaCooldown - dt);

    // Bose-Einstein Condensate time dilation waves in Katman 5
    if (this.currentArenaId === 'bose-einstein-throne') {
      this.timeDilation = 0.68 + 0.32 * Math.sin(this.elapsed * 1.1);
    } else {
      this.timeDilation = 1.0;
    }

    const isSprayingCryo = Boolean(this.keys['KeyE']) && this.heliumReserve > 0.02 && this.cameraMode === 'first-person';
    const isSiphoning = this.rmbDown && this.cameraMode === 'first-person';

    // Update Suit Kelvin toward ambient + thermal interactions
    let targetSuitK = spec.ambientKelvin * 0.55 + 135;
    if (isSiphoning) targetSuitK += 110;
    if (isSprayingCryo) {
      targetSuitK -= 140;
      this.heliumReserve = Math.max(0, this.heliumReserve - dt * 0.22);
    } else {
      this.heliumReserve = Math.min(1, this.heliumReserve + dt * 0.14);
    }
    this.suitKelvin = THREE.MathUtils.damp(this.suitKelvin, THREE.MathUtils.clamp(targetSuitK, 15, 650), 1.8, dt);

    // 1. Update First-Person Movement & Meissner Physics
    if (this.cameraMode === 'first-person' && this.arena) {
      const moveInput = _v1.set(0, 0, 0);
      _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
      _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

      if (this.keys['KeyW']) moveInput.add(_forward);
      if (this.keys['KeyS']) moveInput.sub(_forward);
      if (this.keys['KeyD']) moveInput.add(_right);
      if (this.keys['KeyA']) moveInput.sub(_right);
      if (moveInput.lengthSq() > 0) moveInput.normalize();

      const accel = spec.id === 'superfluid-vaults' ? 28 : 54;
      this.playerVel.x += moveInput.x * accel * dt;
      this.playerVel.z += moveInput.z * accel * dt;

      // Friction: near-zero viscosity in Superfluid Vaults!
      const damping = Math.pow(spec.friction, dt * 60);
      this.playerVel.x *= damping;
      this.playerVel.z *= damping;

      // Meissner Flux-Pinning levitation
      if (this.meissnerTimer > 0) {
        this.meissnerTimer -= dt;
        this.playerVel.y = THREE.MathUtils.damp(this.playerVel.y, 0.5, 8, dt);
        this.meissnerAura.visible = true;
        this.meissnerAura.position.set(this.playerPos.x, this.playerPos.y + 0.15, this.playerPos.z);
        this.meissnerAura.rotation.z += dt * 6;
      } else {
        this.meissnerActive = false;
        this.meissnerAura.visible = false;
        if (this.keys['Space'] && this.grounded) {
          this.playerVel.y = 9.2;
          this.grounded = false;
        }
        this.playerVel.y -= 21.0 * spec.gravityScale * dt;
      }

      this.playerPos.addScaledVector(this.playerVel, dt);

      // Platform collision check
      let supportY = -999;
      for (const p of this.arena.platforms) {
        if (!p.active) continue;
        if (
          this.playerPos.x >= p.minX - 0.35 &&
          this.playerPos.x <= p.maxX + 0.35 &&
          this.playerPos.z >= p.minZ - 0.35 &&
          this.playerPos.z <= p.maxZ + 0.35 &&
          this.playerPos.y >= p.y - 1.2
        ) {
          if (p.y > supportY) supportY = p.y;
        }
      }

      if (supportY > -900 && this.playerPos.y <= supportY + 0.05 && this.playerVel.y <= 0) {
        this.playerPos.y = supportY;
        this.playerVel.y = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }

      // Respawn back onto arena entry if fallen into abyss/molten pool
      if (this.playerPos.y < -9) {
        this.playerPos.copy(this.arena.playerSpawn);
        this.playerVel.set(0, 0, 0);
        this.suitKelvin = Math.min(600, this.suitKelvin + 95);
        this.integrity = Math.max(0.15, this.integrity - 0.2);
      }

      this.camera.position.set(this.playerPos.x, this.playerPos.y + 1.72, this.playerPos.z);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
      this.camera.rotation.z = THREE.MathUtils.damp(
        this.camera.rotation.z,
        this.meissnerActive ? -moveInput.dot(_right) * 0.06 : 0,
        10,
        dt
      );
    } else {
      this.orbitControls.update();
    }

    // 2. Active Siphon Tether (RMB) & Cryo Spray (E) Ray-Cone Interaction
    this.siphonBeam.visible = false;
    this.cryoCone.visible = isSprayingCryo;

    if ((isSiphoning || isSprayingCryo) && this.cameraMode === 'first-person') {
      _forward.set(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      ).normalize();

      // Find closest enemy or thermal bridge in aim cone
      let bestDist = 18;
      let targetPoint: THREE.Vector3 | null = null;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        _v2.copy(enemy.position).add(new THREE.Vector3(0, enemy.height * 0.5, 0));
        const d = _v2.distanceTo(this.camera.position);
        _v3.copy(_v2).sub(this.camera.position).normalize();
        if (d < bestDist && _v3.dot(_forward) > 0.72) {
          bestDist = d;
          targetPoint = _v2.clone();
          if (isSiphoning) {
            const drain = 390 * dt;
            const prevK = enemy.kelvin;
            enemy.kelvin = Math.max(1.2, enemy.kelvin - drain);
            const deltaK = prevK - enemy.kelvin;
            this.siphonHeatCharge = Math.min(1, this.siphonHeatCharge + deltaK / 1100);
            enemy.shockCracks = Math.min(1, enemy.shockCracks + dt * 0.8);
          }
          if (isSprayingCryo && d < 8.5) {
            enemy.kelvin = Math.max(1.2, enemy.kelvin - 520 * dt);
            enemy.shockCracks = Math.min(1, enemy.shockCracks + dt * 1.4);
          }
        }
      }

      // Check thermal bridges for Thermal Shock / Molten Freeze
      if (this.arena) {
        for (const b of this.arena.thermalBridges) {
          if (b.collapsed) continue;
          const d = b.center.distanceTo(this.camera.position);
          if (d < 12) {
            _v3.copy(b.center).sub(this.camera.position).normalize();
            if (_v3.dot(_forward) > 0.68) {
              if (isSiphoning) {
                const prev = b.kelvin;
                b.kelvin = Math.max(15, b.kelvin - 360 * dt);
                this.siphonHeatCharge = Math.min(1, this.siphonHeatCharge + (prev - b.kelvin) / 1400);
                b.shockCracks = Math.min(1, b.shockCracks + dt * 0.9);
              }
              if (isSprayingCryo) {
                if (b.kelvin > 450 && Math.random() < 0.25) {
                  this.spawnSteamBurst(b.center, 0xe0f2fe);
                }
                b.kelvin = Math.max(12, b.kelvin - 580 * dt);
                b.shockCracks = Math.min(1, b.shockCracks + dt * 1.25);
              }
              if (!targetPoint) targetPoint = b.center.clone();
            }
          }
        }
      }

      if (isSiphoning && targetPoint) {
        this.siphonBeam.visible = true;
        // Position beam between left gauntlet world origin & target
        const startPos = _v1.set(-0.34, -0.28, -0.68).applyMatrix4(this.camera.matrixWorld);
        const mid = _v2.copy(startPos).add(targetPoint).multiplyScalar(0.5);
        this.siphonBeam.position.copy(mid);
        const len = startPos.distanceTo(targetPoint);
        this.siphonBeam.scale.set(1, len, 1);
        this.siphonBeam.quaternion.setFromUnitVectors(
          THREE.Object3D.DEFAULT_UP,
          _v3.copy(targetPoint).sub(startPos).normalize()
        );
      }
    }

    // 3. Update Arena Valves, Bridges, & Animated Nodes
    if (this.arena) {
      for (const node of this.arena.animatedNodes) {
        node.update(this.elapsed, dt);
      }

      for (const valve of this.arena.cryoValves) {
        if (valve.isOpen && valve.openProgress < 1) {
          valve.openProgress = Math.min(1, valve.openProgress + dt * 1.8);
          valve.wheel.rotation.z += dt * 9;
          valve.jetMesh.scale.setScalar(0.6 + valve.openProgress * 0.4);
          // Cool linked molten bridge into a solid ice path
          if (valve.targetBridgeId) {
            const b = this.arena.thermalBridges.find((br) => br.id === valve.targetBridgeId);
            if (b) {
              b.kelvin = Math.max(40, b.kelvin - 620 * dt);
            }
          }
        }
        if (valve.isOpen && Math.random() < 0.2) {
          this.spawnSteamBurst(valve.position.clone().add(new THREE.Vector3(0, 1, -3.5)), 0xbae6fd);
        }
      }

      for (const b of this.arena.thermalBridges) {
        b.material.userData.thermalUniforms.uKelvin.value = b.kelvin;
        b.material.userData.thermalUniforms.uShockCracks.value = b.shockCracks;
        b.material.userData.thermalUniforms.uTime.value = this.elapsed;

        if (b.mode === 'freeze-walkable') {
          b.platform.active = b.kelvin < 340;
          b.mesh.position.y = THREE.MathUtils.damp(b.mesh.position.y, b.kelvin < 340 ? -0.35 : -0.7, 5, dt);
        }

        if (b.collapsed) {
          b.collapseVelY -= 18 * dt;
          b.mesh.position.y += b.collapseVelY * dt;
          b.mesh.rotation.x += dt * 0.45;
          if (b.mesh.position.y < -18) {
            b.mesh.visible = false;
          }
        }
      }
    }

    // 4. Update Enemies (Real-time Kelvin Phase Physics & AI)
    let activeEnemies = 0;
    let bossK: number | null = null;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      activeEnemies++;
      if (enemy.isBoss) bossK = enemy.kelvin;

      // Ambient thermal recovery unless frozen into brittle crystal
      const ambientTarget = enemy.archetype === 'plasma-sentinel' ? 1320 : spec.ambientKelvin + 180;
      const recoveryRate = enemy.kelvin < 95 ? 0.08 : 0.35;
      enemy.kelvin = THREE.MathUtils.lerp(enemy.kelvin, ambientTarget, recoveryRate * dt);

      // Update thermal uniforms on all parts
      for (const m of enemy.materials) {
        m.userData.thermalUniforms.uKelvin.value = enemy.kelvin;
        m.userData.thermalUniforms.uShockCracks.value = enemy.shockCracks;
        m.userData.thermalUniforms.uTime.value = this.elapsed;
      }

      // Physical thermal mobility: Frozen (<95K) slows dramatically; Overheated (>1200K) melts/stumbles
      const mobility =
        enemy.kelvin < 95
          ? 0.08
          : enemy.kelvin > 1350
          ? 0.55
          : 1.0 * this.timeDilation;

      // Rotate superconducting rings
      enemy.ringMeshes.forEach((ring, idx) => {
        ring.rotation.z += dt * (1.4 + idx * 0.7) * mobility;
        ring.rotation.y += dt * 0.9 * mobility;
      });

      // Chase / orbit player when in first-person
      if (this.cameraMode === 'first-person') {
        _v1.copy(this.playerPos).sub(enemy.position);
        _v1.y = 0;
        const dist = _v1.length();
        if (dist > 0.1) _v1.normalize();

        const moveSpeed = (enemy.isBoss ? 3.2 : 4.2) * mobility;
        if (dist > (enemy.isBoss ? 6.5 : 3.2)) {
          enemy.position.addScaledVector(_v1, moveSpeed * dt);
        }
        enemy.position.addScaledVector(enemy.velocity, dt);
        enemy.velocity.multiplyScalar(0.88);

        enemy.group.lookAt(this.playerPos.x, enemy.position.y, this.playerPos.z);

        // Close-range thermal hazard
        enemy.attackCooldown -= dt * mobility;
        if (dist < (enemy.isBoss ? 5.2 : 2.9) && enemy.attackCooldown <= 0 && enemy.kelvin > 150) {
          enemy.attackCooldown = 1.8;
          this.suitKelvin = Math.min(620, this.suitKelvin + 65);
          this.integrity = Math.max(0.08, this.integrity - 0.14);
          this.audio.playThermalShock(0.7);
        }
      }

      const hoverOffset = enemy.hoverHeight > 0 ? enemy.hoverHeight + Math.sin(this.elapsed * 2.4 + enemy.phaseAngle) * 0.35 : 0;
      enemy.group.position.set(enemy.position.x, enemy.position.y + hoverOffset, enemy.position.z);
    }

    // 5. Update Shatter Shards, Plasma Waves & Steam Plumes
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life += dt;
      s.velocity.y -= 19.6 * dt;
      s.mesh.position.addScaledVector(s.velocity, dt);
      s.mesh.rotation.x += s.rotVel.x * dt;
      s.mesh.rotation.y += s.rotVel.y * dt;
      if (s.mesh.position.y < 0.15) {
        s.mesh.position.y = 0.15;
        s.velocity.y *= -0.42;
        s.velocity.x *= 0.72;
        s.velocity.z *= 0.72;
      }
      if (s.life >= s.maxLife) {
        this.scene.remove(s.mesh);
        this.shards.splice(i, 1);
      }
    }

    for (let i = this.plasmaWaves.length - 1; i >= 0; i--) {
      const w = this.plasmaWaves[i];
      w.life -= dt;
      w.radius += dt * 36;
      const scale = w.radius;
      w.mesh.scale.set(scale, scale, 1);
      (w.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, w.life * 1.6);
      if (w.life <= 0) {
        this.scene.remove(w.mesh);
        w.mesh.geometry.dispose();
        (w.mesh.material as THREE.Material).dispose();
        this.plasmaWaves.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(1 + p.life * 2.2);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.45 * (1 - p.life / p.maxLife));
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }

    // 6. Drive Diegetic Armament & Acoustic Physics
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    this.armament.update(
      dt,
      this.elapsed,
      horizSpeed,
      this.heliumReserve,
      this.siphonHeatCharge,
      this.suitKelvin,
      isSiphoning,
      isSprayingCryo
    );

    const combatTension = activeEnemies > 0 ? 0.5 + (this.siphonHeatCharge * 0.5) : 0.1;
    this.audio.updateThermodynamics(
      spec.ambientKelvin,
      combatTension,
      isSiphoning || isSprayingCryo ? 1.0 : 0.0
    );

    if (this.elapsed - this.lastTelemetryPush > 0.06) {
      this.lastTelemetryPush = this.elapsed;
      this.onTelemetry({
        suitKelvin: this.suitKelvin,
        heliumReserve: this.heliumReserve,
        siphonHeatCharge: this.siphonHeatCharge,
        integrity: this.integrity,
        meissnerActive: this.meissnerActive,
        timeDilation: this.timeDilation,
        ambientKelvin: spec.ambientKelvin,
        enemiesRemaining: activeEnemies,
        bossKelvin: bossK,
        shatteredCount: this.shatteredCount,
        isPointerLocked: this.isPointerLocked,
      });
    }
  }

  private pushTelemetry(): void {
    const spec = ARENAS.find((a) => a.id === this.currentArenaId) ?? ARENAS[0];
    const boss = this.enemies.find((e) => e.isBoss && e.alive);
    this.onTelemetry({
      suitKelvin: this.suitKelvin,
      heliumReserve: this.heliumReserve,
      siphonHeatCharge: this.siphonHeatCharge,
      integrity: this.integrity,
      meissnerActive: this.meissnerActive,
      timeDilation: this.timeDilation,
      ambientKelvin: spec.ambientKelvin,
      enemiesRemaining: this.enemies.filter((e) => e.alive).length,
      bossKelvin: boss ? boss.kelvin : null,
      shatteredCount: this.shatteredCount,
      isPointerLocked: this.isPointerLocked,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.audio.dispose();
    this.textures.dispose();
    this.orbitControls.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
