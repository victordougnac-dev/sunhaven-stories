import type { WeatherState } from './types';

export type SurfaceType = 'asphalt' | 'sand' | 'grass' | 'wood' | 'interior';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private outdoorFilter: BiquadFilterNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private rainGain: GainNode | null = null;
  private oceanGain: GainNode | null = null;
  private windGain: GainNode | null = null;

  private volume = 0.7;
  private muted = false;
  private isInside = false;
  private unlocked = false;
  private stepTimer = 0;

  unlock(): void {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      this.outdoorFilter = this.ctx.createBiquadFilter();
      this.outdoorFilter.type = 'lowpass';
      this.outdoorFilter.frequency.value = 18000;

      this.outdoorFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.setupAmbienceNodes();
      this.setupEngineNodes();
      this.unlocked = true;
    } catch {
      // Web Audio unavailable
    }
  }

  private createNoiseBuffer(seconds = 2): AudioBuffer | null {
    if (!this.ctx) return null;
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private setupAmbienceNodes(): void {
    if (!this.ctx || !this.outdoorFilter) return;
    const noiseBuf = this.createNoiseBuffer(3);
    if (!noiseBuf) return;

    // Ocean surf ambience
    const oceanSrc = this.ctx.createBufferSource();
    oceanSrc.buffer = noiseBuf;
    oceanSrc.loop = true;
    const oceanFilter = this.ctx.createBiquadFilter();
    oceanFilter.type = 'lowpass';
    oceanFilter.frequency.value = 420;
    this.oceanGain = this.ctx.createGain();
    this.oceanGain.gain.value = 0.0;
    oceanSrc.connect(oceanFilter);
    oceanFilter.connect(this.oceanGain);
    this.oceanGain.connect(this.outdoorFilter);
    oceanSrc.start();

    // Rain ambience
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = noiseBuf;
    rainSrc.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1800;
    rainFilter.Q.value = 0.6;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.outdoorFilter);
    rainSrc.start();

    // Wind / high altitude ambience
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 520;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.015;
    windSrc.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.outdoorFilter);
    windSrc.start();
  }

  private setupEngineNodes(): void {
    if (!this.ctx || !this.masterGain) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;

    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.value = 27.5;

    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 280;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;

    this.engineOsc.connect(engineFilter);
    this.engineSubOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
    this.engineSubOsc.start();
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.setVolume(this.volume);
  }

  setInsideBuilding(inside: boolean): void {
    this.isInside = inside;
    if (this.outdoorFilter && this.ctx) {
      this.outdoorFilter.frequency.setTargetAtTime(inside ? 650 : 18000, this.ctx.currentTime, 0.15);
    }
  }

  updateAmbience(
    dt: number,
    distanceToOcean: number,
    altitude: number,
    weather: WeatherState,
    inVehicle: boolean,
    vehicleSpeedNorm: number,
    isAircraft: boolean
  ): void {
    if (!this.ctx || !this.unlocked) return;
    const t = this.ctx.currentTime;

    // Ocean waves fade out inland
    if (this.oceanGain) {
      const prox = Math.max(0, 1 - distanceToOcean / 190);
      const wavePulse = 0.65 + 0.35 * Math.sin(t * 0.7);
      const target = (this.isInside ? 0.01 : 0.11) * prox * wavePulse;
      this.oceanGain.gain.setTargetAtTime(target, t, 0.2);
    }

    // Rain audio
    if (this.rainGain) {
      const rLevel = weather === 'storm' ? 0.14 : weather === 'rain' ? 0.085 : 0;
      this.rainGain.gain.setTargetAtTime(this.isInside ? rLevel * 0.25 : rLevel, t, 0.25);
    }

    // Wind audio
    if (this.windGain) {
      const altFactor = Math.min(1, Math.max(0, altitude / 90));
      const baseWind = weather === 'storm' ? 0.07 : 0.015;
      this.windGain.gain.setTargetAtTime(baseWind + altFactor * 0.08, t, 0.2);
    }

    // Engine hum
    if (this.engineGain && this.engineOsc && this.engineSubOsc) {
      if (inVehicle) {
        const baseFreq = isAircraft ? 78 : 48;
        const maxFreq = isAircraft ? 195 : 155;
        const freq = baseFreq + vehicleSpeedNorm * (maxFreq - baseFreq);
        this.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
        this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, t, 0.08);
        this.engineGain.gain.setTargetAtTime(0.055 + vehicleSpeedNorm * 0.05, t, 0.08);
      } else {
        this.engineGain.gain.setTargetAtTime(0, t, 0.1);
      }
    }

    void dt;
  }

  updateFootsteps(dt: number, moveSpeed: number, grounded: boolean, surface: SurfaceType): void {
    if (!grounded || moveSpeed < 0.8 || !this.ctx || !this.unlocked) {
      this.stepTimer = 0.12;
      return;
    }
    const interval = moveSpeed > 7 ? 0.28 : 0.42;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = interval;
      this.playFootstep(surface);
    }
  }

  private playFootstep(surface: SurfaceType): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const freqMap: Record<SurfaceType, number> = {
      asphalt: 135,
      sand: 90,
      grass: 105,
      wood: 165,
      interior: 185,
    };
    osc.type = surface === 'sand' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freqMap[surface] + Math.random() * 20, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.07);
    g.gain.setValueAtTime(surface === 'sand' ? 0.04 : 0.065, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  playHorn(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    for (const freq of [340, 425]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  playThunder(): void {
    if (!this.ctx || !this.masterGain) return;
    const buf = this.createNoiseBuffer(1.8);
    if (!buf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(190, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.7);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(t);
  }

  playClick(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.05);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.065);
  }

  playChime(isSecret = false): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const notes = isSecret ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    notes.forEach((n, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      const start = t + i * 0.085;
      osc.frequency.setValueAtTime(n, start);
      g.gain.setValueAtTime(0.09, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  playShutter(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.05);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }
}
