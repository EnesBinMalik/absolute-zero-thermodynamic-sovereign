/**
 * CryoAudioEngine
 * Physical-modeling cryogenic & industrial acoustic engine using Web Audio API.
 * Modulates acoustic propagation speed and metallic clarity dynamically with Kelvin temperature.
 */
export class CryoAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tempFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private valveNoiseNode: AudioBufferSourceNode | null = null;
  private valveGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private currentKelvin = 273;
  private initialized = false;

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.42;

    // Temperature-responsive acoustic filter: colder = sharper, higher metallic Q & clarity
    this.tempFilter = this.ctx.createBiquadFilter();
    this.tempFilter.type = 'lowpass';
    this.tempFilter.frequency.value = 6500;
    this.tempFilter.Q.value = 0.9;

    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;

    this.tempFilter.connect(compressor);
    compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Precompute 2-second noise buffer for cryogenic steam, tank valves, and ice crack transients
    const sampleRate = this.ctx.sampleRate;
    const len = sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.18) * 0.45;
    }

    // Continuous subtle bowed string / industrial cryogenic pressure drone
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.0;
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 260;
    this.droneGain.connect(droneFilter);
    droneFilter.connect(this.tempFilter);

    const baseFreqs = [55.0, 82.41, 110.0]; // A1, E2, A2 heavy string resonance
    baseFreqs.forEach((f, idx) => {
      if (!this.ctx || !this.droneGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = idx === 1 ? 'sawtooth' : 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (idx - 1) * 6;
      const subGain = this.ctx.createGain();
      subGain.gain.value = idx === 1 ? 0.18 : 0.35;
      osc.connect(subGain);
      subGain.connect(this.droneGain);
      osc.start();
      this.droneOscs.push(osc);
    });

    // Continuous cryogenic pressure hiss bed (controlled dynamically by siphon/cryo stream)
    this.valveGain = this.ctx.createGain();
    this.valveGain.gain.value = 0.0;
    const valveBp = this.ctx.createBiquadFilter();
    valveBp.type = 'bandpass';
    valveBp.frequency.value = 2400;
    valveBp.Q.value = 1.6;
    this.valveNoiseNode = this.ctx.createBufferSource();
    this.valveNoiseNode.buffer = this.noiseBuffer;
    this.valveNoiseNode.loop = true;
    this.valveNoiseNode.connect(valveBp);
    valveBp.connect(this.valveGain);
    this.valveGain.connect(this.tempFilter);
    this.valveNoiseNode.start();

    this.initialized = true;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.42, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Updates acoustic propagation based on ambient/suit Kelvin and combat tension.
   * Near 0 K, acoustic clarity sharpens into crisp metallic glass resonance.
   */
  public updateThermodynamics(ambientKelvin: number, combatTension: number, streamLevel: number): void {
    if (!this.initialized || !this.ctx || !this.tempFilter || !this.droneGain || !this.valveGain) return;
    this.currentKelvin = ambientKelvin;
    const now = this.ctx.currentTime;

    // Cold increases high-frequency metallic Q and transparency; high heat softens/muffles through steam
    const coldFactor = Math.max(0, Math.min(1, 1 - ambientKelvin / 350));
    const cutoff = 2800 + coldFactor * 9500;
    const q = 0.7 + coldFactor * 2.2;
    this.tempFilter.frequency.setTargetAtTime(cutoff, now, 0.12);
    this.tempFilter.Q.setTargetAtTime(q, now, 0.12);

    // Bowed string & industrial tension swell
    const targetDrone = 0.03 + Math.min(0.14, combatTension * 0.12);
    this.droneGain.gain.setTargetAtTime(targetDrone, now, 0.25);

    // Cryogenic valve stream intensity
    this.valveGain.gain.setTargetAtTime(streamLevel * 0.22, now, 0.06);
  }

  /**
   * Deep studio-recorded style copper gong strike (arena entry & boss phase breaks).
   */
  public playCopperGong(intensity = 0.8): void {
    if (!this.initialized || !this.ctx || !this.tempFilter || this.muted) return;
    const now = this.ctx.currentTime;
    const base = 73.42 * (this.currentKelvin < 20 ? 1.04 : 1.0); // D2 fundamental
    const partials = [1.0, 1.48, 2.09, 2.56, 3.18, 4.07];

    partials.forEach((ratio, idx) => {
      if (!this.ctx || !this.tempFilter) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(base * ratio, now);
      // Slight metallic pitch sag on impact
      osc.frequency.exponentialRampToValueAtTime(base * ratio * 0.992, now + 2.4);

      const amp = (0.28 * intensity) / (1 + idx * 0.65);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.015 + idx * 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8 - idx * 0.35);

      osc.connect(gain);
      gain.connect(this.tempFilter);
      osc.start(now);
      osc.stop(now + 4.0);
    });
  }

  /**
   * Glacial ice fracture & brittle crystalline shatter when Kelvin Sabre breaks frozen targets.
   */
  public playCrystalShatter(scale = 1.0): void {
    if (!this.initialized || !this.ctx || !this.tempFilter || this.muted) return;
    const now = this.ctx.currentTime;

    // 1. Sharp ice crack transient burst
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2600;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.55 * scale, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      src.connect(hp);
      hp.connect(g);
      g.connect(this.tempFilter);
      src.start(now, Math.random() * 0.5, 0.18);
    }

    // 2. Crystalline shard resonance modes
    const shardCount = 6;
    for (let i = 0; i < shardCount; i++) {
      const delay = i * 0.018 + Math.random() * 0.014;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      const freq = 1400 + Math.random() * 2600 + (this.currentKelvin < 80 ? 500 : 0);
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + delay + 0.24);

      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.linearRampToValueAtTime(0.14 * scale, now + delay + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.28);

      osc.connect(g);
      g.connect(this.tempFilter);
      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    }
  }

  /**
   * Boiling liquid nitrogen meeting superheated metal (Leidenfrost sizzle & crackle).
   */
  public playThermalShock(intensity = 0.9): void {
    if (!this.initialized || !this.ctx || !this.tempFilter || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3600, now);
    bp.frequency.exponentialRampToValueAtTime(900, now + 0.65);
    bp.Q.value = 1.4;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.45 * intensity, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.tempFilter);
    src.start(now, Math.random() * 0.4, 0.75);

    // Metallic thermal contraction snap
    const snap = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(420, now);
    snap.frequency.exponentialRampToValueAtTime(110, now + 0.14);
    sg.gain.setValueAtTime(0.28 * intensity, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    snap.connect(sg);
    sg.connect(this.tempFilter);
    snap.start(now);
    snap.stop(now + 0.16);
  }

  /**
   * Kelvin Sabre titanium swing & superheated plasma wave burst.
   */
  public playSabreSwing(isPlasmaWave: boolean): void {
    if (!this.initialized || !this.ctx || !this.tempFilter || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(isPlasmaWave ? 700 : 1200, now);
    bp.frequency.exponentialRampToValueAtTime(isPlasmaWave ? 2800 : 420, now + 0.22);
    bp.Q.value = isPlasmaWave ? 2.5 : 1.8;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(isPlasmaWave ? 0.52 : 0.28, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + (isPlasmaWave ? 0.45 : 0.24));

    src.connect(bp);
    bp.connect(g);
    g.connect(this.tempFilter);
    src.start(now, 0, isPlasmaWave ? 0.48 : 0.25);

    if (isPlasmaWave) {
      const sub = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(140, now);
      sub.frequency.exponentialRampToValueAtTime(48, now + 0.42);
      sg.gain.setValueAtTime(0.26, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      sub.connect(sg);
      sg.connect(this.tempFilter);
      sub.start(now);
      sub.stop(now + 0.46);
    }
  }

  /**
   * Meissner Flux-Pinning magnetic dash / lock thump.
   */
  public playMeissnerFlux(): void {
    if (!this.initialized || !this.ctx || !this.tempFilter || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.22);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g);
    g.connect(this.tempFilter);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Manual valve spin click & pressure release (Katman 4).
   */
  public playValveRelease(): void {
    if (!this.initialized || !this.ctx || !this.tempFilter || this.muted) return;
    const now = this.ctx.currentTime;
    [0, 0.08, 0.16].forEach((offset, i) => {
      if (!this.ctx || !this.tempFilter) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320 + i * 110, now + offset);
      g.gain.setValueAtTime(0.12, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);
      osc.connect(g);
      g.connect(this.tempFilter);
      osc.start(now + offset);
      osc.stop(now + offset + 0.06);
    });
    this.playThermalShock(1.0);
  }

  public dispose(): void {
    this.droneOscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        // ignore
      }
    });
    if (this.valveNoiseNode) {
      try {
        this.valveNoiseNode.stop();
      } catch {
        // ignore
      }
    }
    if (this.ctx) {
      void this.ctx.close();
    }
    this.initialized = false;
  }
}
