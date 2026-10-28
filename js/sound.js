/**
 * CRYPT OF THE SOVEREIGN - SOUND & MUSIC SYNTHESIZER
 * Moteur audio et dungeon-synth 100% procédural via Web Audio API (0 asset audio externe).
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.masterVolume = 0.8;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.8;

    this.currentTrack = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.bpm = 110;
    this.isMuted = false;

    // Gammes musicales Dungeon-Synth (Mineur harmonique & dorien)
    this.scales = {
      hub: [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25], // Am naturel doux
      explore: [146.83, 174.61, 196.00, 220.00, 261.63, 293.66], // Dm sombre
      combat: [110, 130.81, 146.83, 164.81, 174.61, 220, 261.63], // Am martial
      boss: [82.41, 98.00, 110.00, 123.47, 130.81, 164.81, 196.00] // Em dramatique
    };
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolumes(master, music, sfx) {
    this.masterVolume = master;
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterVolume, now);
      this.musicGain.gain.setValueAtTime(this.musicVolume, now);
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
    }
  }

  // --- SÉQUENCEUR DUNGEON-SYNTH / CHIPTUNE ---
  playMusic(trackName) {
    this.init();
    this.resume();
    if (this.currentTrack === trackName) return;
    this.stopMusic();

    this.currentTrack = trackName;
    this.musicStep = 0;

    let stepInterval = 250;
    if (trackName === 'combat') {
      this.bpm = 135;
      stepInterval = (60 / this.bpm) * 1000 * 0.5;
    } else if (trackName === 'boss') {
      this.bpm = 125;
      stepInterval = (60 / this.bpm) * 1000 * 0.5;
    } else if (trackName === 'hub') {
      this.bpm = 90;
      stepInterval = (60 / this.bpm) * 1000;
    } else {
      this.bpm = 100;
      stepInterval = (60 / this.bpm) * 1000 * 0.75;
    }

    this.musicTimer = setInterval(() => {
      this.stepSequencer();
    }, stepInterval);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTrack = null;
  }

  stepSequencer() {
    if (!this.ctx || this.masterVolume <= 0 || this.musicVolume <= 0) return;

    const scale = this.scales[this.currentTrack] || this.scales.explore;
    const step = this.musicStep % 16;
    const now = this.ctx.currentTime;

    // Basse / Drone
    if (step % 4 === 0) {
      const rootFreq = scale[0] * 0.5;
      this.playSynthNote(rootFreq, 0.4, 'triangle', 0.15, this.musicGain);
    }

    // Mélodie Dungeon-Synth
    let noteIdx = -1;
    if (this.currentTrack === 'hub') {
      const hubPattern = [0, 2, 4, 2, 5, 4, 2, 1, 0, 3, 4, 3, 2, 1, 0, -1];
      noteIdx = hubPattern[step];
    } else if (this.currentTrack === 'explore') {
      const explorePattern = [0, -1, 2, -1, 3, 2, -1, 1, 0, -1, 4, 3, -1, 2, 1, -1];
      noteIdx = explorePattern[step];
    } else if (this.currentTrack === 'combat') {
      const combatPattern = [0, 2, 3, 2, 4, 3, 2, 1, 0, 3, 5, 4, 3, 2, 4, 1];
      noteIdx = combatPattern[step];
      // Percussion charleston chiptune
      if (step % 2 === 1) {
        this.playNoiseNote(0.04, 0.05, this.musicGain);
      }
    } else if (this.currentTrack === 'boss') {
      const bossPattern = [0, 0, 3, 4, 2, 2, 5, 6, 1, 1, 4, 3, 0, 2, 1, 0];
      noteIdx = bossPattern[step];
      // Pilonnage de basse
      this.playSynthNote(scale[0] * 0.25, 0.2, 'sawtooth', 0.12, this.musicGain);
    }

    if (noteIdx >= 0 && noteIdx < scale.length) {
      const freq = scale[noteIdx];
      const type = (this.currentTrack === 'combat' || this.currentTrack === 'boss') ? 'sawtooth' : 'sine';
      this.playSynthNote(freq, 0.22, type, 0.1, this.musicGain);
    }

    this.musicStep++;
  }

  playSynthNote(freq, duration, type = 'sine', gainVal = 0.2, destination = null) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(destination || this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playNoiseNote(duration, gainVal = 0.1, destination = null) {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination || this.sfxGain);

      noise.start();
    } catch (e) {}
  }

  // --- EFFETS SONORES (SFX) ---
  playSwordSlash() {
    this.init(); this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
    this.playNoiseNote(0.08, 0.1);
  }

  playMagicCast() {
    this.init(); this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playDaggerSlash() {
    this.init(); this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playRoll() {
    this.init(); this.resume();
    this.playNoiseNote(0.18, 0.2);
  }

  playHit() {
    this.init(); this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playEnemyDeath() {
    this.init(); this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playChestOpen() {
    this.init(); this.resume();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => {
        this.playSynthNote(freq, 0.25, 'sine', 0.25);
      }, i * 70);
    });
  }

  playGoldPickup() {
    this.init(); this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.05);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playSoulPickup() {
    this.init(); this.resume();
    this.playSynthNote(440, 0.3, 'sine', 0.25);
    setTimeout(() => this.playSynthNote(659.25, 0.35, 'triangle', 0.2), 60);
  }

  playPotion() {
    this.init(); this.resume();
    [300, 420, 560].forEach((f, i) => {
      setTimeout(() => this.playSynthNote(f, 0.08, 'sine', 0.18), i * 50);
    });
  }

  playLevelUp() {
    this.init(); this.resume();
    [392.00, 523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => this.playSynthNote(f, 0.3, 'triangle', 0.3), i * 90);
    });
  }

  playTrap() {
    this.init(); this.resume();
    this.playHit();
    this.playNoiseNote(0.12, 0.25);
  }

  playBossRoar() {
    this.init(); this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.linearRampToValueAtTime(45, now + 0.6);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  playGameOver() {
    this.init(); this.resume();
    [329.63, 293.66, 261.63, 220.00, 164.81].forEach((f, i) => {
      setTimeout(() => this.playSynthNote(f, 0.45, 'sawtooth', 0.25), i * 160);
    });
  }

  playVictory() {
    this.init(); this.resume();
    [261.63, 329.63, 392.00, 523.25, 659.25, 783.99].forEach((f, i) => {
      setTimeout(() => this.playSynthNote(f, 0.4, 'triangle', 0.3), i * 120);
    });
  }
}

window.SoundEngine = SoundEngine;
