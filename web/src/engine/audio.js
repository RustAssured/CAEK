/* CAEK — geluid uit oscillatoren. Geen bestanden, geen download, wel juice. */

export class Geluid {
  constructor() {
    this.ctx = null;
    this.aan = true;
    this.bus = null;
  }

  #start() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 0.22;
    this.bus.connect(this.ctx.destination);
    return this.ctx;
  }

  ontgrendel() {
    const ctx = this.#start();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  zetAan(aan) {
    this.aan = aan;
    if (this.bus) this.bus.gain.value = aan ? 0.22 : 0;
  }

  /** Eén toon. hz mag een array zijn voor een glijdende noot. */
  toon(hz, duur = 0.12, vorm = 'triangle', volume = 1) {
    if (!this.aan) return;
    const ctx = this.#start();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = vorm;
    const reeks = Array.isArray(hz) ? hz : [hz];
    osc.frequency.setValueAtTime(reeks[0], t);
    reeks.slice(1).forEach((f, i) => osc.frequency.exponentialRampToValueAtTime(f, t + duur * ((i + 1) / (reeks.length - 1))));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.6 * volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    osc.connect(gain).connect(this.bus);
    osc.start(t);
    osc.stop(t + duur + 0.02);
  }

  ruisje(duur = 0.2, volume = 0.5, hoogdoorlaat = 700) {
    if (!this.aan) return;
    const ctx = this.#start();
    if (!ctx || ctx.state !== 'running') return;
    const n = Math.floor(ctx.sampleRate * duur);
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const bron = ctx.createBufferSource();
    bron.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hoogdoorlaat;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    bron.connect(filter).connect(gain).connect(this.bus);
    bron.start();
  }

  sprong() { this.toon([340, 620], 0.13, 'square', 0.5); }
  land() { this.ruisje(0.09, 0.22, 400); }
  pak() { this.toon([700, 1180], 0.1, 'triangle', 0.6); }
  fout() { this.toon([260, 140], 0.24, 'sawtooth', 0.45); }
  waarde() { [0, 0.08, 0.17].forEach((d, i) => setTimeout(() => this.toon([660 * (1 + i * 0.26)], 0.16, 'triangle', 0.55), d * 1000)); }
  ping() { this.toon([1320, 1320], 0.5, 'sine', 0.7); setTimeout(() => this.toon([1980], 0.6, 'sine', 0.4), 60); }
  plop() { this.toon([220, 90], 0.18, 'sine', 0.6); }
  klik() { this.toon(520, 0.05, 'square', 0.35); }
  deur() { this.toon([180, 260], 0.3, 'sawtooth', 0.3); }
  super() {
    [0, 0.1, 0.2, 0.32].forEach((d, i) => setTimeout(() => this.toon([220 * (i + 1), 440 * (i + 1)], 0.3, 'sawtooth', 0.5), d * 1000));
    setTimeout(() => this.ruisje(0.8, 0.5, 200), 320);
  }
  kaboom() { this.ruisje(0.45, 0.7, 120); this.toon([140, 40], 0.4, 'square', 0.5); }
  snurk() { this.toon([120, 70], 0.6, 'sawtooth', 0.3); }
}
