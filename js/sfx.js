export class SfxPlayer {
  constructor() {
    this._ctx = null;
    this._volume = 0.3;
    this._footstepTimer = 0;
  }

  _ensure() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  setVolume(v) {
    this._volume = v;
  }

  footstep() {
    const ctx = this._ensure();
    const now = ctx.currentTime;
    if (now - this._footstepTimer < 0.25) return;
    this._footstepTimer = now;

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    noise.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this._volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.05);
  }

  pickup() {
    const ctx = this._ensure();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this._volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  success() {
    const ctx = this._ensure();
    const now = ctx.currentTime;

    [0, 0.1, 0.2].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const freq = i === 2 ? 880 : 660;
      osc.frequency.setValueAtTime(freq, now + offset);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this._volume * 0.25, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    });
  }

  doorOpen() {
    const ctx = this._ensure();
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * 80) * (1 - t / 0.4);
    }
    noise.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this._volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);
    filter.Q.setValueAtTime(2, now);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.4);
  }

  terminalBeep() {
    const ctx = this._ensure();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this._volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  alarm() {
    const ctx = this._ensure();
    const now = ctx.currentTime;

    for (let i = 0; i < 6; i++) {
      const t = now + i * 0.4;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(i % 2 === 0 ? 220 : 180, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this._volume * 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  powerUp() {
    const ctx = this._ensure();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this._volume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }
}
