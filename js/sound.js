// ============================================================
// WebAudio によるかんたん効果音(外部ファイル不要)
// ============================================================

const Sound = (() => {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, { type = 'square', volume = 0.08, delay = 0, slide = 0 } = {}) {
    const c = ensureCtx();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  return {
    toggle() { muted = !muted; return muted; },
    select()  { tone(880, 0.07, { type: 'square' }); },
    confirm() { tone(660, 0.06); tone(990, 0.1, { delay: 0.07 }); },
    hit()     { tone(200, 0.15, { type: 'sawtooth', volume: 0.12, slide: -120 }); },
    superHit(){ tone(150, 0.2, { type: 'sawtooth', volume: 0.15, slide: -100 });
                tone(100, 0.25, { type: 'square', volume: 0.1, delay: 0.08, slide: -60 }); },
    weakHit() { tone(300, 0.08, { type: 'triangle', volume: 0.07 }); },
    miss()    { tone(500, 0.15, { type: 'sine', volume: 0.06, slide: -300 }); },
    faint()   { tone(400, 0.5, { type: 'sawtooth', volume: 0.1, slide: -350 }); },
    victory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'square', delay: i * 0.14, volume: 0.09 })); },
    lose()    { [392, 330, 262].forEach((f, i) => tone(f, 0.3, { type: 'triangle', delay: i * 0.25, volume: 0.08 })); },
  };
})();
