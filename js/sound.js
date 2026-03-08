// ============================================================
// sound.js — Web Audio API sound effects
// ============================================================

const Sound = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
  }

  function play(frequency, duration, type = 'square', volume = 0.15) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch (e) { /* ignore audio errors */ }
  }

  return {
    coin() {
      play(880, 0.1); setTimeout(() => play(1320, 0.15), 80);
    },
    feed() {
      play(523, 0.08); setTimeout(() => play(659, 0.08), 60);
      setTimeout(() => play(784, 0.12), 120);
    },
    water() {
      play(440, 0.1, 'sine'); setTimeout(() => play(660, 0.15, 'sine'), 100);
    },
    heart() {
      play(660, 0.1); setTimeout(() => play(880, 0.1), 80);
      setTimeout(() => play(1100, 0.2), 160);
    },
    death() {
      play(440, 0.2, 'sawtooth', 0.1);
      setTimeout(() => play(330, 0.2, 'sawtooth', 0.1), 200);
      setTimeout(() => play(220, 0.4, 'sawtooth', 0.08), 400);
    },
    buy() {
      play(440, 0.08); setTimeout(() => play(550, 0.08), 60);
      setTimeout(() => play(660, 0.08), 120);
      setTimeout(() => play(880, 0.15), 180);
    },
    sell() {
      play(880, 0.1); setTimeout(() => play(1100, 0.1), 80);
      setTimeout(() => play(1320, 0.2), 160);
    },
    correct() {
      play(523, 0.1); setTimeout(() => play(784, 0.15), 100);
    },
    wrong() {
      play(300, 0.2, 'sawtooth', 0.1);
    },
    click() {
      play(800, 0.05, 'square', 0.08);
    },
    breed() {
      play(440, 0.15); setTimeout(() => play(550, 0.15), 150);
      setTimeout(() => play(660, 0.15), 300);
      setTimeout(() => play(880, 0.3), 450);
    },
    baby() {
      play(880, 0.08); setTimeout(() => play(1100, 0.08), 60);
      setTimeout(() => play(1320, 0.08), 120);
      setTimeout(() => play(1760, 0.2), 180);
    }
  };
})();
