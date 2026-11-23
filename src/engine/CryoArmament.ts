import * as THREE from 'three';
import type { ProceduralTextureSet } from './ProceduralTextures';

/**
 * Diegetic First-Person Cryogenic Armament:
 * - Right Hand: The Kelvin Sabre (10-part titanium & copper-capillary blade with vacuum glass helium tube)
 * - Left Hand: The Entropy Siphon Gauntlet (9-part gauntlet with 6 copper radiator fins indicating absorbed heat)
 */
export class CryoArmament {
  public readonly root = new THREE.Group();
  public readonly sabrePivot = new THREE.Group();
  public readonly gauntletPivot = new THREE.Group();

  private heliumFluidMesh: THREE.Mesh;
  private heliumFluidMat: THREE.MeshStandardMaterial;
  private bladeCoreMat: THREE.MeshStandardMaterial;
  private radiatorMats: THREE.MeshStandardMaterial[] = [];
  private siphonNozzleMat: THREE.MeshStandardMaterial;
  private bubbleGroup = new THREE.Group();
  private bubbles: THREE.Mesh[] = [];

  private swingTimer = 0;
  private plasmaWaveTimer = 0;
  private recoilZ = 0;
  private bobPhase = 0;

  constructor(textures: ProceduralTextureSet, isSoftwareGl: boolean) {
    // 1. RIGHT HAND: THE KELVIN SABRE
    this.sabrePivot.position.set(0.36, -0.32, -0.58);
    this.sabrePivot.rotation.set(0.24, -0.22, 0.14);

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x8ea0b2,
      map: textures.titaniumAlbedo,
      bumpMap: textures.titaniumBump,
      bumpScale: 0.012,
      metalness: 0.88,
      roughness: 0.24,
    });

    const darkGripMat = new THREE.MeshStandardMaterial({
      color: 0x1b222b,
      metalness: 0.35,
      roughness: 0.72,
    });

    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xb8683a,
      map: textures.copperCapillary,
      bumpMap: textures.copperBump,
      bumpScale: 0.015,
      metalness: 0.92,
      roughness: 0.28,
    });

    // Sculpted ergonomic hilt grip
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.22, 14), darkGripMat);
    this.sabrePivot.add(grip);

    // Pommel counterweight cap
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.045, 12), titaniumMat);
    pommel.position.y = -0.13;
    this.sabrePivot.add(pommel);

    // Machined superconducting crossguard
    const guardShape = new THREE.Shape();
    guardShape.moveTo(-0.085, -0.018);
    guardShape.lineTo(0.085, -0.018);
    guardShape.lineTo(0.06, 0.024);
    guardShape.lineTo(-0.06, 0.024);
    guardShape.closePath();
    const guardGeo = new THREE.ExtrudeGeometry(guardShape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    guardGeo.center();
    const guard = new THREE.Mesh(guardGeo, titaniumMat);
    guard.position.y = 0.12;
    this.sabrePivot.add(guard);

    // Beveled titanium cutting blade
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.018, 0);
    bladeShape.lineTo(0.022, 0);
    bladeShape.lineTo(0.016, 0.56);
    bladeShape.lineTo(0.0, 0.66);
    bladeShape.lineTo(-0.012, 0.54);
    bladeShape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.003,
      bevelSegments: 2,
    });
    bladeGeo.translate(0, 0.13, -0.004);
    const blade = new THREE.Mesh(bladeGeo, titaniumMat);
    this.sabrePivot.add(blade);

    // Central capillary cryo-fuller core (glows cyan when chilled, orange during plasma wave)
    this.bladeCoreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.4,
      metalness: 0.5,
      roughness: 0.2,
    });
    const bladeCore = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.52, 0.018), this.bladeCoreMat);
    bladeCore.position.set(0.002, 0.42, 0);
    this.sabrePivot.add(bladeCore);

    // Twin copper micro-capillary tubes feeding liquid helium into blade spine
    for (const side of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.022, 0.04, 0.02),
        new THREE.Vector3(side * 0.036, 0.12, 0.028),
        new THREE.Vector3(side * 0.016, 0.34, 0.014),
      ]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.004, 8, false), copperMat);
      this.sabrePivot.add(tube);
    }

    // Diegetic Vacuum Glass Tube Reservoir mounted on the Kelvin Sabre spine
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      roughness: 0.06,
      metalness: 0.0,
      transmission: isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: isSoftwareGl ? 0.32 : 0.92,
      ior: 1.52,
      depthWrite: false,
    });
    const glassTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.17, 14), glassMat);
    glassTube.position.set(-0.026, 0.22, 0.025);
    glassTube.renderOrder = 6;
    this.sabrePivot.add(glassTube);

    // Inner Liquid Helium Column inside glass tube (diegetic coolant reserve!)
    this.heliumFluidMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.35,
      roughness: 0.15,
      metalness: 0.1,
    });
    this.heliumFluidMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.15, 12),
      this.heliumFluidMat
    );
    this.heliumFluidMesh.position.set(-0.026, 0.22, 0.025);
    this.sabrePivot.add(this.heliumFluidMesh);

    // Boiling / freezing helium micro-bubbles inside the vacuum tube
    this.bubbleGroup.position.set(-0.026, 0.15, 0.025);
    const bubbleGeo = new THREE.SphereGeometry(0.0032, 6, 6);
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(bubbleGeo, this.heliumFluidMat);
      b.position.set((Math.random() - 0.5) * 0.01, Math.random() * 0.13, (Math.random() - 0.5) * 0.01);
      b.userData = { speed: 0.12 + Math.random() * 0.18, offset: Math.random() * 10 };
      this.bubbles.push(b);
      this.bubbleGroup.add(b);
    }
    this.sabrePivot.add(this.bubbleGroup);

    // 2. LEFT HAND: THE ENTROPY SIPHON GAUNTLET
    this.gauntletPivot.position.set(-0.36, -0.34, -0.54);
    this.gauntletPivot.rotation.set(0.18, 0.26, -0.1);

    // Forearm titanium chassis
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.28, 12), titaniumMat);
    forearm.rotation.x = Math.PI * 0.48;
    forearm.position.set(0, -0.02, 0.08);
    this.gauntletPivot.add(forearm);

    // Articulated knuckle & palm shroud
    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.068, 0.14), darkGripMat);
    shroud.position.set(0, 0.0, -0.06);
    this.gauntletPivot.add(shroud);

    // Cryogenic Vacuum Siphon Nozzle & Induction Ring
    this.siphonNozzleMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.25,
    });
    const nozzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.009, 10, 20), copperMat);
    nozzleRing.position.set(0, 0.005, -0.14);
    this.gauntletPivot.add(nozzleRing);

    const nozzleCore = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.05, 12), this.siphonNozzleMat);
    nozzleCore.rotation.x = Math.PI / 2;
    nozzleCore.position.set(0, 0.005, -0.145);
    this.gauntletPivot.add(nozzleCore);

    // 6 Diegetic Copper Radiator Fins (shift dark copper -> incandescent orange as heat energy fills)
    for (let i = 0; i < 6; i++) {
      const finMat = new THREE.MeshStandardMaterial({
        color: 0x6b3a24,
        emissive: 0x000000,
        emissiveIntensity: 0,
        metalness: 0.9,
        roughness: 0.32,
      });
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.046, 0.16), finMat);
      const angleOffset = (i - 2.5) * 0.024;
      fin.position.set(angleOffset, 0.048 - Math.abs(i - 2.5) * 0.004, 0.01);
      fin.rotation.z = -(i - 2.5) * 0.14;
      this.radiatorMats.push(finMat);
      this.gauntletPivot.add(fin);
    }

    this.root.add(this.sabrePivot);
    this.root.add(this.gauntletPivot);
  }

  public triggerSabreSwing(): void {
    this.swingTimer = 0.28;
  }

  public triggerPlasmaWave(): void {
    this.plasmaWaveTimer = 0.45;
  }

  public triggerRecoil(): void {
    this.recoilZ = 0.06;
  }

  /**
   * Drives all diegetic weapon telemetry directly from thermodynamic state (zero 2D bars!).
   */
  public update(
    dt: number,
    elapsed: number,
    moveSpeed: number,
    heliumReserve: number,
    siphonHeatCharge: number,
    suitKelvin: number,
    isSiphoning: boolean,
    isSprayingCryo: boolean
  ): void {
    this.bobPhase += dt * (2.2 + moveSpeed * 0.85);
    const bobX = Math.cos(this.bobPhase * 0.5) * 0.007 * Math.min(1.4, moveSpeed * 0.12 + 0.15);
    const bobY = Math.sin(this.bobPhase) * 0.009 * Math.min(1.4, moveSpeed * 0.12 + 0.15);

    this.recoilZ = THREE.MathUtils.damp(this.recoilZ, 0, 12, dt);

    // Sabre swing & plasma discharge kinematics
    let swingRotX = 0;
    let swingRotY = 0;
    let swingRotZ = 0;
    let swingPosX = 0;
    if (this.swingTimer > 0) {
      this.swingTimer = Math.max(0, this.swingTimer - dt);
      const p = 1 - this.swingTimer / 0.28;
      const arc = Math.sin(p * Math.PI);
      swingRotX = -arc * 1.15;
      swingRotY = arc * 0.95;
      swingRotZ = arc * 0.85;
      swingPosX = -arc * 0.24;
    }

    if (this.plasmaWaveTimer > 0) {
      this.plasmaWaveTimer = Math.max(0, this.plasmaWaveTimer - dt);
      const p = 1 - this.plasmaWaveTimer / 0.45;
      const sweep = Math.sin(p * Math.PI);
      swingRotX = -0.75 * sweep;
      swingRotY = (p - 0.5) * 1.6;
      swingRotZ = 1.25 * sweep;
    }

    this.sabrePivot.position.set(0.36 + bobX + swingPosX, -0.32 + bobY, -0.58 + this.recoilZ);
    this.sabrePivot.rotation.set(0.24 + swingRotX, -0.22 + swingRotY, 0.14 + swingRotZ);

    // Gauntlet kinematics (raises forward when siphoning heat or blasting liquid helium)
    const activeExtend = isSiphoning || isSprayingCryo ? 1 : 0;
    const targetZ = -0.54 - activeExtend * 0.11 + this.recoilZ;
    const targetY = -0.34 + bobY * 0.9 + activeExtend * 0.05;
    this.gauntletPivot.position.set(-0.36 - bobX, targetY, THREE.MathUtils.damp(this.gauntletPivot.position.z, targetZ, 14, dt));
    const jitter = isSiphoning || isSprayingCryo ? Math.sin(elapsed * 48) * 0.008 : 0;
    this.gauntletPivot.rotation.set(0.18 + jitter, 0.26 - activeExtend * 0.14, -0.1);

    // Diegetic 1: Helium Vacuum Tube column & boiling/freezing state
    const clampedHe = Math.max(0.05, Math.min(1, heliumReserve));
    this.heliumFluidMesh.scale.y = clampedHe;
    this.heliumFluidMesh.position.y = 0.145 + clampedHe * 0.075;

    // If suit/tube is superheated, helium boils vigorously; if near 0 K, turns calm sapphire BEC glow
    const boilRate = suitKelvin > 360 ? 2.8 : suitKelvin < 40 ? 0.25 : 1.0;
    this.heliumFluidMat.color.setHex(heliumReserve < 0.2 ? 0x94a3b8 : suitKelvin < 50 ? 0xa5f3fc : 0x38bdf8);
    this.heliumFluidMat.emissiveIntensity = 0.5 + clampedHe * 1.3;

    for (const b of this.bubbles) {
      const speed = (b.userData.speed as number) * boilRate;
      b.position.y = ((elapsed * speed + (b.userData.offset as number)) % (0.13 * clampedHe));
      b.visible = heliumReserve > 0.08;
    }

    // Diegetic 2: Kelvin Sabre capillary fuller color (Plasma Wave vents hot orange energy)
    if (this.plasmaWaveTimer > 0) {
      this.bladeCoreMat.color.setHex(0xff7b29);
      this.bladeCoreMat.emissive.setHex(0xff4500);
      this.bladeCoreMat.emissiveIntensity = 3.2;
    } else {
      this.bladeCoreMat.color.setHex(0x38bdf8);
      this.bladeCoreMat.emissive.setHex(0x0284c7);
      this.bladeCoreMat.emissiveIntensity = 0.7 + clampedHe * 1.1;
    }

    // Diegetic 3: Entropy Siphon Gauntlet's 6 Copper Radiator Fins
    // Shift smoothly from dark oxidized copper -> bronze -> incandescent orange at burst limit!
    for (let i = 0; i < this.radiatorMats.length; i++) {
      const threshold = i / this.radiatorMats.length;
      const finFill = Math.max(0, Math.min(1, (siphonHeatCharge - threshold) * 4.5));
      const mat = this.radiatorMats[i];
      // Base color: dark copper (0x5c2e1c) -> bright orange (0xff7b1c)
      mat.color.setRGB(
        THREE.MathUtils.lerp(0.36, 1.0, finFill),
        THREE.MathUtils.lerp(0.18, 0.46, finFill),
        THREE.MathUtils.lerp(0.11, 0.08, finFill)
      );
      mat.emissive.setRGB(1.0 * finFill, 0.36 * finFill, 0.03 * finFill);
      const pulse = siphonHeatCharge > 0.85 ? 0.35 * Math.sin(elapsed * 14 + i) : 0;
      mat.emissiveIntensity = finFill * 2.4 + Math.max(0, pulse);
    }

    // Siphon nozzle feedback
    if (isSiphoning) {
      this.siphonNozzleMat.color.setHex(0xff8c2a);
      this.siphonNozzleMat.emissive.setHex(0xff5500);
      this.siphonNozzleMat.emissiveIntensity = 2.6;
    } else if (isSprayingCryo) {
      this.siphonNozzleMat.color.setHex(0xa5f3fc);
      this.siphonNozzleMat.emissive.setHex(0x38bdf8);
      this.siphonNozzleMat.emissiveIntensity = 2.6;
    } else {
      this.siphonNozzleMat.color.setHex(0x38bdf8);
      this.siphonNozzleMat.emissive.setHex(0x0284c7);
      this.siphonNozzleMat.emissiveIntensity = 0.65;
    }
  }
}
