/* ==========================================================================
   ROYAL TEXAS HOLD'EM - ADVANCED MODULAR CASINO ENGINE
   Architecture & Modules:
   - FeatureManager: Dynamic, reversible feature toggles
   - Zero System Emojis: 100% custom vector illustrations & metallic SVG assets
   - Persistent Top Nav Bar & Animated Side Transit Drawer
   - Dual Wallet Live Display (Poker Savings Vault vs Mini-Games Wallet)
   - Permadeath on $0 bankroll with permanent save deletion & quick-rebuy
   - Cash Out & Cumulative Poker Savings Vault (infinite accumulation)
   - Short Deck (6-Plus) Hold'em (36 cards, Flush > Full House, Trips > Straight, A-6-7-8-9)
   - Omaha High (4-Card) Combinatorial Evaluation (2 hole + 3 board = 60 combos)
   - Streamlined European Roulette & Solar Flare 3-Reel Slots (custom SVG symbols)
   - Corrected Side Pot Mechanics (side pot ONLY on short-stack all-in; equal all-ins = 1 pot)
   - Exclusive Room: Dynamic 5s bot replacement with inherited chips & 15s turn auto-fold
   - Hidden Nightmare AI: Disguised Championship mode with ~55-60% equity bias & 20% bluff engine
   ========================================================================== */

class FeatureManager {
  static STORAGE_KEY = 'royal_poker_feature_flags_v1';
  static DEFAULT_FLAGS = {
    shortDeck: true,
    omaha: true,
    slots: true,
    roulette: true,
    sidePotRule: true,
    solarFlareTheme: true,
    exclusiveRoom: true,
    permadeath: true
  };

  static getFlags() {
    try {
      const data = localStorage.getItem(FeatureManager.STORAGE_KEY);
      if (data) {
        return { ...FeatureManager.DEFAULT_FLAGS, ...JSON.parse(data) };
      }
    } catch (e) {}
    return { ...FeatureManager.DEFAULT_FLAGS };
  }

  static isEnabled(featureKey) {
    const flags = FeatureManager.getFlags();
    return flags[featureKey] !== false;
  }

  static setFlag(featureKey, enabled) {
    const flags = FeatureManager.getFlags();
    flags[featureKey] = !!enabled;
    try {
      localStorage.setItem(FeatureManager.STORAGE_KEY, JSON.stringify(flags));
    } catch (e) {}
    return flags;
  }

  static resetToDefaults() {
    try {
      localStorage.setItem(FeatureManager.STORAGE_KEY, JSON.stringify(FeatureManager.DEFAULT_FLAGS));
    } catch (e) {}
    return { ...FeatureManager.DEFAULT_FLAGS };
  }
}

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('royal_poker_sound_muted') !== 'true';
    this.volume = parseFloat(localStorage.getItem('royal_poker_volume') || '1.0');
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.boostGain = null;
    this.slotSpinInterval = null;
    this.rouletteTimers = [];
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('royal_poker_volume', this.volume.toString());
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime);
    }
  }

  init() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime);

        // Hardware Dynamics Compressor to prevent clipping while allowing loud output
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(3.5, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.08, this.ctx.currentTime);

        // Make-Up Boost Gain Node: Crystal-clear, noticeably louder audio volume (v1.0325 Sound Fix 2.0)
        this.boostGain = this.ctx.createGain();
        this.boostGain.gain.setValueAtTime(1.95, this.ctx.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.boostGain);
        this.boostGain.connect(this.ctx.destination);
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {}
  }

  toggle() {
    this.init();
    this.enabled = !this.enabled;
    localStorage.setItem('royal_poker_sound_muted', (!this.enabled).toString());
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime);
    }
    if (this.enabled) {
      this.playToggleChime();
    }
    return this.enabled;
  }

  _connectOut(node) {
    if (this.masterGain) {
      node.connect(this.masterGain);
    } else if (this.ctx) {
      node.connect(this.ctx.destination);
    }
  }

  // 1. Melodic Audio Activation Chime
  playToggleChime() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, t); // D5
      gain1.gain.setValueAtTime(0.65, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc1.connect(gain1);
      this._connectOut(gain1);
      osc1.start(t);
      osc1.stop(t + 0.16);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, t + 0.08); // A5
      gain2.gain.setValueAtTime(0.70, t + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc2.connect(gain2);
      this._connectOut(gain2);
      osc2.start(t + 0.08);
      osc2.stop(t + 0.35);
    } catch (e) {}
  }

  // 2. Tactile UI Click (Crisp, Punchy & Louder)
  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(450, t + 0.04);
      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      this._connectOut(gain);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }

  // 3. Ceramic Poker Chip Clatter (Dual Clink, Rich Resonance)
  playChip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(2600, t);
      osc1.frequency.exponentialRampToValueAtTime(900, t + 0.055);
      gain1.gain.setValueAtTime(0.72, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      osc1.connect(gain1);
      this._connectOut(gain1);
      osc1.start(t);
      osc1.stop(t + 0.055);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1900, t + 0.015);
      osc2.frequency.exponentialRampToValueAtTime(750, t + 0.065);
      gain2.gain.setValueAtTime(0.55, t + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      osc2.connect(gain2);
      this._connectOut(gain2);
      osc2.start(t + 0.015);
      osc2.stop(t + 0.065);
    } catch (e) {}
  }

  // 4. Playing Card Deal & Flick on Felt Table
  playCard(pitchVariation = 1.0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620 * pitchVariation, t);
      osc.frequency.exponentialRampToValueAtTime(160 * pitchVariation, t + 0.095);
      gain.gain.setValueAtTime(0.68, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
      osc.connect(gain);
      this._connectOut(gain);
      osc.start(t);
      osc.stop(t + 0.095);
    } catch (e) {}
  }

  // 4B. Deal Hand Cards Sequence (Flick, Flick, Flick...)
  playCardDealingSequence(count = 2, interval = 75) {
    if (!this.enabled) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const pitch = 0.95 + (i % 5) * 0.05;
        this.playCard(pitch);
      }, i * interval);
    }
  }

  // 5. Card Shuffle Riffle (6 Rapid Riffles)
  playShuffle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      for (let i = 0; i < 6; i++) {
        const time = this.ctx.currentTime + i * 0.032;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420 + Math.random() * 220, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + 0.035);
        gain.gain.setValueAtTime(0.55, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        osc.connect(gain);
        this._connectOut(gain);
        osc.start(time);
        osc.stop(time + 0.035);
      }
    } catch (e) {}
  }

  // 6. Poker Table Double Knock (Check / Tap on Oak Wood)
  playCheck() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Knock 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(220, t);
      osc1.frequency.exponentialRampToValueAtTime(80, t + 0.045);
      gain1.gain.setValueAtTime(0.70, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      osc1.connect(gain1);
      this._connectOut(gain1);
      osc1.start(t);
      osc1.stop(t + 0.045);

      // Knock 2 (45ms later)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(180, t + 0.045);
      osc2.frequency.exponentialRampToValueAtTime(70, t + 0.09);
      gain2.gain.setValueAtTime(0.65, t + 0.045);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc2.connect(gain2);
      this._connectOut(gain2);
      osc2.start(t + 0.045);
      osc2.stop(t + 0.09);
    } catch (e) {}
  }

  // 7. Fold (Soft Card Slide Off Felt)
  playFold() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.14);
      gain.gain.setValueAtTime(0.60, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      this._connectOut(gain);
      osc.start(t);
      osc.stop(t + 0.14);
    } catch (e) {}
  }

  // 8. All-In Dramatic Resonant Chord & Sub-Bass
  playAllIn() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const freqs = [70, 140, 210, 280];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.45);
        gain.gain.setValueAtTime(0.75, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        this._connectOut(gain);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch (e) {}
  }

  // 9. Hand Win / Showdown Victory Arpeggio (C5, E5, G5, C6)
  playWin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const time = this.ctx.currentTime + idx * 0.085;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.75, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        osc.connect(gain);
        this._connectOut(gain);
        osc.start(time);
        osc.stop(time + 0.35);
      });
    } catch (e) {}
  }

  // 9B. Loss / Fold / Busted Tone (Descending Minor Harmonics)
  playLose() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [293.66, 233.08, 196.00]; // D4 -> Bb3 -> G3
      notes.forEach((freq, idx) => {
        const time = this.ctx.currentTime + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.52, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
        osc.connect(gain);
        this._connectOut(gain);
        osc.start(time);
        osc.stop(time + 0.28);
      });
    } catch (e) {}
  }

  // 10. Grand Jackpot Fanfare
  playJackpot() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        const time = this.ctx.currentTime + idx * 0.075;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.80, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.40);
        osc.connect(gain);
        this._connectOut(gain);
        osc.start(time);
        osc.stop(time + 0.40);
      });
    } catch (e) {}
  }

  // 11. Slot Machine Lever Pull Clunk & Spring
  playSlotPull() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.16);
      gain.gain.setValueAtTime(0.72, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      this._connectOut(gain);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {}
  }

  // 12. Continuous Slot Machine Reel Spinning Whirr & Ratchet Ticker
  startSlotSpinWhirr() {
    if (!this.enabled) return;
    this.stopSlotSpinWhirr();
    this.init();
    if (!this.ctx) return;
    try {
      let tickCount = 0;
      this.slotSpinInterval = setInterval(() => {
        if (!this.enabled || !this.ctx) return;
        try {
          const t = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = (tickCount % 2 === 0) ? 'triangle' : 'square';
          osc.frequency.setValueAtTime((tickCount % 2 === 0 ? 680 : 520) + Math.random() * 80, t);
          osc.frequency.exponentialRampToValueAtTime(220, t + 0.035);
          gain.gain.setValueAtTime(0.42, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
          osc.connect(gain);
          this._connectOut(gain);
          osc.start(t);
          osc.stop(t + 0.035);
          tickCount++;
        } catch (e) {}
      }, 42);
    } catch (e) {}
  }

  stopSlotSpinWhirr() {
    if (this.slotSpinInterval) {
      clearInterval(this.slotSpinInterval);
      this.slotSpinInterval = null;
    }
  }

  playSlotSpin() {
    this.startSlotSpinWhirr();
  }

  // 13. Slot Machine Reel Brake Stop (Deep Heavy Metallic Thud)
  playSlotStop(reelNum = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const baseFreq = 1800 - (reelNum - 1) * 350;

      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, t);
      osc1.frequency.exponentialRampToValueAtTime(200, t + 0.055);
      gain1.gain.setValueAtTime(0.75, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      osc1.connect(gain1);
      this._connectOut(gain1);
      osc1.start(t);
      osc1.stop(t + 0.055);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(110 - (reelNum * 15), t);
      osc2.frequency.exponentialRampToValueAtTime(45, t + 0.07);
      gain2.gain.setValueAtTime(0.65, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc2.connect(gain2);
      this._connectOut(gain2);
      osc2.start(t);
      osc2.stop(t + 0.07);
    } catch (e) {}
  }

  // 14. Roulette Ball Whirring On Track (Launch Whoosh)
  playRouletteSpin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const time = t + i * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2200 - i * 150, time);
        osc.frequency.exponentialRampToValueAtTime(750, time + 0.04);
        gain.gain.setValueAtTime(0.55, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        osc.connect(gain);
        this._connectOut(gain);
        osc.start(time);
        osc.stop(time + 0.04);
      }
    } catch (e) {}
  }

  // 14B. Natural Decelerating Roulette Ball Fret Clicks
  startRouletteBallDeceleration(durationMs = 3800) {
    if (!this.enabled) return;
    this.clearRouletteTimers();
    // Schedule natural decelerating clicks matching the wheel easing
    const clickDelays = [
      80, 160, 240, 320, 410, 500, 600, 710, 830, 960, 1100,
      1260, 1430, 1620, 1830, 2060, 2310, 2580, 2880, 3200, 3540
    ];
    clickDelays.forEach(delay => {
      if (delay < durationMs) {
        const timer = setTimeout(() => {
          this.playRouletteClick();
        }, delay);
        this.rouletteTimers.push(timer);
      }
    });
  }

  clearRouletteTimers() {
    this.rouletteTimers.forEach(t => clearTimeout(t));
    this.rouletteTimers = [];
  }

  // 15. Roulette Ball Pocket Click (Brass Fret)
  playRouletteClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, t);
      osc.frequency.exponentialRampToValueAtTime(850, t + 0.022);
      gain.gain.setValueAtTime(0.60, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
      osc.connect(gain);
      this._connectOut(gain);
      osc.start(t);
      osc.stop(t + 0.022);
    } catch (e) {}
  }

  // 16. Roulette Ball Pocket Landing Drop (Solid Wooden Pocket Thud)
  playRouletteDrop() {
    if (!this.enabled) return;
    this.clearRouletteTimers();
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(320, t);
      osc1.frequency.exponentialRampToValueAtTime(75, t + 0.085);
      gain1.gain.setValueAtTime(0.75, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
      osc1.connect(gain1);
      this._connectOut(gain1);
      osc1.start(t);
      osc1.stop(t + 0.085);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1400, t + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(500, t + 0.05);
      gain2.gain.setValueAtTime(0.55, t + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc2.connect(gain2);
      this._connectOut(gain2);
      osc2.start(t + 0.02);
      osc2.stop(t + 0.05);
    } catch (e) {}
  }

  // 17. Craps Wooden Cup Shake (3 Rapid Wooden Shakes)
  playDiceCupShake() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      for (let i = 0; i < 3; i++) {
        const time = this.ctx.currentTime + i * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(650 + Math.random() * 200, time);
        osc.frequency.exponentialRampToValueAtTime(240, time + 0.04);
        gain.gain.setValueAtTime(0.60, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        osc.connect(gain);
        this._connectOut(gain);
        osc.start(time);
        osc.stop(time + 0.04);
      }
    } catch (e) {}
  }

  // 17B. Craps Dice Tumbling Rattle
  playDiceTumble() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const time = t + i * 0.048;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(900 + Math.random() * 450, time);
        osc.frequency.exponentialRampToValueAtTime(210, time + 0.04);
        gain.gain.setValueAtTime(0.65, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        osc.connect(gain);
        this._connectOut(gain);
        osc.start(time);
        osc.stop(time + 0.04);
      }
    } catch (e) {}
  }

  // 17C. Craps Dice Table Landing (Thump & Settle)
  playDiceLand() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(260, t);
      osc1.frequency.exponentialRampToValueAtTime(65, t + 0.08);
      gain1.gain.setValueAtTime(0.75, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc1.connect(gain1);
      this._connectOut(gain1);
      osc1.start(t);
      osc1.stop(t + 0.08);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1500, t + 0.018);
      osc2.frequency.exponentialRampToValueAtTime(620, t + 0.06);
      gain2.gain.setValueAtTime(0.55, t + 0.018);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc2.connect(gain2);
      this._connectOut(gain2);
      osc2.start(t + 0.018);
      osc2.stop(t + 0.06);
    } catch (e) {}
  }

  playDiceRoll() {
    this.playDiceTumble();
  }

  // 18. Cashout / Vault Metallic Coin Cascade (8 Coins)
  playCashout() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const coinFreqs = [2400, 2800, 3200, 3700, 4200, 4700, 5200, 5800];
      coinFreqs.forEach((freq, idx) => {
        const time = this.ctx.currentTime + idx * 0.045;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.70, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
        osc.connect(gain);
        this._connectOut(gain);
        osc.start(time);
        osc.stop(time + 0.14);
      });
    } catch (e) {}
  }

  // 19. Alert / Notification Ding
  playAlert() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(960, t);
      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      this._connectOut(gain);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {}
  }
}

const sounds = new SoundManager();
window.addEventListener('touchstart', () => sounds.init(), { once: true, passive: true });
window.addEventListener('pointerdown', () => sounds.init(), { once: true, passive: true });

// Global Tactile Audio Listener: Crisp click/chip sound on every button, chip, tab, and card click
document.addEventListener('click', (e) => {
  const target = e.target.closest('button, .menu-btn, .action-btn, .chip-selector-btn, .modal-close, .rules-tab, .save-slot-card, .casino-tab-btn, .craps-bet-spot, .roulette-cell, .craps-preset-btn, .update-pill, .daily-allowance-btn, .allowance-btn, .diff-card, .variant-card, .theme-card, .wager-btn, .gold-cashout-btn, .gold-cashout-pill, .hub-launch-btn');
  if (target) {
    sounds.init();
    if (target.classList.contains('chip-selector-btn') || target.classList.contains('craps-bet-spot') || target.classList.contains('roulette-cell') || target.classList.contains('craps-preset-btn') || target.classList.contains('wager-btn')) {
      sounds.playChip();
    } else if (target.id === 'btn-fold') {
      sounds.playFold();
    } else if (target.id === 'btn-allin') {
      sounds.playAllIn();
    } else if (target.id === 'btn-check') {
      sounds.playCheck();
    } else {
      sounds.playClick();
    }
  }
}, { capture: true, passive: true });


// ============================================================================
// 2. CARDS & DECK
// ============================================================================
const SUITS = [
  { name: 'Spades', symbol: '♠', color: 'black' },
  { name: 'Hearts', symbol: '♥', color: 'red' },
  { name: 'Diamonds', symbol: '♦', color: 'red' },
  { name: 'Clubs', symbol: '♣', color: 'black' }
];

const RANK_LABELS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

const RANK_FULL = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
  8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
};

class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
  }
  get label() { return RANK_LABELS[this.rank]; }
}

class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }
  reset(variant = 'texas') {
    this.cards = [];
    const minRank = (variant === 'shortDeck') ? 6 : 2;
    for (const suit of SUITS) {
      for (let r = minRank; r <= 14; r++) {
        this.cards.push(new Card(r, suit));
      }
    }
    this.shuffle();
  }
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  deal() { return this.cards.pop(); }
}

// ============================================================================
// 3. 7-CARD COMBINATORIAL HAND EVALUATOR
// ============================================================================
const HAND_RANKS = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9
};

function getCombinations(arr, k) {
  const result = [];
  function backtrack(start, current) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

function evaluate5Cards(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit.name);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  let straightHigh = 0;
  const uniqueRanks = [...new Set(ranks)];

  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    } else if (
      uniqueRanks[0] === 14 &&
      uniqueRanks[1] === 5 &&
      uniqueRanks[2] === 4 &&
      uniqueRanks[3] === 3 &&
      uniqueRanks[4] === 2
    ) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const countEntries = Object.entries(counts).map(([r, c]) => ({ rank: Number(r), count: c }));
  countEntries.sort((a, b) => b.count - a.count || b.rank - a.rank);

  const freqs = countEntries.map(e => e.count);
  const orderedRanks = countEntries.map(e => e.rank);

  if (isFlush && isStraight) {
    const desc = straightHigh === 14 ? 'Royal Flush' : `Straight Flush, ${RANK_FULL[straightHigh]} High`;
    return { category: HAND_RANKS.STRAIGHT_FLUSH, score: [straightHigh], desc };
  }
  if (freqs[0] === 4) {
    return { category: HAND_RANKS.FOUR_OF_A_KIND, score: [orderedRanks[0], orderedRanks[1]], desc: `Four of a Kind, ${RANK_FULL[orderedRanks[0]]}s` };
  }
  if (freqs[0] === 3 && freqs[1] === 2) {
    return { category: HAND_RANKS.FULL_HOUSE, score: [orderedRanks[0], orderedRanks[1]], desc: `Full House, ${RANK_FULL[orderedRanks[0]]}s full of ${RANK_FULL[orderedRanks[1]]}s` };
  }
  if (isFlush) {
    return { category: HAND_RANKS.FLUSH, score: ranks, desc: `Flush, ${RANK_FULL[ranks[0]]} High` };
  }
  if (isStraight) {
    return { category: HAND_RANKS.STRAIGHT, score: [straightHigh], desc: `Straight, ${RANK_FULL[straightHigh]} High` };
  }
  if (freqs[0] === 3) {
    return { category: HAND_RANKS.THREE_OF_A_KIND, score: orderedRanks, desc: `Three of a Kind, ${RANK_FULL[orderedRanks[0]]}s` };
  }
  if (freqs[0] === 2 && freqs[1] === 2) {
    return { category: HAND_RANKS.TWO_PAIR, score: orderedRanks, desc: `Two Pair, ${RANK_FULL[orderedRanks[0]]}s and ${RANK_FULL[orderedRanks[1]]}s` };
  }
  if (freqs[0] === 2) {
    return { category: HAND_RANKS.ONE_PAIR, score: orderedRanks, desc: `Pair of ${RANK_FULL[orderedRanks[0]]}s` };
  }
  return { category: HAND_RANKS.HIGH_CARD, score: ranks, desc: `High Card, ${RANK_FULL[ranks[0]]}` };
}

function compareScores(evalA, evalB) {
  if (evalA.category !== evalB.category) return evalA.category - evalB.category;
  for (let i = 0; i < Math.max(evalA.score.length, evalB.score.length); i++) {
    const sA = evalA.score[i] || 0;
    const sB = evalB.score[i] || 0;
    if (sA !== sB) return sA - sB;
  }
  return 0;
}


const SHORT_DECK_HAND_RANKS = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 5, // In Short Deck: Trips beats Straight!
  FULL_HOUSE: 6,
  FLUSH: 7,           // In Short Deck: Flush beats Full House!
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9
};

function evaluateShortDeck5Cards(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit.name);
  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  let straightHigh = 0;
  const uniqueRanks = [...new Set(ranks)];

  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    } else if (
      uniqueRanks[0] === 14 &&
      uniqueRanks[1] === 9 &&
      uniqueRanks[2] === 8 &&
      uniqueRanks[3] === 7 &&
      uniqueRanks[4] === 6
    ) {
      // Ace plays low for straight in 6-plus: A-6-7-8-9 (9 is straight high)
      isStraight = true;
      straightHigh = 9;
    }
  }

  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const countEntries = Object.entries(counts).map(([r, c]) => ({ rank: Number(r), count: c }));
  countEntries.sort((a, b) => b.count - a.count || b.rank - a.rank);

  const freqs = countEntries.map(e => e.count);
  const orderedRanks = countEntries.map(e => e.rank);

  if (isFlush && isStraight) {
    const desc = straightHigh === 14 ? 'Royal Flush' : `Straight Flush, ${RANK_FULL[straightHigh]} High`;
    return { category: SHORT_DECK_HAND_RANKS.STRAIGHT_FLUSH, score: [straightHigh], desc };
  }
  if (freqs[0] === 4) {
    return { category: SHORT_DECK_HAND_RANKS.FOUR_OF_A_KIND, score: [orderedRanks[0], orderedRanks[1]], desc: `Four of a Kind, ${RANK_FULL[orderedRanks[0]]}s` };
  }
  // In Short Deck: Flush beats Full House!
  if (isFlush) {
    return { category: SHORT_DECK_HAND_RANKS.FLUSH, score: ranks, desc: `Flush, ${RANK_FULL[ranks[0]]} High` };
  }
  if (freqs[0] === 3 && freqs[1] === 2) {
    return { category: SHORT_DECK_HAND_RANKS.FULL_HOUSE, score: [orderedRanks[0], orderedRanks[1]], desc: `Full House, ${RANK_FULL[orderedRanks[0]]}s full of ${RANK_FULL[orderedRanks[1]]}s` };
  }
  // In Short Deck: Three of a Kind beats Straight!
  if (freqs[0] === 3) {
    return { category: SHORT_DECK_HAND_RANKS.THREE_OF_A_KIND, score: orderedRanks, desc: `Three of a Kind, ${RANK_FULL[orderedRanks[0]]}s` };
  }
  if (isStraight) {
    return { category: SHORT_DECK_HAND_RANKS.STRAIGHT, score: [straightHigh], desc: `Straight, ${RANK_FULL[straightHigh]} High` };
  }
  if (freqs[0] === 2 && freqs[1] === 2) {
    return { category: SHORT_DECK_HAND_RANKS.TWO_PAIR, score: orderedRanks, desc: `Two Pair, ${RANK_FULL[orderedRanks[0]]}s and ${RANK_FULL[orderedRanks[1]]}s` };
  }
  if (freqs[0] === 2) {
    return { category: SHORT_DECK_HAND_RANKS.ONE_PAIR, score: orderedRanks, desc: `Pair of ${RANK_FULL[orderedRanks[0]]}s` };
  }
  return { category: SHORT_DECK_HAND_RANKS.HIGH_CARD, score: ranks, desc: `High Card, ${RANK_FULL[ranks[0]]}` };
}

function evaluateOmahaBestHand(holeCards, communityCards) {
  if (communityCards.length < 3) {
    if (holeCards.length >= 2) {
      return { category: HAND_RANKS.HIGH_CARD, desc: `Omaha Hand (${holeCards.length} cards)`, bestCards: holeCards.slice(0, 2) };
    }
    return { category: HAND_RANKS.HIGH_CARD, desc: 'Omaha Starting Hand', bestCards: holeCards };
  }
  // Omaha constraint: Player MUST use exactly 2 hole cards and exactly 3 community cards!
  // Combinations: C(4,2) * C(5,3) = 6 * 10 = 60 combinations
  const holePairs = getCombinations(holeCards, 2);
  const boardTriplets = getCombinations(communityCards, 3);
  let best = null;

  for (const hPair of holePairs) {
    for (const bTrip of boardTriplets) {
      const combo5 = [...hPair, ...bTrip];
      const res = evaluate5Cards(combo5);
      res.bestCards = combo5;
      if (!best || compareScores(res, best) > 0) {
        best = res;
      }
    }
  }
  return best;
}

function evaluateBestHand(holeCards, communityCards, variant = 'texas') {
  if (variant === 'omaha') {
    return evaluateOmahaBestHand(holeCards, communityCards);
  }

  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    if (holeCards.length === 2) {
      if (holeCards[0].rank === holeCards[1].rank) {
        return { category: HAND_RANKS.ONE_PAIR, desc: `Pocket Pair of ${RANK_FULL[holeCards[0].rank]}s`, bestCards: holeCards };
      }
      const high = Math.max(holeCards[0].rank, holeCards[1].rank);
      return { category: HAND_RANKS.HIGH_CARD, desc: `High Card ${RANK_LABELS[high]}`, bestCards: holeCards };
    }
    return { category: HAND_RANKS.HIGH_CARD, desc: 'Starting Hand', bestCards: holeCards };
  }

  const combos = getCombinations(allCards, 5);
  let best = null;
  const evalFn = (variant === 'shortDeck') ? evaluateShortDeck5Cards : evaluate5Cards;

  for (const combo of combos) {
    const res = evalFn(combo);
    res.bestCards = combo;
    if (!best || compareScores(res, best) > 0) {
      best = res;
    }
  }
  return best;
}

function evaluatePreflopTier(holeCards) {
  if (holeCards.length < 2) return 4;
  const [c1, c2] = [...holeCards].sort((a, b) => b.rank - a.rank);
  const r1 = c1.rank, r2 = c2.rank;
  const isPair = (r1 === r2);
  const isSuited = (c1.suit.name === c2.suit.name);

  // Tier 1: Monster (AA, KK, QQ, JJ, AKs)
  if (isPair && r1 >= 11) return 1;
  if (isSuited && r1 === 14 && r2 === 13) return 1;

  // Tier 2: Strong (TT, 99, 88, AKo, AQs, AJs, KQs, AQo)
  if (isPair && r1 >= 8) return 2;
  if (r1 === 14 && r2 >= 12) return 2;
  if (isSuited && r1 === 14 && r2 >= 10) return 2;
  if (isSuited && r1 === 13 && r2 >= 11) return 2;

  // Tier 3: Playable / Speculative (pocket pairs 77-22, suited connectors, suited Aces)
  if (isPair) return 3;
  if (isSuited && r1 === 14) return 3;
  if (isSuited && (r1 - r2 === 1) && r2 >= 5) return 3;
  if (isSuited && r1 >= 11 && r2 >= 9) return 3;
  if (!isSuited && r1 >= 13 && r2 >= 10) return 3;

  // Tier 4: Trash
  return 4;
}

// ============================================================================
// 4. POT MANAGER: Single Main Pot + Clean All-In Side Pot
// ============================================================================
class SidePot {
  constructor(amount, eligiblePlayers) {
    this.amount = amount;
    this.eligiblePlayers = eligiblePlayers;
  }
}

class PotManager {
  static calculateSidePots(players) {
    const contributors = players.filter(p => p.totalBet > 0);
    if (contributors.length === 0) return [];

    const activeOrAllin = contributors.filter(p => !p.folded);
    if (activeOrAllin.length === 0) {
      const total = contributors.reduce((acc, p) => acc + p.totalBet, 0);
      return [new SidePot(total, [])];
    }

    // Side pots form ONLY when a short-stacked player goes All-In with strictly fewer chips
    // than opponents who contributed more. If all bets are equal or no short-stack all-in exists,
    // exactly 1 Main Pot is created and 0 side pots.
    const maxBet = Math.max(...activeOrAllin.map(p => p.totalBet));
    const hasShortStackAllIn = activeOrAllin.some(p => p.allIn && p.totalBet < maxBet);

    if (!hasShortStackAllIn) {
      const total = contributors.reduce((acc, p) => acc + p.totalBet, 0);
      return [new SidePot(total, activeOrAllin)];
    }

    const betLevels = [...new Set(activeOrAllin.map(p => p.totalBet))].sort((a, b) => a - b);
    const pots = [];
    let prevLevel = 0;

    for (const level of betLevels) {
      let potAmount = 0;
      const tierDiff = level - prevLevel;
      if (tierDiff <= 0) continue;

      const eligible = [];
      for (const p of contributors) {
        if (p.totalBet > prevLevel) {
          const contributedInTier = Math.min(p.totalBet - prevLevel, tierDiff);
          potAmount += contributedInTier;
          if (!p.folded && p.totalBet >= level) {
            eligible.push(p);
          }
        }
      }

      if (potAmount > 0 && eligible.length > 0) {
        pots.push(new SidePot(potAmount, eligible));
      } else if (potAmount > 0 && eligible.length === 0 && pots.length > 0) {
        pots[pots.length - 1].amount += potAmount;
      }

      prevLevel = level;
    }

    const excess = contributors.reduce((acc, p) => acc + Math.max(0, p.totalBet - prevLevel), 0);
    if (excess > 0 && pots.length > 0) {
      pots[pots.length - 1].amount += excess;
    }

    return pots;
  }
}

// ============================================================================
// 5. STATS & DEVICE-ISOLATED SAVE MANAGER
// ============================================================================
class SaveManager {
  static STORAGE_KEY = 'royal_poker_device_saves_v4';
  static GLOBAL_KEY = 'royal_poker_device_stats_v4';

  static getGlobalStats() {
    try {
      const data = localStorage.getItem(SaveManager.GLOBAL_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return {
      totalHands: 0,
      handsWon: 0,
      biggestPot: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestHandDesc: 'High Card',
      bestHandRank: 1,
      onlineHandsPlayed: 0,
      texasHands: 0,
      shortDeckHands: 0,
      omahaHands: 0,
      exclusiveHands: 0,
      slotsSpins: 0,
      rouletteSpins: 0,
      totalCashedOut: 0
    };
  }

  static recordVariantHand(variant) {
    const stats = SaveManager.getGlobalStats();
    if (variant === 'shortDeck') stats.shortDeckHands = (stats.shortDeckHands || 0) + 1;
    else if (variant === 'omaha') stats.omahaHands = (stats.omahaHands || 0) + 1;
    else if (variant === 'exclusive') stats.exclusiveHands = (stats.exclusiveHands || 0) + 1;
    else stats.texasHands = (stats.texasHands || 0) + 1;
    try {
      localStorage.setItem(SaveManager.GLOBAL_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  static recordSlotSpin() {
    const stats = SaveManager.getGlobalStats();
    stats.slotsSpins = (stats.slotsSpins || 0) + 1;
    try {
      localStorage.setItem(SaveManager.GLOBAL_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  static recordRouletteSpin() {
    const stats = SaveManager.getGlobalStats();
    stats.rouletteSpins = (stats.rouletteSpins || 0) + 1;
    try {
      localStorage.setItem(SaveManager.GLOBAL_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  static recordCashout(amount) {
    const stats = SaveManager.getGlobalStats();
    stats.totalCashedOut = (stats.totalCashedOut || 0) + amount;
    try {
      localStorage.setItem(SaveManager.GLOBAL_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  static recordHandStats(won, pot, handEval = null, isOnline = false) {
    const stats = SaveManager.getGlobalStats();
    stats.totalHands = (stats.totalHands || 0) + 1;

    if (won) {
      stats.handsWon = (stats.handsWon || 0) + 1;
      stats.currentStreak = (stats.currentStreak || 0) + 1;
      if (stats.currentStreak > (stats.bestStreak || 0)) {
        stats.bestStreak = stats.currentStreak;
      }
    } else {
      stats.currentStreak = 0;
    }

    if (pot > (stats.biggestPot || 0)) {
      stats.biggestPot = pot;
    }

    if (won && handEval) {
      const cat = handEval.category || 1;
      if (cat > (stats.bestHandRank || 1)) {
        stats.bestHandRank = cat;
        stats.bestHandDesc = handEval.desc ? handEval.desc.split(',')[0] : 'High Card';
      }
    }

    if (isOnline) {
      stats.onlineHandsPlayed = (stats.onlineHandsPlayed || 0) + 1;
    }

    try {
      localStorage.setItem(SaveManager.GLOBAL_KEY, JSON.stringify(stats));
    } catch (e) {}
    return stats;
  }

  static getSaves() {
    try {
      const data = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return { slot_1: null, slot_2: null, slot_3: null, slot_4: null };
  }

  static getAllSaves() {
    return SaveManager.getSaves();
  }

  static getSave(slotId) {
    const saves = SaveManager.getSaves();
    return saves[`slot_${slotId}`] || null;
  }

  static saveSlot(slotId, data) {
    const saves = SaveManager.getSaves();
    saves[`slot_${slotId}`] = {
      ...data,
      slotId,
      lastSaved: Date.now()
    };
    try {
      localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(saves));
    } catch (e) {}
  }

  static deleteSlot(slotId) {
    const saves = SaveManager.getSaves();
    saves[`slot_${slotId}`] = null;
    try {
      localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(saves));
    } catch (e) {}
  }
}

// ============================================================================
// 5B. DAILY BANKROLL ALLOWANCE & MINI-GAME ECONOMY MANAGER
// ============================================================================
class EconomyManager {
  static MINIGAME_STORAGE_KEY = 'royal_poker_minigame_wallet_v2';
  static POKER_ALLOWANCE_KEY = 'royal_poker_daily_allowance_v2';
  static CUMULATIVE_SAVINGS_KEY = 'royal_poker_cumulative_savings_v1';
  static GLOBAL_POKER_CLAIM_KEY = 'royal_poker_global_poker_claim_v1';
  static POKER_CYCLE_MS = 3 * 60 * 60 * 1000; // 3-hour Poker Savings allowance cycle
  static MINIGAME_CYCLE_MS = 30 * 60 * 1000;   // 30-minute Mini-Games Free Dollars cycle (v1.0325)
  static CYCLE_MS = 3 * 60 * 60 * 1000;        // Backward-compat alias for Poker

  static getGlobalPokerClaimStatus() {
    let lastClaim = 0;
    try {
      const val = localStorage.getItem(EconomyManager.GLOBAL_POKER_CLAIM_KEY);
      if (val) lastClaim = parseInt(val, 10) || 0;
    } catch (e) {}

    const now = Date.now();
    const elapsed = now - lastClaim;
    if (elapsed >= EconomyManager.POKER_CYCLE_MS || lastClaim === 0) {
      return { canClaim: true, remainingMs: 0, text: 'Ready to Claim!' };
    }
    const remainingMs = EconomyManager.POKER_CYCLE_MS - elapsed;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return {
      canClaim: false,
      remainingMs,
      text: `${pad(hours)}:${pad(mins)}:${pad(secs)}`
    };
  }

  static claimGlobalPokerDaily() {
    const status = EconomyManager.getGlobalPokerClaimStatus();
    if (!status.canClaim) {
      return { success: false, message: `3h cycle active! Next claim in ${status.text}` };
    }
    const newSavings = EconomyManager.addCumulativeSavings(5000);
    try {
      localStorage.setItem(EconomyManager.GLOBAL_POKER_CLAIM_KEY, Date.now().toString());
    } catch (e) {}
    return { success: true, newVaultBalance: newSavings };
  }

  static getCumulativeSavings() {
    try {
      const val = localStorage.getItem(EconomyManager.CUMULATIVE_SAVINGS_KEY);
      if (val !== null) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 0) return num;
      }
    } catch (e) {}
    const initial = 1000;
    EconomyManager.saveCumulativeSavings(initial);
    return initial;
  }

  static saveCumulativeSavings(amount) {
    try {
      localStorage.setItem(EconomyManager.CUMULATIVE_SAVINGS_KEY, amount.toString());
    } catch (e) {}
  }

    static deductCumulativeSavings(amount) {
    const cur = EconomyManager.getCumulativeSavings();
    const toDeduct = Math.max(0, Math.floor(amount));
    const next = Math.max(0, cur - toDeduct);
    EconomyManager.saveCumulativeSavings(next);
    return next;
  }

  static addCumulativeSavings(amount) {
    const cur = EconomyManager.getCumulativeSavings();
    const updated = cur + Math.max(0, Math.floor(amount));
    EconomyManager.saveCumulativeSavings(updated);
    return updated;
  }

  static cashOutRunToSavings(slotId, chips) {
    const amt = Math.max(0, Math.floor(chips));
    const newTotal = EconomyManager.addCumulativeSavings(amt);
    SaveManager.recordCashout(amt);
    let slot = SaveManager.getSave(slotId);
    if (slot) {
      slot.chips = 0;
      slot.cashedOut = true;
      SaveManager.saveSlot(slotId, slot);
    }
    return newTotal;
  }

  static getMiniGameWallet() {
    try {
      const data = localStorage.getItem(EconomyManager.MINIGAME_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed.balance === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    // Starting baseline of $1,000 dedicated strictly to mini-game play
    const initial = { balance: 1000, lastClaimTimestamp: 0 };
    EconomyManager.saveMiniGameWallet(initial);
    return initial;
  }

  static saveMiniGameWallet(wallet) {
    try {
      localStorage.setItem(EconomyManager.MINIGAME_STORAGE_KEY, JSON.stringify(wallet));
    } catch (e) {}
  }

  static getMiniGameClaimStatus() {
    const wallet = EconomyManager.getMiniGameWallet();
    const now = Date.now();
    const lastClaim = wallet.lastClaimTimestamp || 0;
    const elapsed = now - lastClaim;
    if (elapsed >= EconomyManager.MINIGAME_CYCLE_MS || lastClaim === 0) {
      return { canClaim: true, remainingMs: 0, text: 'Ready to Claim!' };
    }
    const remainingMs = EconomyManager.MINIGAME_CYCLE_MS - elapsed;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return {
      canClaim: false,
      remainingMs,
      text: `${pad(hours)}:${pad(mins)}:${pad(secs)}`
    };
  }

  static claimMiniGameDaily() {
    const status = EconomyManager.getMiniGameClaimStatus();
    if (!status.canClaim) {
      return { success: false, message: `30m cycle active! Next claim in ${status.text}` };
    }
    const wallet = EconomyManager.getMiniGameWallet();
    wallet.balance += 1000;
    wallet.lastClaimTimestamp = Date.now();
    EconomyManager.saveMiniGameWallet(wallet);
    return { success: true, balance: wallet.balance };
  }

  static getPokerAllowances() {
    try {
      const data = localStorage.getItem(EconomyManager.POKER_ALLOWANCE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return { slot_1: 0, slot_2: 0, slot_3: 0, slot_4: 0 };
  }

  static savePokerAllowances(allowances) {
    try {
      localStorage.setItem(EconomyManager.POKER_ALLOWANCE_KEY, JSON.stringify(allowances));
    } catch (e) {}
  }

  static getSlotPokerClaimStatus(slotId) {
    const allowances = EconomyManager.getPokerAllowances();
    const lastClaim = allowances[`slot_${slotId}`] || 0;
    const now = Date.now();
    const elapsed = now - lastClaim;
    if (elapsed >= EconomyManager.CYCLE_MS || lastClaim === 0) {
      return { canClaim: true, remainingMs: 0, text: 'Ready to Claim!' };
    }
    const remainingMs = EconomyManager.CYCLE_MS - elapsed;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return {
      canClaim: false,
      remainingMs,
      text: `${pad(hours)}:${pad(mins)}:${pad(secs)}`
    };
  }

  static claimPokerDailyForSlot(slotId) {
    const status = EconomyManager.getSlotPokerClaimStatus(slotId);
    if (!status.canClaim) {
      return { success: false, message: `Slot ${slotId} on cooldown! Next claim in ${status.text}` };
    }
    let slot = SaveManager.getSave(slotId);
    const customName = localStorage.getItem('royal_poker_username') || 'High Roller';
    EconomyManager.addCumulativeSavings(5000); // Also feeds into primary global savings vault
    if (slot) {
      slot.chips = (slot.chips || 0) + 5000;
      SaveManager.saveSlot(slotId, slot);
    } else {
      slot = {
        name: customName,
        chips: 5000,
        stage: 1,
        difficulty: 'medium',
        handNumber: 0,
        winRecord: { won: 0, total: 0 }
      };
      SaveManager.saveSlot(slotId, slot);
    }

    const allowances = EconomyManager.getPokerAllowances();
    allowances[`slot_${slotId}`] = Date.now();
    EconomyManager.savePokerAllowances(allowances);
    return { success: true, slotChips: slot.chips };
  }

  static transferFunds(direction, amount) {
    amount = Math.floor(Number(amount));
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Please enter a valid transfer amount.' };
    }
    const wallet = EconomyManager.getMiniGameWallet();
    const bankBalance = EconomyManager.getCumulativeSavings();

    if (direction === 'bank_to_minigame') {
      if (amount > bankBalance) {
        return { success: false, message: `Transfer amount ($${amount.toLocaleString()}) exceeds your Bank Account balance ($${bankBalance.toLocaleString()})!` };
      }
      EconomyManager.deductCumulativeSavings(amount);
      wallet.balance += amount;
      EconomyManager.saveMiniGameWallet(wallet);
      return {
        success: true,
        direction,
        amount,
        newMiniBalance: wallet.balance,
        newBankBalance: EconomyManager.getCumulativeSavings(),
        message: `Successfully withdrew $${amount.toLocaleString()} from Bank Account into Mini-Game Wallet!`
      };
    } else {
      // Default: minigame_to_bank (Deposit casino winnings to permanent bank account)
      if (amount > wallet.balance) {
        return { success: false, message: `Transfer amount ($${amount.toLocaleString()}) exceeds your Mini-Game Wallet balance ($${wallet.balance.toLocaleString()})!` };
      }
      wallet.balance -= amount;
      EconomyManager.saveMiniGameWallet(wallet);
      const newBank = EconomyManager.addCumulativeSavings(amount);
      return {
        success: true,
        direction: 'minigame_to_bank',
        amount,
        newMiniBalance: wallet.balance,
        newBankBalance: newBank,
        message: `Successfully transferred $${amount.toLocaleString()} into your Bank Account!`
      };
    }
  }

  static transferMiniGameToPoker(slotId, amount) {
    return EconomyManager.transferFunds('minigame_to_bank', amount);
  }
}

// ============================================================================

// ============================================================================
// CUSTOM VECTOR GRAPHICS ASSETS (Zero Emojis • Deep Illustrative Renders)
// ============================================================================
const AvatarSVGs = {
  hero: `<svg class="avatar-svg avatar-hero" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#09132c" stroke="#d4af37" stroke-width="2"/>
    <circle cx="24" cy="24" r="18" fill="url(#hero-radial)" stroke="rgba(253, 224, 71, 0.4)" stroke-width="1"/>
    <path d="M14 28 L17 18 L24 23 L31 18 L34 28 Z" fill="url(#hero-gold)" stroke="#fef08a" stroke-width="1.2"/>
    <circle cx="17" cy="18" r="1.8" fill="#fef08a"/>
    <circle cx="24" cy="23" r="1.8" fill="#fef08a"/>
    <circle cx="31" cy="18" r="1.8" fill="#fef08a"/>
    <rect x="15" y="28" width="18" height="4" rx="1.5" fill="#78350f" stroke="#fcd34d" stroke-width="0.8"/>
    <circle cx="20" cy="30" r="1" fill="#ef4444"/>
    <circle cx="24" cy="30" r="1" fill="#38bdf8"/>
    <circle cx="28" cy="30" r="1" fill="#10b981"/>
    <defs>
      <radialGradient id="hero-radial" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#09132c"/>
      </radialGradient>
      <linearGradient id="hero-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#d4af37"/>
        <stop offset="100%" stop-color="#854d0e"/>
      </linearGradient>
    </defs>
  </svg>`,

  viper: `<svg class="avatar-svg avatar-viper" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#061f18" stroke="#10b981" stroke-width="2"/>
    <path d="M24 10 C18 10 14 14 14 20 C14 26 20 27 24 30 C28 33 29 36 26 38 C23 40 18 38 18 38" stroke="url(#viper-grad)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M24 10 L28 14 L24 18 L20 14 Z" fill="#10b981"/>
    <circle cx="22" cy="13" r="1.2" fill="#ef4444"/>
    <circle cx="26" cy="13" r="1.2" fill="#ef4444"/>
    <defs>
      <linearGradient id="viper-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#34d399"/>
        <stop offset="50%" stop-color="#10b981"/>
        <stop offset="100%" stop-color="#047857"/>
      </linearGradient>
    </defs>
  </svg>`,

  atlas: `<svg class="avatar-svg avatar-atlas" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#0d1b2a" stroke="#38bdf8" stroke-width="2"/>
    <path d="M24 11 L35 16 V26 C35 33 24 38 24 38 C24 38 13 33 13 26 V16 Z" fill="url(#atlas-grad)" stroke="#7dd3fc" stroke-width="1.5"/>
    <path d="M24 16 L31 19 V25 C31 30 24 33 24 33 C24 33 17 30 17 25 V19 Z" fill="#0c2440" stroke="#38bdf8" stroke-width="1"/>
    <circle cx="24" cy="24" r="3" fill="#38bdf8"/>
    <defs>
      <linearGradient id="atlas-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
    </defs>
  </svg>`,

  luna: `<svg class="avatar-svg avatar-luna" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#13112b" stroke="#a78bfa" stroke-width="2"/>
    <path d="M28 12 C20 13 15 20 16 28 C17 35 24 39 31 37 C22 36 18 27 22 18 C23 15 26 13 28 12 Z" fill="url(#luna-grad)" stroke="#c4b5fd" stroke-width="1.2"/>
    <circle cx="34" cy="15" r="1.5" fill="#fef08a"/>
    <circle cx="15" cy="18" r="1" fill="#ddd6fe"/>
    <circle cx="33" cy="30" r="1.2" fill="#ddd6fe"/>
    <defs>
      <linearGradient id="luna-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c4b5fd"/>
        <stop offset="50%" stop-color="#8b5cf6"/>
        <stop offset="100%" stop-color="#6d28d9"/>
      </linearGradient>
    </defs>
  </svg>`,

  duke: `<svg class="avatar-svg avatar-duke" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#2d130a" stroke="#f97316" stroke-width="2"/>
    <circle cx="24" cy="24" r="16" fill="url(#duke-grad)" stroke="#fdba74" stroke-width="1.2"/>
    <path d="M16 16 L20 22 L24 17 L28 22 L32 16 L30 27 L18 27 Z" fill="#b45309" stroke="#fef08a" stroke-width="1"/>
    <circle cx="20" cy="24" r="1.5" fill="#fef08a"/>
    <circle cx="28" cy="24" r="1.5" fill="#fef08a"/>
    <path d="M22 28 L24 31 L26 28 Z" fill="#fef08a"/>
    <defs>
      <linearGradient id="duke-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ea580c"/>
        <stop offset="50%" stop-color="#c2410c"/>
        <stop offset="100%" stop-color="#7c2d12"/>
      </linearGradient>
    </defs>
  </svg>`,

  guest: `<svg class="avatar-svg avatar-guest" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/>
    <circle cx="24" cy="18" r="6" fill="#cbd5e1" stroke="#f8fafc" stroke-width="1"/>
    <path d="M14 36 C14 30 18 27 24 27 C30 27 34 30 34 36 Z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="1"/>
  </svg>`,

  bot: `<svg class="avatar-svg avatar-bot" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#1e1b4b" stroke="#6366f1" stroke-width="2"/>
    <rect x="15" y="16" width="18" height="14" rx="3" fill="#312e81" stroke="#818cf8" stroke-width="1.2"/>
    <circle cx="20" cy="22" r="2" fill="#38bdf8"/>
    <circle cx="28" cy="22" r="2" fill="#38bdf8"/>
    <line x1="20" y1="26" x2="28" y2="26" stroke="#818cf8" stroke-width="1.2"/>
    <line x1="24" y1="12" x2="24" y2="16" stroke="#818cf8" stroke-width="1.5"/>
    <circle cx="24" cy="11" r="1.5" fill="#f43f5e"/>
  </svg>`
};

// Aliases for internal emoji tokens to support seamless backward compatibility
AvatarSVGs['👑'] = AvatarSVGs.hero;
AvatarSVGs['🐍'] = AvatarSVGs.viper;
AvatarSVGs['🛡️'] = AvatarSVGs.atlas;
AvatarSVGs['🌙'] = AvatarSVGs.luna;
AvatarSVGs['🦁'] = AvatarSVGs.duke;
AvatarSVGs['👤'] = AvatarSVGs.guest;

const SlotSymbolSVGs = {
  seven: `<svg class="slot-sym-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="url(#seven-bg)" stroke="#ffd700" stroke-width="1.5"/>
    <path d="M13 14 H35 L22 36 H16 L27 19 H13 Z" fill="url(#seven-gold)" stroke="#fff" stroke-width="0.8"/>
    <defs>
      <linearGradient id="seven-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="seven-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#eab308"/>
        <stop offset="100%" stop-color="#a16207"/>
      </linearGradient>
    </defs>
  </svg>`,

  flare: `<svg class="slot-sym-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="url(#flare-bg)" stroke="#f97316" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="8" fill="#fef08a"/>
    <path d="M24 7 L26 18 L37 13 L29 22 L40 24 L29 26 L37 35 L26 30 L24 41 L22 30 L11 35 L19 26 L8 24 L19 22 L11 13 L22 18 Z" fill="url(#flare-fire)" opacity="0.9"/>
    <defs>
      <linearGradient id="flare-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3b0764"/>
        <stop offset="100%" stop-color="#180424"/>
      </linearGradient>
      <linearGradient id="flare-fire" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#f97316"/>
        <stop offset="100%" stop-color="#dc2626"/>
      </linearGradient>
    </defs>
  </svg>`,

  star: `<svg class="slot-sym-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="url(#star-bg)" stroke="#38bdf8" stroke-width="1.5"/>
    <path d="M24 8 L27 18 L37 20 L29 27 L32 37 L24 31 L16 37 L19 27 L11 20 L21 18 Z" fill="url(#star-gold)" stroke="#fff" stroke-width="0.8"/>
    <defs>
      <linearGradient id="star-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0c4a6e"/>
        <stop offset="100%" stop-color="#082f49"/>
      </linearGradient>
      <linearGradient id="star-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#eab308"/>
      </linearGradient>
    </defs>
  </svg>`,

  spade: `<svg class="slot-sym-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="#0f172a" stroke="#cbd5e1" stroke-width="1.5"/>
    <path d="M24 11 C20 18 14 22 14 27 C14 31 17 34 21 34 C23 34 24 33 24 33 V37 H20 V39 H28 V37 H24 V33 C24 33 25 34 27 34 C31 34 34 31 34 27 C34 22 28 18 24 11 Z" fill="url(#spade-grad)" stroke="#e2e8f0" stroke-width="0.8"/>
    <defs>
      <linearGradient id="spade-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
    </defs>
  </svg>`,

  heart: `<svg class="slot-sym-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="#2d0a0a" stroke="#ef4444" stroke-width="1.5"/>
    <path d="M24 37 C24 37 13 29 13 20 C13 14 18 11 22 14 C23 15 24 17 24 17 C24 17 25 15 26 14 C30 11 35 14 35 20 C35 29 24 37 24 37 Z" fill="url(#heart-grad)" stroke="#fca5a5" stroke-width="0.8"/>
    <defs>
      <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f87171"/>
        <stop offset="50%" stop-color="#ef4444"/>
        <stop offset="100%" stop-color="#991b1b"/>
      </linearGradient>
    </defs>
  </svg>`,

  diamond: `<svg class="slot-sym-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="#042f2e" stroke="#06b6d4" stroke-width="1.5"/>
    <path d="M24 10 L35 24 L24 38 L13 24 Z" fill="url(#dia-grad)" stroke="#a5f3fc" stroke-width="0.8"/>
    <line x1="13" y1="24" x2="35" y2="24" stroke="#e0f2fe" stroke-width="0.5"/>
    <line x1="24" y1="10" x2="24" y2="38" stroke="#e0f2fe" stroke-width="0.5"/>
    <defs>
      <linearGradient id="dia-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#67e8f9"/>
        <stop offset="50%" stop-color="#06b6d4"/>
        <stop offset="100%" stop-color="#0e7490"/>
      </linearGradient>
    </defs>
  </svg>`,

  club: `<svg class="slot-sym-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="#052e16" stroke="#22c55e" stroke-width="1.5"/>
    <circle cx="24" cy="18" r="6" fill="url(#club-grad)" stroke="#86efac" stroke-width="0.8"/>
    <circle cx="18" cy="27" r="6" fill="url(#club-grad)" stroke="#86efac" stroke-width="0.8"/>
    <circle cx="30" cy="27" r="6" fill="url(#club-grad)" stroke="#86efac" stroke-width="0.8"/>
    <path d="M23 27 H25 V37 H21 V39 H27 V37 H25 V27 Z" fill="#86efac"/>
    <defs>
      <linearGradient id="club-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4ade80"/>
        <stop offset="50%" stop-color="#22c55e"/>
        <stop offset="100%" stop-color="#15803d"/>
      </linearGradient>
    </defs>
  </svg>`
};

function renderSlotSymbol(symbol) {
  const map = {
    '7️⃣': 'seven',
    'seven': 'seven',
    '🔥': 'flare',
    'flare': 'flare',
    '⭐': 'star',
    'star': 'star',
    '👑': 'spade',
    'spade': 'spade',
    '💎': 'diamond',
    'diamond': 'diamond',
    '🍒': 'heart',
    'heart': 'heart',
    '🔔': 'club',
    'club': 'club'
  };
  const key = map[symbol] || symbol;
  return SlotSymbolSVGs[key] || `<span class="slot-text-sym">${symbol}</span>`;
}

function renderAvatar(seatIdx, avatarKey) {
  const el = document.getElementById(`avatar-${seatIdx}`);
  if (!el) return;
  const map = {
    '👑': 'hero',
    'hero': 'hero',
    '🐍': 'viper',
    'viper': 'viper',
    '🛡️': 'atlas',
    'atlas': 'atlas',
    '🌙': 'luna',
    'luna': 'luna',
    '🦁': 'duke',
    'duke': 'duke',
    '👤': 'guest',
    'guest': 'guest'
  };
  const key = map[avatarKey] || avatarKey;
  const svg = AvatarSVGs[key] || AvatarSVGs.hero || AvatarSVGs.guest || AvatarSVGs.bot;
  el.innerHTML = svg;
}

// 6. BOT PROFILES & DIFFICULTY
// ============================================================================
const BASE_BOT_PROFILES = {
  1: { name: 'Viper', style: 'Shark (TAG)', avatar: '🐍', aggression: 2.10, cbetFreq: 0.96, bluffFreq: 0.30, callTightness: 0.70 },
  2: { name: 'Atlas', style: 'Solid (TAG)', avatar: '🛡️', aggression: 1.54, cbetFreq: 0.75, bluffFreq: 0.20, callTightness: 0.85 },
  3: { name: 'Luna', style: 'Nit (Rock)', avatar: '🌙', aggression: 1.00, cbetFreq: 0.50, bluffFreq: 0.08, callTightness: 1.15 },
  4: { name: 'Duke', style: 'Maniac', avatar: '🦁', aggression: 2.60, cbetFreq: 1.00, bluffFreq: 0.50, callTightness: 0.55 }
};

// Deterministic Room Host Peer ID (Secretly managed, never shown to user)
const POKER_ROOM_HOST_ID = 'royal-holdem-myimathss-host-v7';

// ============================================================================
// 7. MAIN POKER APPLICATION CONTROLLER
// ============================================================================
class PokerApp {
  constructor() {
    this.deck = new Deck();
    this.communityCards = [];
    this.currentRound = 'pre-flop';
    this.handNumber = 0;
    this.stage = 1;
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.currentBet = 0;
    this.minRaise = 20;
    this.dealerIdx = 0;
    this.actingIdx = 0;
    this.hasActed = new Set();
    this.activeSlot = 1;
    this.difficulty = 'medium';
    this.winRecord = { won: 0, total: 0 };
    this.allInAutoRunout = false;
    this.handInProgress = false;
    this.turnTimerInterval = null;
    this.turnSecondsLeft = 15;
    this.remoteTurnWatchdog = null;
    this.joiningCountdownTimer = null;
    this.heartbeatInterval = null;

    // Hand History & Log
    this.handHistory = [];

    // Roulette Mini-Game State
    this.rouletteBets = {};
    this.selectedRouletteChip = 10;
    this.rouletteSpinning = false;
    this.rouletteAngle = 0;

    // Craps Mini-Game State
    this.crapsBets = {};
    this.crapsPoint = null;
    this.selectedCrapsChip = 10;
    this.crapsRolling = false;

    // Dedicated Solo Casino State & Financial Tracking (v1.025)
    this.casinoSessionNetPnL = 0;
    this.casinoActiveSoloGame = null;
    this.casinoPreviousView = 'menu';

    // Solar Blackjack Table Arena State (v1.1)
    this.bjSlotId = 1;
    this.bjBankroll = 1000;
    this.bjCurrentBet = 50;
    this.bjSelectedChip = 25;
    this.bjDealerCards = [];
    this.bjPlayerCards = [];
    this.bjShoe = [];
    this.bjHandActive = false;
    this.bjHoleRevealed = false;
    this.pendingSlotIsContinuation = false;

    // Multiplayer Online State
    this.isOnlineRoom = false;
    this.isHost = false;
    this.peer = null;
    this.hostConn = null;
    this.guestConnections = []; // Host tracks: [{ conn, name, seatIdx, chips, waiting }]
    this.mySeatIdx = 0;

    this.pendingSlotTarget = null;
    this.pendingDeleteSlot = null;

    // 5 Players: Seat 0 is Hero/Host, Seats 1-4 are Bots or Online Friends
    this.players = [
      { id: 0, name: 'You', style: 'Hero', avatar: '👑', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: false, isRemote: false },
      { id: 1, name: 'Viper', style: 'Shark (TAG)', avatar: '🐍', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: true, isRemote: false },
      { id: 2, name: 'Atlas', style: 'Solid (TAG)', avatar: '🛡️', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: true, isRemote: false },
      { id: 3, name: 'Luna', style: 'Nit (Rock)', avatar: '🌙', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: true, isRemote: false },
      { id: 4, name: 'Duke', style: 'Maniac', avatar: '🦁', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: true, isRemote: false }
    ];

    this.variant = localStorage.getItem('royal_poker_active_variant') || 'texas';

    // Wrap ALL initializers in defensive try/catch as mandated by handoff guide!
    try { this.bindDOM(); } catch (err) { console.error("bindDOM error:", err); }
    try { this.initInGameAlerts(); } catch (err) { console.error("initInGameAlerts error:", err); }
    try { this.initPlayerRegistration(); } catch (err) { console.error("initPlayerRegistration error:", err); }
    try { this.initBuyInModal(); } catch (err) { console.error("initBuyInModal error:", err); }
    try { this.bindTopNavAndModals(); } catch (err) { console.error("bindTopNav error:", err); }
    try { this.initCasinoLounge(); } catch (err) { console.error("initCasinoLounge error:", err); }
    try { this.initCasinoPortal(); } catch (err) { console.error("initCasinoPortal error:", err); }
    try { this.setGameVariant(this.variant); } catch (err) { console.error("setGameVariant error:", err); }
    try { this.initRoulette(); } catch (err) { console.error("initRoulette error:", err); }
    try { this.initSlots(); } catch (err) { console.error("initSlots error:", err); }
    try { this.initTransfer(); } catch (err) { console.error("initTransfer error:", err); }
    try { this.initEconomy(); } catch (err) { console.error("initEconomy error:", err); }
    try { this.startDailyTimersLoop(); } catch (err) { console.error("startDailyTimersLoop error:", err); }
    try { this.updateGlobalStatsUI(); } catch (err) { console.error("updateGlobalStatsUI error:", err); }
    try { this.updateDualWalletUI(); } catch (err) { console.error("updateDualWalletUI error:", err); }
    try { this.renderMainMenuSlots(); } catch (err) { console.error("renderSlots error:", err); }
    try { this.initUpdateLogModal(); } catch (err) { console.error("initUpdateLogModal error:", err); }
    try { this.initCustomWagerModal(); } catch (err) { console.error("initCustomWagerModal error:", err); }
    try { this.initCraps(); } catch (err) { console.error("initCraps error:", err); }
    try { this.initBackgroundTheme(); } catch (err) { console.error("initBackgroundTheme error:", err); }
    try { this.initNewsTicker(); } catch (err) { console.error("initNewsTicker error:", err); }
    try { this.initLeaderboard(); } catch (err) { console.error("initLeaderboard error:", err); }
    try { this.initUpdateAnnouncementModal(); } catch (err) { console.error("initUpdateAnnouncementModal error:", err); }
    try { this.initSlotGameSelectModal(); } catch (err) { console.error("initSlotGameSelectModal error:", err); }
    try { this.initBlackjackBuyInModal(); } catch (err) { console.error("initBlackjackBuyInModal error:", err); }
    try { this.initBlackjack(); } catch (err) { console.error("initBlackjack error:", err); }

    window.pokerApp = this;
    window.pokerGame = this;
    window.app = this;
    window.handleFactoryReset = () => this.handleFactoryReset();

    // Check if URL has ?room=join or ?room=private
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('room') === 'join' || urlParams.get('room') === 'private') {
      this.promptOnlineRoomPassword();
    }
  }

  // ==========================================================================
  // v1.01: UPDATE LOG, CUSTOM WAGERING & TABLE MOTION ANIMATIONS
  // ==========================================================================
  initUpdateLogModal() {
    const modal = document.getElementById('update-log-modal');
    const btnNav = document.getElementById('btn-update-log-trigger');
    const btnHero = document.getElementById('menu-update-log-trigger');
    const btnMore = document.getElementById('bottom-update-notes-more-btn');
    const closeBtn = document.getElementById('close-update-log-btn');
    const closeBtnBottom = document.getElementById('btn-close-update-log');

    const openModal = () => {
      // 1. If on main menu, smooth scroll down to the start of the bottom update notes
      const bottomNotes = document.getElementById('bottom-update-notes');
      if (bottomNotes) {
        bottomNotes.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // 2. Open update log modal and ensure scrolled to the very start of latest release notes
      if (modal) {
        modal.classList.remove('hidden');
        const modalBody = modal.querySelector('.update-log-body');
        if (modalBody) {
          modalBody.scrollTop = 0;
        }
      }
      sounds.playClick();
    };

    const closeModal = () => {
      if (modal) modal.classList.add('hidden');
      sounds.playClick();
    };

    if (btnNav) btnNav.addEventListener('click', openModal);
    if (btnHero) btnHero.addEventListener('click', openModal);
    if (btnMore) btnMore.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeBtnBottom) closeBtnBottom.addEventListener('click', closeModal);
  }

  initCustomWagerModal() {
    this.customWagerTargetGame = null;
    const modal = document.getElementById('custom-wager-modal');
    const inputEl = document.getElementById('custom-wager-input');
    const errEl = document.getElementById('custom-wager-err');
    const closeBtn = document.getElementById('close-custom-wager-btn');
    const cancelBtn = document.getElementById('btn-cancel-custom-wager');
    const confirmBtn = document.getElementById('btn-confirm-custom-wager');

    const closeModal = () => {
      if (modal) modal.classList.add('hidden');
      if (errEl) errEl.classList.add('hidden');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const val = Math.floor(Number(inputEl ? inputEl.value : 0));
        const wallet = EconomyManager.getMiniGameWallet();
        if (isNaN(val) || val < 10) {
          if (errEl) { errEl.textContent = 'Minimum wager is $10!'; errEl.classList.remove('hidden'); }
          return;
        }
        if (val > wallet.balance) {
          if (errEl) { errEl.textContent = `Insufficient Mini-Game Wallet balance! Available: $${wallet.balance.toLocaleString()}.`; errEl.classList.remove('hidden'); }
          return;
        }

        if (this.customWagerTargetGame === 'roulette') {
          this.selectedRouletteChip = val;
          const customBtn = document.querySelector('.r-preset-btn[data-wager="custom"]');
          if (customBtn) customBtn.textContent = `$${val.toLocaleString()}`;
        } else if (this.customWagerTargetGame === 'slots') {
          this.slotWager = val;
          const customBtn = document.querySelector('.slots-preset-btn[data-wager="custom"]');
          if (customBtn) customBtn.textContent = `$${val.toLocaleString()}`;
          this.updateSlotsUI();
        } else if (this.customWagerTargetGame === 'craps') {
          this.selectedCrapsChip = val;
          const customBtn = document.querySelector('.craps-preset-btn[data-wager="custom"]');
          if (customBtn) customBtn.textContent = `$${val.toLocaleString()}`;
        }

        sounds.playChip();
        closeModal();
      });
    }
  }

  openCustomWagerModal(gameType) {
    this.customWagerTargetGame = gameType;
    const modal = document.getElementById('custom-wager-modal');
    const inputEl = document.getElementById('custom-wager-input');
    const errEl = document.getElementById('custom-wager-err');
    const titleEl = document.getElementById('custom-wager-modal-title');
    const descEl = document.getElementById('custom-wager-modal-desc');
    const wallet = EconomyManager.getMiniGameWallet();

    if (titleEl) {
      if (gameType === 'roulette') titleEl.textContent = 'Custom Roulette Wager';
      else if (gameType === 'slots') titleEl.textContent = 'Custom Slot Machine Bet';
      else if (gameType === 'craps') titleEl.textContent = 'Custom Craps Wager';
    }
    if (descEl) descEl.textContent = `Set your custom bet amount from your Mini-Game Wallet (Available: $${wallet.balance.toLocaleString()}).`;

    const currentWager = gameType === 'roulette' ? this.selectedRouletteChip : (gameType === 'craps' ? this.selectedCrapsChip : this.slotWager);
    if (inputEl) {
      inputEl.value = Math.max(10, currentWager || 50);
      inputEl.max = wallet.balance;
    }
    if (errEl) errEl.classList.add('hidden');
    if (modal) modal.classList.remove('hidden');
  }

  animateChipBet(playerIdx) {
    try {
      const seatEl = document.getElementById(`seat-${playerIdx}`);
      const potEl = this.potEl || document.getElementById('pot-total');
      if (!seatEl || !potEl) return;

      const rectFrom = seatEl.getBoundingClientRect();
      const rectTo = potEl.getBoundingClientRect();
      if (!rectFrom.width || !rectTo.width) return;

      const chip = document.createElement('div');
      chip.className = 'flying-chip-token';
      chip.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#ffd700" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="#b45309" stroke="#fde047" stroke-width="1.2"/><text x="12" y="16" font-size="11" font-weight="900" fill="#fff" text-anchor="middle">$</text></svg>`;
      chip.style.left = `${rectFrom.left + rectFrom.width / 2 - 12}px`;
      chip.style.top = `${rectFrom.top + rectFrom.height / 2 - 12}px`;
      document.body.appendChild(chip);

      requestAnimationFrame(() => {
        const deltaX = (rectTo.left + rectTo.width / 2) - (rectFrom.left + rectFrom.width / 2);
        const deltaY = (rectTo.top + rectTo.height / 2) - (rectFrom.top + rectFrom.height / 2);
        chip.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.85) rotate(180deg)`;
        chip.style.opacity = '0.85';
      });

      setTimeout(() => {
        if (chip && chip.parentNode) chip.parentNode.removeChild(chip);
      }, 450);
    } catch (e) {
      // Defensive try/catch
    }
  }

  animatePotAward(winnerIdx) {
    try {
      const seatEl = document.getElementById(`seat-${winnerIdx}`);
      const potEl = this.potEl || document.getElementById('pot-total');
      if (potEl) {
        potEl.classList.add('pot-victory-sweep');
        setTimeout(() => potEl.classList.remove('pot-victory-sweep'), 700);
      }
      if (!seatEl || !potEl) return;

      const rectFrom = potEl.getBoundingClientRect();
      const rectTo = seatEl.getBoundingClientRect();
      if (!rectFrom.width || !rectTo.width) return;

      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const chip = document.createElement('div');
          chip.className = 'flying-chip-token';
          chip.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#ffd700" stroke="#fde047" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="#b45309" stroke="#fef08a" stroke-width="1.2"/><text x="12" y="16" font-size="11" font-weight="900" fill="#fff" text-anchor="middle">$</text></svg>`;
          chip.style.left = `${rectFrom.left + rectFrom.width / 2 - 12}px`;
          chip.style.top = `${rectFrom.top + rectFrom.height / 2 - 12}px`;
          document.body.appendChild(chip);

          requestAnimationFrame(() => {
            const deltaX = (rectTo.left + rectTo.width / 2) - (rectFrom.left + rectFrom.width / 2);
            const deltaY = (rectTo.top + rectTo.height / 2) - (rectFrom.top + rectFrom.height / 2);
            chip.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1) rotate(270deg)`;
            chip.style.opacity = '0.9';
          });

          setTimeout(() => {
            if (chip && chip.parentNode) chip.parentNode.removeChild(chip);
          }, 450);
        }, i * 90);
      }
    } catch (e) {
      // Defensive try/catch
    }
  }

  // ==========================================================================
  // TOP NAVIGATION, TRANSIT DRAWER & MODAL CONTROLLERS
  // ==========================================================================
  toggleTransitDrawer(open) {
    if (!this.transitDrawer) return;
    const isOpen = open !== undefined ? open : !this.transitDrawer.classList.contains('open');
    this.transitDrawer.classList.toggle('open', isOpen);
    if (this.drawerBackdrop) this.drawerBackdrop.classList.toggle('open', isOpen);
    if (isOpen) {
      this.updateDualWalletUI();
    }
  }

  bindTopNavAndModals() {
    // 1. Persistent Top Nav Bar Buttons
    this.btnToggleTransit = document.getElementById('btn-toggle-transit-drawer');
    this.transitDrawer = document.getElementById('transit-drawer');
    this.drawerBackdrop = document.getElementById('drawer-backdrop');
    this.btnCloseTransit = document.getElementById('btn-close-drawer') || document.getElementById('btn-close-transit');

    if (this.btnToggleTransit) this.btnToggleTransit.addEventListener('click', () => this.toggleTransitDrawer());
    if (this.drawerBackdrop) this.drawerBackdrop.addEventListener('click', () => this.toggleTransitDrawer(false));
    if (this.btnCloseTransit) this.btnCloseTransit.addEventListener('click', () => this.toggleTransitDrawer(false));

    // Transit links in drawer (v1.035: All buttons instant teleport to hosted game)
    document.querySelectorAll('#transit-drawer .drawer-item, .transit-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const dest = item.dataset.dest || item.dataset.transit || item.dataset.variant;
        this.toggleTransitDrawer(false);
        sounds.playClick();
        if (dest) this.handleTransitNavigation(dest);
      });
    });

    // Quick sound toggle in header
    this.btnQuickSound = document.getElementById('btn-quick-sound');
    if (this.btnQuickSound) {
      this.btnQuickSound.addEventListener('click', () => {
        sounds.toggle();
        this.updateAudioControlsUI();
      });
    }

    // Stats modal trigger
    this.btnNavStats = document.getElementById('btn-nav-stats');
    this.statsModal = document.getElementById('stats-modal');
    this.closeStatsBtn = document.getElementById('close-stats-btn');
    if (this.btnNavStats && this.statsModal) {
      this.btnNavStats.addEventListener('click', () => this.openStatsModal());
    }
    if (this.closeStatsBtn && this.statsModal) {
      this.closeStatsBtn.addEventListener('click', () => this.statsModal.classList.add('hidden'));
    }

    // Settings modal trigger
    this.btnNavSettings = document.getElementById('btn-nav-settings');
    this.settingsModal = document.getElementById('settings-modal');
    this.closeSettingsBtn = document.getElementById('close-settings-btn');
    if (this.btnNavSettings && this.settingsModal) {
      this.btnNavSettings.addEventListener('click', () => this.openSettingsModal());
    }
    if (this.closeSettingsBtn && this.settingsModal) {
      this.closeSettingsBtn.addEventListener('click', () => this.settingsModal.classList.add('hidden'));
    }

    // Rules modal from top bar
    this.btnNavRules = document.getElementById('btn-nav-rules');
    if (this.btnNavRules && this.rulesModal) {
      this.btnNavRules.addEventListener('click', () => this.rulesModal.classList.remove('hidden'));
    }

    // Update 1.125: Symmetrical Main Menu Action Cards
    const btnMenuRules = document.getElementById('btn-menu-rules');
    if (btnMenuRules && this.rulesModal) {
      btnMenuRules.addEventListener('click', () => {
        this.rulesModal.classList.remove('hidden');
        sounds.playClick();
      });
    }

    const btnMenuStats = document.getElementById('btn-menu-stats');
    if (btnMenuStats) {
      btnMenuStats.addEventListener('click', () => {
        this.openStatsModal();
      });
    }

    const btnMenuSettings = document.getElementById('btn-menu-settings');
    if (btnMenuSettings) {
      btnMenuSettings.addEventListener('click', () => {
        this.openSettingsModal();
      });
    }

    // Cash Out Modal triggers (both game footer button and header action button)
    this.btnCashoutExit = document.getElementById('btn-cashout-exit');
    this.btnTopCashout = document.getElementById('btn-top-cashout');
    this.cashoutModal = document.getElementById('cashout-modal');
    this.closeCashoutBtn = document.getElementById('close-cashout-btn');
    this.btnConfirmCashout = document.getElementById('btn-confirm-cashout');
    this.btnCancelCashout = document.getElementById('btn-cancel-cashout');

    if (this.btnCashoutExit && this.cashoutModal) {
      this.btnCashoutExit.addEventListener('click', () => this.openCashoutModal());
    }
    if (this.btnTopCashout && this.cashoutModal) {
      this.btnTopCashout.addEventListener('click', () => this.openCashoutModal());
    }
    if (this.closeCashoutBtn && this.cashoutModal) {
      this.closeCashoutBtn.addEventListener('click', () => this.cashoutModal.classList.add('hidden'));
    }
    if (this.btnCancelCashout && this.cashoutModal) {
      this.btnCancelCashout.addEventListener('click', () => this.cashoutModal.classList.add('hidden'));
    }
    if (this.btnConfirmCashout) {
      this.btnConfirmCashout.addEventListener('click', () => this.confirmCashout());
    }

    // Audio & Volume controls in Settings
    const settingSoundToggle = document.getElementById('setting-sound-toggle');
    if (settingSoundToggle) {
      settingSoundToggle.checked = sounds.enabled;
      settingSoundToggle.addEventListener('change', (e) => {
        sounds.enabled = e.target.checked;
        localStorage.setItem('royal_poker_sound_muted', (!sounds.enabled).toString());
        this.updateAudioControlsUI();
      });
    }

    const volSlider = document.getElementById('setting-volume-slider');
    const volVal = document.getElementById('setting-volume-val');
    if (volSlider) {
      volSlider.value = Math.round(sounds.volume * 100);
      if (volVal) volVal.textContent = `${volSlider.value}%`;
      volSlider.addEventListener('input', (e) => {
        const v = Number(e.target.value) / 100;
        sounds.setVolume(v);
        if (volVal) volVal.textContent = `${e.target.value}%`;
      });
    }

    // Feature Flag Switches in Settings
    const flagToggles = [
      { id: 'flag-short-deck', key: 'shortDeck' },
      { id: 'flag-omaha', key: 'omaha' },
      { id: 'flag-slots', key: 'slots' },
      { id: 'flag-roulette', key: 'roulette' },
      { id: 'flag-side-pot-rule', key: 'sidePotRule' }
    ];
    flagToggles.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = FeatureManager.isEnabled(key);
        el.addEventListener('change', (e) => {
          FeatureManager.setFlag(key, e.target.checked);
          this.setAnnouncement(`[CONFIG] Module '${key}' is now ${e.target.checked ? 'ACTIVE' : 'DISABLED'}`);
        });
      }
    });

    // Visual Theme / Quality Selector
    // Complete Factory Reset in Settings
    const btnFactoryReset = document.getElementById('btn-factory-reset');
    if (btnFactoryReset) {
      btnFactoryReset.addEventListener('click', () => this.handleFactoryReset());
    }

    const qualitySelect = document.getElementById('setting-quality');
    if (qualitySelect) {
      const savedQ = localStorage.getItem('royal_poker_quality') || 'high';
      qualitySelect.value = savedQ;
      document.body.dataset.quality = savedQ;
      qualitySelect.addEventListener('change', (e) => {
        localStorage.setItem('royal_poker_quality', e.target.value);
        document.body.dataset.quality = e.target.value;
      });
    }

    this.updateDualWalletUI();
    this.updateAudioControlsUI();
  }

  // ==========================================================================
  // DEDICATED CASINO LOUNGE HUB (Dual-View Slots & European Roulette)
  // ==========================================================================

    // ==========================================================================
  // IN-GAME MODAL ALERT & CONFIRMATION SYSTEM (Zero Native Browser Popups)
  // ==========================================================================
  initInGameAlerts() {
    const cancelBtn = document.getElementById('in-game-alert-cancel');
    const okBtn = document.getElementById('in-game-alert-ok');
    const modal = document.getElementById('in-game-modal-alert');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }
    const closeBuyin = document.getElementById('close-buyin-modal-btn');
    const cancelBuyin = document.getElementById('btn-cancel-buyin');
    const buyinModal = document.getElementById('buyin-modal');
    if (closeBuyin && buyinModal) closeBuyin.addEventListener('click', () => buyinModal.classList.add('hidden'));
    if (cancelBuyin && buyinModal) cancelBuyin.addEventListener('click', () => buyinModal.classList.add('hidden'));
  }

  showInGameAlert({ title, message, type = 'info', onOk = null }) {
    const modal = document.getElementById('in-game-modal-alert');
    const titleEl = document.getElementById('in-game-alert-title');
    const msgEl = document.getElementById('in-game-alert-msg');
    const iconWrap = document.getElementById('in-game-alert-icon-wrap');
    const cancelBtn = document.getElementById('in-game-alert-cancel');
    const okBtn = document.getElementById('in-game-alert-ok');
    if (!modal) return;

    if (titleEl) titleEl.textContent = title || 'SYSTEM NOTICE';
    if (msgEl) msgEl.textContent = message || '';

    if (iconWrap) {
      if (type === 'danger' || type === 'error') {
        iconWrap.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        iconWrap.style.background = 'rgba(239, 68, 68, 0.15)';
        iconWrap.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      } else if (type === 'success') {
        iconWrap.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2"/><path d="M8 12l3 3 5-5" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        iconWrap.style.background = 'rgba(16, 185, 129, 0.15)';
        iconWrap.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        iconWrap.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ffd700" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/></svg>`;
        iconWrap.style.background = 'rgba(253, 224, 71, 0.12)';
        iconWrap.style.borderColor = 'rgba(253, 224, 71, 0.35)';
      }
    }

    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (okBtn) {
      okBtn.textContent = 'OK';
      okBtn.className = 'btn btn-primary gold-glow-btn';
      okBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onOk) onOk();
      };
    }

    modal.classList.remove('hidden');
  }

  showInGameConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false, onConfirm = null, onCancel = null }) {
    const modal = document.getElementById('in-game-modal-alert');
    const titleEl = document.getElementById('in-game-alert-title');
    const msgEl = document.getElementById('in-game-alert-msg');
    const iconWrap = document.getElementById('in-game-alert-icon-wrap');
    const cancelBtn = document.getElementById('in-game-alert-cancel');
    const okBtn = document.getElementById('in-game-alert-ok');
    if (!modal) return;

    if (titleEl) titleEl.textContent = title || 'CONFIRM ACTION';
    if (msgEl) msgEl.textContent = message || '';

    if (iconWrap) {
      if (isDanger) {
        iconWrap.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        iconWrap.style.background = 'rgba(239, 68, 68, 0.18)';
        iconWrap.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      } else {
        iconWrap.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ffd700" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/></svg>`;
        iconWrap.style.background = 'rgba(253, 224, 71, 0.12)';
        iconWrap.style.borderColor = 'rgba(253, 224, 71, 0.35)';
      }
    }

    if (cancelBtn) {
      cancelBtn.textContent = cancelText;
      cancelBtn.classList.remove('hidden');
      cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onCancel) onCancel();
      };
    }

    if (okBtn) {
      okBtn.textContent = confirmText;
      okBtn.className = isDanger ? 'btn btn-danger-reset' : 'btn btn-primary gold-glow-btn';
      okBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onConfirm) onConfirm();
      };
    }

    modal.classList.remove('hidden');
  }

  // ==========================================================================
  // MANDATORY PLAYER REGISTRATION (Required Before Playing)
  // ==========================================================================
  getPlayerName() {
    const raw = (localStorage.getItem('royal_poker_username') || '').trim();
    if (!raw || raw.toLowerCase() === 'you' || raw.toLowerCase() === 'hero') return null;
    return raw;
  }

  requirePlayerName(onSuccess) {
    const name = this.getPlayerName();
    if (name) {
      if (typeof onSuccess === 'function') {
        onSuccess(name);
      }
      return true;
    }
    this.openPlayerNameModal(onSuccess);
    return false;
  }

  initPlayerRegistration() {
    const modal = document.getElementById('player-name-modal');
    if (!modal) return;
    const submitBtn = document.getElementById('player-name-modal-submit');
    const input = document.getElementById('player-name-modal-input');
    if (submitBtn) submitBtn.addEventListener('click', () => this.handleRegisterPlayerSubmit());
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleRegisterPlayerSubmit();
      });
    }
  }

  openPlayerNameModal(onSuccess) {
    this.pendingRegistrationCallback = onSuccess;
    const modal = document.getElementById('player-name-modal');
    const input = document.getElementById('player-name-modal-input');
    const err = document.getElementById('player-name-modal-err');
    if (!modal) return;
    if (err) err.classList.add('hidden');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
    modal.classList.remove('hidden');
  }

  handleRegisterPlayerSubmit() {
    const modal = document.getElementById('player-name-modal');
    const input = document.getElementById('player-name-modal-input');
    const err = document.getElementById('player-name-modal-err');
    const val = (input ? input.value : '').trim();

    if (!val || val.length < 2 || val.length > 16) {
      if (err) {
        err.textContent = 'Please enter a valid callsign (2-16 characters).';
        err.classList.remove('hidden');
      }
      return;
    }

    localStorage.setItem('royal_poker_username', val);
    localStorage.setItem('royal_poker_name_locked', 'true');
    this.players[0].name = val;
    const heroEl = document.getElementById('hero-name');
    if (heroEl) heroEl.textContent = val;
    const userInp = document.getElementById('player-username-input');
    if (userInp) {
      userInp.value = val;
      userInp.readOnly = true;
      userInp.disabled = true;
      userInp.classList.add('locked-input');
    }
    const saveBtn = document.getElementById('btn-save-username');
    if (saveBtn) {
      saveBtn.classList.add('locked-btn');
      saveBtn.innerHTML = '<svg class="lock-svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#fcd34d" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#fcd34d" stroke-width="2"/></svg><span>Locked</span>';
    }

    this.renderMainMenuSlots();
    if (modal) modal.classList.add('hidden');
    sounds.playWin();
    this.setAnnouncement(`[WELCOME] Registered as "${val}". High-Roller access granted!`);

    if (this.pendingRegistrationCallback) {
      const cb = this.pendingRegistrationCallback;
      this.pendingRegistrationCallback = null;
      cb(val);
    }
  }

  // ==========================================================================
  // POKER RUN BUY-IN SELECTION (Funded Strictly from Savings Vault)
  // ==========================================================================
  initBuyInModal() {
    const inputEl = document.getElementById('buyin-amount-input');
    const errEl = document.getElementById('buyin-err-msg');

    document.querySelectorAll('.buyin-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.buyin-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.dataset.preset;
        const savings = EconomyManager.getCumulativeSavings();
        let val = 1000;
        if (p === 'half') val = Math.max(1000, Math.floor(savings / 2));
        else if (p === 'max') val = Math.max(1000, savings);
        else val = Math.min(Number(p) || 1000, savings);

        if (inputEl) inputEl.value = val;
        if (errEl) errEl.classList.add('hidden');
      });
    });

    const confirmBtn = document.getElementById('btn-confirm-buyin');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.handleBuyInConfirm());
    }
  }

  openBuyInModal(slotId, difficulty, isContinuation = false) {
    this.pendingBuyInSlot = slotId;
    this.pendingBuyInDifficulty = difficulty;
    this.isBuyInContinuation = isContinuation;

    const savings = EconomyManager.getCumulativeSavings();
    const modal = document.getElementById('buyin-modal');
    const availEl = document.getElementById('buyin-available-savings');
    const inputEl = document.getElementById('buyin-amount-input');
    const errEl = document.getElementById('buyin-err-msg');
    const modalTitle = modal ? modal.querySelector('h2') : null;
    const confirmBtn = document.getElementById('btn-confirm-buyin');

    if (isContinuation) {
      const slotData = SaveManager.getSave(slotId) || {};
      const currentStack = Number(slotData.chips) || 0;
      this.pendingContinuationCurrentStack = currentStack;

      if (modalTitle) modalTitle.textContent = `Enter Table Stack (Slot ${slotId})`;
      if (confirmBtn) confirmBtn.textContent = 'Enter Table';

      if (currentStack < 1000 && (savings + currentStack) < 1000) {
        sounds.playCheck();
        this.showInGameAlert({
          title: 'INSUFFICIENT FUNDS FOR TABLE ENTRY',
          message: `Your current save slot stack ($${currentStack.toLocaleString()}) and Savings Vault ($${savings.toLocaleString()}) cannot reach the minimum table entry of $1,000.

Claim your $5,000 (3-Hour) Poker Allowance or transfer Casino funds to continue!`
        });
        return;
      }

      if (availEl) availEl.textContent = `$${savings.toLocaleString()} (Current Stack: $${currentStack.toLocaleString()})`;
      if (inputEl) {
        inputEl.value = Math.max(1000, currentStack);
        inputEl.min = 1000;
        inputEl.max = currentStack + savings;
      }
    } else {
      if (modalTitle) modalTitle.textContent = 'Fund Poker Run Buy-In';
      if (confirmBtn) confirmBtn.textContent = 'Launch Run';

      if (savings < 1000) {
        sounds.playCheck();
        this.showInGameAlert({
          title: 'INSUFFICIENT SAVINGS VAULT',
          message: `You currently have $${savings.toLocaleString()} in your Savings Vault. A minimum buy-in of $1,000 is required to launch a Poker Run.

Claim your $5,000 (3-Hour) Poker Allowance or transfer Casino funds to start a run!`
        });
        return;
      }

      if (availEl) availEl.textContent = `$${savings.toLocaleString()}`;
      if (inputEl) {
        inputEl.value = Math.min(1000, savings);
        inputEl.min = 1000;
        inputEl.max = savings;
      }
    }

    if (errEl) errEl.classList.add('hidden');
    if (modal) modal.classList.remove('hidden');
  }

  handleBuyInConfirm() {
    const inputEl = document.getElementById('buyin-amount-input');
    const errEl = document.getElementById('buyin-err-msg');
    const modal = document.getElementById('buyin-modal');
    const buyIn = Number(inputEl ? inputEl.value : 1000) || 0;
    const savings = EconomyManager.getCumulativeSavings();

    if (buyIn < 1000) {
      if (errEl) { errEl.textContent = 'Minimum Table Buy-In is $1,000.'; errEl.classList.remove('hidden'); }
      return;
    }

    const slotId = this.pendingBuyInSlot || 1;
    const diff = this.pendingBuyInDifficulty || 'medium';

    if (this.isBuyInContinuation) {
      const currentStack = this.pendingContinuationCurrentStack || 0;
      const neededFromSavings = Math.max(0, buyIn - currentStack);

      if (neededFromSavings > savings) {
        if (errEl) {
          errEl.textContent = `Insufficient savings! Need $${neededFromSavings.toLocaleString()} additional funds from Savings Vault to bring stack to $${buyIn.toLocaleString()}.`;
          errEl.classList.remove('hidden');
        }
        return;
      }

      if (neededFromSavings > 0) {
        EconomyManager.deductCumulativeSavings(neededFromSavings);
      } else if (buyIn < currentStack) {
        const returnToSavings = currentStack - buyIn;
        EconomyManager.addCumulativeSavings(returnToSavings);
      }

      const slotData = SaveManager.getSave(slotId) || {};
      slotData.chips = buyIn;
      SaveManager.save(slotId, slotData);

      this.updateDualWalletUI();
      this.updateEconomyDashboard();
      if (modal) modal.classList.add('hidden');
      this.loadGame(slotId);
    } else {
      if (buyIn > savings) {
        if (errEl) { errEl.textContent = `Insufficient savings! Available balance is only $${savings.toLocaleString()}.`; errEl.classList.remove('hidden'); }
        return;
      }

      EconomyManager.deductCumulativeSavings(buyIn);
      this.updateDualWalletUI();
      this.updateEconomyDashboard();
      if (modal) modal.classList.add('hidden');

      this.startNewGame(slotId, diff, buyIn);
    }
  }


  // ==========================================================================
  // DEDICATED CASINO RESORT PAGE & TRANSITIONS
  // ==========================================================================
  initCasinoPortal() {
    this.btnEnterCasinoPortal = document.getElementById('btn-enter-casino-portal');
    this.btnCasinoBackPoker = document.getElementById('btn-casino-back-poker');
    this.btnCasinoClaimDaily = document.getElementById('btn-casino-claim-daily');
    this.btnCasinoTransferBtn = document.getElementById('btn-casino-transfer-btn');

    if (this.btnEnterCasinoPortal) {
      this.btnEnterCasinoPortal.addEventListener('click', () => {
        this.requirePlayerName(() => this.showCasinoView());
      });
    }
    if (this.btnCasinoBackPoker) {
      this.btnCasinoBackPoker.addEventListener('click', () => this.hideCasinoView());
    }
    if (this.btnCasinoClaimDaily) {
      this.btnCasinoClaimDaily.addEventListener('click', () => {
        const res = EconomyManager.claimMiniGameDaily();
        if (res.success) {
          sounds.playWin();
          this.updateDualWalletUI();
          this.updateEconomyDashboard();
          this.updateRouletteUI();
          this.updateSlotsUI();
          this.setAnnouncement(`[CLAIMED] Claimed $1,000 Mini-Game Allowance! (30-Minute Cooldown) New balance: $${res.balance.toLocaleString()}`);
        } else {
          sounds.playCheck();
          this.setAnnouncement(`[NOTICE] ${res.message}`);
        }
      });
    }
    if (this.btnCasinoTransferBtn) {
      this.btnCasinoTransferBtn.addEventListener('click', () => {
        this.openTransferModal();
      });
    }

    const quickCrapsBtn = document.getElementById('btn-quick-craps-portal');
    if (quickCrapsBtn) {
      quickCrapsBtn.addEventListener('click', () => {
        this.requirePlayerName(() => this.showCasinoView('craps'));
      });
    }

    // v1.025: Interactive Showcase Card Listeners
    const cardRoulette = document.getElementById('showcase-card-roulette');
    const cardSlots = document.getElementById('showcase-card-slots');
    const cardCraps = document.getElementById('showcase-card-craps');

    if (cardRoulette) {
      cardRoulette.addEventListener('click', () => {
        this.requirePlayerName(() => this.showCasinoSoloGame('roulette'));
      });
    }
    if (cardSlots) {
      cardSlots.addEventListener('click', () => {
        this.requirePlayerName(() => this.showCasinoSoloGame('slots'));
      });
    }
    if (cardCraps) {
      cardCraps.addEventListener('click', () => {
        this.requirePlayerName(() => this.showCasinoSoloGame('craps'));
      });
    }

    // Direct button click listeners for showcase cards
    document.querySelectorAll('.btn-roulette-enter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.requirePlayerName(() => this.showCasinoSoloGame('roulette'));
      });
    });
    document.querySelectorAll('.btn-slots-enter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.requirePlayerName(() => this.showCasinoSoloGame('slots'));
      });
    });
    document.querySelectorAll('.btn-craps-enter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.requirePlayerName(() => this.showCasinoSoloGame('craps'));
      });
    });

    // v1.025: Solo HUD Nav Buttons
    const btnSoloBackHub = document.getElementById('btn-solo-back-hub');
    if (btnSoloBackHub) {
      btnSoloBackHub.addEventListener('click', () => this.showCasinoShowcaseHub());
    }
    const btnSoloExitMain = document.getElementById('btn-solo-exit-main');
    if (btnSoloExitMain) {
      btnSoloExitMain.addEventListener('click', () => this.hideCasinoView());
    }
    const btnSoloCashoutPoker = document.getElementById('btn-solo-cashout-poker');
    if (btnSoloCashoutPoker) {
      btnSoloCashoutPoker.addEventListener('click', () => this.openTransferModal());
    }
    const legacyCrapsBtn = document.getElementById('btn-open-craps');
    if (legacyCrapsBtn) {
      legacyCrapsBtn.addEventListener('click', () => {
        this.requirePlayerName(() => this.showCasinoView('craps'));
      });
    }

    // Redirect legacy casino buttons to dedicated view
    const legacyCasinoLounge = document.getElementById('btn-open-casino-lounge');
    if (legacyCasinoLounge) {
      legacyCasinoLounge.addEventListener('click', () => this.showCasinoView());
    }
    const legacySlotsBtn = document.getElementById('btn-open-slots');
    if (legacySlotsBtn) {
      legacySlotsBtn.addEventListener('click', () => this.showCasinoView('slots'));
    }
    const legacyRouletteBtn = document.getElementById('btn-open-roulette');
    if (legacyRouletteBtn) {
      legacyRouletteBtn.addEventListener('click', () => this.showCasinoView('roulette'));
    }
  }

  showCasinoView(focus = 'all') {
    this.casinoPreviousView = (this.gameView && !this.gameView.classList.contains('hidden')) ? 'game' : 'menu';
    this.clearTurnTimer();
    const mainMenu = document.getElementById('main-menu');
    const gameView = document.getElementById('game-view');
    const casinoView = document.getElementById('casino-view');
    if (!casinoView) return;

    if (mainMenu && !mainMenu.classList.contains('hidden')) {
      mainMenu.classList.add('page-slide-left-out');
      casinoView.classList.remove('hidden');
      casinoView.classList.add('page-slide-left-in');

      setTimeout(() => {
        mainMenu.classList.add('hidden');
        mainMenu.classList.remove('page-slide-left-out');
        casinoView.classList.remove('page-slide-left-in');
      }, 350);
    } else {
      if (mainMenu) mainMenu.classList.add('hidden');
      if (gameView) gameView.classList.add('hidden');
      casinoView.classList.remove('hidden');
    }

    if (this.btnCashoutExit) this.btnCashoutExit.classList.add('hidden');
    if (this.btnTopCashout) this.btnTopCashout.classList.add('hidden');

    this.updateRouletteUI();
    this.updateSlotsUI();
    this.updateDualWalletUI();
    const meterWin = document.getElementById('meter-win-val');
    if (meterWin) meterWin.textContent = '$0';
    if (this.drawRouletteWheel) {
      this.drawRouletteWheel(this.rouletteAngle || 0);
    }

    if (focus === 'slots' || focus === 'roulette' || focus === 'craps') {
      this.showCasinoSoloGame(focus);
    } else {
      this.showCasinoShowcaseHub();
    }
  }

  showCasinoShowcaseHub() {
    this.casinoActiveSoloGame = null;
    const hub = document.getElementById('casino-showcase-hub');
    const soloWrap = document.getElementById('casino-solo-arena-wrap');
    if (hub) hub.classList.remove('hidden');
    if (soloWrap) soloWrap.classList.add('hidden');
    this.updateDualWalletUI();
  }

  showCasinoSoloGame(game = 'roulette') {
    this.casinoActiveSoloGame = game;
    const hub = document.getElementById('casino-showcase-hub');
    const soloWrap = document.getElementById('casino-solo-arena-wrap');
    if (hub) hub.classList.add('hidden');
    if (soloWrap) soloWrap.classList.remove('hidden');

    const rouletteCard = document.querySelector('.roulette-arena-card');
    const slotsCard = document.querySelector('.slots-arena-card');
    const crapsCard = document.getElementById('craps-arena-card') || document.querySelector('.craps-arena-card');

    if (rouletteCard) {
      if (game === 'roulette') {
        rouletteCard.classList.remove('hidden');
        rouletteCard.style.display = 'block';
      } else {
        rouletteCard.classList.add('hidden');
        rouletteCard.style.display = 'none';
      }
    }
    if (slotsCard) {
      if (game === 'slots') {
        slotsCard.classList.remove('hidden');
        slotsCard.style.display = 'block';
      } else {
        slotsCard.classList.add('hidden');
        slotsCard.style.display = 'none';
      }
    }
    if (crapsCard) {
      if (game === 'craps') {
        crapsCard.classList.remove('hidden');
        crapsCard.style.display = 'block';
      } else {
        crapsCard.classList.add('hidden');
        crapsCard.style.display = 'none';
      }
    }

    const titleEl = document.getElementById('solo-active-game-title');
    if (titleEl) {
      if (game === 'roulette') titleEl.textContent = 'HELIOS SOLAR ROULETTE';
      else if (game === 'slots') titleEl.textContent = 'SOLAR CORONA 100X SLOTS';
      else if (game === 'craps') titleEl.textContent = 'ROYAL SOLAR CRAPS TABLE';
    }

    this.updateSoloHUD();

    if (game === 'roulette' && this.drawRouletteWheel) {
      this.drawRouletteWheel(this.rouletteAngle || 0);
    }

    const soloHud = document.getElementById('solo-game-hud-bar');
    if (soloHud) soloHud.scrollIntoView({ behavior: 'smooth' });
  }

  updateSoloHUD() {
    const wallet = EconomyManager.getMiniGameWallet();
    const pnlEl = document.getElementById('solo-session-pnl-val');
    const walletEl = document.getElementById('solo-wallet-display');
    const cvWallet = document.getElementById('casino-page-wallet-val');

    if (walletEl) walletEl.textContent = `$${wallet.balance.toLocaleString()}`;
    if (cvWallet) cvWallet.textContent = `$${wallet.balance.toLocaleString()}`;

    if (pnlEl) {
      const pnl = this.casinoSessionNetPnL || 0;
      if (pnl > 0) {
        pnlEl.textContent = `+$${pnl.toLocaleString()} (Profit)`;
        pnlEl.className = 'emerald';
      } else if (pnl < 0) {
        pnlEl.textContent = `-$${Math.abs(pnl).toLocaleString()} (Loss)`;
        pnlEl.className = 'crimson';
      } else {
        pnlEl.textContent = '$0 (Even)';
        pnlEl.className = 'gold';
      }
    }
  }

  promptInsufficientCasinoFunds(gameName = 'Casino Game') {
    const wallet = EconomyManager.getMiniGameWallet();
    this.showInGameConfirm({
      title: 'OUT OF CASINO FUNDS',
      message: `Your Casino balance is $${wallet.balance.toLocaleString()}, which is below the minimum bet for ${gameName}.\n\nWould you like to cash out & return to Texas Hold'em, or claim your $1,000 allowance if your 3-hour cooldown is complete?`,
      confirmText: 'RETURN TO MAIN MENU',
      cancelText: 'CLAIM $1,000 (3H)',
      onConfirm: () => this.hideCasinoView(),
      onCancel: () => {
        const res = EconomyManager.claimMiniGameDaily();
        if (res.success) {
          sounds.playWin();
          this.updateDualWalletUI();
          this.updateEconomyDashboard();
          this.updateSoloHUD();
          this.updateRouletteUI();
          this.updateSlotsUI();
          this.updateCrapsUI();
          this.setAnnouncement(`[CLAIMED] Claimed $1,000 Mini-Game Allowance! New balance: $${res.balance.toLocaleString()}`);
        } else {
          sounds.playCheck();
          this.setAnnouncement(`[NOTICE] ${res.message}`);
          this.showInGameAlert({
            title: 'ALLOWANCE COOLDOWN ACTIVE',
            message: res.message,
            type: 'info'
          });
        }
      }
    });
  }

  hideCasinoView() {
    const mainMenu = document.getElementById('main-menu');
    const casinoView = document.getElementById('casino-view');
    if (!casinoView) return;

    casinoView.classList.add('page-slide-right-out');

    setTimeout(() => {
      casinoView.classList.add('hidden');
      casinoView.classList.remove('page-slide-right-out');
    }, 350);

    if (this.casinoPreviousView === 'game' && this.activeSlot !== null) {
      this.showGameView();
    } else {
      if (mainMenu) {
        mainMenu.classList.remove('hidden');
        mainMenu.classList.add('page-slide-right-in');
        setTimeout(() => {
          mainMenu.classList.remove('page-slide-right-in');
        }, 350);
      }
      this.updateEconomyDashboard();
      this.renderMainMenuSlots();
      this.updateDualWalletUI();
    }
  }

  handleFactoryReset(skipConfirm = false) {
    if (!skipConfirm) {
      this.showInGameConfirm({
        title: 'SYSTEM FACTORY RESET',
        message: 'This will immediately and permanently erase all 3 save slots, active poker runs, career statistics, cumulative savings, and mini-game wallet, resetting all 24-hour daily allowance cooldowns to 0 so allowances can be claimed fresh immediately.\n\nAre you absolutely sure you want to perform a complete factory data wipe?',
        confirmText: 'PURGE ALL DATA',
        cancelText: 'CANCEL',
        isDanger: true,
        onConfirm: () => this.executeFactoryResetPurge()
      });
      return;
    }
    this.executeFactoryResetPurge();
  }

  executeFactoryResetPurge() {
    try {
      // 1. Wipe all localStorage items
      const knownKeys = [
        SaveManager.STORAGE_KEY,
        SaveManager.GLOBAL_KEY,
        EconomyManager.CUMULATIVE_SAVINGS_KEY,
        EconomyManager.MINIGAME_STORAGE_KEY,
        EconomyManager.POKER_ALLOWANCE_KEY,
        EconomyManager.GLOBAL_POKER_CLAIM_KEY,
        'royal_poker_device_saves_v4',
        'royal_poker_device_stats_v4',
        'royal_poker_cumulative_savings_v1',
        'royal_poker_minigame_wallet_v2',
        'royal_poker_daily_allowance_v2',
        'royal_poker_global_poker_claim_v1',
        'royal_poker_active_variant',
        'royal_poker_feature_flags_v1',
        'royal_poker_quality',
        'royal_poker_sound_muted',
        'royal_poker_username',
        'royal_poker_name_locked',
        'royal_poker_volume',
        'solar_poker_leaderboard_data',
        'solar_poker_registered_roster'
      ];
      knownKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      // Purge any remaining royal_poker_* or royal_* keys
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('royal_poker_') || k.startsWith('royal_')) {
            localStorage.removeItem(k);
          }
        });
      } catch (e) {}

      // 2. Initialize pristine clean baselines
      try {
        localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify({ slot_1: null, slot_2: null, slot_3: null, slot_4: null }));
      } catch (e) {}
      
      const cleanStats = {
        totalHands: 0,
        handsWon: 0,
        biggestPot: 0,
        currentStreak: 0,
        bestStreak: 0,
        bestHandDesc: 'High Card',
        bestHandRank: 1,
        onlineHandsPlayed: 0,
        texasHands: 0,
        shortDeckHands: 0,
        omahaHands: 0,
        exclusiveHands: 0,
        slotsSpins: 0,
        rouletteSpins: 0,
        totalCashedOut: 0
      };
      try {
        localStorage.setItem(SaveManager.GLOBAL_KEY, JSON.stringify(cleanStats));
      } catch (e) {}

      EconomyManager.saveCumulativeSavings(1000);
      EconomyManager.saveMiniGameWallet({ balance: 1000, lastClaimTimestamp: 0 });
      EconomyManager.savePokerAllowances({ slot_1: 0, slot_2: 0, slot_3: 0, slot_4: 0 });
      try {
        localStorage.setItem(EconomyManager.GLOBAL_POKER_CLAIM_KEY, '0');
        localStorage.setItem('royal_poker_username', 'High Roller');
      } catch (e) {}

      // 3. Reset application state variables
      this.activeSlot = null;
      this.handInProgress = false;
      this.stage = 1;
      this.handNumber = 0;
      this.difficulty = 'medium';
      this.currentBet = 0;
      this.communityCards = [];
      this.clearTurnTimer();

      // Reset players array to clean baseline
      this.players = [
        { id: 0, name: 'You', style: 'Hero', avatar: '👑', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: false, isRemote: false },
        { id: 1, name: 'Viper', style: 'Shark (TAG)', avatar: '🐍', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: true, isRemote: false },
        { id: 2, name: 'Atlas', style: 'Solid (TAG)', avatar: '🛡️', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: true, isRemote: false },
        { id: 3, name: 'Luna', style: 'Nit (Rock)', avatar: '🌙', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: true, isRemote: false },
        { id: 4, name: 'Duke', style: 'Maniac', avatar: '🦁', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, knockedOut: false, isBot: true, isRemote: false }
      ];

      // 4. Close all views and return to Main Menu
      const casinoView = document.getElementById('casino-view');
      if (casinoView) casinoView.classList.add('hidden');
      if (this.gameView) this.gameView.classList.add('hidden');
      if (this.mainMenuView) this.mainMenuView.classList.remove('hidden');

      // Close all modals
      if (this.settingsModal) this.settingsModal.classList.add('hidden');
      const statsModal = document.getElementById('stats-modal');
      if (statsModal) statsModal.classList.add('hidden');
      const cashoutModal = document.getElementById('cashout-modal');
      if (cashoutModal) cashoutModal.classList.add('hidden');
      const diffModal = document.getElementById('difficulty-modal');
      if (diffModal) diffModal.classList.add('hidden');

      // 5. Update UI displays
      this.renderMainMenuSlots();
      this.updateGlobalStatsUI();
      this.updateEconomyDashboard();
      this.updateRouletteUI();
      this.updateSlotsUI();
      this.updateLeaderboardUI();
      this.updateDualWalletUI();

      const usernameInput = document.getElementById('player-username-input');
      if (usernameInput) {
        usernameInput.value = 'High Roller';
        usernameInput.readOnly = false;
        usernameInput.disabled = false;
        usernameInput.classList.remove('locked-input');
      }
      const btnSaveUsername = document.getElementById('btn-save-username');
      if (btnSaveUsername) {
        btnSaveUsername.classList.remove('locked-btn');
        btnSaveUsername.title = 'Save Permanent Callsign';
        btnSaveUsername.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Save</span>';
      }
      const lbModal = document.getElementById('leaderboard-modal');
      if (lbModal) lbModal.classList.add('hidden');

      // 6. Audio and announcement feedback
      sounds.playWin();
      this.setAnnouncement('[RESET] Complete Factory Reset executed. All save slots, wallets, stats, and daily cooldowns restored to baseline.');
      this.showInGameAlert({
        title: 'FACTORY RESET COMPLETE',
        message: 'All save slots, wallets, career statistics, and 24-hour daily allowance cooldown clocks have been completely wiped and restored to fresh starting baselines.',
        type: 'success'
      });
    } catch (err) {
      console.error('Factory reset error:', err);
    }
  }

  updateTopBarWallets() {
    this.updateDualWalletUI();
  }

  openCasinoLounge(view = 'split') {
    const modal = document.getElementById('casino-lounge-modal');
    if (!modal) return;
    this.setCasinoLoungeView(view);
    this.updateDualWalletUI();

    // Render current slot symbols in lounge
    for (let r = 1; r <= 3; r++) {
      const reel = document.getElementById(`lounge-slot-reel-${r}`);
      if (reel) reel.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(r === 1 ? '7️⃣' : (r === 2 ? '🔥' : '⭐'))}</div>`;
    }

    // Draw initial roulette wheel on lounge canvas
    const canvas = document.getElementById('lounge-roulette-canvas');
    if (canvas && this.drawRouletteWheelOn) {
      this.drawRouletteWheelOn(canvas, 0);
    } else if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(140, 140, 130, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }

    modal.classList.remove('hidden');
  }

  setCasinoLoungeView(view) {
    const body = document.getElementById('casino-lounge-body');
    if (body) body.setAttribute('data-active-view', view);
    document.querySelectorAll('.lounge-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
  }

  initCasinoLounge() {
    this.loungeModal = document.getElementById('casino-lounge-modal');
    this.closeLoungeBtn = document.getElementById('close-casino-lounge-btn');
    this.btnOpenCasinoLounge = document.getElementById('btn-open-casino-lounge');
    this.drawerItemLounge = document.getElementById('drawer-item-lounge');

    if (this.btnOpenCasinoLounge) {
      this.btnOpenCasinoLounge.addEventListener('click', () => this.openCasinoLounge('split'));
    }
    if (this.drawerItemLounge) {
      this.drawerItemLounge.addEventListener('click', () => {
        this.toggleTransitDrawer(false);
        this.showCasinoView('all');
      });
    }
    if (this.closeLoungeBtn && this.loungeModal) {
      this.closeLoungeBtn.addEventListener('click', () => this.loungeModal.classList.add('hidden'));
    }

    // View buttons (split / slots / roulette)
    document.querySelectorAll('.lounge-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const v = e.target.dataset.view || 'split';
        this.setCasinoLoungeView(v);
      });
    });

    // Quick claim button in lounge
    const loungeClaimBtn = document.getElementById('btn-lounge-claim');
    if (loungeClaimBtn) {
      loungeClaimBtn.addEventListener('click', () => {
        const res = EconomyManager.claimMiniGameDaily();
        if (res.success) {
          sounds.playWin();
          this.updateDualWalletUI();
          this.updateEconomyDashboard();
          this.setAnnouncement(`[CLAIMED] Claimed $1,000 Mini-Game Allowance! (30-Minute Cooldown) New balance: $${res.balance.toLocaleString()}`);
        } else {
          sounds.playCheck();
          this.setAnnouncement(`[NOTICE] ${res.message}`);
        }
      });
    }

    // Lounge Slots Wager Preset Buttons
    let loungeSlotWager = 50;
    document.querySelectorAll('.lounge-slots-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.lounge-slots-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const w = btn.dataset.wager;
        if (w === 'max') {
          loungeSlotWager = Math.min(500, EconomyManager.getMiniGameWallet().balance);
        } else {
          loungeSlotWager = Number(w);
        }
      });
    });

    // Lounge Spin Slots
    const btnLoungeSpinSlots = document.getElementById('btn-lounge-spin-slots');
    if (btnLoungeSpinSlots) {
      btnLoungeSpinSlots.addEventListener('click', () => {
        const wallet = EconomyManager.getMiniGameWallet();
        if (wallet.balance < loungeSlotWager || loungeSlotWager <= 0) {
          sounds.playCheck();
          this.showInGameAlert({
            title: 'INSUFFICIENT CASINO FUNDS',
            message: 'Your Casino Wallet balance is too low for this wager. Claim your +$500 Daily Allowance or transfer funds from your savings vault.',
            type: 'warning'
          });
          return;
        }

        // Deduct wager
        wallet.balance -= loungeSlotWager;
        EconomyManager.saveMiniGameWallet(wallet);
        this.updateDualWalletUI();
        SaveManager.recordSlotSpin();

        sounds.playSlotPull();
        btnLoungeSpinSlots.disabled = true;

        const r1 = document.getElementById('lounge-slot-reel-1');
        const r2 = document.getElementById('lounge-slot-reel-2');
        const r3 = document.getElementById('lounge-slot-reel-3');
        [r1, r2, r3].forEach(el => el && el.classList.add('spinning'));

        // Roll reels
        const randSym = () => {
          const rand = Math.random();
          if (rand < 0.05) return '7️⃣';
          if (rand < 0.18) return '🔥';
          if (rand < 0.35) return '⭐';
          if (rand < 0.55) return ['♠️', '♥️', '♦️', '♣️'][Math.floor(Math.random() * 4)];
          return ['👑', '💎', '🍒'][Math.floor(Math.random() * 3)];
        };

        const f1 = randSym();
        const f2 = randSym();
        const f3 = randSym();

        setTimeout(() => {
          if (r1) { r1.classList.remove('spinning'); r1.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(f1)}</div>`; sounds.playSlotStop(); }
        }, 500);
        setTimeout(() => {
          if (r2) { r2.classList.remove('spinning'); r2.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(f2)}</div>`; sounds.playSlotStop(); }
        }, 850);
        setTimeout(() => {
          if (r3) { r3.classList.remove('spinning'); r3.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(f3)}</div>`; sounds.playSlotStop(); }

          // Evaluate win
          let mult = 0;
          let title = 'NO WIN';
          const reels = [f1, f2, f3];
          if (f1 === '7️⃣' && f2 === '7️⃣' && f3 === '7️⃣') { mult = 50; title = 'JACKPOT 777! 50x WIN!'; }
          else if (f1 === '🔥' && f2 === '🔥' && f3 === '🔥') { mult = 30; title = 'SUPER WILD FLARE! 30x WIN!'; }
          else if (f1 === '⭐' && f2 === '⭐' && f3 === '⭐') { mult = 20; title = 'TRIPLE STARS! 20x WIN!'; }
          else if (['♠️', '♥️', '♦️', '♣️'].includes(f1) && f1 === f2 && f2 === f3) { mult = 10; title = 'ROYAL SUITS! 10x WIN!'; }
          else if (reels.includes('🔥') && (f1 === f2 || f2 === f3 || f1 === f3 || reels.filter(s => s === '🔥').length >= 2)) { mult = 5; title = 'WILD BOOST PAIR! 5x WIN!'; }
          else if (f1 === f2 || f2 === f3 || f1 === f3) { mult = 2; title = 'MATCHING PAIR! 2x WIN!'; }
          else if (reels.includes('7️⃣') || reels.includes('⭐')) { mult = 1; title = 'LUCKY PUSH! Wager Returned'; }

          const payout = loungeSlotWager * mult;
          if (payout > 0) {
            wallet.balance += payout;
            EconomyManager.saveMiniGameWallet(wallet);
            sounds.playWin();
          }

          const resEl = document.getElementById('lounge-slots-result');
          const tEl = document.getElementById('lounge-slots-result-title');
          const dEl = document.getElementById('lounge-slots-result-detail');
          if (resEl && tEl && dEl) {
            tEl.textContent = title;
            dEl.textContent = payout > 0 ? `+ $${payout.toLocaleString()}` : `Better luck next spin!`;
            resEl.classList.remove('hidden');
            setTimeout(() => resEl.classList.add('hidden'), 3500);
          }

          this.updateDualWalletUI();
          btnLoungeSpinSlots.disabled = false;
        }, 1200);
      });
    }

    // Lounge Roulette Quick Bet Selection
    let loungeRouletteWager = 10;
    let loungeRouletteBetType = 'color';
    let loungeRouletteBetVal = 'red';

    document.querySelectorAll('.lounge-r-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.lounge-r-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const w = btn.dataset.wager;
        if (w === 'max') {
          loungeRouletteWager = Math.min(500, EconomyManager.getMiniGameWallet().balance);
        } else {
          loungeRouletteWager = Number(w);
        }
        const bTot = document.getElementById('lounge-roulette-total-bet');
        if (bTot) bTot.textContent = `$${loungeRouletteWager}`;
      });
    });

    document.querySelectorAll('.lounge-r-bet-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.lounge-r-bet-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loungeRouletteBetType = btn.dataset.betType;
        loungeRouletteBetVal = btn.dataset.betVal;
        const bTarg = document.getElementById('lounge-roulette-bet-target');
        if (bTarg) bTarg.textContent = (loungeRouletteBetVal || '').toUpperCase();
      });
    });

    // Lounge Spin Roulette
    const btnLoungeSpinRoulette = document.getElementById('btn-lounge-spin-roulette');
    if (btnLoungeSpinRoulette) {
      btnLoungeSpinRoulette.addEventListener('click', () => {
        const wallet = EconomyManager.getMiniGameWallet();
        if (wallet.balance < loungeRouletteWager || loungeRouletteWager <= 0) {
          sounds.playCheck();
          this.showInGameAlert({
            title: 'INSUFFICIENT CASINO FUNDS',
            message: 'Your Casino Wallet balance is too low for this wager. Claim your +$500 Daily Allowance or transfer funds from your savings vault.',
            type: 'warning'
          });
          return;
        }

        wallet.balance -= loungeRouletteWager;
        EconomyManager.saveMiniGameWallet(wallet);
        this.updateDualWalletUI();
        SaveManager.recordRouletteSpin();

        sounds.playChip();
        btnLoungeSpinRoulette.disabled = true;

        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        const winningNumber = Math.floor(Math.random() * 37);
        const isRed = redNumbers.includes(winningNumber);
        const color = winningNumber === 0 ? 'green' : (isRed ? 'red' : 'black');
        const isEven = winningNumber !== 0 && winningNumber % 2 === 0;

        let won = false;
        let payout = 0;

        if (loungeRouletteBetType === 'color' && loungeRouletteBetVal === color) {
          won = true; payout = loungeRouletteWager * 2;
        } else if (loungeRouletteBetType === 'parity') {
          if (loungeRouletteBetVal === 'even' && isEven) { won = true; payout = loungeRouletteWager * 2; }
          else if (loungeRouletteBetVal === 'odd' && !isEven && winningNumber !== 0) { won = true; payout = loungeRouletteWager * 2; }
        } else if (loungeRouletteBetType === 'number' && Number(loungeRouletteBetVal) === winningNumber) {
          won = true; payout = loungeRouletteWager * 36;
        }

        setTimeout(() => {
          if (won) {
            wallet.balance += payout;
            EconomyManager.saveMiniGameWallet(wallet);
            sounds.playWin();
          }

          const resEl = document.getElementById('lounge-roulette-result');
          const ballEl = document.getElementById('lounge-roulette-ball');
          const textEl = document.getElementById('lounge-roulette-text');
          if (resEl && ballEl && textEl) {
            ballEl.textContent = winningNumber.toString();
            ballEl.className = `roulette-ball-badge r-color-${color}`;
            textEl.textContent = won ? `Landed on ${winningNumber} ${color.toUpperCase()}! Won $${payout.toLocaleString()}!` : `Landed on ${winningNumber} ${color.toUpperCase()}! No win.`;
            resEl.classList.remove('hidden');
            setTimeout(() => resEl.classList.add('hidden'), 4000);
          }

          this.updateDualWalletUI();
          btnLoungeSpinRoulette.disabled = false;
        }, 1500);
      });
    }

    // Lounge transfer shortcut
    const btnLoungeTransfer = document.getElementById('btn-lounge-transfer');
    if (btnLoungeTransfer) {
      btnLoungeTransfer.addEventListener('click', () => {
        if (this.loungeModal) this.loungeModal.classList.add('hidden');
        const trModal = document.getElementById('transfer-modal');
        if (trModal) trModal.classList.remove('hidden');
        this.updateTransferModal();
      });
    }
  }


  updateAudioControlsUI() {
    const isMuted = !sounds.enabled;

    // 1. Menu sound pill button
    if (this.menuSoundBtn) {
      this.menuSoundBtn.classList.toggle('audio-muted', isMuted);
      this.menuSoundBtn.title = isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects';
      this.menuSoundBtn.innerHTML = `
        <span class="btn-icon">
          <svg class="btn-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="${isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(253,224,71,0.2)'}" stroke="${isMuted ? '#ef4444' : '#fde047'}" stroke-width="2"/>
            ${isMuted 
              ? '<path d="M22 9l-6 6M16 9l6 6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>' 
              : '<path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" stroke="#fde047" stroke-width="1.8" stroke-linecap="round"/>'}
          </svg>
        </span> Sound: ${isMuted ? 'MUTED' : 'ON'}`;
    }

    // 2. Table header sound button
    if (this.soundToggleBtn) {
      this.soundToggleBtn.classList.toggle('audio-muted', isMuted);
      this.soundToggleBtn.title = isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects';
      this.soundToggleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:3px">
          <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="${isMuted ? '#ef4444' : '#fde047'}" stroke-width="2"/>
          ${isMuted 
            ? '<path d="M22 9l-6 6M16 9l6 6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>' 
            : '<path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="#fde047" stroke-width="1.8" stroke-linecap="round"/>'}
        </svg> ${isMuted ? 'Muted' : 'Sound'}`;
    }

    // 3. Top-bar persistent quick sound toggle
    if (this.btnQuickSound) {
      this.btnQuickSound.title = isMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio Synthesizer';
      this.btnQuickSound.classList.toggle('audio-muted', isMuted);
      this.btnQuickSound.innerHTML = `
        <svg id="top-sound-svg" class="btn-svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="${isMuted ? '#ef4444' : '#fde047'}" stroke-width="2"/>
          ${isMuted 
            ? '<path d="M22 9l-6 6M16 9l6 6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>' 
            : '<path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="#fde047" stroke-width="1.8" stroke-linecap="round"/>'}
        </svg>`;
    }

    // 4. Settings modal toggle
    const settingSoundToggle = document.getElementById('setting-sound-toggle');
    if (settingSoundToggle) {
      settingSoundToggle.checked = sounds.enabled;
    }
  }

  handleTransitNavigation(dest) {
    if (dest === 'blackjack') {
      this.requirePlayerName(() => this.openBlackjackSetup(this.activeSlot || 1));
    } else if (dest === 'texas') {
      this.teleportToTexasHoldem();
    } else if (dest === 'exclusive') {
      this.promptOnlineRoomPassword();
    } else if (dest === 'slots') {
      this.requirePlayerName(() => this.showCasinoView('slots'));
    } else if (dest === 'roulette') {
      this.requirePlayerName(() => this.showCasinoView('roulette'));
    } else if (dest === 'craps') {
      this.requirePlayerName(() => this.showCasinoView('craps'));
    } else if (dest === 'casino' || dest === 'lounge') {
      this.requirePlayerName(() => this.showCasinoView('all'));
    } else if (dest === 'vault' || dest === 'transfer') {
      this.openTransferModal();
    }
  }

  teleportToTexasHoldem() {
    this.setGameVariant('texas');
    const mainMenu = document.getElementById('main-menu');
    const casinoView = document.getElementById('casino-view');
    if (casinoView) casinoView.classList.add('hidden');
    if (mainMenu) mainMenu.classList.add('hidden');

    if (this.activeSlot) {
      this.showGameView();
      if (!this.handInProgress) this.startNewHand();
    } else {
      const s1 = SaveManager.getSave(1);
      if (s1 && s1.chips > 0) {
        this.loadGame(1);
      } else {
        this.startNewGame(1, 'medium', 1000);
      }
    }
    sounds.playChip();
    this.setAnnouncement("[TELEPORT] Teleported to Solar Texas Hold'em Arena!");
  }

  setGameVariant(v) {
    this.variant = v;
    localStorage.setItem('royal_poker_active_variant', v);
    const badge = document.getElementById('nav-variant-badge');
    if (badge) {
      if (v === 'shortDeck') badge.textContent = "SHORT DECK (6+)";
      else if (v === 'omaha') badge.textContent = "OMAHA (4-CARD)";
      else if (v === 'exclusive') badge.textContent = "EXCLUSIVE ROOM";
      else badge.textContent = "TEXAS HOLD'EM";
    }
  }

  openStatsModal() {
    if (!this.statsModal) return;
    const stats = SaveManager.getGlobalStats();
    const vaultBal = EconomyManager.getCumulativeSavings();

    const sHands = document.getElementById('stat-career-hands');
    const sWon = document.getElementById('stat-career-won');
    const sRate = document.getElementById('stat-career-winrate');
    const sPot = document.getElementById('stat-career-biggest-pot');
    const sStreak = document.getElementById('stat-career-streak');
    const sBest = document.getElementById('stat-career-besthand');

    if (sHands) sHands.textContent = stats.totalHands || 0;
    if (sWon) sWon.textContent = stats.handsWon || 0;
    const rate = stats.totalHands > 0 ? Math.round(((stats.handsWon || 0) / stats.totalHands) * 100) : 0;
    if (sRate) sRate.textContent = `${rate}%`;
    if (sPot) sPot.textContent = `$${(stats.biggestPot || 0).toLocaleString()}`;
    if (sStreak) sStreak.textContent = stats.bestStreak || 0;
    if (sBest) sBest.textContent = stats.bestHandDesc || 'High Card';

    const sVault = document.getElementById('stat-career-vault');
    const sCashed = document.getElementById('stat-career-cashed');
    const sTex = document.getElementById('stat-career-texas') || document.getElementById('stat-texas-hands');
    const sShort = document.getElementById('stat-career-short') || document.getElementById('stat-shortdeck-hands');
    const sOmaha = document.getElementById('stat-career-omaha') || document.getElementById('stat-omaha-hands');
    const sExcl = document.getElementById('stat-career-exclusive') || document.getElementById('stat-exclusive-hands');
    const sMinigames = document.getElementById('stat-career-minigames');
    const sSlots = document.getElementById('stat-slots-spins');
    const sRoulette = document.getElementById('stat-roulette-spins');

    if (sVault) sVault.textContent = `$${vaultBal.toLocaleString()}`;
    if (sCashed) sCashed.textContent = `$${(stats.totalCashedOut || 0).toLocaleString()}`;
    if (sTex) sTex.textContent = stats.texasHands || (stats.totalHands || 0);
    if (sShort) sShort.textContent = stats.shortDeckHands || 0;
    if (sOmaha) sOmaha.textContent = stats.omahaHands || 0;
    if (sExcl) sExcl.textContent = stats.exclusiveHands || (stats.onlineHandsPlayed || 0);
    if (sMinigames) sMinigames.textContent = `${stats.slotsSpins || 0} / ${stats.rouletteSpins || 0}`;
    if (sSlots) sSlots.textContent = stats.slotsSpins || 0;
    if (sRoulette) sRoulette.textContent = stats.rouletteSpins || 0;

    this.statsModal.classList.remove('hidden');
  }

  openSettingsModal() {
    if (!this.settingsModal) return;
    const settingSoundToggle = document.getElementById('setting-sound-toggle');
    if (settingSoundToggle) settingSoundToggle.checked = sounds.enabled;
    const volSlider = document.getElementById('setting-volume-slider');
    const volVal = document.getElementById('setting-volume-val');
    if (volSlider) {
      volSlider.value = Math.round(sounds.volume * 100);
      if (volVal) volVal.textContent = `${volSlider.value}%`;
    }
    let currentTheme = localStorage.getItem('solar_poker_bg_theme') || 'ultra';
    if (currentTheme === 'high') currentTheme = 'ultra';
    if (currentTheme === 'low') currentTheme = 'night';

    ['ultra', 'balanced', 'night', 'minimal'].forEach(t => {
      const card = document.getElementById(`bg-card-${t}`);
      if (card) {
        card.classList.toggle('active', t === currentTheme);
      }
    });
    const bgCardHigh = document.getElementById('bg-card-high');
    const bgCardLow = document.getElementById('bg-card-low');
    if (bgCardHigh) bgCardHigh.classList.toggle('active', currentTheme === 'ultra');
    if (bgCardLow) bgCardLow.classList.toggle('active', currentTheme === 'night');

    this.settingsModal.classList.remove('hidden');
  }

  openCashoutModal() {
    if (!this.cashoutModal) return;
    const hero = this.players[0];
    const stack = hero ? hero.chips : 0;
    const vault = EconomyManager.getCumulativeSavings();
    const curStackEl = document.getElementById('cashout-chips-val') || document.getElementById('cashout-current-stack');
    const vaultTotEl = document.getElementById('cashout-vault-total');
    if (curStackEl) curStackEl.textContent = `$${stack.toLocaleString()}`;
    if (vaultTotEl) vaultTotEl.textContent = `$${(vault + stack).toLocaleString()}`;
    this.cashoutModal.classList.remove('hidden');
  }

  confirmCashout() {
    const hero = this.players[0];
    const amountToCash = hero ? hero.chips : 0;
    if (amountToCash <= 0) {
      sounds.playCheck();
      this.showInGameAlert({ title: 'NO CHIPS TO CASH OUT', message: 'You have no active chips at the table to cash out into your savings vault.' });
      if (this.cashoutModal) this.cashoutModal.classList.add('hidden');
      return;
    }

    EconomyManager.cashOutRunToSavings(this.activeSlot, amountToCash);
    hero.chips = 0;
    hero.knockedOut = true;

    sounds.playWin();
    if (this.cashoutModal) this.cashoutModal.classList.add('hidden');
    this.setAnnouncement(`[VAULT] Cashed out $${amountToCash.toLocaleString()} into Cumulative Poker Savings Vault!`);
    this.updateDualWalletUI();
    this.showMenuView();
  }

  updateDualWalletUI() {
    const vaultBal = EconomyManager.getCumulativeSavings();
    const miniWallet = EconomyManager.getMiniGameWallet();

    const vaultEl = document.getElementById('nav-poker-vault-val');
    if (vaultEl) vaultEl.textContent = `$${vaultBal.toLocaleString()}`;

    const miniEl = document.getElementById('nav-minigame-val');
    if (miniEl) miniEl.textContent = `$${miniWallet.balance.toLocaleString()}`;

    const drawerVaultEl = document.getElementById('d-vault-savings') || document.getElementById('drawer-vault-val');
    if (drawerVaultEl) drawerVaultEl.textContent = `$${vaultBal.toLocaleString()}`;

    const drawerMiniEl = document.getElementById('d-vault-minigame') || document.getElementById('d-vault-mini') || document.getElementById('drawer-mini-val');
    if (drawerMiniEl) drawerMiniEl.textContent = `$${miniWallet.balance.toLocaleString()}`;

    const menuVaultEl = document.getElementById('menu-poker-vault-val');
    if (menuVaultEl) menuVaultEl.textContent = `$${vaultBal.toLocaleString()}`;

    const menuMiniEl = document.getElementById('menu-minigame-val');
    if (menuMiniEl) menuMiniEl.textContent = `$${miniWallet.balance.toLocaleString()}`;

    const portalMiniEl = document.getElementById('portal-minigame-val');
    if (portalMiniEl) portalMiniEl.textContent = `$${miniWallet.balance.toLocaleString()}`;

    const casinoPageWalletEl = document.getElementById('casino-page-wallet-val');
    if (casinoPageWalletEl) casinoPageWalletEl.textContent = `$${miniWallet.balance.toLocaleString()}`;

    const loungeWalletEl = document.getElementById('lounge-wallet-balance');
    if (loungeWalletEl) loungeWalletEl.textContent = `$${miniWallet.balance.toLocaleString()}`;
  }

  renderAvatar(seatIdx, avatarKey) {
    renderAvatar(seatIdx, avatarKey);
  }


  getBaselineBlinds(stage = 1) {
    if (stage === 1) return { sb: 10, bb: 20 };
    if (stage === 2) return { sb: 25, bb: 50 };
    if (stage === 3) return { sb: 50, bb: 100 };
    const mult = Math.pow(2, stage - 3);
    return { sb: 50 * mult, bb: 100 * mult };
  }

  getBlindsForHand(h, stage = 1) {
    const base = this.getBaselineBlinds(stage);
    let mult = 1;
    if (h > 20) mult = 16;
    else if (h > 15) mult = 8;
    else if (h > 10) mult = 4;
    else if (h > 5) mult = 2;
    return { sb: base.sb * mult, bb: base.bb * mult };
  }

  bindDOM() {
    this.mainMenuView = document.getElementById('main-menu');
    this.gameView = document.getElementById('game-view');
    this.btnBackMenu = document.getElementById('btn-back-menu');
    this.menuRulesBtn = document.getElementById('menu-rules-btn');
    this.menuSoundBtn = document.getElementById('menu-sound-btn');
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.rulesBtn = document.getElementById('rules-btn');

    // Modals
    this.rulesModal = document.getElementById('rules-modal');
    this.closeRulesBtn = document.getElementById('close-rules-btn');
    this.diffModal = document.getElementById('difficulty-modal');
    this.closeDiffBtn = document.getElementById('close-diff-modal-btn');
    this.deleteModal = document.getElementById('confirm-delete-modal');
    this.closeDeleteBtn = document.getElementById('close-delete-modal-btn');
    this.btnConfirmDelete = document.getElementById('btn-confirm-delete');
    this.btnCancelDelete = document.getElementById('btn-cancel-delete');
    this.authModal = document.getElementById('online-auth-modal');
    this.closeAuthBtn = document.getElementById('close-auth-modal-btn');
    this.btnSubmitAuth = document.getElementById('btn-submit-auth');
    this.btnCancelAuth = document.getElementById('btn-cancel-auth');
    this.roomPassInput = document.getElementById('room-password-input');
    this.roomNameInput = document.getElementById('room-player-name-input');
    this.authErrorMsg = document.getElementById('auth-error-msg');
    this.btnOpenOnlineRoom = document.getElementById('btn-open-online-room');
    this.onlineRoomBadge = document.getElementById('online-room-badge');
    this.onlineRoomStatusText = document.getElementById('online-room-status-text');
    this.btnCopyInvite = document.getElementById('btn-copy-invite');

    // 5s Countdown & Mid-Round Waiting Overlays
    this.countdownOverlay = document.getElementById('dealer-countdown-overlay');
    this.countdownNumber = document.getElementById('countdown-number');
    this.waitingRoundOverlay = document.getElementById('waiting-round-overlay');
    this.waitingRoundText = document.getElementById('waiting-round-text');
    this.btnPauseLeaveRoom = document.getElementById('btn-pause-leave-room');

    // 15-Second Turn Timer Elements
    this.turnTimerBar = document.getElementById('turn-timer-bar');
    this.turnTimerText = document.getElementById('turn-timer-text');
    this.turnTimerFill = document.getElementById('turn-timer-fill');

    // Back button elements
    this.btnBackIcon = document.getElementById('btn-back-icon');
    this.btnBackLabel = document.getElementById('btn-back-label');

    // Arena elements
    this.announcementEl = document.getElementById('dealer-announcement');
    this.potEl = document.getElementById('pot-amount');
    this.sidePotWrapper = document.getElementById('side-pot-wrapper');
    this.sidePotText = document.getElementById('side-pot-text');
    this.handNumEl = document.getElementById('hand-number');
    this.blindsIndicatorEl = document.getElementById('blinds-indicator');
    this.blindsBanner = document.getElementById('blinds-banner');
    this.blindsBannerText = document.getElementById('blinds-banner-text');
    this.stageBadgeEl = document.getElementById('round-stage-badge');
    this.actionPanelEl = document.getElementById('action-controls');
    this.sliderEl = document.getElementById('bet-slider');
    this.sliderValEl = document.getElementById('bet-slider-display');
    this.btnFold = document.getElementById('btn-fold');
    this.btnCheckCall = document.getElementById('btn-check-call');
    this.checkCallText = document.getElementById('check-call-text');
    this.btnRaise = document.getElementById('btn-raise');
    this.raiseText = document.getElementById('raise-text');
    this.btnAllin = document.getElementById('btn-allin');
    this.btnNextHand = document.getElementById('btn-next-hand');
    this.heroHandBadge = document.getElementById('hero-hand-rank-badge');

    // Back to Menu (Mid-round lockdown in online room!)
    if (this.btnBackMenu) this.btnBackMenu.addEventListener('click', () => {
      if (this.isOnlineRoom && this.handInProgress) {
        this.setAnnouncement('[LOCKDOWN] Mid-round lockdown active! You can only leave during the 5-second pause between hands.');
        sounds.playCheck();
        return;
      }
      if (!this.isOnlineRoom) {
        this.saveCurrentGame();
      } else {
        this.leaveOnlineRoom();
      }
      this.showMenuView();
    });

    // Pause Screen Leave Room button
    if (this.btnPauseLeaveRoom) {
      this.btnPauseLeaveRoom.addEventListener('click', () => {
        this.leaveOnlineRoom();
      });
    }

    // Rules Modal
    const openRules = () => this.rulesModal.classList.remove('hidden');
    if (this.rulesBtn) this.rulesBtn.addEventListener('click', openRules);
    if (this.menuRulesBtn) this.menuRulesBtn.addEventListener('click', openRules);
    if (this.closeRulesBtn && this.rulesModal) this.closeRulesBtn.addEventListener('click', () => this.rulesModal.classList.add('hidden'));

    // Rules Tabs
    const tabBtns = document.querySelectorAll('.rules-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.rules-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

    // Unified Sound toggle handler for all buttons
    const handleAudioToggle = () => {
      sounds.toggle();
      this.updateAudioControlsUI();
    };
    if (this.menuSoundBtn) this.menuSoundBtn.addEventListener('click', handleAudioToggle);
    if (this.soundToggleBtn) this.soundToggleBtn.addEventListener('click', handleAudioToggle);

    // Global Delegating Tactile Click Sound for Interactive UI Controls
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, .nav-icon-btn, .menu-pill-btn, .modal-tab-btn, .rules-tab-btn, .save-slot-card, .showcase-card, .diff-card, .craps-quick-portal-btn, .transit-drawer-link');
      if (btn && !btn.classList.contains('sound-toggle') && btn.id !== 'btn-quick-sound' && btn.id !== 'menu-sound-btn' && btn.id !== 'sound-toggle-btn') {
        sounds.playClick();
      }
    });

    // Online Room Auth
    if (this.btnOpenOnlineRoom) this.btnOpenOnlineRoom.addEventListener('click', () => this.promptOnlineRoomPassword());
    if (this.closeAuthBtn && this.authModal) this.closeAuthBtn.addEventListener('click', () => this.authModal.classList.add('hidden'));
    if (this.btnCancelAuth && this.authModal) this.btnCancelAuth.addEventListener('click', () => this.authModal.classList.add('hidden'));
    if (this.btnSubmitAuth) this.btnSubmitAuth.addEventListener('click', () => this.handleOnlineAuthSubmit());
    this.roomPassInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleOnlineAuthSubmit();
    });

    // Copy Invite Link (Safe link, never leaks password)
    if (this.btnCopyInvite) this.btnCopyInvite.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}?room=join`;
      navigator.clipboard.writeText(url).then(() => {
        this.btnCopyInvite.textContent = 'Copied to Clipboard!';
        setTimeout(() => this.btnCopyInvite.textContent = 'Share Link', 2000);
      }).catch(() => {
        prompt('Copy room invite link:', url);
      });
    });

    // Difficulty selection cards
    document.querySelectorAll('.diff-card').forEach(card => {
      card.addEventListener('click', () => {
        const diff = card.dataset.difficulty;
        this.diffModal.classList.add('hidden');
        if (this.pendingSlotTarget !== null) {
          this.openBuyInModal(this.pendingSlotTarget, diff, false);
        }
      });
    });
    if (this.closeDiffBtn && this.diffModal) this.closeDiffBtn.addEventListener('click', () => this.diffModal.classList.add('hidden'));

    // Delete Modal
    if (this.closeDeleteBtn && this.deleteModal) this.closeDeleteBtn.addEventListener('click', () => this.deleteModal.classList.add('hidden'));
    if (this.btnCancelDelete && this.deleteModal) this.btnCancelDelete.addEventListener('click', () => this.deleteModal.classList.add('hidden'));
    if (this.btnConfirmDelete) this.btnConfirmDelete.addEventListener('click', () => {
      if (this.pendingDeleteSlot) {
        SaveManager.deleteSlot(this.pendingDeleteSlot);
        this.pendingDeleteSlot = null;
        this.deleteModal.classList.add('hidden');
        this.renderMainMenuSlots();
      }
    });

    // Slider
    if (this.sliderEl) this.sliderEl.addEventListener('input', () => {
      const val = Number(this.sliderEl.value);
      this.sliderValEl.textContent = `$${val}`;
      if (this.currentBet === 0) {
        this.raiseText.textContent = `Bet $${val}`;
      } else {
        this.raiseText.textContent = `Raise to $${val}`;
      }
    });

    // Quick Bet Buttons
    document.getElementById('qb-min').addEventListener('click', () => {
      this.sliderEl.value = this.sliderEl.min;
      this.sliderEl.dispatchEvent(new Event('input'));
    });
    document.getElementById('qb-half-pot').addEventListener('click', () => {
      const pot = this.getTotalPot();
      const target = Math.min(Number(this.sliderEl.max), Math.max(Number(this.sliderEl.min), Math.floor(pot * 0.5)));
      this.sliderEl.value = target;
      this.sliderEl.dispatchEvent(new Event('input'));
    });
    document.getElementById('qb-pot').addEventListener('click', () => {
      const pot = this.getTotalPot();
      const target = Math.min(Number(this.sliderEl.max), Math.max(Number(this.sliderEl.min), pot));
      this.sliderEl.value = target;
      this.sliderEl.dispatchEvent(new Event('input'));
    });
    document.getElementById('qb-max').addEventListener('click', () => {
      this.sliderEl.value = this.sliderEl.max;
      this.sliderEl.dispatchEvent(new Event('input'));
    });

    // Action buttons
    if (this.btnFold) this.btnFold.addEventListener('click', () => this.handleActionClick('fold'));
    if (this.btnCheckCall) this.btnCheckCall.addEventListener('click', () => this.handleActionClick('check_call'));
    if (this.btnRaise) this.btnRaise.addEventListener('click', () => this.handleActionClick('raise', Number(this.sliderEl ? this.sliderEl.value : 0)));
    if (this.btnAllin) this.btnAllin.addEventListener('click', () => this.handleActionClick('allin'));

    // Deal Next Hand button
    if (this.btnNextHand) this.btnNextHand.addEventListener('click', () => {
      this.btnNextHand.classList.add('hidden');
      if (this.isOnlineRoom && !this.isHost) {
        // Guest waits for host
        return;
      }
      this.startNewHand();
    });

    // Custom Profile & Permanent Identity Callsign
    this.usernameInput = document.getElementById('player-username-input');
    this.btnSaveUsername = document.getElementById('btn-save-username');
    if (this.usernameInput) {
      const savedName = localStorage.getItem('royal_poker_username') || 'High Roller';
      this.usernameInput.value = savedName;
      this.players[0].name = savedName;

      const isLocked = localStorage.getItem('royal_poker_name_locked') === 'true';

      const updateLockUI = (locked) => {
        if (!this.usernameInput) return;
        if (locked) {
          this.usernameInput.readOnly = true;
          this.usernameInput.disabled = true;
          this.usernameInput.classList.add('locked-input');
          if (this.btnSaveUsername) {
            this.btnSaveUsername.classList.add('locked-btn');
            this.btnSaveUsername.title = 'Player identity is permanent and cannot be modified. Factory reset in settings to reset.';
            this.btnSaveUsername.innerHTML = '<svg class="lock-svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#fcd34d" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#fcd34d" stroke-width="2"/></svg><span>Locked</span>';
          }
        } else {
          this.usernameInput.readOnly = false;
          this.usernameInput.disabled = false;
          this.usernameInput.classList.remove('locked-input');
          if (this.btnSaveUsername) {
            this.btnSaveUsername.classList.remove('locked-btn');
            this.btnSaveUsername.title = 'Save Permanent Callsign';
            this.btnSaveUsername.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Save</span>';
          }
        }
      };

      updateLockUI(isLocked);

      const handleNameAction = () => {
        const currentlyLocked = localStorage.getItem('royal_poker_name_locked') === 'true';
        if (currentlyLocked) {
          sounds.playError();
          this.showInGameAlert({
            title: 'CALLSIGN PERMANENTLY LOCKED',
            message: `Your callsign "${this.usernameInput.value}" is permanent. Only a complete Factory Reset in Settings can reset your identity and leaderboard standing.`
          });
          return;
        }

        const val = (this.usernameInput.value || '').trim();
        if (val && val.toLowerCase() !== 'you') {
          localStorage.setItem('royal_poker_username', val);
          localStorage.setItem('royal_poker_name_locked', 'true');
          this.players[0].name = val;
          const heroEl = document.getElementById('hero-name');
          if (heroEl) heroEl.textContent = val;
          updateLockUI(true);
          this.renderMainMenuSlots();
          sounds.playWin();
          this.showInGameAlert({
            title: 'IDENTITY PERMANENTLY BOUND',
            message: `Player callsign "${val}" has been permanently registered. Your global leaderboard record will now track this callsign.`
          });
        }
      };

      if (this.btnSaveUsername) {
        this.btnSaveUsername.addEventListener('click', handleNameAction);
      }
      this.usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleNameAction();
      });
      this.usernameInput.addEventListener('click', () => {
        if (localStorage.getItem('royal_poker_name_locked') === 'true') {
          handleNameAction();
        }
      });
    }

    // Stage indicator & Hand History drawer
    this.stageIndicator = document.getElementById('stage-indicator');
    this.btnHandHistory = document.getElementById('btn-hand-history');
    this.historyModal = document.getElementById('hand-history-panel');
    this.closeHistoryBtn = document.getElementById('close-history-btn');
    this.btnClearHistory = document.getElementById('btn-clear-history');
    this.historyList = document.getElementById('hand-history-list');
    this.historyCountEl = document.getElementById('history-total-count');

    if (this.btnHandHistory && this.historyModal) {
      this.btnHandHistory.addEventListener('click', () => {
        this.renderHandHistory();
        this.historyModal.classList.remove('hidden');
      });
    }
    if (this.closeHistoryBtn && this.historyModal) {
      this.closeHistoryBtn.addEventListener('click', () => this.historyModal.classList.add('hidden'));
    }
    if (this.btnClearHistory) {
      this.btnClearHistory.addEventListener('click', () => {
        this.handHistory = [];
        this.renderHandHistory();
      });
    }

    // European Roulette Mini-Game
    this.btnOpenRoulette = document.getElementById('btn-open-roulette');
    this.rouletteModal = document.getElementById('roulette-modal');
    this.closeRouletteBtn = document.getElementById('close-roulette-btn');
    this.btnSpinRoulette = document.getElementById('btn-spin-roulette');
    this.btnClearRoulette = document.getElementById('btn-clear-roulette');

    if (this.btnOpenRoulette && this.rouletteModal) {
      this.btnOpenRoulette.addEventListener('click', () => {
        this.openRouletteModal();
      });
    }
    if (this.closeRouletteBtn && this.rouletteModal) {
      this.closeRouletteBtn.addEventListener('click', () => {
        this.rouletteModal.classList.add('hidden');
      });
    }
    if (this.btnClearRoulette) {
      this.btnClearRoulette.addEventListener('click', () => this.clearRouletteBets());
    }
    if (this.btnSpinRoulette) {
      this.btnSpinRoulette.addEventListener('click', () => this.spinRouletteWheel());
    }

    // Stage Victory Modal
    this.stageVictoryModal = document.getElementById('stage-victory-modal');
    this.btnAdvanceStage = document.getElementById('btn-advance-stage');
    this.btnVictoryMenu = document.getElementById('btn-victory-menu');
    if (this.btnAdvanceStage) {
      this.btnAdvanceStage.addEventListener('click', () => {
        if (this.stageVictoryModal) this.stageVictoryModal.classList.add('hidden');
        this.advanceToNextStage();
      });
    }
    if (this.btnVictoryMenu) {
      this.btnVictoryMenu.addEventListener('click', () => {
        if (this.stageVictoryModal) this.stageVictoryModal.classList.add('hidden');
        this.showMenuView();
      });
    }

    // Permadeath Game Over Modal
    this.gameOverModal = document.getElementById('game-over-modal');
    this.btnQuickRebuy = document.getElementById('btn-quick-rebuy');
    this.btnGameoverMenu = document.getElementById('btn-gameover-menu');
    if (this.btnQuickRebuy) {
      this.btnQuickRebuy.addEventListener('click', () => {
        if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
        this.startNewGame(this.activeSlot || 1, this.difficulty || 'medium');
      });
    }
    if (this.btnGameoverMenu) {
      this.btnGameoverMenu.addEventListener('click', () => {
        if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
        this.showMenuView();
      });
    }
  }

  // ==========================================================================
  // VIEW NAVIGATION & STATS
  // ==========================================================================
  showMenuView() {
    this.clearTurnTimer();
    const casinoView = document.getElementById('casino-view');
    if (casinoView) casinoView.classList.add('hidden');
    this.gameView.classList.add('hidden');
    this.mainMenuView.classList.remove('hidden');
    this.countdownOverlay.classList.add('hidden');
    this.waitingRoundOverlay.classList.add('hidden');
    this.updateMenuLockState();
    this.updateGlobalStatsUI();
    this.updateDualWalletUI();
    this.renderMainMenuSlots();
    if (this.btnCashoutExit) this.btnCashoutExit.classList.add('hidden');
    if (this.btnTopCashout) this.btnTopCashout.classList.add('hidden');
  }

  showGameView() {
    this.mainMenuView.classList.add('hidden');
    this.gameView.classList.remove('hidden');
    this.updateMenuLockState();
    if (this.btnCashoutExit) this.btnCashoutExit.classList.remove('hidden');
    if (this.btnTopCashout) this.btnTopCashout.classList.remove('hidden');
  }

  updateMenuLockState() {
    if (!this.btnBackMenu) return;
    if (this.isOnlineRoom && this.handInProgress) {
      this.btnBackMenu.classList.add('menu-locked');
      if (this.btnBackIcon) this.btnBackIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="2"/></svg>';
      if (this.btnBackLabel) this.btnBackLabel.textContent = 'Locked';
      this.btnBackMenu.title = 'You cannot leave while a hand is in progress!';
    } else {
      this.btnBackMenu.classList.remove('menu-locked');
      if (this.btnBackIcon) this.btnBackIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z" stroke="currentColor" stroke-width="2"/></svg>';
      if (this.btnBackLabel) this.btnBackLabel.textContent = 'Menu';
      this.btnBackMenu.title = 'Return to Main Menu';
    }
  }

  startTurnTimer(player) {
    this.clearTurnTimer();
    if (!this.isOnlineRoom) return; // 15-SECOND LIMIT ONLY IN EXCLUSIVE ROOM!

    if (!this.turnTimerBar) return;
    this.turnTimerBar.classList.remove('hidden', 'urgent');
    this.turnSecondsLeft = 15;
    this.turnTimerText.textContent = '15s';
    this.turnTimerFill.style.width = '100%';

    this.turnTimerInterval = setInterval(() => {
      this.turnSecondsLeft--;
      if (this.turnSecondsLeft > 0) {
        this.turnTimerText.textContent = `${this.turnSecondsLeft}s`;
        this.turnTimerFill.style.width = `${(this.turnSecondsLeft / 15) * 100}%`;
        if (this.turnSecondsLeft <= 5) {
          this.turnTimerBar.classList.add('urgent');
          sounds.playCheck();
        }
      } else {
        this.clearTurnTimer();
        // 15-second time limit expired: MANDATORY AUTO-FOLD!
        this.logMessage(`[TIMEOUT] 15s turn limit expired for ${player.name} - Auto-folded!`, 'turn');
        this.setAnnouncement(`[TIMEOUT] Turn time expired for ${player.name} — Auto-folded!`);
        this.handleActionClick('fold');
      }
    }, 1000);
  }

  clearTurnTimer() {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = null;
    }
    if (this.turnTimerBar) {
      this.turnTimerBar.classList.add('hidden');
      this.turnTimerBar.classList.remove('urgent');
    }
  }

  leaveOnlineRoom() {
    this.clearTurnTimer();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.remoteTurnWatchdog) {
      clearTimeout(this.remoteTurnWatchdog);
      this.remoteTurnWatchdog = null;
    }
    if (this.joiningCountdownTimer) {
      clearInterval(this.joiningCountdownTimer);
      this.joiningCountdownTimer = null;
    }
    this.countdownOverlay.classList.add('hidden');
    this.waitingRoundOverlay.classList.add('hidden');
    this.isOnlineRoom = false;
    this.isHost = false;
    this.handInProgress = false;
    this.onlineRoomBadge.classList.add('hidden');

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    if (this.hostConn) {
      try { this.hostConn.close(); } catch (e) {}
      this.hostConn = null;
    }
    this.guestConnections = [];
    this.updateMenuLockState();
    this.showMenuView();
  }

  updateGlobalStatsUI() {
    const stats = SaveManager.getGlobalStats();
    const totalEl = document.getElementById('stat-total-hands');
    const wonEl = document.getElementById('stat-hands-won');
    const rateEl = document.getElementById('stat-win-rate');
    const potEl = document.getElementById('stat-biggest-pot');
    const streakEl = document.getElementById('stat-best-streak');
    const handEl = document.getElementById('stat-best-hand');
    const roomEl = document.getElementById('stat-room-status');

    if (totalEl) totalEl.textContent = (stats.totalHands || 0).toLocaleString();
    if (wonEl) wonEl.textContent = (stats.handsWon || 0).toLocaleString();
    if (rateEl) {
      const rate = (stats.totalHands > 0) ? Math.round(((stats.handsWon || 0) / stats.totalHands) * 100) : 0;
      rateEl.textContent = `${rate}%`;
    }
    if (potEl) potEl.textContent = `$${(stats.biggestPot || 0).toLocaleString()}`;
    if (streakEl) streakEl.textContent = (stats.bestStreak || 0).toString();
    if (handEl) handEl.textContent = stats.bestHandDesc || 'High Card';
    if (roomEl) {
      const onlineCount = stats.onlineHandsPlayed || 0;
      roomEl.textContent = onlineCount > 0 ? `Active (${onlineCount} played)` : 'Joinable';
    }
  }

  // ==========================================================================
  // EXCLUSIVE ROOM (No Password Leaked, P2P Peer Coordination)
  // ==========================================================================
  promptOnlineRoomPassword() {
    this.roomPassInput.value = '';
    this.authErrorMsg.classList.add('hidden');
    this.authModal.classList.remove('hidden');
    setTimeout(() => this.roomPassInput.focus(), 150);
  }

  handleOnlineAuthSubmit() {
    const entered = this.roomPassInput.value.trim().toLowerCase();
    // Validate secret room password without ever showing it in UI text
    if (entered !== 'helloworld') {
      this.authErrorMsg.classList.remove('hidden');
      return;
    }

    const playerName = this.roomNameInput.value.trim() || 'Player';
    this.authModal.classList.add('hidden');
    this.connectToOnlineRoom(playerName);
  }

  connectToOnlineRoom(playerName) {
    this.isOnlineRoom = true;
    this.onlineRoomBadge.classList.remove('hidden');
    this.onlineRoomStatusText.textContent = 'Connecting...';

    // Reset table for fresh $1,000 online experience
    this.players[0].name = playerName;
    this.players[0].chips = 1000;
    this.players[0].isBot = false;
    this.players[0].isRemote = false;
    document.getElementById('hero-name').textContent = playerName;

    // Reset remaining seats
    for (let i = 1; i < 5; i++) {
      const prof = BASE_BOT_PROFILES[i];
      this.players[i].name = prof.name;
      this.players[i].style = prof.style;
      this.players[i].avatar = prof.avatar;
      this.players[i].chips = 1000;
      this.players[i].isBot = true;
      this.players[i].isRemote = false;
      this.players[i].peerConn = null;
      document.getElementById(`name-${i}`).textContent = prof.name;
      document.getElementById(`style-${i}`).textContent = prof.style;
      document.getElementById(`avatar-${i}`).textContent = prof.avatar;
      document.getElementById(`chips-${i}`).textContent = '1000';
    }

    this.showGameView();

    // Check if PeerJS library is available
    if (typeof Peer === 'undefined') {
      this.onlineRoomStatusText.textContent = 'Host (Local Simulation)';
      this.isHost = true;
      this.startNewHand();
      return;
    }

    // Attempt to connect as Guest to existing host; if none exists, become the Host
    let tempPeer = null;
    let connectedToHost = false;

    try {
      tempPeer = new Peer();
    } catch (e) {
      this.becomeRoomHost(playerName);
      return;
    }

    const hostCheckTimeout = setTimeout(() => {
      if (!connectedToHost) {
        try { tempPeer.destroy(); } catch (e) {}
        this.becomeRoomHost(playerName);
      }
    }, 1800);

    tempPeer.on('open', () => {
      const conn = tempPeer.connect(POKER_ROOM_HOST_ID, { reliable: true });

      conn.on('open', () => {
        connectedToHost = true;
        clearTimeout(hostCheckTimeout);
        this.becomeRoomGuest(tempPeer, conn, playerName);
      });

      conn.on('error', () => {
        if (!connectedToHost) {
          clearTimeout(hostCheckTimeout);
          try { tempPeer.destroy(); } catch (e) {}
          this.becomeRoomHost(playerName);
        }
      });
    });

    tempPeer.on('error', () => {
      if (!connectedToHost) {
        clearTimeout(hostCheckTimeout);
        try { tempPeer.destroy(); } catch (e) {}
        this.becomeRoomHost(playerName);
      }
    });
  }

  becomeRoomHost(playerName) {
    this.isHost = true;
    this.onlineRoomStatusText.textContent = 'Table Host';
    this.setAnnouncement('[HOST] You are the Table Host! Starting table...');

    try {
      this.peer = new Peer(POKER_ROOM_HOST_ID);
      this.peer.on('connection', (conn) => {
        this.handleNewGuestConnection(conn);
      });
      this.peer.on('error', (err) => {
        console.warn('Host peer notice:', err);
      });
    } catch (e) {
      console.warn('Failed to bind host peer, running local room');
    }

    // Heartbeat Keepalive to prevent connection dropouts
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.guestConnections.forEach(g => {
        if (g.conn && g.conn.open) {
          try { g.conn.send({ type: 'heartbeat_ping', timestamp: Date.now() }); } catch (e) {}
        }
      });
    }, 4500);

    this.startNewHand();
  }

  handleNewGuestConnection(conn) {
    conn.on('data', (data) => {
      if (data.type === 'heartbeat_ping') {
        try { conn.send({ type: 'heartbeat_pong' }); } catch (e) {}
        return;
      } else if (data.type === 'heartbeat_pong') {
        return;
      }

      if (data.type === 'join') {
        const guestName = data.name || 'Friend';
        // Find an open seat (Seats 1-4)
        let assignedSeat = -1;
        for (let s = 1; s < 5; s++) {
          if (this.players[s].isBot) {
            assignedSeat = s;
            break;
          }
        }

        if (assignedSeat === -1) {
          conn.send({ type: 'table_full', message: 'Table is full (5/5 players).' });
          return;
        }

        // Check if hand is in progress
        if (this.handInProgress) {
          // Put guest in waiting queue until next hand
          const guestEntry = { conn, name: guestName, seatIdx: assignedSeat, chips: 1000, waiting: true };
          this.guestConnections.push(guestEntry);
          conn.send({
            type: 'waiting_screen',
            seat: assignedSeat,
            message: 'Hand in progress. The 5-second joining window opens right when this round finishes!'
          });
          this.setAnnouncement(`[JOIN] ${guestName} joined the room! Waiting for the next round.`);
        } else {
          // Table between hands: seat guest immediately
          this.seatGuestPlayer(conn, guestName, assignedSeat);
        }
      } else if (data.type === 'action') {
        this.handleGuestAction(conn, data);
      }
    });

    conn.on('close', () => {
      this.handleGuestDisconnected(conn);
    });
  }

  seatGuestPlayer(conn, name, seatIdx) {
    const targetBot = this.players[seatIdx];
    // Friend dynamically replaces active bot and takes over its seat and stack!
    const inheritedChips = (targetBot && targetBot.chips > 0) ? targetBot.chips : 1000;

    this.players[seatIdx].name = name;
    this.players[seatIdx].style = 'Friend (Online)';
    this.players[seatIdx].avatar = '👤';
    this.players[seatIdx].chips = inheritedChips;
    this.players[seatIdx].isBot = false;
    this.players[seatIdx].isRemote = true;
    this.players[seatIdx].peerConn = conn;

    document.getElementById(`name-${seatIdx}`).textContent = name;
    document.getElementById(`style-${seatIdx}`).textContent = 'Friend (Online)';
    this.renderAvatar(seatIdx, 'guest');
    document.getElementById(`chips-${seatIdx}`).textContent = inheritedChips.toString();

    this.guestConnections.push({ conn, name, seatIdx, chips: inheritedChips, waiting: false });

    conn.send({
      type: 'seated',
      seat: seatIdx,
      name: name,
      chips: inheritedChips,
      tableState: this.serializeTableStateFor(seatIdx)
    });

    this.setAnnouncement(`[JOIN] ${name} joined Exclusive Room & took over Seat ${seatIdx} ($${inheritedChips})!`);
    this.broadcastTableState();
  }

  handleGuestDisconnected(conn) {
    const idx = this.guestConnections.findIndex(g => g.conn === conn);
    if (idx !== -1) {
      const g = this.guestConnections[idx];
      this.guestConnections.splice(idx, 1);
      const s = g.seatIdx;
      // Revert to bot
      const prof = BASE_BOT_PROFILES[s] || { name: 'Bot', style: 'Solid', avatar: '🤖' };
      this.players[s].name = prof.name;
      this.players[s].style = prof.style;
      this.players[s].avatar = prof.avatar;
      this.players[s].isBot = true;
      this.players[s].isRemote = false;
      this.players[s].peerConn = null;
      document.getElementById(`name-${s}`).textContent = prof.name;
      document.getElementById(`style-${s}`).textContent = prof.style;
      document.getElementById(`avatar-${s}`).textContent = prof.avatar;
      this.setAnnouncement(`[DISCONNECT] ${g.name} disconnected. Replaced by ${prof.name}.`);
      this.broadcastTableState();
    }
  }

  becomeRoomGuest(clientPeer, conn, playerName) {
    this.isHost = false;
    this.peer = clientPeer;
    this.hostConn = conn;
    this.onlineRoomStatusText.textContent = 'Connected (Guest)';

    // Register join request with Host
    conn.send({ type: 'join', name: playerName });

    // Client Heartbeat Keepalive
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.hostConn && this.hostConn.open) {
        try { this.hostConn.send({ type: 'heartbeat_ping', timestamp: Date.now() }); } catch (e) {}
      }
    }, 4500);

    conn.on('data', (data) => {
      this.handleGuestReceivedData(data);
    });

    conn.on('close', () => {
      this.setAnnouncement('[DISCONNECT] Disconnected from table host. Returning to menu.');
      setTimeout(() => this.showMenuView(), 2500);
    });
  }

  handleGuestReceivedData(data) {
    if (data.type === 'heartbeat_ping') {
      if (this.hostConn && this.hostConn.open) {
        try { this.hostConn.send({ type: 'heartbeat_pong' }); } catch (e) {}
      }
      return;
    } else if (data.type === 'heartbeat_pong') {
      return;
    }

    if (data.type === 'waiting_screen') {
      this.mySeatIdx = data.seat;
      this.waitingRoundOverlay.classList.remove('hidden');
      if (this.waitingRoundText) this.waitingRoundText.textContent = data.message;
    } else if (data.type === 'seated') {
      this.mySeatIdx = data.seat;
      this.waitingRoundOverlay.classList.add('hidden');
      this.setAnnouncement(`[SEATED] Seated at Seat ${data.seat}! Waiting for hand to deal.`);
      if (data.tableState) this.applyRemoteTableState(data.tableState);
    } else if (data.type === 'countdown_tick') {
      this.waitingRoundOverlay.classList.add('hidden');
      if (data.seconds > 0) {
        this.countdownOverlay.classList.remove('hidden');
        this.countdownNumber.textContent = data.seconds;
        sounds.playCheck();
      } else {
        this.countdownOverlay.classList.add('hidden');
      }
    } else if (data.type === 'table_state') {
      this.applyRemoteTableState(data.state);
    } else if (data.type === 'action_bubble') {
      this.showActionBubble(data.playerIdx, data.text);
    }
  }

  serializeTableStateFor(seatIdx) {
    return {
      handNumber: this.handNumber,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      dealerIdx: this.dealerIdx,
      actingIdx: this.actingIdx,
      stage: this.stageBadgeEl ? this.stageBadgeEl.textContent : 'PRE-FLOP',
      announcement: this.announcementEl ? this.announcementEl.textContent : '',
      communityCards: this.communityCards.map(c => ({ rank: c.rank, suit: c.suit })),
      totalPot: this.getTotalPot(),
      sidePots: PotManager.calculateSidePots(this.players).map(sp => ({
        amount: sp.amount,
        eligible: sp.eligiblePlayers.map(p => p.id)
      })),
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        style: p.style,
        avatar: p.avatar,
        chips: p.chips,
        currentBet: p.currentBet,
        totalBet: p.totalBet,
        folded: p.folded,
        allIn: p.allIn,
        isBot: p.isBot,
        // Card privacy: Only reveal cards if it's the player's own seat or at showdown / all-in runout
        cards: (p.id === seatIdx || this.stageBadgeEl.textContent === 'SHOWDOWN' || this.allInAutoRunout)
          ? p.cards.map(c => ({ rank: c.rank, suit: c.suit }))
          : p.cards.map(() => ({ hidden: true }))
      }))
    };
  }

  broadcastTableState() {
    if (!this.isOnlineRoom || !this.isHost) return;
    this.guestConnections.forEach(g => {
      if (!g.waiting && g.conn && g.conn.open) {
        try {
          g.conn.send({
            type: 'table_state',
            state: this.serializeTableStateFor(g.seatIdx)
          });
        } catch (e) {}
      }
    });
  }

  broadcastCountdownTick(seconds) {
    if (!this.isOnlineRoom || !this.isHost) return;
    this.guestConnections.forEach(g => {
      if (g.conn && g.conn.open) {
        try {
          g.conn.send({ type: 'countdown_tick', seconds: seconds });
        } catch (e) {}
      }
    });
  }

  applyRemoteTableState(state) {
    if (!state) return;
    this.handNumber = state.handNumber;
    this.smallBlind = state.smallBlind;
    this.bigBlind = state.bigBlind;
    this.currentBet = state.currentBet;
    this.minRaise = state.minRaise;
    this.actingIdx = state.actingIdx;
    this.handNumEl.textContent = this.handNumber;
    this.blindsIndicatorEl.textContent = `Blinds: $${this.smallBlind} / $${this.bigBlind}`;
    this.potEl.textContent = `$${state.totalPot.toLocaleString()}`;
    if (this.stageBadgeEl) this.stageBadgeEl.textContent = state.stage;
    if (this.announcementEl) this.announcementEl.textContent = state.announcement;

    // Side pot display
    if (state.sidePots && state.sidePots.length > 1 && state.sidePots[1].amount > 0) {
      this.sidePotText.textContent = `Main Pot: $${state.sidePots[0].amount.toLocaleString()} | Side Pot: $${state.sidePots[1].amount.toLocaleString()}`;
      this.sidePotWrapper.classList.remove('hidden');
    } else {
      this.sidePotWrapper.classList.add('hidden');
    }

    // Update community cards
    ['flop-1', 'flop-2', 'flop-3', 'turn', 'river'].forEach(id => {
      document.getElementById(id).innerHTML = '';
    });
    state.communityCards.forEach((c, idx) => {
      const slotIds = ['flop-1', 'flop-2', 'flop-3', 'turn', 'river'];
      const slot = document.getElementById(slotIds[idx]);
      if (slot) slot.appendChild(this.renderCardDOM(new Card(c.rank, c.suit)));
    });

    // Update players
    state.players.forEach((p, idx) => {
      const seatEl = document.getElementById(`seat-${idx}`);
      document.getElementById(`name-${idx}`).textContent = p.name;
      document.getElementById(`avatar-${idx}`).textContent = p.avatar;
      document.getElementById(`style-${idx}`).textContent = p.style;
      document.getElementById(`chips-${idx}`).textContent = p.chips.toLocaleString();

      seatEl.classList.toggle('current-turn', idx === state.actingIdx);
      seatEl.classList.toggle('folded-seat', p.folded);

      // Render cards
      const cardsBox = document.getElementById(`cards-${idx}`);
      cardsBox.innerHTML = '';
      p.cards.forEach(c => {
        if (c.hidden) {
          cardsBox.appendChild(this.renderCardDOM(null, true));
        } else {
          cardsBox.appendChild(this.renderCardDOM(new Card(c.rank, c.suit), false));
        }
      });
    });

    // Is it my turn as a guest?
    if (state.actingIdx === this.mySeatIdx) {
      const myPlayer = state.players[this.mySeatIdx];
      if (!myPlayer.folded && !myPlayer.allIn) {
        this.promptGuestTurn(myPlayer, state);
      } else {
        this.actionPanelEl.classList.add('disabled');
      }
    } else {
      this.actionPanelEl.classList.add('disabled');
    }
  }

  promptGuestTurn(player, state) {
    this.actionPanelEl.classList.remove('disabled');
    const toCall = state.currentBet - player.currentBet;

    if (toCall === 0) {
      this.checkCallText.textContent = 'Check';
    } else {
      this.checkCallText.textContent = `Call $${Math.min(toCall, player.chips)}`;
    }
    this.btnCheckCall.disabled = false;
    this.btnFold.disabled = false;
    this.btnAllin.disabled = (player.chips === 0);

    const minBet = state.currentBet === 0 ? state.bigBlind : state.currentBet + state.minRaise;
    if (player.chips + player.currentBet >= minBet) {
      this.sliderEl.disabled = false;
      this.sliderEl.min = minBet;
      this.sliderEl.max = player.chips + player.currentBet;
      this.sliderEl.value = minBet;
      this.sliderEl.dispatchEvent(new Event('input'));
      this.btnRaise.disabled = false;
    } else {
      this.sliderEl.disabled = true;
      this.btnRaise.disabled = true;
    }

    // 15-SECOND LIMIT FOR GUEST TURN
    this.startTurnTimer(player);
  }

  handleActionClick(action, amt = 0) {
    this.clearTurnTimer();
    if (this.isOnlineRoom && !this.isHost) {
      // Send action to host
      if (this.hostConn && this.hostConn.open) {
        this.actionPanelEl.classList.add('disabled');
        this.hostConn.send({ type: 'action', action: action, amount: amt });
      }
      return;
    }

    // Host or Solo player
    this.handleHeroAction(action, amt);
  }

  handleGuestAction(conn, data) {
    if (this.remoteTurnWatchdog) {
      clearTimeout(this.remoteTurnWatchdog);
      this.remoteTurnWatchdog = null;
    }
    const guest = this.guestConnections.find(g => g.conn === conn);
    if (!guest || guest.seatIdx !== this.actingIdx) return;
    const player = this.players[guest.seatIdx];

    const toCall = this.currentBet - player.currentBet;

    if (data.action === 'fold') {
      player.folded = true;
      this.showActionBubble(player.id, 'Fold');
      this.setAnnouncement(`${player.name} folded.`);
    } else if (data.action === 'check_call') {
      if (toCall === 0) {
        sounds.playCheck();
        this.showActionBubble(player.id, 'Check');
        this.setAnnouncement(`${player.name} checked.`);
      } else {
        const called = this.postBet(player, toCall);
        this.showActionBubble(player.id, `Call $${called}`);
        this.setAnnouncement(`${player.name} called $${called}.`);
      }
    } else if (data.action === 'raise') {
      const added = data.amount - player.currentBet;
      this.postBet(player, added);
      this.minRaise = player.currentBet - this.currentBet;
      this.currentBet = player.currentBet;
      this.hasActed.clear();
      this.showActionBubble(player.id, `Raise $${player.currentBet}`);
      this.setAnnouncement(`${player.name} raised to $${player.currentBet}.`);
    } else if (data.action === 'allin') {
      const added = player.chips;
      this.postBet(player, added);
      if (player.currentBet > this.currentBet) {
        this.minRaise = player.currentBet - this.currentBet;
        this.currentBet = player.currentBet;
      }
      this.hasActed.clear();
      this.showActionBubble(player.id, `ALL-IN $${player.currentBet}!`);
      this.setAnnouncement(`[ALL-IN] ${player.name} SHOVED ALL-IN ($${player.currentBet})!`);
    }

    this.hasActed.add(player.id);
    this.actingIdx = (this.actingIdx + 1) % this.players.length;
    this.broadcastTableState();
    setTimeout(() => this.nextTurn(), 450);
  }

  // ==========================================================================
  // SAVE SLOTS RENDERING & INTERACTIONS (Device-Isolated)
  // ==========================================================================
  renderMainMenuSlots() {
    const saves = SaveManager.getSaves();

    for (let slotId = 1; slotId <= 4; slotId++) {
      const cardEl = document.getElementById(`slot-card-${slotId}`);
      if (!cardEl) continue;
      cardEl.innerHTML = '';

      const slotData = saves[`slot_${slotId}`];

      if (!slotData) {
        cardEl.className = 'slot-card empty-slot';
        cardEl.innerHTML = `
          <div class="slot-corner-bracket top-left"></div>
          <div class="slot-corner-bracket top-right"></div>
          <div class="empty-chip-emblem">
            <div class="chip-outer-ring"></div>
            <div class="chip-inner-circle">
              <span class="chip-plus">+</span>
            </div>
          </div>
          <div class="empty-slot-content">
            <div class="empty-slot-badge">SLOT ${slotId}</div>
            <div class="empty-slot-title">NEW CAMPAIGN</div>
            <div class="empty-slot-games-list">
              <span class="eg-tag gold">&diams; Texas Hold'em</span>
              <span class="eg-tag emerald">&spades; Blackjack</span>
            </div>
            <div class="empty-slot-starting-chips">
              <span class="chips-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="1.8"/><circle cx="12" cy="12" r="5" stroke="#34d399" stroke-width="1.2"/><path d="M12 9v6M10 10.5c.8-.7 2.2-.7 3 0s-.5 1.5-1.5 1.5-1.5.8-.7 1.5 2.2.7 3 0" stroke="#fde047" stroke-width="1.4"/></svg>
              </span> $1,000 Starting Bankroll
            </div>
            <div class="empty-slot-cta">Choose Game &bull; Start Run</div>
          </div>
          <div class="slot-corner-bracket bottom-left"></div>
          <div class="slot-corner-bracket bottom-right"></div>
        `;
        cardEl.onclick = () => {
          this.requirePlayerName(() => {
            this.openSlotGameSelect(slotId, false);
          });
        };
      } else {
        cardEl.className = 'slot-card active-slot';
        const winPercent = slotData.winRecord && slotData.winRecord.total > 0
          ? Math.round((slotData.winRecord.won / slotData.winRecord.total) * 100)
          : 0;
        const slotUser = slotData.username || localStorage.getItem('royal_poker_username') || 'Hero';
        const slotStage = slotData.stage || 1;
        const gameType = slotData.gameType || 'texas';
        const isBj = gameType === 'blackjack';
        const diffBadgeClass = slotData.difficulty === 'nightmare' ? 'diff-championship' : `diff-${slotData.difficulty || 'medium'}`;
        const diffBadgeLabel = isBj ? 'CASINO 21' : (slotData.difficulty === 'nightmare' ? 'CHAMPIONSHIP' : (slotData.difficulty || 'medium').toUpperCase());
        const gameBadgeClass = isBj ? 'type-blackjack' : 'type-texas';
        const gameBadgeIcon = isBj
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="10" height="15" rx="2" transform="rotate(-10 3 4)" fill="#064e3b" stroke="#34d399" stroke-width="1.8"/><rect x="10" y="4" width="10" height="15" rx="2" transform="rotate(10 10 4)" fill="#0f172a" stroke="#ffd700" stroke-width="1.8"/><text x="13" y="15" font-family="'Cinzel',serif" font-size="7" font-weight="900" fill="#fde047">21</text></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C9 7 4 9 4 14a8 8 0 0 0 16 0c0-5-5-7-8-12z" fill="#ffd700" stroke="#fef08a" stroke-width="1.2"/><path d="M12 18v4M9 22h6" stroke="#ffd700" stroke-width="1.5"/></svg>`;
        const gameBadgeTitle = isBj ? 'SOLAR BLACKJACK' : "SOLAR TEXAS HOLD'EM";

        cardEl.innerHTML = `
          <div class="slot-corner-bracket top-left"></div>
          <div class="slot-corner-bracket top-right"></div>
          <div class="slot-header">
            <div class="slot-badge-wrap">
              <span class="slot-crown-icon">
                <svg width="16" height="13" viewBox="0 0 72 54" fill="none"><path d="M14 38 Q36 22 58 38 L54 44 Q36 34 18 44 Z" fill="#b91c1c"/><rect x="10" y="42" width="52" height="8" rx="2" fill="#ffd700" stroke="#fef08a" stroke-width="1"/><path d="M12 42 L8 22 L20 30 L36 12 L52 30 L64 22 L60 42 Z" fill="#ffd700" stroke="#fef08a" stroke-width="1.5"/><circle cx="36" cy="11" r="3" fill="#fff"/></svg>
              </span>
              <span class="slot-badge">SLOT ${slotId} &bull; ${slotUser}</span>
            </div>
            <span class="slot-diff ${diffBadgeClass}">${diffBadgeLabel}</span>
          </div>

          <!-- Active Game Identifier Badge -->
          <div class="slot-game-indicator ${gameBadgeClass}">
            <span class="game-ind-icon">${gameBadgeIcon}</span>
            <span class="game-ind-name">${gameBadgeTitle}</span>
          </div>

          <div class="slot-bankroll-wrap">
            <span class="slot-bankroll-label">BANKROLL &bull; ${isBj ? 'BLACKJACK TABLE' : 'STAGE ' + slotStage}</span>
            <div class="slot-bankroll">
              <span class="bankroll-currency">$</span>${(slotData.chips || 1000).toLocaleString()}
            </div>
          </div>
          <div class="slot-stats-grid">
            <div class="slot-stat-item">
              <span class="slot-stat-lbl">Active Game</span>
              <span class="slot-stat-val ${isBj ? 'emerald' : 'gold'}">${isBj ? 'Blackjack 21' : "Texas Hold'em"}</span>
            </div>
            <div class="slot-stat-item">
              <span class="slot-stat-lbl">${isBj ? 'Hands' : 'Stage / Round'}</span>
              <span class="slot-stat-val">${isBj ? '#' + (slotData.handNumber || 1) : 'S' + slotStage + ' #h' + (slotData.handNumber || 1)}</span>
            </div>
            <div class="slot-stat-item">
              <span class="slot-stat-lbl">Win Rate</span>
              <span class="slot-stat-val">${winPercent}%</span>
            </div>
          </div>
          <div class="slot-actions">
            <button class="slot-btn-play gold-action-btn">
              <span>Continue Run</span> <span class="play-arrow">▶</span>
            </button>
            <button class="slot-btn-del" title="Delete Profile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 5v6m4-6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="slot-corner-bracket bottom-left"></div>
          <div class="slot-corner-bracket bottom-right"></div>
        `;

        const handleContinuationClick = (e) => {
          if (e) e.stopPropagation();
          this.requirePlayerName(() => {
            if (isBj) {
              this.startBlackjackGame(slotId, slotData.chips || 1000, 50);
            } else {
              this.openSlotGameSelect(slotId, true);
            }
          });
        };
        cardEl.onclick = handleContinuationClick;
        cardEl.querySelector('.slot-btn-play').onclick = handleContinuationClick;

        cardEl.querySelector('.slot-btn-del').onclick = (e) => {
          e.stopPropagation();
          this.pendingDeleteSlot = slotId;
          document.getElementById('delete-slot-name').textContent = `Save Slot ${slotId}`;
          this.deleteModal.classList.remove('hidden');
        };
      }
    }
    // Update live circuit standings when slot balances change
    this.updateLeaderboardUI();
  }

  startNewGame(slotId, difficulty, buyIn = 1000) {
    this.activeSlot = slotId;
    this.difficulty = difficulty;
    this.stage = 1;
    this.isOnlineRoom = false;
    this.isHost = false;
    this.onlineRoomBadge.classList.add('hidden');
    this.handNumber = 0;
    this.winRecord = { won: 0, total: 0 };
    const baseline = this.getBaselineBlinds(1);
    this.smallBlind = baseline.sb;
    this.bigBlind = baseline.bb;
    this.dealerIdx = 0;

    const startingStack = Math.max(1000, Math.floor(Number(buyIn) || 1000));
    const customName = localStorage.getItem('royal_poker_username') || 'High Roller';
    this.players[0].name = customName;
    this.players[0].chips = startingStack;
    this.players[0].knockedOut = false;
    this.players[0].isBot = false;
    this.players[0].isRemote = false;
    document.getElementById('hero-name').textContent = customName;

    for (let i = 1; i < 5; i++) {
      const prof = BASE_BOT_PROFILES[i];
      this.players[i].name = prof.name;
      this.players[i].style = prof.style;
      this.players[i].avatar = prof.avatar;
      this.players[i].chips = startingStack;
      this.players[i].knockedOut = false;
      this.players[i].isBot = true;
      this.players[i].isRemote = false;
      this.players[i].peerConn = null;
      document.getElementById(`name-${i}`).textContent = prof.name;
      document.getElementById(`style-${i}`).textContent = prof.style;
      document.getElementById(`avatar-${i}`).textContent = prof.avatar;
      const seatEl = document.getElementById(`seat-${i}`);
      if (seatEl) {
        seatEl.classList.remove('knocked-out');
        const badge = seatEl.querySelector('.knockout-stamp');
        if (badge) badge.remove();
      }
    }

    if (this.stageIndicator) this.stageIndicator.textContent = `Stage ${this.stage}`;
    document.getElementById('difficulty-indicator').textContent = this.difficulty === 'nightmare' ? 'CHAMPIONSHIP' : this.difficulty.toUpperCase();
    this.saveCurrentGame();
    this.showGameView();
    this.startNewHand();
  }

  loadGame(slotId) {
    const data = SaveManager.getSave(slotId);
    if (!data) return;

    this.activeSlot = slotId;
    this.stage = data.stage || 1;
    this.difficulty = data.difficulty || 'medium';
    this.isOnlineRoom = false;
    this.isHost = false;
    this.onlineRoomBadge.classList.add('hidden');
    this.handNumber = (data.handNumber || 1) - 1;
    this.winRecord = data.winRecord || { won: 0, total: 0 };

    const customName = data.username || localStorage.getItem('royal_poker_username') || 'You';
    this.players[0].name = customName;
    this.players[0].chips = data.chips || 1000;
    this.players[0].knockedOut = (this.players[0].chips <= 0);
    this.players[0].isBot = false;
    this.players[0].isRemote = false;
    document.getElementById('hero-name').textContent = customName;

    if (data.botChips && Array.isArray(data.botChips)) {
      data.botChips.forEach((bc, idx) => {
        if (this.players[idx + 1]) {
          this.players[idx + 1].chips = bc;
          this.players[idx + 1].knockedOut = (bc <= 0);
        }
      });
    }

    for (let i = 1; i < 5; i++) {
      const prof = BASE_BOT_PROFILES[i];
      this.players[i].name = prof.name;
      this.players[i].style = prof.style;
      this.players[i].avatar = prof.avatar;
      this.players[i].isBot = true;
      this.players[i].isRemote = false;
      this.players[i].peerConn = null;
      document.getElementById(`name-${i}`).textContent = prof.name;
      document.getElementById(`style-${i}`).textContent = prof.style;
      document.getElementById(`avatar-${i}`).textContent = prof.avatar;
      const seatEl = document.getElementById(`seat-${i}`);
      if (seatEl) {
        if (this.players[i].knockedOut) {
          seatEl.classList.add('knocked-out');
        } else {
          seatEl.classList.remove('knocked-out');
          const badge = seatEl.querySelector('.knockout-stamp');
          if (badge) badge.remove();
        }
      }
    }

    if (this.stageIndicator) this.stageIndicator.textContent = `Stage ${this.stage}`;
    document.getElementById('difficulty-indicator').textContent = this.difficulty === 'nightmare' ? 'CHAMPIONSHIP' : this.difficulty.toUpperCase();
    this.showGameView();
    this.startNewHand();
  }

  saveCurrentGame() {
    if (this.isOnlineRoom) return; // Online room state is session-only and never overwrites solo saves!

    // Permadeath Check: If hero bankroll dropped to $0, immediately purge the save slot!
    if (this.players[0].chips <= 0) {
      SaveManager.deleteSlot(this.activeSlot);
      return;
    }

    const botChips = [
      this.players[1].chips,
      this.players[2].chips,
      this.players[3].chips,
      this.players[4].chips
    ];

    const username = localStorage.getItem('royal_poker_username') || 'You';

    SaveManager.saveSlot(this.activeSlot, {
      gameType: 'texas',
      username: username,
      stage: this.stage || 1,
      chips: this.players[0].chips,
      handNumber: this.handNumber,
      difficulty: this.difficulty,
      winRecord: this.winRecord,
      botChips: botChips
    });
  }

  // ==========================================================================
  // GAMEPLAY ENGINE: DEALING, ROUNDS, & 5-SECOND JOINING WINDOW
  // ==========================================================================
  renderCardDOM(card, isHidden = false) {
    const cardEl = document.createElement('div');
    if (isHidden || !card) {
      cardEl.className = 'card back card-hidden card-deal-anim';
      cardEl.innerHTML = `
        <svg class="card-back-svg" viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="140" rx="8" fill="#070e22" stroke="#d4af37" stroke-width="1.8"/>
          <rect x="4" y="4" width="92" height="132" rx="6" fill="#0c1633" stroke="rgba(212, 175, 55, 0.45)" stroke-width="0.8"/>
          <rect x="7" y="7" width="86" height="126" rx="4" fill="none" stroke="rgba(212, 175, 55, 0.25)" stroke-width="0.5" stroke-dasharray="2 2"/>
          <g opacity="0.18" stroke="#fcd34d" stroke-width="0.5">
            <path d="M7 20 L93 120 M7 40 L93 140 M7 60 L93 160 M7 0 L93 100"/>
            <path d="M93 20 L7 120 M93 40 L7 140 M93 60 L7 160 M93 0 L7 100"/>
          </g>
          <path d="M10 14 Q14 10 18 10 M10 14 Q10 18 10 22 M14 14 A3 3 0 1 1 11 11" stroke="#fcd34d" stroke-width="0.9" fill="none"/>
          <path d="M90 126 Q86 130 82 130 M90 126 Q90 122 90 118 M86 126 A3 3 0 1 1 89 129" stroke="#fcd34d" stroke-width="0.9" fill="none"/>
          <path d="M90 14 Q86 10 82 10 M90 14 Q90 18 90 22 M86 14 A3 3 0 1 0 89 11" stroke="#fcd34d" stroke-width="0.9" fill="none"/>
          <path d="M10 126 Q14 130 18 130 M10 126 Q10 122 10 118 M14 126 A3 3 0 1 0 11 129" stroke="#fcd34d" stroke-width="0.9" fill="none"/>
          <circle cx="50" cy="70" r="26" stroke="#d4af37" stroke-width="1.2" fill="#09132c"/>
          <circle cx="50" cy="70" r="23" stroke="rgba(253, 224, 71, 0.4)" stroke-width="0.7" stroke-dasharray="1.5 1.5"/>
          <circle cx="50" cy="70" r="19" stroke="#d4af37" stroke-width="0.8" fill="#070e22"/>
          <g stroke="rgba(253, 224, 71, 0.45)" stroke-width="0.7">
            <line x1="50" y1="44" x2="50" y2="50"/>
            <line x1="50" y1="96" x2="50" y2="90"/>
            <line x1="24" y1="70" x2="30" y2="70"/>
            <line x1="76" y1="70" x2="70" y2="70"/>
            <line x1="32" y1="52" x2="36" y2="56"/>
            <line x1="68" y1="88" x2="64" y2="84"/>
            <line x1="68" y1="52" x2="64" y2="56"/>
            <line x1="32" y1="88" x2="36" y2="84"/>
          </g>
          <g transform="translate(50, 70) scale(0.88)">
            <line x1="-12" y1="-12" x2="12" y2="12" stroke="#d4af37" stroke-width="1.1"/>
            <circle cx="-12" cy="-12" r="1.6" fill="#fcd34d"/>
            <circle cx="12" cy="12" r="1.6" fill="#fcd34d"/>
            <line x1="12" y1="-12" x2="-12" y2="12" stroke="#d4af37" stroke-width="1.1"/>
            <circle cx="12" cy="-12" r="1.6" fill="#fcd34d"/>
            <circle cx="-12" cy="12" r="1.6" fill="#fcd34d"/>
            <path d="M-10 4 L-12 -6 L-5 -1 L0 -8 L5 -1 L12 -6 L10 4 Z" fill="url(#card-back-gold-crown)" stroke="#fef08a" stroke-width="0.8"/>
            <circle cx="-12" cy="-6" r="1" fill="#fff"/>
            <circle cx="0" cy="-8" r="1.2" fill="#fff"/>
            <circle cx="12" cy="-6" r="1" fill="#fff"/>
            <rect x="-9" y="4" width="18" height="3" rx="1" fill="#78350f" stroke="#fcd34d" stroke-width="0.5"/>
            <circle cx="-5" cy="5.5" r="0.7" fill="#ef4444"/>
            <circle cx="0" cy="5.5" r="0.7" fill="#38bdf8"/>
            <circle cx="5" cy="5.5" r="0.7" fill="#10b981"/>
          </g>
          <defs>
            <linearGradient id="card-back-gold-crown" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="50%" stop-color="#d4af37"/>
              <stop offset="100%" stop-color="#854d0e"/>
            </linearGradient>
          </defs>
        </svg>
      `;
      return cardEl;
    }

    const color = card.suit.color; // 'red' or 'black'
    cardEl.className = `card ${color} card-${color} card-deal-anim`;
    cardEl.innerHTML = `
      <div class="card-top">
        <span class="card-rank">${card.label}</span>
        <span class="card-suit">${card.suit.symbol}</span>
      </div>
      <div class="card-center">${card.suit.symbol}</div>
      <div class="card-bottom">
        <span class="card-rank">${card.label}</span>
        <span class="card-suit">${card.suit.symbol}</span>
      </div>
    `;
    return cardEl;
  }

  showActionBubble(playerIdx, text) {
    const b = document.getElementById(`action-bubble-${playerIdx}`);
    if (!b) return;
    b.textContent = text;
    b.classList.remove('hidden');
    setTimeout(() => b.classList.add('hidden'), 2200);

    if (this.isOnlineRoom && this.isHost) {
      this.guestConnections.forEach(g => {
        if (g.conn && g.conn.open) {
          try {
            g.conn.send({ type: 'action_bubble', playerIdx: playerIdx, text: text });
          } catch (e) {}
        }
      });
    }
  }

  setAnnouncement(text) {
    if (this.announcementEl) this.announcementEl.textContent = text;
  }

  getTotalPot() {
    return this.players.reduce((sum, p) => sum + p.totalBet, 0);
  }

  updateTableUI() {
    const totalPot = this.getTotalPot();
    this.potEl.textContent = `$${totalPot.toLocaleString()}`;
    this.handNumEl.textContent = this.handNumber;
    this.blindsIndicatorEl.textContent = `Blinds: $${this.smallBlind} / $${this.bigBlind}`;

    // Clean Side Pot: only shown if someone is all-in with unequal bets
    const pots = PotManager.calculateSidePots(this.players);
    if (pots.length > 1 && pots[1].amount > 0) {
      this.sidePotText.textContent = `Main Pot: $${pots[0].amount.toLocaleString()} | Side Pot: $${pots[1].amount.toLocaleString()}`;
      this.sidePotWrapper.classList.remove('hidden');
    } else {
      this.sidePotWrapper.classList.add('hidden');
    }

    // Pot fire effect for high stakes / win streaks
    const potEl = this.potEl;
    if (potEl) {
      if (totalPot >= 300) {
        potEl.classList.add('pot-fire-glow');
        if (!potEl.querySelector('.pot-fire-icon')) {
          const fireSpan = document.createElement('span');
          fireSpan.className = 'pot-fire-icon';
          fireSpan.innerHTML = '<span class="flare-badge">HOT</span>';
          potEl.prepend(fireSpan);
        }
      } else {
        potEl.classList.remove('pot-fire-glow');
        const fireSpan = potEl.querySelector('.pot-fire-icon');
        if (fireSpan) fireSpan.remove();
      }
    }

    this.players.forEach((p, idx) => {
      document.getElementById(`chips-${idx}`).textContent = p.chips.toLocaleString();
      const seatEl = document.getElementById(`seat-${idx}`);
      seatEl.classList.toggle('folded-seat', p.folded);
      seatEl.classList.toggle('knocked-out', !!p.knockedOut);
      if (p.folded) {
        seatEl.querySelectorAll('.card').forEach(card => card.classList.add('card-folded-anim'));
        if (idx === 0) {
          const heroBox = document.getElementById('hero-cards');
          if (heroBox) heroBox.querySelectorAll('.card').forEach(card => card.classList.add('card-folded-anim'));
        }
      }

      // Dealer button indicator
      const dBtn = document.getElementById(`dealer-btn-${idx}`);
      if (dBtn) dBtn.classList.toggle('hidden', idx !== this.dealerIdx);

      // Bet chips badge
      const betBadge = document.getElementById(`bet-badge-${idx}`);
      if (betBadge) {
        if (p.currentBet > 0) {
          betBadge.textContent = `$${p.currentBet.toLocaleString()}`;
          betBadge.classList.remove('hidden');
        } else {
          betBadge.classList.add('hidden');
        }
      }
    });

    // Hero hand rank badge
    const minHole = (this.variant === 'omaha') ? 4 : 2;
    if (this.players[0].cards.length >= minHole && !this.players[0].folded) {
      const best = evaluateBestHand(this.players[0].cards, this.communityCards, this.variant);
      this.heroHandBadge.textContent = best.desc;
      this.heroHandBadge.classList.remove('hidden');
    } else {
      this.heroHandBadge.classList.add('hidden');
    }
  }

  triggerStageVictory() {
    this.handInProgress = false;
    this.clearTurnTimer();
    sounds.playWin();
    if (this.stageVictoryModal) {
      const chipsWon = this.players.reduce((sum, p) => sum + p.chips, 0);
      const vChipsWon = document.getElementById('v-chips-won');
      const vStageCompleted = document.getElementById('v-stage-completed');
      const vNextBlinds = document.getElementById('v-next-blinds');
      if (vChipsWon) vChipsWon.textContent = `$${chipsWon.toLocaleString()}`;
      if (vStageCompleted) vStageCompleted.textContent = `Stage ${this.stage || 1}`;
      const nextBase = this.getBaselineBlinds((this.stage || 1) + 1);
      if (vNextBlinds) vNextBlinds.textContent = `$${nextBase.sb} / $${nextBase.bb}`;
      this.stageVictoryModal.classList.remove('hidden');
    }
  }

  advanceToNextStage() {
    this.stage = (this.stage || 1) + 1;
    this.handNumber = 0;
    this.currentBet = 0;
    const base = this.getBaselineBlinds(this.stage);
    this.smallBlind = base.sb;
    this.bigBlind = base.bb;
    this.dealerIdx = 0;

    // Reset bot bankrolls for the new escalated stage
    const botStartChips = 1000 * this.stage;
    for (let i = 1; i < 5; i++) {
      this.players[i].chips = botStartChips;
      this.players[i].knockedOut = false;
      const seat = document.getElementById(`seat-${i}`);
      if (seat) {
        seat.classList.remove('knocked-out');
        const badge = seat.querySelector('.knockout-stamp');
        if (badge) badge.remove();
      }
    }
    // Hero advances with at least the stage baseline bankroll
    this.players[0].chips = Math.max(this.players[0].chips, botStartChips);

    if (this.stageIndicator) this.stageIndicator.textContent = `Stage ${this.stage}`;
    this.saveCurrentGame();
    this.startNewHand();
  }

  startNewHand() {
    // 1. Permadeath Validation: If hero has 0 chips, slot is deleted permanently!
    if (!this.isOnlineRoom && this.players[0].chips <= 0) {
      SaveManager.deleteSlot(this.activeSlot);
      this.renderMainMenuSlots();
      if (this.gameOverModal) this.gameOverModal.classList.remove('hidden');
      return;
    }

    // 2. Table Dominance Check: If all bots are knocked out, trigger victory!
    if (!this.isOnlineRoom && this.players.slice(1).every(p => p.chips <= 0 || p.knockedOut)) {
      this.triggerStageVictory();
      return;
    }

    this.handInProgress = true;
    this.updateMenuLockState();
    this.handNumber++;
    this.allInAutoRunout = false;

    // Dynamic blinds based on hand count within the current stage
    const prevSB = this.smallBlind;
    const newBlinds = this.getBlindsForHand(this.handNumber, this.stage || 1);
    this.smallBlind = newBlinds.sb;
    this.bigBlind = newBlinds.bb;

    if (this.smallBlind > prevSB && this.handNumber > 1) {
      this.triggerBlindsIncreasedAlert();
    }

    this.stageBadgeEl.textContent = 'PRE-FLOP';
    this.communityCards = [];
    this.deck.reset();

    for (let i = 0; i < 5; i++) {
      document.getElementById(`cards-${i}`).innerHTML = '';
      document.getElementById(`seat-${i}`).classList.remove('adrenaline-threat', 'current-turn', 'folded-seat');
    }
    ['flop-1', 'flop-2', 'flop-3', 'turn', 'river'].forEach(id => {
      document.getElementById(id).innerHTML = '';
    });

    // Reset player round states and tag knockouts: eliminated bots stay knocked out & folded
    this.players.forEach(p => {
      p.cards = [];
      p.currentBet = 0;
      p.totalBet = 0;
      p.knockedOut = (p.chips <= 0 || p.knockedOut);
      p.folded = p.knockedOut;
      p.allIn = false; // Eliminated players are NOT all-in; they are out of the hand
      if (p.isBot) p.wasPreflopRaiser = false;

      const seat = document.getElementById(`seat-${p.id}`);
      if (seat) {
        seat.classList.toggle('knocked-out', p.knockedOut);
        let badge = seat.querySelector('.knockout-stamp');
        if (p.knockedOut && !badge) {
          badge = document.createElement('div');
          badge.className = 'knockout-stamp';
          badge.textContent = 'BUSTED';
          seat.appendChild(badge);
        } else if (!p.knockedOut && badge) {
          badge.remove();
        }
      }
    });

    sounds.playShuffle();
    this.setAnnouncement('New hand dealt! Blinds posted.');

    this.deck.reset(this.variant);
    SaveManager.recordVariantHand(this.variant);

    // Render SVG avatars for table seats
    for (let s = 0; s < 5; s++) {
      this.renderAvatar(s, this.players[s].avatar);
      const cBox = document.getElementById(`cards-${s}`);
      if (cBox) cBox.classList.toggle('omaha-hand', this.variant === 'omaha');
    }

    // Deal hole cards (4 cards for Omaha, 2 cards for Texas/Short Deck)
    const holeCount = (this.variant === 'omaha') ? 4 : 2;
    let cardDealDelay = 0;
    for (let c = 0; c < holeCount; c++) {
      this.players.forEach((p, idx) => {
        if (!p.knockedOut && !p.folded) {
          const card = this.deck.deal();
          p.cards.push(card);
          const isHidden = (idx !== 0);
          const el = this.renderCardDOM(card, isHidden);
          document.getElementById(`cards-${idx}`).appendChild(el);
          setTimeout(() => sounds.playCard(1.0 + (idx * 0.04)), cardDealDelay);
          cardDealDelay += 65;
        }
      });
    }

    // STRICT DECK INTEGRITY (ZERO DUPLICATE CARDS):
    // All cards are dealt exclusively from a single authentic deck (52 cards standard, 36 cards short deck).
    // No artificial card spawning or out-of-deck injections. Nightmare mode difficulty is driven purely
    // by advanced pot odds, aggressive pre-flop 3-betting, and 35% strategic bluff frequency.
    if (!this.isOnlineRoom && this.difficulty === 'nightmare') {
      const activeBots = [1, 2, 3, 4].filter(i => !this.players[i].knockedOut && !this.players[i].folded);
      if (activeBots.length > 0) {
        const rivalIdx = activeBots[0];
        const rSeat = document.getElementById(`seat-${rivalIdx}`);
        if (rSeat) rSeat.classList.add('adrenaline-threat');
      }
    }

    // Rotate dealer button among active (non-knocked-out) players with chips > 0
    let d = (this.dealerIdx + 1) % this.players.length;
    let dAttempts = 0;
    while ((this.players[d].knockedOut || this.players[d].chips <= 0) && dAttempts < this.players.length) {
      d = (d + 1) % this.players.length;
      dAttempts++;
    }
    this.dealerIdx = d;

    // Small and Big Blind indices strictly from active players with chips > 0
    let sbIdx = (this.dealerIdx + 1) % this.players.length;
    let sbAttempts = 0;
    while ((this.players[sbIdx].knockedOut || this.players[sbIdx].chips <= 0) && sbAttempts < this.players.length) {
      sbIdx = (sbIdx + 1) % this.players.length;
      sbAttempts++;
    }

    let bbIdx = (sbIdx + 1) % this.players.length;
    let bbAttempts = 0;
    while ((this.players[bbIdx].knockedOut || this.players[bbIdx].chips <= 0 || bbIdx === sbIdx) && bbAttempts < this.players.length) {
      bbIdx = (bbIdx + 1) % this.players.length;
      bbAttempts++;
    }

    // Deduct forced blinds with immediate stack update
    this.postBet(this.players[sbIdx], Math.min(this.smallBlind, this.players[sbIdx].chips));
    this.postBet(this.players[bbIdx], Math.min(this.bigBlind, this.players[bbIdx].chips));
    this.currentBet = this.bigBlind;
    this.minRaise = this.bigBlind;

    this.updateTableUI();
    this.broadcastTableState();

    let utgIdx = (bbIdx + 1) % this.players.length;
    let utgAttempts = 0;
    while ((this.players[utgIdx].knockedOut || this.players[utgIdx].folded || this.players[utgIdx].chips <= 0) && utgAttempts < this.players.length) {
      utgIdx = (utgIdx + 1) % this.players.length;
      utgAttempts++;
    }
    this.startBettingRound('pre-flop', utgIdx);
  }

  triggerBlindsIncreasedAlert() {
    this.blindsBannerText.textContent = `BLINDS INCREASED! Now $${this.smallBlind} / $${this.bigBlind}`;
    this.blindsBanner.classList.remove('hidden');
    sounds.playWin();
    setTimeout(() => this.blindsBanner.classList.add('hidden'), 3500);
  }

  postBet(player, amount) {
    const actual = Math.min(amount, player.chips);
    player.chips -= actual;
    player.currentBet += actual;
    player.totalBet += actual;
    if (player.chips === 0) player.allIn = true;
    sounds.playChip();
    this.animateChipBet(player.id);
    return actual;
  }

  startBettingRound(roundName, startIdx) {
    this.currentRound = roundName;
    this.actingIdx = startIdx;
    this.hasActed = new Set();
    this.nextTurn();
  }

  nextTurn() {
    this.updateTableUI();
    this.broadcastTableState();

    const active = this.players.filter(p => !p.folded && !p.knockedOut && p.chips >= 0);
    if (active.length === 1) {
      this.resolveEarlyWin(active[0]);
      return;
    }

    const acting = active.filter(p => !p.allIn);

    // 1. All remaining active players are all-in: TRIGGER DRAMATIC AUTO-RUNOUT
    if (acting.length === 0 && active.length >= 2) {
      this.runoutAllInBoard();
      return;
    }

    // 2. Exactly one non-all-in player remains, and they have matched the bet and acted:
    if (acting.length === 1 && active.length >= 2) {
      if (acting[0].currentBet === this.currentBet && this.hasActed.has(acting[0].id)) {
        this.runoutAllInBoard();
        return;
      }
    }

    // 3. Normal betting round: All acting players have matched currentBet and acted
    const allMatched = acting.every(p => p.currentBet === this.currentBet);
    const allActed = acting.every(p => this.hasActed.has(p.id));

    if (allMatched && allActed && acting.length > 0) {
      if (acting.length <= 1 && active.length >= 2) {
        this.runoutAllInBoard();
        return;
      }
      this.advanceStage();
      return;
    }

    const p = this.players[this.actingIdx];
    if (p.folded || p.allIn) {
      this.actingIdx = (this.actingIdx + 1) % this.players.length;
      this.nextTurn();
      return;
    }

    this.players.forEach((_, idx) => {
      document.getElementById(`seat-${idx}`).classList.toggle('current-turn', idx === p.id);
    });

    if (p.isBot) {
      this.actionPanelEl.classList.add('disabled');
      const thinkTime = 700 + Math.random() * 500;
      setTimeout(() => this.runBotStrategicTurn(p), thinkTime);
    } else if (p.isRemote) {
      // Remote guest friend's turn: Host waits for message from guest (15s limit)
      this.actionPanelEl.classList.add('disabled');
      this.setAnnouncement(`Waiting for ${p.name}'s action (15s limit)...`);
      if (this.remoteTurnWatchdog) clearTimeout(this.remoteTurnWatchdog);
      this.remoteTurnWatchdog = setTimeout(() => {
        if (this.actingIdx === p.id && this.handInProgress) {
          this.logMessage(`[TIMEOUT] 15s turn limit expired for ${p.name} - Auto-folded!`, 'turn');
          this.setAnnouncement(`[TIMEOUT] Turn time expired for ${p.name} — Auto-folded!`);
          this.handleGuestAction(p.peerConn, { action: 'fold' });
        }
      }, 16000);
    } else {
      // Hero (Local Host) turn
      this.promptHeroTurn(p);
    }
  }

  // DRAMATIC ALL-IN BOARD RUNOUT (Flop -> Turn -> River automatically with pauses)
  runoutAllInBoard() {
    this.allInAutoRunout = true;
    this.actionPanelEl.classList.add('disabled');
    this.setAnnouncement('[ALL-IN] Shove Called! Dealing out remaining board cards...');

    // Reveal all cards immediately for all-in showdown drama
    this.players.forEach((p, idx) => {
      if (!p.folded) {
        const container = document.getElementById(`cards-${idx}`);
        container.innerHTML = '';
        p.cards.forEach(c => container.appendChild(this.renderCardDOM(c)));
      }
    });

    this.broadcastTableState();

    const runNextStreet = () => {
      if (this.communityCards.length === 0) {
        this.deck.deal();
        for (let i = 0; i < 3; i++) {
          const c = this.deck.deal();
          this.communityCards.push(c);
          document.getElementById(`flop-${i + 1}`).appendChild(this.renderCardDOM(c));
        }
        sounds.playCard();
        this.stageBadgeEl.textContent = 'THE FLOP';
        this.updateTableUI();
        this.broadcastTableState();
        setTimeout(runNextStreet, 1100);
      } else if (this.communityCards.length === 3) {
        this.deck.deal();
        const c = this.deck.deal();
        this.communityCards.push(c);
        document.getElementById('turn').appendChild(this.renderCardDOM(c));
        sounds.playCard();
        this.stageBadgeEl.textContent = 'THE TURN';
        this.updateTableUI();
        this.broadcastTableState();
        setTimeout(runNextStreet, 1100);
      } else if (this.communityCards.length === 4) {
        this.deck.deal();
        const c = this.deck.deal();
        this.communityCards.push(c);
        document.getElementById('river').appendChild(this.renderCardDOM(c));
        sounds.playCard();
        this.stageBadgeEl.textContent = 'THE RIVER';
        this.updateTableUI();
        this.broadcastTableState();
        setTimeout(() => this.resolveShowdown(), 1200);
      } else {
        this.resolveShowdown();
      }
    };

    setTimeout(runNextStreet, 800);
  }

  promptHeroTurn(hero) {
    this.actionPanelEl.classList.remove('disabled');
    const toCall = this.currentBet - hero.currentBet;

    if (toCall === 0) {
      this.checkCallText.textContent = 'Check';
    } else {
      this.checkCallText.textContent = `Call $${Math.min(toCall, hero.chips)}`;
    }
    this.btnCheckCall.disabled = false;
    this.btnFold.disabled = false;
    this.btnAllin.disabled = (hero.chips === 0);

    const minBet = this.currentBet === 0 ? this.bigBlind : this.currentBet + this.minRaise;
    if (hero.chips + hero.currentBet >= minBet) {
      this.sliderEl.disabled = false;
      this.sliderEl.min = minBet;
      this.sliderEl.max = hero.chips + hero.currentBet;
      this.sliderEl.value = minBet;
      this.sliderEl.dispatchEvent(new Event('input'));
      this.btnRaise.disabled = false;
    } else {
      this.sliderEl.disabled = true;
      this.btnRaise.disabled = true;
    }

    this.setAnnouncement('Your turn! Select your action.');
    if (this.isOnlineRoom) {
      this.startTurnTimer(hero);
    }
  }

  handleHeroAction(action, amt = 0) {
    this.clearTurnTimer();
    const hero = this.players[0];
    this.actionPanelEl.classList.add('disabled');
    const toCall = this.currentBet - hero.currentBet;

    if (action === 'fold') {
      hero.folded = true;
      this.showActionBubble(0, 'Fold');
      this.setAnnouncement('You folded.');
    } else if (action === 'check_call') {
      if (toCall === 0) {
        sounds.playCheck();
        this.showActionBubble(0, 'Check');
        this.setAnnouncement('You checked.');
      } else {
        const called = this.postBet(hero, toCall);
        this.showActionBubble(0, `Call $${called}`);
        this.setAnnouncement(`You called $${called}.`);
      }
    } else if (action === 'raise') {
      const added = amt - hero.currentBet;
      this.postBet(hero, added);
      this.minRaise = hero.currentBet - this.currentBet;
      this.currentBet = hero.currentBet;
      this.hasActed.clear();
      this.showActionBubble(0, `Raise $${hero.currentBet}`);
      this.setAnnouncement(`You raised to $${hero.currentBet}.`);
    } else if (action === 'allin') {
      const added = hero.chips;
      this.postBet(hero, added);
      if (hero.currentBet > this.currentBet) {
        this.minRaise = hero.currentBet - this.currentBet;
        this.currentBet = hero.currentBet;
      }
      this.hasActed.clear();
      this.showActionBubble(0, `ALL-IN $${hero.currentBet}!`);
      this.setAnnouncement(`[ALL-IN] YOU SHOVE ALL-IN WITH $${hero.currentBet}!`);
    }

    this.hasActed.add(hero.id);
    this.actingIdx = (this.actingIdx + 1) % this.players.length;
    setTimeout(() => this.nextTurn(), 450);
  }

  // ==========================================================================
  // BOT AI DECISION TREE: HIGH-IQ POT ODDS, 20% BLUFF RATE & NIGHTMARE ENGINE
  // ==========================================================================
  runBotStrategicTurn(bot) {
    const toCall = this.currentBet - bot.currentBet;
    const isPreflop = (this.communityCards.length === 0);
    const pot = this.getTotalPot();
    const isHeroAllIn = this.players[0].allIn;
    const isNightmare = (this.difficulty === 'nightmare');

    // Calculate exact pot odds
    const potOdds = toCall > 0 ? (toCall / (pot + toCall)) : 0;

    // Board texture analysis
    const isBoardPaired = this.communityCards.length >= 3 && (new Set(this.communityCards.map(c => c.rank)).size < this.communityCards.length);
    const suitCounts = {};
    this.communityCards.forEach(c => suitCounts[c.suit.name] = (suitCounts[c.suit.name] || 0) + 1);
    const hasFlushDanger = Object.values(suitCounts).some(cnt => cnt >= 3);
    const hasScaryHighCard = this.communityCards.some(c => c.rank >= 13);
    const isRiver = (this.currentRound === 'river');

    // Strategic Bluff Engine: 20% bluff frequency on standard difficulties, up to 35% on Nightmare
    const bluffThreshold = isNightmare ? 0.35 : 0.20;
    const shouldStrategicBluff = (Math.random() < bluffThreshold) && (isRiver || hasScaryHighCard || isBoardPaired || bot.id === 4);

    if (isPreflop) {
      const tier = evaluatePreflopTier(bot.cards);
      const preflopEquity = tier === 1 ? 0.82 : (tier === 2 ? 0.65 : (tier === 3 ? 0.48 : (tier === 4 ? 0.34 : 0.20)));

      // Facing large shove or all-in
      if (toCall > this.bigBlind * 4 || isHeroAllIn) {
        if (tier === 1) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `CALL ALL-IN!`);
          this.setAnnouncement(`[SNAP CALL] ${bot.name} SNAPS CALL with monster pocket pair!`);
        } else if ((tier === 2 && (preflopEquity >= potOdds || Math.random() < 0.70)) || (isNightmare && tier <= 2)) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `CALL ALL-IN!`);
          this.setAnnouncement(`[CALL] ${bot.name} calls the all-in shove with strong pot odds!`);
        } else if (bot.style.includes('Maniac') && Math.random() < 0.45) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `GAMBLE CALL!`);
          this.setAnnouncement(`[CALL] Duke gambles and calls the all-in!`);
        } else {
          bot.folded = true;
          this.showActionBubble(bot.id, 'Fold');
          this.setAnnouncement(`${bot.name} folds to the shove.`);
        }
      } else if (toCall === 0) {
        // Checked to bot
        if ((tier <= 2 && Math.random() < 0.75) || (isNightmare && tier <= 3)) {
          const raiseAmt = Math.min(bot.chips, this.minRaise * (isNightmare ? 4 : 3));
          this.postBet(bot, raiseAmt);
          this.minRaise = raiseAmt - this.currentBet;
          this.currentBet = bot.currentBet;
          bot.wasPreflopRaiser = true;
          this.hasActed.clear();
          this.showActionBubble(bot.id, `Raise to $${bot.currentBet}`);
          this.setAnnouncement(`${bot.name} raises to $${bot.currentBet}!`);
        } else if (shouldStrategicBluff && Math.random() < 0.5) {
          const bluffAmt = Math.min(bot.chips, this.minRaise * 2);
          this.postBet(bot, bluffAmt);
          this.minRaise = bluffAmt - this.currentBet;
          this.currentBet = bot.currentBet;
          this.hasActed.clear();
          this.showActionBubble(bot.id, `Bluff Raise $${bot.currentBet}`);
          this.setAnnouncement(`[RAISE] ${bot.name} fires a pre-flop bluff raise to $${bot.currentBet}!`);
        } else {
          sounds.playCheck();
          this.showActionBubble(bot.id, 'Check');
          this.setAnnouncement(`${bot.name} checks.`);
        }
      } else {
        // Calling standard bets
        if (tier === 1) {
          if (isNightmare && Math.random() < 0.6) {
            // Nightmare 3-bet
            const reRaise = Math.min(bot.chips, this.currentBet + this.minRaise * 2);
            this.postBet(bot, reRaise - bot.currentBet);
            this.minRaise = reRaise - this.currentBet;
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `3-Bet $${bot.currentBet}`);
            this.setAnnouncement(`[3-BET] ${bot.name} re-raises to $${bot.currentBet}!`);
          } else {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls $${called}.`);
          }
        } else if (preflopEquity >= potOdds || tier <= 3 || (Math.random() < 0.55 && !isNightmare)) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `Call $${called}`);
          this.setAnnouncement(`${bot.name} calls $${called}.`);
        } else {
          bot.folded = true;
          this.showActionBubble(bot.id, 'Fold');
          this.setAnnouncement(`${bot.name} folds.`);
        }
      }
    } else {
      // Post-Flop Decisions: High-IQ pot odds & texture reads
      const best = evaluateBestHand(bot.cards, this.communityCards);
      const isMonster = best.category >= HAND_RANKS.FULL_HOUSE;
      const isStrong = best.category >= HAND_RANKS.TWO_PAIR;
      const isPair = best.category >= HAND_RANKS.ONE_PAIR;

      // Estimated post-flop equity
      let postFlopEquity = 0.15;
      if (isMonster) postFlopEquity = 0.95;
      else if (best.category >= HAND_RANKS.FLUSH) postFlopEquity = 0.85;
      else if (best.category >= HAND_RANKS.STRAIGHT) postFlopEquity = 0.78;
      else if (best.category >= HAND_RANKS.THREE_OF_A_KIND) postFlopEquity = 0.68;
      else if (isStrong) postFlopEquity = 0.55;
      else if (isPair) postFlopEquity = 0.38;

      if (toCall > 0) {
        // Evaluate calling vs pot odds & all-in confrontations
        const isFacingAllIn = isHeroAllIn || toCall >= bot.chips;
        const justifiedByOdds = postFlopEquity >= (potOdds * (isNightmare ? 0.9 : 0.8));

        if (isFacingAllIn) {
          // Absolute stack deduction: Calling an all-in commits bot's entire remaining stack
          if (isMonster || isStrong || (justifiedByOdds && Math.random() < 0.70)) {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `CALL ALL-IN!`);
            this.setAnnouncement(`[CALL] ${bot.name} calls the all-in shove (${best.desc})!`);
          } else {
            bot.folded = true;
            this.showActionBubble(bot.id, 'Fold');
            this.setAnnouncement(`${bot.name} folds to the all-in shove.`);
          }
        } else if (isMonster || isStrong || justifiedByOdds) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `Call $${called}`);
          this.setAnnouncement(`${bot.name} calls $${called} (${best.desc}).`);
        } else if (shouldStrategicBluff && Math.random() < 0.30 && bot.chips > toCall * 3) {
          // Semi-bluff raise on scary board!
          const bluffRaise = Math.min(bot.chips, this.currentBet + Math.max(this.minRaise, Math.floor(pot * 0.6)));
          this.postBet(bot, bluffRaise - bot.currentBet);
          this.minRaise = bluffRaise - this.currentBet;
          this.currentBet = bot.currentBet;
          this.hasActed.clear();
          this.showActionBubble(bot.id, `Bluff Raise $${bot.currentBet}`);
          this.setAnnouncement(`[RAISE] ${bot.name} attacks the board with a high-pressure bluff raise to $${bot.currentBet}!`);
        } else {
          bot.folded = true;
          this.showActionBubble(bot.id, 'Fold');
          this.setAnnouncement(`${bot.name} folds to the bet.`);
        }
      } else {
        // Checked to bot: Value bet or strategic bluff
        if (isMonster || (isStrong && Math.random() < 0.85) || (isNightmare && isPair && Math.random() < 0.7)) {
          const betPct = isMonster ? 0.75 : 0.55;
          const betAmt = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * betPct)));
          this.postBet(bot, betAmt);
          this.currentBet = bot.currentBet;
          this.hasActed.clear();
          this.showActionBubble(bot.id, `Bet $${betAmt}`);
          this.setAnnouncement(`${bot.name} value bets $${betAmt} (${best.desc}).`);
        } else if (shouldStrategicBluff) {
          // 20% strategic bluff in position or on scary river
          const bluffAmt = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.55)));
          this.postBet(bot, bluffAmt);
          this.currentBet = bot.currentBet;
          this.hasActed.clear();
          this.showActionBubble(bot.id, `Bluff $${bluffAmt}`);
          this.setAnnouncement(`[BLUFF] ${bot.name} fires a strategic bluff bet of $${bluffAmt}!`);
        } else {
          sounds.playCheck();
          this.showActionBubble(bot.id, 'Check');
          this.setAnnouncement(`${bot.name} checks.`);
        }
      }
    }

    this.hasActed.add(bot.id);
    this.actingIdx = (this.actingIdx + 1) % this.players.length;
    setTimeout(() => this.nextTurn(), 500);
  }

  advanceStage() {
    this.players.forEach(p => p.currentBet = 0);
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.players.forEach((_, idx) => document.getElementById(`seat-${idx}`).classList.remove('current-turn'));

    const active = this.players.filter(p => !p.folded);
    if (active.length <= 1) {
      this.resolveEarlyWin(active[0]);
      return;
    }

    if (this.currentRound === 'pre-flop') {
      this.stageBadgeEl.textContent = 'THE FLOP';
      this.deck.deal();
      for (let i = 0; i < 3; i++) {
        const c = this.deck.deal();
        this.communityCards.push(c);
        setTimeout(() => sounds.playCard(1.0 + i * 0.05), i * 90);
        document.getElementById(`flop-${i + 1}`).appendChild(this.renderCardDOM(c));
      }
      this.setAnnouncement('Flop dealt! First player acts.');
      this.startBettingRound('flop', (this.dealerIdx + 1) % this.players.length);

    } else if (this.currentRound === 'flop') {
      this.stageBadgeEl.textContent = 'THE TURN';
      this.deck.deal();
      const c = this.deck.deal();
      this.communityCards.push(c);
      sounds.playCard();
      document.getElementById('turn').appendChild(this.renderCardDOM(c));
      this.setAnnouncement('Turn card dealt!');
      this.startBettingRound('turn', (this.dealerIdx + 1) % this.players.length);

    } else if (this.currentRound === 'turn') {
      this.stageBadgeEl.textContent = 'THE RIVER';
      this.deck.deal();
      const c = this.deck.deal();
      this.communityCards.push(c);
      sounds.playCard();
      document.getElementById('river').appendChild(this.renderCardDOM(c));
      this.setAnnouncement('River card dealt! Final betting round.');
      this.startBettingRound('river', (this.dealerIdx + 1) % this.players.length);

    } else if (this.currentRound === 'river') {
      this.resolveShowdown();
    }
  }

  resolveEarlyWin(winner) {
    const pot = this.getTotalPot();
    winner.chips += pot;
    sounds.playWin();
    this.animatePotAward(winner.id);

    const heroWon = (winner.id === 0);
    if (heroWon) this.winRecord.won++;
    this.winRecord.total++;

    const heroHandEval = this.players[0].cards.length === 2 ? evaluateBestHand(this.players[0].cards, this.communityCards) : null;
    SaveManager.recordHandStats(heroWon, pot, heroHandEval, this.isOnlineRoom);
    this.updateGlobalStatsUI();

    // Log Hand History Event
    this.recordHandHistory({
      stage: this.stage || 1,
      handNum: this.handNumber,
      winner: winner.name,
      amount: pot,
      desc: 'All opponents folded',
      cards: winner.cards || [],
      community: [...this.communityCards]
    });

    this.setAnnouncement(`[WINNER] ${winner.name} wins $${pot}! (Opponents folded)`);
    this.updateTableUI();
    this.broadcastTableState();
    this.finishHand();
  }

  // ==========================================================================
  // SHOWDOWN & SIDE POT SETTLEMENT
  // ==========================================================================
  resolveShowdown() {
    this.stageBadgeEl.textContent = 'SHOWDOWN';
    sounds.playWin();

    // Reveal all remaining active cards
    this.players.forEach((p, idx) => {
      if (!p.folded) {
        const container = document.getElementById(`cards-${idx}`);
        container.innerHTML = '';
        p.cards.forEach(c => container.appendChild(this.renderCardDOM(c)));
      }
    });

    const pots = PotManager.calculateSidePots(this.players);
    let heroWonAny = false;
    let heroBestEval = null;
    let totalPotAmount = this.getTotalPot();
    const announcements = [];

    pots.forEach((pot, pIdx) => {
      const potLabel = pots.length === 1 ? 'Pot' : (pIdx === 0 ? 'Main Pot' : `Side Pot`);
      const eligible = pot.eligiblePlayers.filter(p => !p.folded);

      if (eligible.length === 0) return;

      if (eligible.length === 1) {
        eligible[0].chips += pot.amount;
        if (eligible[0].id === 0) heroWonAny = true;
        this.animatePotAward(eligible[0].id);
        announcements.push(`${eligible[0].name} takes ${potLabel} ($${pot.amount}).`);
        return;
      }

      const evaluated = eligible.map(p => ({
        player: p,
        eval: evaluateBestHand(p.cards, this.communityCards, this.variant)
      }));

      evaluated.sort((a, b) => compareScores(b.eval, a.eval));
      const bestScore = evaluated[0].eval;
      const tiedWinners = evaluated.filter(item => compareScores(item.eval, bestScore) === 0);

      const share = Math.floor(pot.amount / tiedWinners.length);
      const remainder = pot.amount % tiedWinners.length;

      tiedWinners.forEach((w, wIdx) => {
        w.player.chips += share + (wIdx < remainder ? 1 : 0);
        if (w.player.id === 0) {
          heroWonAny = true;
          heroBestEval = w.eval;
        }

        // Highlight winning cards on board
        w.eval.bestCards.forEach(c => {
          const commSlots = document.querySelectorAll('.community-cards-box .card');
          commSlots.forEach(el => {
            if (el.textContent.includes(c.label) && el.textContent.includes(c.suit.symbol)) {
              el.classList.add('winning-highlight');
            }
          });
        });
      });

      if (tiedWinners.length === 1) {
        announcements.push(`[WINNER] ${tiedWinners[0].player.name} wins ${potLabel} ($${pot.amount}) with ${tiedWinners[0].eval.desc}!`);
        this.recordHandHistory({
          stage: this.stage || 1,
          handNum: this.handNumber,
          winner: tiedWinners[0].player.name,
          amount: pot.amount,
          desc: tiedWinners[0].eval.desc,
          cards: tiedWinners[0].player.cards,
          community: [...this.communityCards]
        });
      } else {
        const names = tiedWinners.map(w => w.player.name).join(' & ');
        announcements.push(`[CHOP] Chop! ${names} split ${potLabel} ($${pot.amount})!`);
        this.recordHandHistory({
          stage: this.stage || 1,
          handNum: this.handNumber,
          winner: names,
          amount: pot.amount,
          desc: `Chop Split with ${tiedWinners[0].eval.desc}`,
          cards: tiedWinners[0].player.cards,
          community: [...this.communityCards]
        });
      }
    });

    if (heroWonAny) this.winRecord.won++;
    this.winRecord.total++;

    if (!heroBestEval && this.players[0].cards.length === 2) {
      heroBestEval = evaluateBestHand(this.players[0].cards, this.communityCards);
    }
    SaveManager.recordHandStats(heroWonAny, totalPotAmount, heroBestEval, this.isOnlineRoom);
    this.updateGlobalStatsUI();

    // Absolute Stack Deduction & Elimination Enforcement (Phase 4)
    const newlyEliminated = [];
    this.players.forEach((p, idx) => {
      if (p.chips <= 0) {
        p.chips = 0;
        p.knockedOut = true;
        p.allIn = false;
        p.folded = true;
        p.cards = [];
        const seatEl = document.getElementById(`seat-${idx}`);
        if (seatEl) {
          seatEl.classList.add('knocked-out');
          let badge = seatEl.querySelector('.knockout-stamp');
          if (!badge) {
            badge = document.createElement('div');
            badge.className = 'knockout-stamp';
            badge.textContent = 'BUSTED';
            seatEl.appendChild(badge);
          }
        }
        const chipEl = document.getElementById(`chips-${idx}`);
        if (chipEl) chipEl.textContent = '0';
        const cBox = document.getElementById(`cards-${idx}`);
        if (cBox) cBox.innerHTML = '';
        if (idx > 0 && !this.isOnlineRoom) {
          newlyEliminated.push(p.name);
        }
      }
    });

    if (newlyEliminated.length > 0) {
      announcements.push(`[BUSTED] ${newlyEliminated.join(' & ')} lost all chips and was eliminated from the table!`);
    }

    this.setAnnouncement(announcements.join(' '));
    this.updateTableUI();
    this.broadcastTableState();
    this.finishHand();
  }

  // ==========================================================================
  // HAND COMPLETION, BUSTED TO ZERO MONEY, & 5-SECOND JOINING WINDOW
  // ==========================================================================
  finishHand() {
    this.handInProgress = false;
    this.clearTurnTimer();
    this.updateMenuLockState();
    this.actionPanelEl.classList.remove('disabled');
    this.btnFold.disabled = true;
    this.btnCheckCall.disabled = true;
    this.btnRaise.disabled = true;
    this.btnAllin.disabled = true;
    this.sliderEl.disabled = true;

    if (!this.isOnlineRoom) {
      this.saveCurrentGame();
    }

    const hero = this.players[0];
    if (hero.chips === 0) {
      // PERMADEATH ACTIVATED: Save slot deleted permanently from storage!
      if (!this.isOnlineRoom) {
        SaveManager.deleteSlot(this.activeSlot);
        this.renderMainMenuSlots();
      }
      this.setAnnouncement('[BUST] Zero chips left. Permadeath activated.');
      if (this.gameOverModal) {
        this.gameOverModal.classList.remove('hidden');
      }
      this.btnNextHand.textContent = 'Start New Run ($1,000)';
      this.btnNextHand.onclick = () => {
        this.btnNextHand.onclick = null;
        this.btnNextHand.textContent = 'Deal Next Hand';
        if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
        this.openBuyInModal(this.activeSlot || 1, this.difficulty || 'medium');
      };
      this.btnNextHand.classList.remove('hidden');
      return;
    }

    // Immediate permanent bot elimination check
    this.players.forEach((p, idx) => {
      if (p.chips <= 0) {
        p.chips = 0;
        p.knockedOut = true;
        p.allIn = false;
        p.folded = true;
        p.cards = [];
        const seatEl = document.getElementById(`seat-${idx}`);
        if (seatEl) seatEl.classList.add('knocked-out');
      }
    });

    // Check if ALL bots have 0 chips: Table Conquered!
    if (!this.isOnlineRoom && this.players.slice(1).every(p => p.chips <= 0 || p.knockedOut)) {
      this.triggerStageVictory();
      return;
    }

    if (this.isOnlineRoom && this.isHost) {
      // 1. Seat any waiting friends who connected mid-hand
      this.guestConnections.forEach(g => {
        if (g.waiting) {
          g.waiting = false;
          const s = g.seatIdx;
          const targetBot = this.players[s];
          const inheritedChips = (targetBot && targetBot.chips > 0) ? targetBot.chips : 1000;

          this.players[s].name = g.name;
          this.players[s].style = 'Friend (Online)';
          this.players[s].avatar = '👤';
          this.players[s].chips = inheritedChips;
          this.players[s].isBot = false;
          this.players[s].isRemote = true;
          this.players[s].peerConn = g.conn;
          g.chips = inheritedChips;

          document.getElementById(`name-${s}`).textContent = g.name;
          document.getElementById(`style-${s}`).textContent = 'Friend (Online)';
          this.renderAvatar(s, 'guest');
          document.getElementById(`chips-${s}`).textContent = inheritedChips.toString();

          g.conn.send({
            type: 'seated',
            seat: s,
            name: g.name,
            chips: inheritedChips,
            tableState: this.serializeTableStateFor(s)
          });
          this.setAnnouncement(`[JOIN] ${g.name} replaced bot at Seat ${s} with $${inheritedChips} for next round!`);
        }
      });

      // 2. Start the 5-Second Joining Window countdown between hands!
      this.start5SecondJoiningCountdown(() => {
        this.startNewHand();
      });
      return;
    }

    // Solo mode: show deal button
    this.btnNextHand.classList.remove('hidden');
  }

  // 5-Second Pause Screen & Joining Window countdown timer between hands
  start5SecondJoiningCountdown(onComplete) {
    let seconds = 5;
    this.countdownOverlay.classList.remove('hidden');
    this.countdownNumber.textContent = seconds;
    sounds.playCheck();
    this.broadcastCountdownTick(seconds);

    if (this.joiningCountdownTimer) clearInterval(this.joiningCountdownTimer);

    this.joiningCountdownTimer = setInterval(() => {
      seconds--;
      if (seconds > 0) {
        this.countdownNumber.textContent = seconds;
        sounds.playCheck();
        this.broadcastCountdownTick(seconds);
      } else {
        clearInterval(this.joiningCountdownTimer);
        this.joiningCountdownTimer = null;
        this.countdownOverlay.classList.add('hidden');
        this.broadcastCountdownTick(0);
        if (onComplete) onComplete();
      }
    }, 1000);
  }

  // ==========================================================================
  // EUROPEAN SINGLE-ZERO ROULETTE MINI-GAME
  // ==========================================================================
  initRoulette() {
    this.rouletteCanvas = document.getElementById('roulette-canvas');
    if (!this.rouletteCanvas) return;
    this.rouletteCtx = this.rouletteCanvas.getContext('2d');
    this.wheelNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    this.redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    this.drawRouletteWheel(0);

    // Populate numbers grid 1-36
    const grid = document.getElementById('roulette-numbers-grid');
    if (grid) {
      grid.innerHTML = '';
      for (let n = 1; n <= 36; n++) {
        const btn = document.createElement('button');
        const isRed = this.redNumbers.has(n);
        btn.className = `r-num-cell ${isRed ? 'red' : 'black'}`;
        btn.textContent = n;
        btn.dataset.betType = 'number';
        btn.dataset.betVal = n;
        btn.addEventListener('click', () => this.placeRouletteBet('number', n, btn));
        grid.appendChild(btn);
      }
    }

    // Quick Preset Wager buttons ($10, $50, $100, MAX)
    document.querySelectorAll('.r-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.r-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const wagerType = btn.dataset.wager;
        const wallet = EconomyManager.getMiniGameWallet();
        if (wagerType === 'custom') {
          this.openCustomWagerModal('roulette');
        } else if (wagerType === 'max') {
          this.selectedRouletteChip = Math.max(10, wallet.balance);
        } else {
          this.selectedRouletteChip = Number(wagerType) || 10;
        }
        sounds.playChip();
      });
    });

    // Chip selectors
    document.querySelectorAll('.r-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.r-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedRouletteChip = Number(btn.dataset.chip);
        sounds.playChip();
      });
    });

    // Outside spots
    document.querySelectorAll('.r-bet-spot').forEach(spot => {
      spot.addEventListener('click', () => {
        this.placeRouletteBet(spot.dataset.betType, spot.dataset.betVal, spot);
      });
    });

    // Shortcut button to Bankroll Transfer
    const transferBtn = document.getElementById('btn-roulette-transfer');
    if (transferBtn) {
      transferBtn.addEventListener('click', () => {
        if (this.rouletteModal) this.rouletteModal.classList.add('hidden');
        this.openTransferModal();
      });
    }
  }

  openRouletteModal() {
    if (!this.rouletteModal) return;
    this.updateRouletteUI();
    this.rouletteModal.classList.remove('hidden');
    this.drawRouletteWheel(this.rouletteAngle || 0);
  }

  updateRouletteUI() {
    const wallet = EconomyManager.getMiniGameWallet();
    const rBankroll = document.getElementById('roulette-bankroll');
    const rBetTotal = document.getElementById('roulette-total-bet');
    if (rBankroll) rBankroll.textContent = `$${wallet.balance.toLocaleString()}`;
    const totalBet = Object.values(this.rouletteBets).reduce((sum, b) => sum + b.amount, 0);
    if (rBetTotal) rBetTotal.textContent = `$${totalBet.toLocaleString()}`;
    const portalMiniEl = document.getElementById('portal-minigame-val');
    if (portalMiniEl) portalMiniEl.textContent = `$${wallet.balance.toLocaleString()}`;
    const casinoPageWalletEl = document.getElementById('casino-page-wallet-val');
    if (casinoPageWalletEl) casinoPageWalletEl.textContent = `$${wallet.balance.toLocaleString()}`;
    this.updateEconomyDashboard();
  }

  placeRouletteBet(type, val, targetEl) {
    if (this.rouletteSpinning) return;
    const name = this.getPlayerName();
    if (!name) {
      this.openPlayerNameModal(() => this.placeRouletteBet(type, val, targetEl));
      return;
    }

    const chipAmt = this.selectedRouletteChip || 10;
    const wallet = EconomyManager.getMiniGameWallet();
    if (wallet.balance < chipAmt) {
      sounds.playCheck();
      const pill = document.getElementById('roulette-status-pill');
      if (pill) pill.textContent = '[ERROR] Insufficient mini-game wallet funds!';
      this.showInGameAlert({
        title: 'INSUFFICIENT CASINO FUNDS',
        message: `You need at least $${chipAmt.toLocaleString()} in your Casino Wallet to place this bet. Your balance is $${wallet.balance.toLocaleString()}. Claim your daily allowance or transfer chips from your savings vault.`
      });
      return;
    }

    const key = `${type}_${val}`;
    if (!this.rouletteBets[key]) {
      this.rouletteBets[key] = { type, val, amount: 0, el: targetEl };
    }
    this.rouletteBets[key].amount += chipAmt;
    wallet.balance -= chipAmt;
    EconomyManager.saveMiniGameWallet(wallet);
    sounds.playChip();

    let badge = targetEl.querySelector('.bet-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'bet-badge';
      targetEl.appendChild(badge);
    }
    badge.textContent = `$${this.rouletteBets[key].amount}`;

    const pill = document.getElementById('roulette-status-pill');
    if (pill) pill.textContent = `Bet placed on ${val}! Spin when ready.`;

    this.updateRouletteUI();
  }

  clearRouletteBets() {
    if (this.rouletteSpinning) return;
    const wallet = EconomyManager.getMiniGameWallet();
    Object.values(this.rouletteBets).forEach(b => {
      wallet.balance += b.amount;
      if (b.el) {
        const badge = b.el.querySelector('.bet-badge');
        if (badge) badge.remove();
      }
    });
    EconomyManager.saveMiniGameWallet(wallet);
    this.rouletteBets = {};
    sounds.playChip();
    const pill = document.getElementById('roulette-status-pill');
    if (pill) pill.textContent = 'All bets cleared and refunded to mini-game wallet.';
    this.updateRouletteUI();
  }

  drawRouletteWheel(angle) {
    if (!this.rouletteCtx) return;
    const ctx = this.rouletteCtx;
    const size = 320;
    const center = size / 2;
    const radius = center - 8;
    ctx.clearRect(0, 0, size, size);

    const totalPockets = this.wheelNumbers.length;
    const arc = (2 * Math.PI) / totalPockets;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);

    for (let i = 0; i < totalPockets; i++) {
      const num = this.wheelNumbers[i];
      const startAngle = i * arc;
      const endAngle = startAngle + arc;

      // Color pocket
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      if (num === 0) {
        ctx.fillStyle = '#15803d'; // European single green zero
      } else if (this.redNumbers.has(num)) {
        ctx.fillStyle = '#b91c1c'; // Red
      } else {
        ctx.fillStyle = '#0f172a'; // Black
      }
      ctx.fill();

      // Golden sector dividers
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Number text
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(num.toString(), radius - 12, 4);
      ctx.restore();
    }

    // Outer rim
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    // Solar Corona Center Spindle Hub
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, 2 * Math.PI);
    const sunGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 38);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.3, '#fef08a');
    sunGrad.addColorStop(0.7, '#f59e0b');
    sunGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = sunGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();

    // Inner Radiant Sun Core
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, 2 * Math.PI);
    ctx.fillStyle = '#fffbeb';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.restore();
  }

  spinRouletteWheel() {
    if (this.rouletteSpinning) return;
    const totalBet = Object.values(this.rouletteBets).reduce((sum, b) => sum + b.amount, 0);
    if (totalBet === 0) {
      sounds.playCheck();
      const pill = document.getElementById('roulette-status-pill');
      if (pill) pill.textContent = '[NOTICE] Place at least one bet before spinning!';
      return;
    }

    SaveManager.recordRouletteSpin();
    sounds.playRouletteSpin();
    sounds.startRouletteBallDeceleration(3800);
    this.rouletteSpinning = true;
    const spinBtn = document.getElementById('btn-spin-roulette');
    if (spinBtn) spinBtn.disabled = true;

    // Pick random winning pocket (European 0 to 36)
    const winningIdx = Math.floor(Math.random() * this.wheelNumbers.length);
    const winningNumber = this.wheelNumbers[winningIdx];

    const totalPockets = this.wheelNumbers.length;
    const arc = (2 * Math.PI) / totalPockets;

    // Pointer is at the top: angle 3*PI/2
    const targetOffset = (3 * Math.PI / 2) - (winningIdx * arc + arc / 2);
    const fullRotations = 6 + Math.floor(Math.random() * 3);
    const targetAngle = fullRotations * 2 * Math.PI + targetOffset;

    const startAngle = this.rouletteAngle % (2 * Math.PI);
    const delta = targetAngle - startAngle;
    const duration = 3800; // ms
    const startTime = performance.now();

    let lastTickAngle = startAngle;

    const animateWheel = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + delta * ease;
      this.rouletteAngle = currentAngle;
      this.drawRouletteWheel(currentAngle);

      if (Math.abs(currentAngle - lastTickAngle) >= arc * 0.9) {
        sounds.playRouletteClick();
        lastTickAngle = currentAngle;
      }

      if (progress < 1) {
        requestAnimationFrame(animateWheel);
      } else {
        this.rouletteSpinning = false;
        if (spinBtn) spinBtn.disabled = false;
        this.resolveRouletteSpin(winningNumber);
      }
    };

    requestAnimationFrame(animateWheel);
  }

  // ==========================================================================
  // v1.015: ROYAL SOLAR CRAPS ENGINE
  // ==========================================================================
  renderCrapsDieSVG(val) {
    const pips = {
      1: [[25, 25]],
      2: [[14, 14], [36, 36]],
      3: [[14, 14], [25, 25], [36, 36]],
      4: [[14, 14], [36, 14], [14, 36], [36, 36]],
      5: [[14, 14], [36, 14], [25, 25], [14, 36], [36, 36]],
      6: [[14, 14], [36, 14], [14, 25], [36, 25], [14, 36], [36, 36]]
    };
    const dots = (pips[val] || pips[1]).map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="4" fill="#ef4444" stroke="#fca5a5" stroke-width="0.8" filter="drop-shadow(0 0 3px #ef4444)"/>`
    ).join('');
    return `<svg width="48" height="48" viewBox="0 0 50 50" class="craps-die-svg">
      <rect width="50" height="50" rx="8" fill="#090d16" stroke="#ffd700" stroke-width="2"/>
      <rect x="3" y="3" width="44" height="44" rx="6" fill="#131c31" stroke="rgba(255,215,0,0.3)" stroke-width="1"/>
      ${dots}
    </svg>`;
  }

  initCraps() {
    this.crapsBets = {};
    this.crapsPoint = null;
    this.selectedCrapsChip = 10;
    this.crapsRolling = false;

    // Preset chip selectors ($10, $50, $100, $1,000, Custom)
    document.querySelectorAll('.craps-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.craps-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const wagerType = btn.dataset.wager;
        if (wagerType === 'custom') {
          this.openCustomWagerModal('craps');
        } else {
          this.selectedCrapsChip = Number(wagerType) || 10;
        }
        sounds.playChip();
      });
    });

    // Betting spots click handler
    document.querySelectorAll('.craps-bet-spot').forEach(spot => {
      spot.addEventListener('click', () => {
        this.requirePlayerName(() => {
          const betType = spot.dataset.bet;
          if (!betType) return;
          const chipAmt = this.selectedCrapsChip || 10;
          const wallet = EconomyManager.getMiniGameWallet();
          const currentTotal = Object.values(this.crapsBets).reduce((a, b) => a + b, 0);

          if (currentTotal + chipAmt > wallet.balance) {
            sounds.playCheck();
            this.showInGameAlert({
              title: 'INSUFFICIENT CASINO FUNDS',
              message: `Your Casino Wallet balance is too low for this bet. Available: $${wallet.balance.toLocaleString()}. Claim your +$1,000 allowance or transfer funds from savings!`,
              type: 'warning'
            });
            return;
          }

          this.crapsBets[betType] = (this.crapsBets[betType] || 0) + chipAmt;
          sounds.playChip();
          this.updateCrapsUI();
        });
      });
    });

    // Craps Rules button
    const rulesBtn = document.getElementById('btn-craps-rules');
    if (rulesBtn) {
      rulesBtn.addEventListener('click', () => {
        this.showInGameAlert({
          title: 'ROYAL SOLAR CRAPS RULES',
          message: `COME-OUT ROLL (Point OFF):
• Bet Pass Line (1:1): Natural 7 or 11 WINS! Craps 2, 3, or 12 LOSES.
• Bet Don't Pass (1:1): Craps 2 or 3 WINS! (12 pushes). 7 or 11 loses.
• Rolling 4, 5, 6, 8, 9, 10 sets the POINT! Puck flips ON.

POINT PHASE (Puck ON):
• Pass Line WINS if Point is hit before a 7!
• Seven Out: Rolling 7 before Point loses Pass Line, wins Don't Pass.

HIGH-ACTION PROPOSITIONS (Every Roll):
• FIELD: 2 pays 2:1, 12 pays 3:1, 3/4/9/10/11 pay 1:1. 5/6/7/8 lose.
• ANY 7: Pays 4:1 if 7 is rolled on the next roll.
• ANY CRAPS: Pays 7:1 if 2, 3, or 12 is rolled on next roll.
• HARDWAYS: Hard 6 (3-3) or Hard 8 (4-4) pays 9:1 before 7!`,
          type: 'info'
        });
      });
    }

    // Roll Dice button
    const rollBtn = document.getElementById('btn-craps-roll');
    if (rollBtn) {
      rollBtn.addEventListener('click', () => {
        this.requirePlayerName(() => this.rollCrapsDice());
      });
    }

    // Clear Bets button
    const clearBtn = document.getElementById('btn-craps-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.crapsBets = {};
        sounds.playChip();
        this.updateCrapsUI();
      });
    }

    this.updateCrapsUI();
  }

  updateCrapsUI() {
    const totalBet = Object.values(this.crapsBets).reduce((a, b) => a + b, 0);
    const totalEl = document.getElementById('craps-total-bet');
    if (totalEl) totalEl.textContent = `$${totalBet.toLocaleString()}`;

    const pointEl = document.getElementById('craps-point-display');
    if (pointEl) {
      if (this.crapsPoint) {
        pointEl.textContent = `ON: ${this.crapsPoint}`;
        pointEl.className = 'gold';
      } else {
        pointEl.textContent = 'OFF';
        pointEl.className = 'gold';
      }
    }

    const betTypes = ['pass', 'dontpass', 'field', 'seven', 'anycraps', 'hard6', 'hard8'];
    betTypes.forEach(bt => {
      const badge = document.getElementById(`chip-badge-${bt}`);
      const spot = document.getElementById(`craps-bet-${bt}`);
      const amt = this.crapsBets[bt] || 0;
      if (badge) {
        if (amt > 0) {
          badge.textContent = `$${amt.toLocaleString()}`;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
      if (spot) {
        spot.classList.toggle('active', amt > 0);
      }
    });

    const wallet = EconomyManager.getMiniGameWallet();
    const crapsBal = document.getElementById('craps-wallet-balance');
    if (crapsBal) crapsBal.textContent = `$${wallet.balance.toLocaleString()}`;
  }

  rollCrapsDice() {
    if (this.crapsRolling) return;
    const totalBet = Object.values(this.crapsBets).reduce((a, b) => a + b, 0);

    if (totalBet <= 0) {
      sounds.playCheck();
      this.showInGameAlert({
        title: 'NO BETS PLACED',
        message: 'Place at least one wager on the Craps table (Pass Line, Don\'t Pass, Field, or Props) before rolling!',
        type: 'info'
      });
      return;
    }

    const wallet = EconomyManager.getMiniGameWallet();
    if (wallet.balance < totalBet) {
      sounds.playCheck();
      this.showInGameAlert({
        title: 'INSUFFICIENT CASINO FUNDS',
        message: `Your Casino Wallet balance is $${wallet.balance.toLocaleString()}, which cannot cover your $${totalBet.toLocaleString()} wager.`,
        type: 'warning'
      });
      return;
    }

    // Deduct total bet from wallet upfront
    wallet.balance -= totalBet;
    EconomyManager.saveMiniGameWallet(wallet);
    this.updateDualWalletUI();
    this.updateEconomyDashboard();
    this.updateCrapsUI();

    this.crapsRolling = true;
    sounds.playDiceCupShake();
    setTimeout(() => sounds.playDiceTumble(), 120);

    const d1El = document.getElementById('craps-die-1');
    const d2El = document.getElementById('craps-die-2');
    const banner = document.getElementById('craps-result-banner');

    if (d1El) d1El.classList.add('die-tumbling');
    if (d2El) d2El.classList.add('die-tumbling');
    if (banner) banner.textContent = 'Dice tumbling down the solar craps felt...';

    setTimeout(() => {
      if (d1El) d1El.classList.remove('die-tumbling');
      if (d2El) d2El.classList.remove('die-tumbling');

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;

      sounds.playDiceLand();
      if (d1El) d1El.innerHTML = this.renderCrapsDieSVG(d1);
      if (d2El) d2El.innerHTML = this.renderCrapsDieSVG(d2);

      let totalReturn = 0;
      const winMessages = [];

      // 1. Resolve Contract Line Bets (Pass Line / Don't Pass)
      const passBet = this.crapsBets['pass'] || 0;
      const dontPassBet = this.crapsBets['dontpass'] || 0;

      if (this.crapsPoint === null) {
        // COME-OUT ROLL
        if (total === 7 || total === 11) {
          // Natural Win for Pass
          if (passBet > 0) {
            totalReturn += passBet * 2;
            winMessages.push(`Pass Line wins $${(passBet * 2).toLocaleString()}!`);
          }
          delete this.crapsBets['pass'];
          delete this.crapsBets['dontpass'];
          if (banner) banner.textContent = `Natural ${total}! Pass Line wins! Come-out continues.`;
        } else if (total === 2 || total === 3) {
          // Craps for Pass, Win for Don't Pass
          if (dontPassBet > 0) {
            totalReturn += dontPassBet * 2;
            winMessages.push(`Don't Pass wins $${(dontPassBet * 2).toLocaleString()}!`);
          }
          delete this.crapsBets['pass'];
          delete this.crapsBets['dontpass'];
          if (banner) banner.textContent = `Craps ${total}! Don't Pass wins!`;
        } else if (total === 12) {
          // Craps 12: Pass loses, Don't Pass pushes
          if (dontPassBet > 0) {
            totalReturn += dontPassBet; // Push returns bet
            winMessages.push(`Don't Pass pushes $${dontPassBet.toLocaleString()}.`);
          }
          delete this.crapsBets['pass'];
          delete this.crapsBets['dontpass'];
          if (banner) banner.textContent = `Craps 12! Don't Pass pushes.`;
        } else {
          // 4, 5, 6, 8, 9, 10: Point established
          this.crapsPoint = total;
          if (banner) banner.textContent = `Point established at ${total}! Roll again to hit ${total} before a 7.`;
        }
      } else {
        // POINT PHASE
        if (total === this.crapsPoint) {
          // Hit the Point!
          if (passBet > 0) {
            totalReturn += passBet * 2;
            winMessages.push(`Hit Point ${total}! Pass Line wins $${(passBet * 2).toLocaleString()}!`);
          }
          delete this.crapsBets['pass'];
          delete this.crapsBets['dontpass'];
          this.crapsPoint = null;
          if (banner) banner.textContent = `Rolled ${total}! Point hit! Pass Line wins!`;
        } else if (total === 7) {
          // Seven Out!
          if (dontPassBet > 0) {
            totalReturn += dontPassBet * 2;
            winMessages.push(`Seven Out! Don't Pass wins $${(dontPassBet * 2).toLocaleString()}!`);
          }
          delete this.crapsBets['pass'];
          delete this.crapsBets['dontpass'];
          this.crapsPoint = null;
          if (banner) banner.textContent = `Seven Out! Don't Pass wins. Point resets to OFF.`;
        } else {
          if (banner) banner.textContent = `Rolled ${total}. Point remains ${this.crapsPoint}. Keep shooting!`;
        }
      }

      // 2. Resolve Single-Roll Field Bet
      const fieldBet = this.crapsBets['field'] || 0;
      if (fieldBet > 0) {
        if (total === 2) {
          totalReturn += fieldBet * 3; // 2:1 payout + original bet
          winMessages.push(`Field Double (2) pays $${(fieldBet * 3).toLocaleString()}!`);
        } else if (total === 12) {
          totalReturn += fieldBet * 4; // 3:1 payout + original bet
          winMessages.push(`Field Triple (12) pays $${(fieldBet * 4).toLocaleString()}!`);
        } else if ([3, 4, 9, 10, 11].includes(total)) {
          totalReturn += fieldBet * 2; // 1:1 payout + original bet
          winMessages.push(`Field (${total}) pays $${(fieldBet * 2).toLocaleString()}!`);
        }
        delete this.crapsBets['field'];
      }

      // 3. Resolve Single-Roll Any 7 Bet (4:1)
      const sevenBet = this.crapsBets['seven'] || 0;
      if (sevenBet > 0) {
        if (total === 7) {
          totalReturn += sevenBet * 5; // 4:1 payout + original bet
          winMessages.push(`Any 7 pays $${(sevenBet * 5).toLocaleString()}!`);
        }
        delete this.crapsBets['seven'];
      }

      // 4. Resolve Single-Roll Any Craps Bet (7:1)
      const crapsBet = this.crapsBets['anycraps'] || 0;
      if (crapsBet > 0) {
        if ([2, 3, 12].includes(total)) {
          totalReturn += crapsBet * 8; // 7:1 payout + original bet
          winMessages.push(`Any Craps (${total}) pays $${(crapsBet * 8).toLocaleString()}!`);
        }
        delete this.crapsBets['anycraps'];
      }

      // 5. Resolve Hardway Bets (Hard 6 & Hard 8: 9:1)
      const hard6Bet = this.crapsBets['hard6'] || 0;
      if (hard6Bet > 0) {
        if (d1 === 3 && d2 === 3) {
          totalReturn += hard6Bet * 10;
          winMessages.push(`Hard 6 (3-3) pays $${(hard6Bet * 10).toLocaleString()}!`);
          delete this.crapsBets['hard6'];
        } else if (total === 7 || total === 6) {
          delete this.crapsBets['hard6'];
        }
      }

      const hard8Bet = this.crapsBets['hard8'] || 0;
      if (hard8Bet > 0) {
        if (d1 === 4 && d2 === 4) {
          totalReturn += hard8Bet * 10;
          winMessages.push(`Hard 8 (4-4) pays $${(hard8Bet * 10).toLocaleString()}!`);
          delete this.crapsBets['hard8'];
        } else if (total === 7 || total === 8) {
          delete this.crapsBets['hard8'];
        }
      }

      const netReturn = totalReturn - totalBet;
      if (totalReturn > 0) {
        sounds.playWin();
        const curWallet = EconomyManager.getMiniGameWallet();
        curWallet.balance += totalReturn;
        EconomyManager.saveMiniGameWallet(curWallet);
        if (netReturn > 0) {
          this.setAnnouncement(`[CRAPS WIN] Rolled ${total} (${d1}+${d2})! You WON +$${totalReturn.toLocaleString()}! (Net profit: +$${netReturn.toLocaleString()})`);
        } else {
          this.setAnnouncement(`[CRAPS PUSH] Rolled ${total} (${d1}+${d2})! Push/Return $${totalReturn.toLocaleString()}.`);
        }
      } else {
        sounds.playLose();
        this.setAnnouncement(`[CRAPS LOSS] Rolled ${total} (${d1}+${d2}). You LOST -$${totalBet.toLocaleString()} on this roll.`);
      }

      this.updateDualWalletUI();
      this.updateEconomyDashboard();
      this.updateCrapsUI();
      this.crapsRolling = false;
      this.casinoSessionNetPnL = (this.casinoSessionNetPnL || 0) + (totalWon - totalBet);
      this.updateSoloHUD();
      if (EconomyManager.getMiniGameWallet().balance <= 0) {
        setTimeout(() => this.promptInsufficientCasinoFunds('Craps'), 1200);
      }
    }, 650);
  }

  resolveRouletteSpin(winningNumber) {
    sounds.playRouletteDrop();
    const isRed = this.redNumbers.has(winningNumber);
    const isBlack = winningNumber > 0 && !isRed;
    const isEven = (winningNumber > 0 && winningNumber % 2 === 0);
    const isOdd = (winningNumber > 0 && winningNumber % 2 === 1);
    const isLow = (winningNumber >= 1 && winningNumber <= 18);
    const isHigh = (winningNumber >= 19 && winningNumber <= 36);
    const dozen = winningNumber === 0 ? 0 : (winningNumber <= 12 ? 1 : (winningNumber <= 24 ? 2 : 3));

    let totalPayout = 0;
    const winningDescriptions = [];

    Object.values(this.rouletteBets).forEach(bet => {
      let won = false;
      let payoutMult = 0;

      if (bet.type === 'number' && Number(bet.val) === winningNumber) {
        won = true;
        payoutMult = 36; // 35 to 1 payout + original bet returned
      } else if (bet.type === 'color') {
        if (bet.val === 'red' && isRed) won = true;
        if (bet.val === 'black' && isBlack) won = true;
        if (won) payoutMult = 2; // 1 to 1 payout
      } else if (bet.type === 'parity') {
        if (bet.val === 'even' && isEven) won = true;
        if (bet.val === 'odd' && isOdd) won = true;
        if (won) payoutMult = 2;
      } else if (bet.type === 'low' && isLow) {
        won = true;
        payoutMult = 2;
      } else if (bet.type === 'high' && isHigh) {
        won = true;
        payoutMult = 2;
      } else if (bet.type === 'dozen' && Number(bet.val) === dozen) {
        won = true;
        payoutMult = 3; // 2 to 1 payout
      }

      if (won) {
        const winAmt = bet.amount * payoutMult;
        totalPayout += winAmt;
        winningDescriptions.push(`+$${winAmt} on ${bet.val}`);
      }

      if (bet.el) {
        const b = bet.el.querySelector('.bet-badge');
        if (b) b.remove();
      }
    });

    const wallet = EconomyManager.getMiniGameWallet();
    wallet.balance += totalPayout;
    EconomyManager.saveMiniGameWallet(wallet);
    this.rouletteBets = {};

    const banner = document.getElementById('roulette-result-display');
    const ballBadge = document.getElementById('roulette-result-ball');
    const resultText = document.getElementById('roulette-result-text');
    const statusPill = document.getElementById('roulette-status-pill');

    if (banner && ballBadge && resultText) {
      banner.classList.remove('hidden');
      ballBadge.textContent = winningNumber;
      ballBadge.style.backgroundColor = (winningNumber === 0 ? '#15803d' : (isRed ? '#b91c1c' : '#0f172a'));
      const colorLabel = (winningNumber === 0 ? 'Green' : (isRed ? 'Red' : 'Black'));
      resultText.textContent = `Result: ${winningNumber} ${colorLabel} (${winningNumber === 0 ? 'Zero' : (isEven ? 'EVEN' : 'ODD')})!`;
    }

    const totalBetRoulette = Object.values(this.rouletteBets || {}).reduce((s, b) => s + (b.amount || 0), 0);
    const netRoulette = totalPayout - totalBetRoulette;
    this.casinoSessionNetPnL = (this.casinoSessionNetPnL || 0) + netRoulette;
    this.updateSoloHUD();

    if (totalPayout > 0) {
      sounds.playWin();
      if (statusPill) statusPill.textContent = `WINNER! Paid out $${totalPayout.toLocaleString()}! (${winningDescriptions.join(', ')})`;
    } else {
      sounds.playLose();
      if (statusPill) statusPill.textContent = `No winning bets. Try your luck again!`;
    }

    this.updateRouletteUI();
    if (EconomyManager.getMiniGameWallet().balance <= 0) {
      setTimeout(() => this.promptInsufficientCasinoFunds('Roulette'), 1200);
    }
  }

  // ==========================================================================
  // SOLAR FLARE 3-REEL SLOTS MINI-GAME
  // ==========================================================================

  setSlotVariant(variant) {
    this.slotVariant = variant;
    const titleEl = document.getElementById('slots-marquee-title');
    const subEl = document.getElementById('slots-marquee-sub');
    const volEl = document.getElementById('slots-volatility-tag');
    const itemsEl = document.getElementById('slots-paytable-items');

    sounds.playChip();

    if (variant === 'classic') {
      if (titleEl) titleEl.textContent = 'CLASSIC 3-REEL • TRADITIONAL CASINO';
      if (subEl) subEl.textContent = 'LUCKY 7s • GOLDEN BELLS • CHERRIES • BARS';
      if (volEl) { volEl.textContent = 'MEDIUM VOLATILITY'; volEl.className = 'paytable-volatility'; }
      if (itemsEl) {
        itemsEl.innerHTML = `
          <div class="pt-item"><span class="pt-sym">TRIPLE 7s</span> <strong class="pt-mult gold">40x</strong></div>
          <div class="pt-item"><span class="pt-sym">TRIPLE BELLS</span> <strong class="pt-mult yellow">20x</strong></div>
          <div class="pt-item"><span class="pt-sym">TRIPLE CHERRIES</span> <strong class="pt-mult orange">15x</strong></div>
          <div class="pt-item"><span class="pt-sym">TRIPLE SPADES</span> <strong class="pt-mult emerald">10x</strong></div>
          <div class="pt-item"><span class="pt-sym">ANY 2 CHERRIES</span> <strong class="pt-mult green">3x</strong></div>
          <div class="pt-item"><span class="pt-sym">ANY 7s</span> <strong class="pt-mult gray">1x Push</strong></div>
        `;
      }
    } else if (variant === 'jackpot') {
      if (titleEl) titleEl.textContent = 'HIGH-STAKES 100x • GRAND CASINO JACKPOT';
      if (subEl) subEl.textContent = 'TRIPLE 777 • DIAMOND VAULTS • ROYAL CROWNS';
      if (volEl) { volEl.textContent = 'EXTREME VOLATILITY'; volEl.className = 'paytable-volatility'; }
      if (itemsEl) {
        itemsEl.innerHTML = `
          <div class="pt-item"><span class="pt-sym">TRIPLE 777 GRAND</span> <strong class="pt-mult gold">100x</strong></div>
          <div class="pt-item"><span class="pt-sym">TRIPLE DIAMONDS</span> <strong class="pt-mult orange">50x</strong></div>
          <div class="pt-item"><span class="pt-sym">TRIPLE CROWN SPADES</span> <strong class="pt-mult yellow">30x</strong></div>
          <div class="pt-item"><span class="pt-sym">TRIPLE COSMIC FLARES</span> <strong class="pt-mult emerald">25x</strong></div>
          <div class="pt-item"><span class="pt-sym">PAIR OF 7s</span> <strong class="pt-mult green">5x</strong></div>
          <div class="pt-item"><span class="pt-sym">ANY 7 OR STAR</span> <strong class="pt-mult gray">1x Push</strong></div>
        `;
      }
    } else {
      // Solar Multipliers
      if (titleEl) titleEl.textContent = 'SOLAR FLARE • 30x WILD MULTIPLIER';
      if (subEl) subEl.textContent = 'WILD FLARES • SOLAR STARS • ROYAL SUITS';
      if (volEl) { volEl.textContent = 'HIGH VOLATILITY'; volEl.className = 'paytable-volatility'; }
      if (itemsEl) {
        itemsEl.innerHTML = `
          <div class="pt-item"><span class="pt-sym">TRIPLE WILD FLARES</span> <strong class="pt-mult orange">30x</strong></div>
          <div class="pt-item"><span class="pt-sym">TRIPLE STARS</span> <strong class="pt-mult yellow">20x</strong></div>
          <div class="pt-item"><span class="pt-sym">TRIPLE 7s</span> <strong class="pt-mult gold">15x</strong></div>
          <div class="pt-item"><span class="pt-sym">PAIR + WILD FLARE</span> <strong class="pt-mult green">5x</strong></div>
          <div class="pt-item"><span class="pt-sym">TWO WILD FLARES</span> <strong class="pt-mult emerald">10x</strong></div>
          <div class="pt-item"><span class="pt-sym">ANY 7 OR STAR</span> <strong class="pt-mult gray">1x Push</strong></div>
        `;
      }
    }
  }

  initSlots() {
    this.slotsModal = document.getElementById('slots-modal');
    this.btnOpenSlots = document.getElementById('btn-open-slots');
    this.closeSlotsBtn = document.getElementById('close-slots-btn');
    this.btnSpinSlots = document.getElementById('btn-spin-slots');
    this.btnSlotsTransfer = document.getElementById('btn-slots-transfer');
    this.slotWager = 50;
    this.slotSpinning = false;
    this.slotVariant = 'solar';
    document.querySelectorAll('.variant-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.variant-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setSlotVariant(btn.dataset.variant || 'solar');
      });
    });


    if (this.btnOpenSlots) {
      this.btnOpenSlots.addEventListener('click', () => this.openSlotsModal());
    }
    if (this.closeSlotsBtn && this.slotsModal) {
      this.closeSlotsBtn.addEventListener('click', () => this.closeSlotsModal());
    }
    if (this.btnSpinSlots) {
      this.btnSpinSlots.addEventListener('click', () => this.spinSlotMachine());
    }
    const leverAssembly = document.getElementById('slot-lever-assembly');
    if (leverAssembly) {
      leverAssembly.addEventListener('click', () => this.spinSlotMachine());
    }
    if (this.btnSlotsTransfer) {
      this.btnSlotsTransfer.addEventListener('click', () => {
        this.closeSlotsModal();
        this.openTransferModal();
      });
    }

    // Quick preset wager buttons ($10, $50, $100, MAX)
    document.querySelectorAll('.slots-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.slots-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const wagerVal = btn.dataset.wager;
        const wallet = EconomyManager.getMiniGameWallet();
        if (wagerVal === 'custom') {
          this.openCustomWagerModal('slots');
        } else if (wagerVal === 'max') {
          this.slotWager = Math.max(10, wallet.balance);
          sounds.playChip();
          this.updateSlotsUI();
        } else {
          this.slotWager = Number(wagerVal) || 50;
          sounds.playChip();
          this.updateSlotsUI();
        }
      });
    });
  }

  openSlotsModal() {
    if (!this.slotsModal) return;
    this.updateSlotsUI();
    const banner = document.getElementById('slots-result-banner');
    if (banner) banner.classList.add('hidden');
    const winDisplay = document.getElementById('slots-win-display');
    if (winDisplay) winDisplay.textContent = 'Ready to Spin!';
    this.slotsModal.classList.remove('hidden');
  }

  closeSlotsModal() {
    if (this.slotsModal) this.slotsModal.classList.add('hidden');
  }

  updateSlotsUI() {
    const wallet = EconomyManager.getMiniGameWallet();
    const balEl = document.getElementById('slots-wallet-balance');
    const wagerEl = document.getElementById('slots-current-wager');
    if (balEl) balEl.textContent = `$${wallet.balance.toLocaleString()}`;
    if (wagerEl) wagerEl.textContent = `$${this.slotWager.toLocaleString()}`;
    const portalMiniEl = document.getElementById('portal-minigame-val');
    if (portalMiniEl) portalMiniEl.textContent = `$${wallet.balance.toLocaleString()}`;
    const casinoPageWalletEl = document.getElementById('casino-page-wallet-val');
    if (casinoPageWalletEl) casinoPageWalletEl.textContent = `$${wallet.balance.toLocaleString()}`;
    this.updateEconomyDashboard();
  }

  spinSlotMachine() {
    if (this.slotSpinning) return;
    const name = this.getPlayerName();
    if (!name) {
      this.openPlayerNameModal(() => this.spinSlotMachine());
      return;
    }

    const wallet = EconomyManager.getMiniGameWallet();
    if (wallet.balance < this.slotWager) {
      sounds.playCheck();
      const winDisplay = document.getElementById('slots-win-display');
      if (winDisplay) winDisplay.textContent = 'Insufficient Mini-Game funds!';
      this.showInGameAlert({
        title: 'INSUFFICIENT CASINO FUNDS',
        message: `Your Casino Wallet balance ($${wallet.balance.toLocaleString()}) is insufficient for a $${this.slotWager.toLocaleString()} spin. Reduce your wager, claim your daily allowance, or transfer funds.`
      });
      return;
    }

    const leverArm = document.getElementById('slot-lever-arm');
    if (leverArm) {
      leverArm.classList.add('pulled');
      setTimeout(() => leverArm.classList.remove('pulled'), 600);
    }
    sounds.playSlotPull();

    this.slotSpinning = true;
    wallet.balance -= this.slotWager;
    EconomyManager.saveMiniGameWallet(wallet);
    this.updateSlotsUI();

    if (this.btnSpinSlots) this.btnSpinSlots.disabled = true;
    sounds.startSlotSpinWhirr();

    const banner = document.getElementById('slots-result-banner');
    if (banner) banner.classList.add('hidden');
    const winDisplay = document.getElementById('slots-win-display');
    if (winDisplay) winDisplay.textContent = 'Spinning reels...';

    // Start reel spin animation
    const reel1 = document.getElementById('slot-reel-1');
    const reel2 = document.getElementById('slot-reel-2');
    const reel3 = document.getElementById('slot-reel-3');
    [reel1, reel2, reel3].forEach(r => {
      if (r) r.classList.add('spinning');
    });

    const pickSymbol = () => {
      const rand = Math.random();
      if (this.slotVariant === 'classic') {
        if (rand < 0.12) return '7️⃣';
        if (rand < 0.30) return '🔔';
        if (rand < 0.52) return '🍒';
        if (rand < 0.76) return '♠️';
        return '💎';
      } else if (this.slotVariant === 'jackpot') {
        if (rand < 0.05) return '7️⃣';
        if (rand < 0.15) return '💎';
        if (rand < 0.30) return '👑';
        if (rand < 0.50) return '🔥';
        if (rand < 0.70) return '⭐';
        return '♠️';
      } else {
        // Solar Multipliers
        if (rand < 0.08) return '7️⃣';
        if (rand < 0.22) return '🔥';
        if (rand < 0.38) return '⭐';
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        return suits[Math.floor(Math.random() * suits.length)];
      }
    };

    const finalReels = [pickSymbol(), pickSymbol(), pickSymbol()];

    // Staggered reel stops
    SaveManager.recordSlotSpin();
    setTimeout(() => {
      if (reel1) {
        reel1.classList.remove('spinning');
        reel1.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(finalReels[0])}</div>`;
        sounds.playSlotStop(1);
      }
    }, 600);

    setTimeout(() => {
      if (reel2) {
        reel2.classList.remove('spinning');
        reel2.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(finalReels[1])}</div>`;
        sounds.playSlotStop(2);
      }
    }, 1050);

    setTimeout(() => {
      if (reel3) {
        reel3.classList.remove('spinning');
        reel3.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(finalReels[2])}</div>`;
        sounds.playSlotStop(3);
      }
      this.resolveSlotSpin(finalReels);
    }, 1500);
  }

  resolveSlotSpin(reels) {
    this.slotSpinning = false;
    sounds.stopSlotSpinWhirr();
    if (this.btnSpinSlots) this.btnSpinSlots.disabled = false;

    const [s1, s2, s3] = reels;
    let multiplier = 0;
    let title = '';

    if (this.slotVariant === 'classic') {
      if (s1 === '7️⃣' && s2 === '7️⃣' && s3 === '7️⃣') {
        multiplier = 40;
        title = 'CLASSIC 777 JACKPOT! 40x WIN!';
      } else if (s1 === '🔔' && s2 === '🔔' && s3 === '🔔') {
        multiplier = 20;
        title = 'TRIPLE BELLS! 20x WIN!';
      } else if (s1 === '🍒' && s2 === '🍒' && s3 === '🍒') {
        multiplier = 15;
        title = 'TRIPLE CHERRIES! 15x WIN!';
      } else if ((s1 === '♠️' || s1 === '💎') && s1 === s2 && s2 === s3) {
        multiplier = 10;
        title = 'TRIPLE BARS / GEMS! 10x WIN!';
      } else if (reels.filter(s => s === '🍒').length >= 2) {
        multiplier = 3;
        title = 'DOUBLE CHERRIES! 3x WIN!';
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        multiplier = 2;
        title = 'MATCHING PAIR! 2x WIN!';
      } else if (reels.includes('7️⃣')) {
        multiplier = 1;
        title = 'LUCKY 7 PUSH! Wager Returned';
      } else {
        multiplier = 0;
        title = 'No Match. Spin again!';
      }
    } else if (this.slotVariant === 'jackpot') {
      if (s1 === '7️⃣' && s2 === '7️⃣' && s3 === '7️⃣') {
        multiplier = 100;
        title = 'GRAND CASINO JACKPOT! 100x WIN!';
      } else if (s1 === '💎' && s2 === '💎' && s3 === '💎') {
        multiplier = 50;
        title = 'DIAMOND VAULT MEGA WIN! 50x!';
      } else if (s1 === '👑' && s2 === '👑' && s3 === '👑') {
        multiplier = 30;
        title = 'ROYAL CROWN JACKPOT! 30x!';
      } else if (s1 === '🔥' && s2 === '🔥' && s3 === '🔥') {
        multiplier = 25;
        title = 'COSMIC FLARE WIN! 25x!';
      } else if (reels.filter(s => s === '7️⃣').length >= 2) {
        multiplier = 5;
        title = 'PAIR OF 7s! 5x WIN!';
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        multiplier = 2;
        title = 'MATCHING PAIR! 2x WIN!';
      } else if (reels.includes('7️⃣') || reels.includes('⭐')) {
        multiplier = 1;
        title = 'LUCKY PUSH! Wager Returned';
      } else {
        multiplier = 0;
        title = 'No Match. Spin again!';
      }
    } else {
      // Solar Multipliers
      if (s1 === '🔥' && s2 === '🔥' && s3 === '🔥') {
        multiplier = 30;
        title = 'SUPER WILD FLARE! 30x WIN!';
      } else if (s1 === '⭐' && s2 === '⭐' && s3 === '⭐') {
        multiplier = 20;
        title = 'TRIPLE STARS! 20x WIN!';
      } else if (s1 === '7️⃣' && s2 === '7️⃣' && s3 === '7️⃣') {
        multiplier = 15;
        title = 'SOLAR 777! 15x WIN!';
      } else if ((s1 === '♠️' || s1 === '♥️' || s1 === '♦️' || s1 === '♣️') && s1 === s2 && s2 === s3) {
        multiplier = 10;
        title = 'ROYAL SUITS FLUSH! 10x WIN!';
      } else if (reels.filter(s => s === '🔥').length >= 2) {
        multiplier = 10;
        title = 'DOUBLE WILD FLARES! 10x BOOST!';
      } else if (reels.filter(s => s === '🔥').length >= 1 && (s1 === s2 || s2 === s3 || s1 === s3)) {
        multiplier = 5;
        title = 'WILD BOOST PAIR! 5x WIN!';
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        multiplier = 2;
        title = 'MATCHING PAIR! 2x WIN!';
      } else if (reels.includes('7️⃣') || reels.includes('⭐')) {
        multiplier = 1;
        title = 'LUCKY PUSH! Wager Returned';
      } else {
        multiplier = 0;
        title = 'No Match. Try again!';
      }
    }

    const banner = document.getElementById('slots-result-banner');
    const bannerTitle = document.getElementById('slots-result-title');
    const bannerDetail = document.getElementById('slots-result-detail');
    const winDisplay = document.getElementById('slots-win-display');

    if (multiplier > 0) {
      const payout = this.slotWager * multiplier;
      const wallet = EconomyManager.getMiniGameWallet();
      wallet.balance += payout;
      EconomyManager.saveMiniGameWallet(wallet);

      if (multiplier >= 20) {
        sounds.playJackpot();
      } else {
        sounds.playWin();
      }

      const netProfit = payout - this.slotWager;
      if (banner && bannerTitle && bannerDetail) {
        banner.className = 'slots-result-banner win-glow';
        banner.classList.remove('hidden');
        bannerTitle.textContent = title;
        bannerDetail.textContent = `+$${payout.toLocaleString()} Won! (Net profit: +$${netProfit.toLocaleString()})`;
      }
      if (winDisplay) {
        winDisplay.textContent = `WIN +$${payout.toLocaleString()}! (Net profit: +$${netProfit.toLocaleString()})`;
      }
      this.setAnnouncement(`[SLOTS WIN] ${title} Won +$${payout.toLocaleString()}! (Net profit +$${netProfit.toLocaleString()})`);
    } else {
      sounds.playFold();
      if (banner && bannerTitle && bannerDetail) {
        banner.className = 'slots-result-banner';
        banner.classList.remove('hidden');
        bannerTitle.textContent = 'BET LOST';
        bannerDetail.textContent = `-$${this.slotWager.toLocaleString()} • Spin again to win big!`;
      }
      if (winDisplay) {
        winDisplay.textContent = `LOST -$${this.slotWager.toLocaleString()} on this spin.`;
      }
      this.setAnnouncement(`[SLOTS LOSS] You lost -$${this.slotWager.toLocaleString()} on this spin.`);
    }

    const payout = (multiplier > 0) ? (this.slotWager * multiplier) : 0;
    this.casinoSessionNetPnL = (this.casinoSessionNetPnL || 0) + (payout - this.slotWager);
    this.updateSoloHUD();
    this.updateSlotsUI();
    if (EconomyManager.getMiniGameWallet().balance <= 0) {
      setTimeout(() => this.promptInsufficientCasinoFunds('Slots'), 1200);
    }
  }

  // ==========================================================================
  // BANK ACCOUNT FUND TRANSFER (Mini-Game Wallet <-> Cumulative Savings Vault)
  // ==========================================================================
  initTransfer() {
    this.transferModal = document.getElementById('transfer-modal');
    this.btnOpenTransfer = document.getElementById('btn-open-transfer');
    this.btnMenuBankTransfer = document.getElementById('btn-menu-bank-transfer');
    this.btnHeroTransfer = document.getElementById('btn-hero-transfer');
    this.btnSlotsTransfer = document.getElementById('btn-slots-transfer');
    this.closeTransferBtn = document.getElementById('close-transfer-btn');
    this.btnCancelTransfer = document.getElementById('btn-cancel-transfer');
    this.btnConfirmTransfer = document.getElementById('btn-confirm-transfer');
    this.transferAmtInput = document.getElementById('transfer-amount-input');
    this.transferError = document.getElementById('transfer-error-msg');
    this.transferDirection = 'minigame_to_bank';

    if (this.btnOpenTransfer) {
      this.btnOpenTransfer.addEventListener('click', () => this.openTransferModal());
    }
    if (this.btnMenuBankTransfer) {
      this.btnMenuBankTransfer.addEventListener('click', () => this.openTransferModal());
    }
    if (this.btnHeroTransfer) {
      this.btnHeroTransfer.addEventListener('click', () => this.openTransferModal());
    }
    if (this.btnSlotsTransfer) {
      this.btnSlotsTransfer.addEventListener('click', () => this.openTransferModal());
    }
    if (this.closeTransferBtn && this.transferModal) {
      this.closeTransferBtn.addEventListener('click', () => this.closeTransferModal());
    }
    if (this.btnCancelTransfer && this.transferModal) {
      this.btnCancelTransfer.addEventListener('click', () => this.closeTransferModal());
    }
    if (this.btnConfirmTransfer) {
      this.btnConfirmTransfer.addEventListener('click', () => this.executeTransfer());
    }

    // Direction Toggle
    const btnDirToBank = document.getElementById('btn-dir-to-bank');
    const btnDirToMini = document.getElementById('btn-dir-to-minigame');
    if (btnDirToBank && btnDirToMini) {
      btnDirToBank.addEventListener('click', () => {
        this.transferDirection = 'minigame_to_bank';
        btnDirToBank.classList.add('active');
        btnDirToMini.classList.remove('active');
        this.updateTransferModal();
        sounds.playClick();
      });
      btnDirToMini.addEventListener('click', () => {
        this.transferDirection = 'bank_to_minigame';
        btnDirToMini.classList.add('active');
        btnDirToBank.classList.remove('active');
        this.updateTransferModal();
        sounds.playClick();
      });
    }

    // Preset buttons: +$100, +$250, +$500, +$1,000, All Funds
    document.querySelectorAll('.t-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amtType = btn.dataset.amt;
        const wallet = EconomyManager.getMiniGameWallet();
        const bank = EconomyManager.getCumulativeSavings();
        const maxAvail = (this.transferDirection === 'bank_to_minigame') ? bank : wallet.balance;

        if (amtType === 'all') {
          if (this.transferAmtInput) this.transferAmtInput.value = maxAvail;
        } else {
          const val = Number(amtType) || 100;
          if (this.transferAmtInput) this.transferAmtInput.value = Math.min(val, maxAvail);
        }
        sounds.playChip();
      });
    });
  }

  openTransferModal() {
    if (!this.transferModal) return;
    this.updateTransferModal();
    if (this.transferError) this.transferError.classList.add('hidden');
    const wallet = EconomyManager.getMiniGameWallet();
    const bank = EconomyManager.getCumulativeSavings();
    const maxAvail = (this.transferDirection === 'bank_to_minigame') ? bank : wallet.balance;
    if (this.transferAmtInput) this.transferAmtInput.value = Math.min(100, maxAvail);
    this.transferModal.classList.remove('hidden');
    sounds.playClick();
  }

  updateTransferModal() {
    const wallet = EconomyManager.getMiniGameWallet();
    const bank = EconomyManager.getCumulativeSavings();
    const miniEl = document.getElementById('transfer-avail-balance');
    const bankEl = document.getElementById('transfer-bank-balance');
    const confirmBtn = document.getElementById('btn-confirm-transfer');
    const inputLabel = document.getElementById('transfer-amount-label');
    const boxMini = document.getElementById('t-box-minigame');
    const boxBank = document.getElementById('t-box-bank');

    if (miniEl) miniEl.textContent = `$${wallet.balance.toLocaleString()}`;
    if (bankEl) bankEl.textContent = `$${bank.toLocaleString()}`;

    if (this.transferDirection === 'bank_to_minigame') {
      if (confirmBtn) confirmBtn.textContent = 'Withdraw to Mini-Game Wallet';
      if (inputLabel) inputLabel.textContent = `Withdraw Amount ($) • Available in Bank: $${bank.toLocaleString()}:`;
      if (boxBank) boxBank.classList.add('active');
      if (boxMini) boxMini.classList.remove('active');
    } else {
      if (confirmBtn) confirmBtn.textContent = 'Confirm Bank Deposit';
      if (inputLabel) inputLabel.textContent = `Deposit Amount ($) • Available in Wallet: $${wallet.balance.toLocaleString()}:`;
      if (boxMini) boxMini.classList.add('active');
      if (boxBank) boxBank.classList.remove('active');
    }
  }

  closeTransferModal() {
    if (this.transferModal) this.transferModal.classList.add('hidden');
  }

  executeTransfer() {
    const amt = Number(this.transferAmtInput ? this.transferAmtInput.value : 0);
    const direction = this.transferDirection || 'minigame_to_bank';
    const wallet = EconomyManager.getMiniGameWallet();
    const bank = EconomyManager.getCumulativeSavings();
    const maxAvail = (direction === 'bank_to_minigame') ? bank : wallet.balance;

    if (isNaN(amt) || amt <= 0 || amt > maxAvail) {
      if (this.transferError) {
        this.transferError.textContent = (amt > maxAvail)
          ? `Amount exceeds available ${(direction === 'bank_to_minigame') ? 'Bank Account' : 'Mini-Game'} balance ($${maxAvail.toLocaleString()})!`
          : 'Please enter a valid positive transfer amount.';
        this.transferError.classList.remove('hidden');
      }
      sounds.playCheck();
      return;
    }

    const res = EconomyManager.transferFunds(direction, amt);
    if (!res.success) {
      if (this.transferError) {
        this.transferError.textContent = res.message;
        this.transferError.classList.remove('hidden');
      }
      sounds.playCheck();
      return;
    }

    sounds.playWin();
    this.setAnnouncement(`[BANK TRANSFER] ${res.message}`);
    this.showInGameAlert({
      title: 'BANK TRANSFER COMPLETE',
      message: `${res.message}\nNew Bank Balance: $${res.newBankBalance.toLocaleString()} | Mini-Game Wallet: $${res.newMiniBalance.toLocaleString()}`
    });

    this.updateDualWalletUI();
    this.updateEconomyDashboard();
    this.updateRouletteUI();
    this.updateSlotsUI();
    this.closeTransferModal();
  }

  // ==========================================================================
  // DAILY ECONOMY DASHBOARD & TIMERS
  // ==========================================================================
  initEconomy() {
    this.updateEconomyDashboard();

    const miniBtn = document.getElementById('btn-claim-minigame-daily');
    if (miniBtn) {
      miniBtn.addEventListener('click', () => {
        const res = EconomyManager.claimMiniGameDaily();
        if (res.success) {
          sounds.playWin();
          this.updateEconomyDashboard();
          this.setAnnouncement(`[CLAIMED] Claimed $1,000 Mini-Game Allowance! (30-Minute Cooldown) New balance: $${res.balance.toLocaleString()}`);
        } else {
          sounds.playCheck();
          this.setAnnouncement(`[NOTICE] ${res.message}`);
        }
      });
    }

    const pokerBtn = document.getElementById('btn-claim-poker-daily');
    if (pokerBtn) {
      pokerBtn.addEventListener('click', () => {
        const res = EconomyManager.claimGlobalPokerDaily();
        if (res.success) {
          sounds.playWin();
          this.updateDualWalletUI();
          this.updateEconomyDashboard();
          this.setAnnouncement(`[CLAIMED] Claimed $5,000 Global Allowance directly into Cumulative Poker Savings Vault!`);
        } else {
          sounds.playCheck();
          this.setAnnouncement(`[NOTICE] ${res.message}`);
        }
      });
    }
  }

  updateEconomyDashboard() {
    const wallet = EconomyManager.getMiniGameWallet();
    const balEl = document.getElementById('minigame-wallet-balance');
    if (balEl) balEl.textContent = `$${wallet.balance.toLocaleString()}`;

    const slotsBal = document.getElementById('slots-wallet-balance');
    if (slotsBal) slotsBal.textContent = `$${wallet.balance.toLocaleString()}`;

    const rouletteBal = document.getElementById('roulette-bankroll');
    if (rouletteBal) rouletteBal.textContent = `$${wallet.balance.toLocaleString()}`;

    const crapsBal = document.getElementById('craps-wallet-balance');
    if (crapsBal) crapsBal.textContent = `$${wallet.balance.toLocaleString()}`;

    const transferBal = document.getElementById('transfer-avail-balance');
    if (transferBal) transferBal.textContent = `$${wallet.balance.toLocaleString()}`;
  }

  startDailyTimersLoop() {
    const updateTimers = () => {
      const miniStatus = EconomyManager.getMiniGameClaimStatus();
      const miniTimerEl = document.getElementById('minigame-claim-timer');
      const miniBtn = document.getElementById('btn-claim-minigame-daily');
      if (miniTimerEl) {
        miniTimerEl.textContent = miniStatus.canClaim ? 'Ready to Claim!' : `Next: ${miniStatus.text}`;
      }
      if (miniBtn) {
        miniBtn.disabled = !miniStatus.canClaim;
      }
      const casinoClaimBtn = document.getElementById('btn-casino-claim-daily');
      if (casinoClaimBtn) {
        casinoClaimBtn.disabled = !miniStatus.canClaim;
      }

      const pokerStatus = EconomyManager.getGlobalPokerClaimStatus();
      const pokerTimerEl = document.getElementById('poker-claim-timer');
      const pokerBtn = document.getElementById('btn-claim-poker-daily');
      if (pokerTimerEl) {
        pokerTimerEl.textContent = pokerStatus.canClaim ? 'Ready to Claim!' : `Next: ${pokerStatus.text}`;
      }
      if (pokerBtn) {
        pokerBtn.disabled = !pokerStatus.canClaim;
      }
    };

    updateTimers();
    setInterval(updateTimers, 1000);
  }

  // ==========================================================================
  // HAND HISTORY ACTION LOGGER
  // ==========================================================================
  recordHandHistory(entry) {
    this.handHistory.unshift({
      ...entry,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
    if (this.handHistory.length > 50) this.handHistory.pop();
    this.renderHandHistory();
  }

  renderHandHistory() {
    const list = document.getElementById('hand-history-list');
    const countEl = document.getElementById('history-total-count');
    if (!list) return;

    if (countEl) {
      countEl.textContent = `${this.handHistory.length} hands recorded in this session`;
    }

    if (this.handHistory.length === 0) {
      list.innerHTML = `<div class="history-empty-placeholder">No hands completed yet in this session. Play hands at the table to see real-time showdowns, hole cards, and pot payouts logged here!</div>`;
      return;
    }

    list.innerHTML = '';
    this.handHistory.forEach(h => {
      const item = document.createElement('div');
      item.className = 'history-item';
      let cardsStr = '';
      if (h.cards && Array.isArray(h.cards)) {
        cardsStr = h.cards.map(c => `${c.label}${c.suit ? c.suit.symbol : ''}`).join(' ');
      }
      let commStr = '';
      if (h.community && Array.isArray(h.community) && h.community.length > 0) {
        commStr = `Board: [${h.community.map(c => `${c.label}${c.suit.symbol}`).join(' ')}]`;
      }

      item.innerHTML = `
        <div class="history-item-header">
          <span>Stage ${h.stage || 1} &bull; Hand #${h.handNum || 1}</span>
          <span>${h.time || ''}</span>
        </div>
        <div class="history-item-winner">Winner: ${h.winner} (+$${(h.amount || 0).toLocaleString()})</div>
        <div class="history-item-hand">${h.desc || ''}</div>
        ${cardsStr ? `<div class="history-item-cards">Hole: ${cardsStr} ${commStr ? `&bull; ${commStr}` : ''}</div>` : ''}
      `;
      list.appendChild(item);
    });
  }

  // ==========================================================================
  // v1.1: BACKGROUND THEME MODE CONTROLLER (SOLAR FLARE ULTRA & NIGHT SKY SERENADE)
  // ==========================================================================
  initBackgroundTheme() {
    let savedTheme = localStorage.getItem('solar_poker_bg_theme') || 'ultra';
    if (savedTheme === 'high') savedTheme = 'ultra';
    if (savedTheme === 'low') savedTheme = 'night';

    const themes = ['ultra', 'balanced', 'night', 'minimal'];

    const applyTheme = (theme, notify = false) => {
      let target = theme;
      if (target === 'high') target = 'ultra';
      if (target === 'low') target = 'night';
      if (!themes.includes(target)) target = 'ultra';

      // Remove all theme classes
      document.body.classList.remove(
        'bg-theme-ultra',
        'bg-theme-balanced',
        'bg-theme-night',
        'bg-theme-minimal',
        'low-detail-bg'
      );

      // Apply target classes
      if (target === 'ultra') {
        document.body.classList.add('bg-theme-ultra');
      } else if (target === 'balanced') {
        document.body.classList.add('bg-theme-balanced');
      } else if (target === 'night') {
        document.body.classList.add('bg-theme-night', 'low-detail-bg');
      } else if (target === 'minimal') {
        document.body.classList.add('bg-theme-minimal', 'low-detail-bg');
      }

      localStorage.setItem('solar_poker_bg_theme', target);

      // Update UI cards
      themes.forEach(t => {
        const card = document.getElementById(`bg-card-${t}`);
        if (card) {
          card.classList.toggle('active', t === target);
        }
      });

      // Backward compatibility for old card IDs if present
      const oldHigh = document.getElementById('bg-card-high');
      const oldLow = document.getElementById('bg-card-low');
      if (oldHigh) oldHigh.classList.toggle('active', target === 'ultra');
      if (oldLow) oldLow.classList.toggle('active', target === 'night');

      if (notify) {
        const descriptions = {
          ultra: 'Solar Flare Ultra activated. Full dynamic rotating Bastion gears, plasma flares & geometry restored.',
          balanced: 'Solar Eclipse Balanced activated. Rotating cogs and gentle plasma retained with heavy borders softened.',
          night: 'Night Sky Serenade activated. Deep serene navy atmosphere with calm twinkling stars and gentle constellations.',
          minimal: 'Deep Cosmos Minimal activated. Pitch-black starry void with pure twinkling stars and zero geometric clutter.'
        };
        const titles = {
          ultra: 'SOLAR FLARE ULTRA',
          balanced: 'SOLAR ECLIPSE BALANCED',
          night: 'NIGHT SKY SERENADE',
          minimal: 'DEEP COSMOS MINIMAL'
        };

        this.showInGameAlert({
          title: titles[target] || 'THEME UPDATED',
          message: descriptions[target] || 'Background atmosphere successfully updated.'
        });
      }
    };

    applyTheme(savedTheme, false);

    // Bind click events on all 4 cards
    themes.forEach(t => {
      const card = document.getElementById(`bg-card-${t}`);
      if (card) {
        card.addEventListener('click', () => {
          applyTheme(t, true);
          sounds.playToggleChime();
        });
      }
    });

    // Also support legacy card IDs if clicked
    const legacyHigh = document.getElementById('bg-card-high');
    const legacyLow = document.getElementById('bg-card-low');
    if (legacyHigh) legacyHigh.addEventListener('click', () => { applyTheme('ultra', true); sounds.playToggleChime(); });
    if (legacyLow) legacyLow.addEventListener('click', () => { applyTheme('night', true); sounds.playToggleChime(); });
  }

  // ==========================================================================
  // v1.12: COOKIE CLICKER-STYLE CASINO & GLOBAL NEWS WIRE TICKER (100+ HEADLINES)
  // ==========================================================================
  initNewsTicker() {
    const container = document.getElementById('news-ticker-container');
    const content = document.getElementById('news-ticker-content');
    const tagEl = document.getElementById('news-ticker-tag');
    const textEl = document.getElementById('news-ticker-text');
    if (!container || !content || !tagEl || !textEl) return;

    // Database of 105 distinct headlines (15% Poker, 70% Global & Vietnam, 15% Space Weather)
    const HEADLINES = [
      // Update 1.13 & Update 1.2 Roadmap Highlights
      { category: 'poker', tag: 'UPDATE 1.2 ROADMAP', text: "Official Announcement: Global Leaderboard with cloud sync and Exclusive Private Room multiplayer will be finished in Update 1.2!" },
      { category: 'poker', tag: 'AUDIO STUDIO', text: "Music Coming Soon: Dedicated atmospheric table soundtracks & ambient casino music currently in studio recording!" },
      { category: 'poker', tag: 'ROSTER STANDINGS', text: "In-game registered player leaderboard is now active: compete against registered players and table rivals!" },
      // --- POKER & CASINO WIRE (~15%) ---
      { category: 'poker', tag: 'POKER WIRE', text: "High-stakes titan Phil Ivey spotted executing deep river check-raises in the Solar VIP lounge." },
      { category: 'poker', tag: 'POKER WIRE', text: "Record-breaking $2,400,000 bad-beat jackpot triggered on Table 7 with Quad Aces cracked by a Royal Flush." },
      { category: 'poker', tag: 'POKER WIRE', text: "Macau high-roller championship concludes as mystery player executes a legendary 5-bet air bluff on the river." },
      { category: 'poker', tag: 'POKER WIRE', text: "World Poker Tour confirms Solar Flare Casino Hub as official host venue for the upcoming galactic tournament." },
      { category: 'poker', tag: 'POKER WIRE', text: "Card counter politely advised to switch to European Roulette single-zero wheel after historic 14-shoe heater." },
      { category: 'poker', tag: 'POKER WIRE', text: "Quantum solver algorithms debate optimal river shove frequencies with suited connectors on dry boards." },
      { category: 'poker', tag: 'POKER WIRE', text: "Casino Transit Lounge reports record traffic as private high-roller multiplayer suites reach full capacity." },
      { category: 'poker', tag: 'POKER WIRE', text: "Doyle Brunson's iconic 10-2 hand honored with custom 24-karat gold commemorative VIP chip." },
      { category: 'poker', tag: 'POKER WIRE', text: "Daniel Negreanu inspects Solar Blackjack VIP table; certifies dealer stand on soft-17 as optimal player odds." },
      { category: 'poker', tag: 'POKER WIRE', text: "Las Vegas casino directors tour Solar Flare Hub to study real-time P2P browser peer coordination." },
      { category: 'poker', tag: 'POKER WIRE', text: "New career cashout record established: High roller banks $1,850,000 directly into Cumulative Savings Vault." },
      { category: 'poker', tag: 'POKER WIRE', text: "European Roulette wheel clocks 11 consecutive black landings on Table 3 before spinning Red 7." },
      { category: 'poker', tag: 'POKER WIRE', text: "Texas Hold'em stage 3 bot 'The Sultan' undergoes behavioral recalibration after aggressive triple-barrel bluffs." },
      { category: 'poker', tag: 'POKER WIRE', text: "High-stakes private suite hosts marathon 48-hour cash game between international circuit champions." },
      { category: 'poker', tag: 'POKER WIRE', text: "Casino lounge mixologist crafts signature cocktail 'The Pocket Aces' served with floating gold leaf." },
      { category: 'poker', tag: 'POKER WIRE', text: "Craps table erupts into cheers as shooter rolls 18 consecutive passes before sevening out." },

      // --- VIETNAM NEWS & BREAKTHROUGHS (~35%) ---
      { category: 'vietnam', tag: 'VIETNAM', text: "Hanoi Metro Line 3 Nhon-Hanoi Station section welcomes over 100,000 enthusiastic passengers in opening week." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Da Nang High-Tech Park secures $1.5 billion foreign direct investment for advanced semiconductor packaging." },
      { category: 'vietnam', tag: 'VIETNAM', text: "UNESCO formally inscribes Ha Long Bay-Cat Ba Archipelago as Vietnam's newest inter-provincial World Natural Heritage site." },
      { category: 'vietnam', tag: 'VIETNAM', text: "VinFast expands smart electric vehicle deliveries across North American and European maritime corridors." },
      { category: 'vietnam', tag: 'VIETNAM', text: "North-South high-speed railway feasibility project receives resounding National Assembly endorsement." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Vietnam semiconductor workforce initiative aims to train 50,000 specialized chip engineers by 2030." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Ho Chi Minh City unveils futuristic Thu Thiem pedestrian bridge design inspired by glowing mangrove leaves." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Vietnam coffee exports shatter all historic records, surpassing $5.2 billion in annual international trade." },
      { category: 'vietnam', tag: 'VIETNAM', text: "National Innovation Center in Hoa Lac hosts ASEAN digital transformation and regional AI leadership summit." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Phu Quoc International Airport breaks ground on passenger terminal expansion to support eco-tourism travel." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Can Tho floating market preservation project launches interactive digital 3D waterway cultural map." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Hoi An Ancient Town transitions to 100% solar-powered nocturnal heritage lanterns along the Thu Bon River." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Long Thanh International Airport terminal roof superstructure reaches 80% completion ahead of schedule." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Sapa terraced rice valleys welcome record international photographers during golden harvest season." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Ba Na Hills Golden Bridge continues to receive global accolades among the world's most breathtaking architectural wonders." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Binh Thuan offshore wind project synchronizes first gigawatt of clean marine electricity to national grid." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Hue Imperial Citadel archaeological team uncovers pristine Nguyen Dynasty royal ceramic artifact collection." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Ha Giang Loop eco-transit corridor deploys solar-powered emergency communication beacons along mountain passes." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Cu Chi subterranean historical complex unveils photorealistic virtual reality historical journey." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Quy Nhon establishes international science discovery center and astronomical observatory on central coast." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Mekong Delta floating solar installations achieve 300-megawatt generation while preventing reservoir water loss." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Son Doong cave research expedition surveys subterranean river system extending 10 kilometers beneath limestone karst." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Vietnam circular textile manufacturers export apparel woven entirely from recycled coastal marine plastic." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Nha Trang Oceanography Institute releases 500 rehabilitated green sea turtles into protected marine sanctuaries." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Dalat high-tech strawberry farms deploy AI autonomous pollination drones in climate-controlled glasshouses." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Ban Gioc Waterfall cross-border tourism corridor welcomes international eco-hikers along emerald river trails." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Saigon River electric waterbus service doubles fleet to offer silent, emission-free urban commuting." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Cai Mep-Thi Vai deepwater port terminal welcomes 24,000-TEU mega container vessels connecting directly to America." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Bat Trang ceramic artisans blend ancient 700-year glazes with sustainable electric kilns." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Phong Nha-Ke Bang speleologists chart 5 new pristine caves adorned with glittering calcite crystals." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Vietnam national esports team claims international gold in premier competitive multiplayer arena." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Tam Coc-Bich Dong boatmen celebrate 100% solar recharge stations for river tour safety lighting." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Dong Van Karst Plateau Geopark introduces community eco-lodges celebrating traditional highland architecture." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Hai Van Pass scenic railway route voted among Southeast Asia's most spectacular coastal train journeys." },
      { category: 'vietnam', tag: 'VIETNAM', text: "Saigon Central Post Office celebrates 135th anniversary with restored historic French neoclassical facade." },

      // --- GLOBAL SCIENCE & WORLD BREAKTHROUGHS (~35%) ---
      { category: 'global', tag: 'GLOBAL', text: "James Webb Space Telescope detects methane and water vapor signatures in atmosphere of temperate exoplanet." },
      { category: 'global', tag: 'GLOBAL', text: "International Thermonuclear Experimental Reactor (ITER) sustains high-confinement magnetic plasma milestone." },
      { category: 'global', tag: 'GLOBAL', text: "Renewable solar and wind generation collectively exceeds 30% of global electrical supply for the first time." },
      { category: 'global', tag: 'GLOBAL', text: "NASA Artemis mission achieves successful translunar injection firing during deep space simulation." },
      { category: 'global', tag: 'GLOBAL', text: "Mariana Trench deep-submersible expedition discovers bioluminescent benthic organisms at 8,200 meters depth." },
      { category: 'global', tag: 'GLOBAL', text: "Fault-tolerant quantum processor demonstrates topological error correction across 1,200 logical qubits." },
      { category: 'global', tag: 'GLOBAL', text: "Global reforestation satellite monitoring confirms 18 million hectares of indigenous forest recovery." },
      { category: 'global', tag: 'GLOBAL', text: "European Southern Observatory produces razor-sharp polarized image of supermassive black hole magnetic fields." },
      { category: 'global', tag: 'GLOBAL', text: "Solid-state lithium battery prototype demonstrates 1,100 km vehicle range with 8-minute ultrafast charge." },
      { category: 'global', tag: 'GLOBAL', text: "United Nations High Seas Treaty officially enters into force protecting two-thirds of international waters." },
      { category: 'global', tag: 'GLOBAL', text: "World Health Organization announces widespread eradication of wild polio virus across two additional continents." },
      { category: 'global', tag: 'GLOBAL', text: "Exascale supercomputer models Earth's coupled climate-ocean circulation with millimetric precision." },
      { category: 'global', tag: 'GLOBAL', text: "Astronomers locate wandering rogue exoplanet accompanied by two orbiting moons in interstellar void." },
      { category: 'global', tag: 'GLOBAL', text: "Commercial aviation marks safest global operational year in history alongside green hydrogen flight tests." },
      { category: 'global', tag: 'GLOBAL', text: "Next-generation stellarator fusion reactor sustains 60-million-degree electron core confinement." },
      { category: 'global', tag: 'GLOBAL', text: "Low-Earth orbit mega-constellation brings gigabit laser-crosslinked internet to Antarctic researchers." },
      { category: 'global', tag: 'GLOBAL', text: "Ambient direct-air carbon capture plant mineralizes 500,000 metric tons of atmospheric CO2 into basalt rock." },
      { category: 'global', tag: 'GLOBAL', text: "Large Hadron Collider detects rare lepton-flavor universality violation providing hints of new physics." },
      { category: 'global', tag: 'GLOBAL', text: "Graphene membrane desalinization plant slashes energy consumption for potable drinking water by 45%." },
      { category: 'global', tag: 'GLOBAL', text: "Autonomous zero-emission electric container vessel completes maiden voyage across North Atlantic." },
      { category: 'global', tag: 'GLOBAL', text: "Bio-engineered drought-tolerant wheat varietals demonstrate 35% higher yields under extreme heat waves." },
      { category: 'global', tag: 'GLOBAL', text: "International Space Station astronauts harvest fresh cosmic dwarf tomatoes grown in aeroponic chambers." },
      { category: 'global', tag: 'GLOBAL', text: "Marine biologists complete transplantation of 1 million heat-resilient coral micro-fragments across Pacific reefs." },
      { category: 'global', tag: 'GLOBAL', text: "Voyager 1 spacecraft transmits coherent interstellar telemetry from 15.3 billion miles beyond Earth." },
      { category: 'global', tag: 'GLOBAL', text: "Nobel Committee honors physicists for attosecond laser pulses enabling electron motion measurement." },
      { category: 'global', tag: 'GLOBAL', text: "Global clean energy investments outpace fossil fuel exploration by greater than 2-to-1 margin." },
      { category: 'global', tag: 'GLOBAL', text: "Super-deep geothermal test well reaches 9,800 meters into hot crystalline basement granite." },
      { category: 'global', tag: 'GLOBAL', text: "High-speed maglev prototype sets world ground transportation speed record of 635 km/h in evacuated tube." },
      { category: 'global', tag: 'GLOBAL', text: "Autonomous underwater gliders map 100,000 square kilometers of uncharted abyssal seafloor mountains." },
      { category: 'global', tag: 'GLOBAL', text: "Space telescope captures direct optical reflection of proto-planetary debris belt orbiting nearby star." },
      { category: 'global', tag: 'GLOBAL', text: "Neutrino observatory achieves sub-electronvolt sensitivity measuring cosmic neutrino mass hierarchy." },
      { category: 'global', tag: 'GLOBAL', text: "Biomaterial engineers manufacture 100% biodegradable polymers synthesized entirely from kelp alginate." },
      { category: 'global', tag: 'GLOBAL', text: "Space-based solar power satellite successfully beams microwave electricity to desert ground rectenna." },
      { category: 'global', tag: 'GLOBAL', text: "Antarctic deep ice core drill retrieves 1.8-million-year-old ice containing pristine ancient atmospheric gas." },
      { category: 'global', tag: 'GLOBAL', text: "Gravitational wave laser interferometers detect chirp of binary neutron star merger 400M light-years away." },

      // --- COSMIC SPACE WEATHER & CASINO TEMPO (~15%) ---
      { category: 'tempo', tag: 'SOLAR TEMPO', text: "Solar flare intensity elevated to Class X9.4: High-roller chip magnetism increased by 0.04%." },
      { category: 'weather', tag: 'RESORT WEATHER', text: "Casino Transit Lounge micro-climate: Balmy 21.5°C with a 100% probability of escalating river bluffs." },
      { category: 'tempo', tag: 'SOLAR TEMPO', text: "Solar corona stream velocity reaches 750 km/s; dealer recommends gripping pocket aces firmly." },
      { category: 'weather', tag: 'RESORT WEATHER', text: "High-stakes VIP suite forecast: Heavy evening showers of $5,000 golden chips expected after midnight." },
      { category: 'tempo', tag: 'SOLAR TEMPO', text: "Cosmic magnetic micro-fluctuation induces harmonic resonance in European Roulette wheel bearings." },
      { category: 'weather', tag: 'RESORT WEATHER', text: "Planetary alignment creates optimal celestial fortune for disciplined check-raise strategies." },
      { category: 'tempo', tag: 'SOLAR TEMPO', text: "Sunspot cluster AR3664 radiates auspicious cosmic photons directly onto Solo Campaign Save Slot 1." },
      { category: 'weather', tag: 'RESORT WEATHER', text: "Deep space atmosphere: Clear cosmic skies across Orion arm with a gentle interstellar dust breeze." },
      { category: 'tempo', tag: 'SOLAR TEMPO', text: "Gravitational micro-wave detected near Blackjack shoe; mathematical dealer bust odds remain constant." },
      { category: 'weather', tag: 'RESORT WEATHER', text: "Casino Resort relative humidity: Ideal 45% for crisp, perfectly audible card-flicking acoustics." },
      { category: 'tempo', tag: 'SOLAR TEMPO', text: "Geomagnetic KP-index reaches Level 8: Solar auroras illuminate casino glass viewing terraces." },
      { category: 'weather', tag: 'RESORT WEATHER', text: "Lunar tidal perigee: Pocket Kings report 1.2% heightened aesthetic majesty under arena spotlights." },
      { category: 'tempo', tag: 'SOLAR TEMPO', text: "Solar wind plasma stream generates gentle harmless static crackle on the Craps green felt." },
      { category: 'weather', tag: 'RESORT WEATHER', text: "Transit hub weather: Cool evening breeze outdoors; warm golden high-roller hospitality indoors." },
      { category: 'tempo', tag: 'SOLAR TEMPO', text: "Cosmic radiation deflection shield operating at 100%; cryptographic RNG seed entropy verified pristine." },
      { category: 'weather', tag: 'RESORT WEATHER', text: "Solar observatory confirms serene cosmic dawn: All 4 background atmosphere presets synchronized." }
    ];

    // Fisher-Yates non-repeating shuffle queue
    let shuffledIndices = [];
    let currentIndex = 0;

    const buildShuffledQueue = () => {
      shuffledIndices = Array.from({ length: HEADLINES.length }, (_, i) => i);
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }
      currentIndex = 0;
    };

    buildShuffledQueue();

    const displayHeadline = (index, animated = true) => {
      const item = HEADLINES[shuffledIndices[index]];
      if (!item) return;

      if (animated) {
        content.classList.add('fading-out');
        setTimeout(() => {
          tagEl.className = `news-headline-tag ${item.category}`;
          tagEl.textContent = item.tag;
          textEl.textContent = item.text;
          content.classList.remove('fading-out');
          content.classList.add('fading-in');
          setTimeout(() => content.classList.remove('fading-in'), 220);
        }, 180);
      } else {
        tagEl.className = `news-headline-tag ${item.category}`;
        tagEl.textContent = item.tag;
        textEl.textContent = item.text;
      }
    };

    let tickerInterval = null;

    const advanceHeadline = (playAudio = false) => {
      currentIndex++;
      if (currentIndex >= shuffledIndices.length) {
        buildShuffledQueue();
      }
      displayHeadline(currentIndex, true);
      if (playAudio) {
        sounds.playClick();
      }
    };

    const resetTickerTimer = () => {
      if (tickerInterval) clearInterval(tickerInterval);
      tickerInterval = setInterval(() => advanceHeadline(false), 9000);
    };

    // Show initial headline immediately
    displayHeadline(0, false);
    resetTickerTimer();

    // Click anywhere on ticker to cycle immediately (Cookie Clicker style)
    container.addEventListener('click', () => {
      advanceHeadline(true);
      resetTickerTimer();
    });
  }

  // ==========================================================================
  // v1.125: GLOBAL HIGH-ROLLER LEADERBOARD & ON-PAGE STANDINGS CONTROLLER
  // ==========================================================================
  initLeaderboard() {
    const btnNav = document.getElementById('btn-nav-leaderboard');
    const drawerItem = document.getElementById('drawer-item-leaderboard');
    const btnMenuRanks = document.getElementById('btn-menu-ranks');
    const mainLbExpand = document.getElementById('main-lb-expand-btn');
    const modal = document.getElementById('leaderboard-modal');
    const closeBtn = document.getElementById('close-leaderboard-btn');
    const closeFooterBtn = document.getElementById('btn-close-leaderboard');

    const openModal = () => {
      this.openLeaderboardModal();
      if (this.transitDrawer) this.closeTransitDrawer();
    };

    const closeModal = () => {
      if (modal) modal.classList.add('hidden');
      sounds.playClick();
    };

    if (btnNav) btnNav.addEventListener('click', openModal);
    if (drawerItem) drawerItem.addEventListener('click', openModal);
    if (btnMenuRanks) btnMenuRanks.addEventListener('click', openModal);
    if (mainLbExpand) mainLbExpand.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);

    // Initial populate of on-page leaderboard
    this.updateLeaderboardUI();
  }

  updateLeaderboardUI() {
    // Calculate Hero Net Worth: Cumulative Savings + Mini-game Wallet + All 4 Save Slots
    const cumulativeSavings = EconomyManager.getCumulativeSavings() || 0;
    const walletObj = EconomyManager.getMiniGameWallet();
    const miniGameWallet = (walletObj && typeof walletObj.balance === 'number') ? walletObj.balance : 0;
    const saves = SaveManager.getSaves() || {};
    let slotsChips = 0;
    for (let i = 1; i <= 4; i++) {
      const slot = saves[`slot_${i}`];
      if (slot && typeof slot.chips === 'number') {
        slotsChips += slot.chips;
      }
    }
    const heroTotalWealth = cumulativeSavings + miniGameWallet + slotsChips;
    const heroName = (localStorage.getItem('royal_poker_username') || 'Hero').trim();

    // In-Game Registered Standings & Solar Rivals (No external international players)
    const IN_GAME_RIVALS = [
      { name: "Viper", role: "TAG Shark Rival", status: "Solar Diamond VIP", wealth: 185000 },
      { name: "Atlas", role: "Solid TAG Contender", status: "Solar Elite", wealth: 142000 },
      { name: "Luna", role: "Nit Master / Rock", status: "Solar Elite", wealth: 98000 },
      { name: "Duke", role: "Maniac High-Roller", status: "High Roller", wealth: 76000 },
      { name: "Rex 'Bluff King'", role: "Tournament Challenger", status: "Circuit Pro", wealth: 54000 },
      { name: "Jade 'Solar Ace'", role: "Floor Master", status: "Circuit Pro", wealth: 42000 },
      { name: "Nova 'The Comet'", role: "Blackjack Specialist", status: "Table Regular", wealth: 28000 },
      { name: "Maverick", role: "Solar Circuit Veteran", status: "Table Regular", wealth: 19500 },
      { name: "Helios", role: "Grand Arena Host", status: "Rising Contender", wealth: 12000 }
    ];

    // Maintain persistent registered players roster on this device
    let savedProfiles = [];
    try {
      const raw = localStorage.getItem('solar_poker_registered_roster');
      if (raw) savedProfiles = JSON.parse(raw);
    } catch (e) {}

    // Save Hero into registered roster if not already saved
    if (heroName && heroName !== 'Hero') {
      const existing = savedProfiles.find(p => p.name.toLowerCase() === heroName.toLowerCase());
      if (existing) {
        existing.wealth = heroTotalWealth;
      } else {
        savedProfiles.push({ name: heroName, role: "Registered Player", status: "Active Hero", wealth: heroTotalWealth });
      }
      try {
        localStorage.setItem('solar_poker_registered_roster', JSON.stringify(savedProfiles));
      } catch (e) {}
    }

    // Filter out Hero from savedProfiles so Hero isn't duplicated
    const otherRegistered = savedProfiles.filter(p => p.name.toLowerCase() !== heroName.toLowerCase());

    // Combine Hero into in-game registered standings
    const standings = [
      ...IN_GAME_RIVALS,
      ...otherRegistered,
      {
        name: heroName,
        role: "Registered Player",
        status: "Active Hero",
        wealth: heroTotalWealth,
        isHero: true
      }
    ];

    // Sort descending by total wealth
    standings.sort((a, b) => b.wealth - a.wealth);

    // Find Hero Rank
    const heroRank = standings.findIndex(p => p.isHero) + 1;

    let tierDesc = "High Roller Candidate";
    if (heroTotalWealth >= 1000000) tierDesc = "Apex Sovereign Legend";
    else if (heroTotalWealth >= 500000) tierDesc = "Solar Royalty VIP";
    else if (heroTotalWealth >= 200000) tierDesc = "High-Roller Elite";
    else if (heroTotalWealth >= 50000) tierDesc = "Circuit Contender";
    else if (heroTotalWealth >= 10000) tierDesc = "Rising Table Specialist";

    // 1. Update Leaderboard Modal Hero Summary Card
    const heroCallsignEl = document.getElementById('lb-hero-callsign');
    const heroWealthEl = document.getElementById('lb-hero-wealth');
    const heroRankEl = document.getElementById('lb-hero-rank');
    const heroTierEl = document.getElementById('lb-hero-tier');

    if (heroCallsignEl) heroCallsignEl.textContent = heroName;
    if (heroWealthEl) heroWealthEl.textContent = `$${heroTotalWealth.toLocaleString()}`;
    if (heroRankEl) heroRankEl.textContent = `#${heroRank} of ${standings.length}`;
    if (heroTierEl) heroTierEl.textContent = tierDesc;

    // 2. Update On-Page Main Menu Leaderboard Strip
    const mainHeroNameEl = document.getElementById('main-lb-hero-name');
    const mainHeroWealthEl = document.getElementById('main-lb-hero-wealth');
    const mainHeroRankEl = document.getElementById('main-lb-hero-rank');
    const mainHeroTierEl = document.getElementById('main-lb-hero-tier');

    if (mainHeroNameEl) mainHeroNameEl.textContent = heroName;
    if (mainHeroWealthEl) mainHeroWealthEl.textContent = `$${heroTotalWealth.toLocaleString()}`;
    if (mainHeroRankEl) mainHeroRankEl.textContent = `#${heroRank} of ${standings.length}`;
    if (mainHeroTierEl) mainHeroTierEl.textContent = tierDesc;

    // 3. Render Modal Table Body
    const tbody = document.getElementById('leaderboard-table-body');
    if (tbody) {
      tbody.innerHTML = standings.map((player, idx) => {
        const rank = idx + 1;
        const isHero = player.isHero;
        const rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : ''));
        const rowClass = isHero ? 'hero-leaderboard-row' : '';

        return `
          <tr class="${rowClass}">
            <td class="rank-cell ${rankClass}">
              ${rank === 1 ? '&#9733; #1' : `#${rank}`}
            </td>
            <td class="player-cell">
              <strong>${player.name}</strong>
              ${isHero ? '<span class="hero-tag-badge">YOU</span>' : ''}
            </td>
            <td class="region-cell">${player.role || 'Registered Player'}</td>
            <td class="title-cell">${player.status || 'Active Member'}</td>
            <td class="td-wealth gold">$${player.wealth.toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }

    // 4. Render On-Page Scrollable Leaderboard Table Body
    const mainTbody = document.getElementById('main-leaderboard-tbody');
    if (mainTbody) {
      mainTbody.innerHTML = standings.map((player, idx) => {
        const rank = idx + 1;
        const isHero = player.isHero;
        const rankClass = rank === 1 ? 'gold-rank' : (rank === 2 ? 'silver-rank' : (rank === 3 ? 'bronze-rank' : ''));
        const rowClass = isHero ? 'main-lb-hero-row' : '';

        return `
          <tr class="${rowClass}">
            <td class="mlb-td-rank ${rankClass}">
              ${rank === 1 ? '&#9733; #1' : `#${rank}`}
            </td>
            <td class="mlb-td-name">
              <span class="mlb-name-text">${player.name}</span>
              ${isHero ? '<span class="mlb-you-tag">YOU</span>' : ''}
            </td>
            <td class="mlb-td-origin">${player.role || 'Player'}</td>
            <td class="mlb-td-wealth">$${player.wealth.toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }
  }

  openLeaderboardModal() {
    this.updateLeaderboardUI();
    const modal = document.getElementById('leaderboard-modal');
    if (modal) {
      modal.classList.remove('hidden');
      sounds.playToggleChime();
    }
  }

  // ==========================================================================
  // v1.13: FIRST-TIME OVERPOWERING UPDATE 1.13 ANNOUNCEMENT MODAL
  // ==========================================================================
  initUpdateAnnouncementModal() {
    const modal = document.getElementById('update-announcement-modal');
    const closeBtn = document.getElementById('close-update-announcement-btn');
    const startBtn = document.getElementById('btn-start-playing-v11') || document.getElementById('btn-start-playing-v12');
    const seenVersion = localStorage.getItem('solar_poker_seen_version');

    const dismissModal = () => {
      if (modal) modal.classList.add('hidden');
      localStorage.setItem('solar_poker_seen_version', '1.13');
      sounds.playClick();
    };

    if (closeBtn) closeBtn.addEventListener('click', dismissModal);
    if (startBtn) startBtn.addEventListener('click', dismissModal);

    // Initial first-time presentation for v1.13 In-Game Roster & Horizontal Hub Update
    if (seenVersion !== '1.13' && modal) {
      setTimeout(() => {
        modal.classList.remove('hidden');
        sounds.playAlert();
      }, 400);
    }
  }

  // ==========================================================================
  // v1.1: SAVE SLOT GAME SELECTION MODAL (TEXAS HOLD'EM VS SOLAR BLACKJACK)
  // ==========================================================================
  initSlotGameSelectModal() {
    const modal = document.getElementById('slot-game-select-modal');
    const closeBtn = document.getElementById('close-game-select-btn');
    const btnTexas = document.getElementById('btn-select-texas');
    const btnBj = document.getElementById('btn-select-blackjack');

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (btnTexas && modal) {
      btnTexas.addEventListener('click', () => {
        modal.classList.add('hidden');
        sounds.playClick();
        const slotId = this.pendingSlotTarget;
        const saves = SaveManager.getSaves();
        const slotData = saves[`slot_${slotId}`];

        if (this.pendingSlotIsContinuation && slotData) {
          this.openBuyInModal(slotId, slotData.difficulty, true);
        } else {
          if (this.diffModal) this.diffModal.classList.remove('hidden');
        }
      });
    }

    if (btnBj && modal) {
      btnBj.addEventListener('click', () => {
        modal.classList.add('hidden');
        sounds.playClick();
        this.openBlackjackSetup(this.pendingSlotTarget);
      });
    }
  }

  openSlotGameSelect(slotId, isContinuation = false) {
    this.pendingSlotTarget = slotId;
    this.pendingSlotIsContinuation = isContinuation;

    const modal = document.getElementById('slot-game-select-modal');
    const labelEl = document.getElementById('game-select-slot-label');
    if (labelEl) {
      labelEl.textContent = `SLOT ${slotId} • ${isContinuation ? 'CONTINUE RUN' : 'NEW CAMPAIGN'}`;
    }
    if (modal) modal.classList.remove('hidden');
    sounds.playClick();
  }

  // ==========================================================================
  // v1.1: BLACKJACK BUY-IN & BET SETUP MODAL
  // ==========================================================================
  initBlackjackBuyInModal() {
    const modal = document.getElementById('blackjack-buyin-modal');
    const closeBtn = document.getElementById('close-bj-buyin-btn');
    const cancelBtn = document.getElementById('btn-cancel-bj-buyin');
    const confirmBtn = document.getElementById('btn-confirm-bj-buyin');
    const inputEl = document.getElementById('bj-hand-bet-input');
    const errEl = document.getElementById('bj-buyin-error-msg');

    const closeModal = () => {
      if (modal) modal.classList.add('hidden');
      if (errEl) errEl.textContent = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Preset bet buttons ($10, $25, $50, $100, $250, $500)
    document.querySelectorAll('.bj-bet-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = Number(btn.dataset.bet) || 50;
        if (inputEl) {
          inputEl.value = Math.min(amt, this.bjSetupBankroll || 1000);
        }
        sounds.playChip();
        if (errEl) errEl.textContent = '';
      });
    });

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const bet = Number(inputEl ? inputEl.value : 50);
        const bankroll = this.bjSetupBankroll || 1000;

        if (isNaN(bet) || bet < 10) {
          if (errEl) errEl.textContent = 'Minimum hand bet is $10.';
          sounds.playFold();
          return;
        }
        if (bet > bankroll) {
          if (errEl) errEl.textContent = `Bet cannot exceed available bankroll ($${bankroll.toLocaleString()}).`;
          sounds.playFold();
          return;
        }

        closeModal();
        this.startBlackjackGame(this.pendingSlotTarget, bankroll, bet);
      });
    }
  }

  openBlackjackSetup(slotId) {
    this.pendingSlotTarget = slotId;
    const saves = SaveManager.getSaves();
    const slotData = saves[`slot_${slotId}`];
    const bankroll = (slotData && slotData.chips > 0) ? slotData.chips : 1000;
    this.bjSetupBankroll = bankroll;

    const modal = document.getElementById('blackjack-buyin-modal');
    const titleEl = document.getElementById('bj-modal-slot-title');
    const bankrollEl = document.getElementById('bj-modal-avail-bankroll');
    const inputEl = document.getElementById('bj-hand-bet-input');
    const errEl = document.getElementById('bj-buyin-error-msg');

    if (titleEl) titleEl.textContent = `SAVE SLOT ${slotId} • SOLAR BLACKJACK`;
    if (bankrollEl) bankrollEl.textContent = `$${bankroll.toLocaleString()}`;
    if (inputEl) inputEl.value = Math.min(50, bankroll);
    if (errEl) errEl.textContent = '';

    if (modal) modal.classList.remove('hidden');
    sounds.playClick();
  }

  // ==========================================================================
  // v1.1: SOLAR BLACKJACK ENGINE & CONTROLLER
  // ==========================================================================
  initBlackjack() {
    this.bindBlackjackDOM();
  }

  bindBlackjackDOM() {
    this.bjView = document.getElementById('blackjack-view');
    this.bjBankrollEl = document.getElementById('bj-table-bankroll');
    this.bjCurrentBetEl = document.getElementById('bj-table-current-bet');
    this.bjActiveBetValEl = document.getElementById('bj-active-bet-val');
    this.bjDealerScoreEl = document.getElementById('bj-dealer-score-tag');
    this.bjDealerCardsEl = document.getElementById('bj-dealer-cards');
    this.bjPlayerScoreEl = document.getElementById('bj-player-score-tag');
    this.bjPlayerCardsEl = document.getElementById('bj-player-cards');
    this.bjStatusMsgEl = document.getElementById('bj-status-message');

    this.bjBettingControls = document.getElementById('bj-betting-controls');
    this.bjPlayControls = document.getElementById('bj-play-controls');
    this.bjPostControls = document.getElementById('bj-post-controls');

    const btnBack = document.getElementById('btn-bj-back-menu');
    const btnCashout = document.getElementById('btn-bj-cashout');
    const btnClearBet = document.getElementById('btn-bj-clear-bet');
    const btnDoubleBet = document.getElementById('btn-bj-double-bet');
    const btnDeal = document.getElementById('btn-bj-deal');
    const btnHit = document.getElementById('btn-bj-hit');
    const btnStand = document.getElementById('btn-bj-stand');
    const btnDouble = document.getElementById('btn-bj-double');
    const btnSurrender = document.getElementById('btn-bj-surrender');
    const btnNewHand = document.getElementById('btn-bj-new-hand');

    if (btnBack) btnBack.addEventListener('click', () => this.hideBlackjackView());
    if (btnCashout) btnCashout.addEventListener('click', () => this.cashoutBlackjack());

    // Chips selection on table
    document.querySelectorAll('.bj-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.bjHandActive) return;
        const val = Number(btn.dataset.chip) || 25;
        this.bjSelectedChip = val;
        document.querySelectorAll('.bj-chip-btn').forEach(b => b.classList.remove('active-chip'));
        btn.classList.add('active-chip');

        // Increment bet up to available bankroll
        const newBet = Math.min(this.bjCurrentBet + val, this.bjBankroll);
        this.bjCurrentBet = newBet;
        this.updateBlackjackBetDisplay();
        sounds.playChip();
      });
    });

    if (btnClearBet) {
      btnClearBet.addEventListener('click', () => {
        if (this.bjHandActive) return;
        this.bjCurrentBet = Math.min(10, this.bjBankroll);
        this.updateBlackjackBetDisplay();
        sounds.playClick();
      });
    }

    if (btnDoubleBet) {
      btnDoubleBet.addEventListener('click', () => {
        if (this.bjHandActive) return;
        this.bjCurrentBet = Math.min(this.bjCurrentBet * 2, this.bjBankroll);
        this.updateBlackjackBetDisplay();
        sounds.playChip();
      });
    }

    if (btnDeal) btnDeal.addEventListener('click', () => this.dealBlackjackHand());
    if (btnHit) btnHit.addEventListener('click', () => this.hitBlackjack());
    if (btnStand) btnStand.addEventListener('click', () => this.standBlackjack());
    if (btnDouble) btnDouble.addEventListener('click', () => this.doubleDownBlackjack());
    if (btnSurrender) btnSurrender.addEventListener('click', () => this.surrenderBlackjack());
    if (btnNewHand) btnNewHand.addEventListener('click', () => this.resetBlackjackForNewHand());
  }

  showBlackjackView() {
    this.casinoPreviousView = 'menu';
    const mainMenu = document.getElementById('main-menu');
    const gameView = document.getElementById('game-view');
    const casinoView = document.getElementById('casino-view');

    if (mainMenu) mainMenu.classList.add('hidden');
    if (gameView) gameView.classList.add('hidden');
    if (casinoView) casinoView.classList.add('hidden');
    if (this.bjView) this.bjView.classList.remove('hidden');

    this.updateBlackjackTableUI();
  }

  hideBlackjackView() {
    this.saveBlackjackSlotData();
    if (this.bjView) this.bjView.classList.add('hidden');
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
      mainMenu.classList.remove('hidden');
      mainMenu.classList.add('page-slide-right-in');
      setTimeout(() => mainMenu.classList.remove('page-slide-right-in'), 350);
    }
    this.renderMainMenuSlots();
    this.updateDualWalletUI();
    sounds.playClick();
  }

  cashoutBlackjack() {
    sounds.playCashout();
    this.saveBlackjackSlotData();
    this.hideBlackjackView();
    this.setAnnouncement(`[CASHOUT] Successfully saved $${this.bjBankroll.toLocaleString()} to Slot ${this.bjSlotId}!`);
  }

  saveBlackjackSlotData() {
    const saves = SaveManager.getSaves();
    let slotData = saves[`slot_${this.bjSlotId}`];
    if (!slotData) {
      slotData = {
        slotId: this.bjSlotId,
        gameType: 'blackjack',
        username: localStorage.getItem('royal_poker_username') || 'Hero',
        chips: this.bjBankroll,
        difficulty: 'medium',
        stage: 1,
        handNumber: 1,
        winRecord: { won: 0, total: 0 }
      };
    } else {
      slotData.gameType = 'blackjack';
      slotData.chips = this.bjBankroll;
    }
    SaveManager.saveSlot(this.bjSlotId, slotData);
  }

  resetBjShoe() {
    this.bjShoe = [];
    // 4 standard 52-card decks for authentic casino dealing
    for (let d = 0; d < 4; d++) {
      for (const suit of SUITS) {
        for (let r = 2; r <= 14; r++) {
          this.bjShoe.push(new Card(r, suit));
        }
      }
    }
    // Fisher-Yates shuffle
    for (let i = this.bjShoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bjShoe[i], this.bjShoe[j]] = [this.bjShoe[j], this.bjShoe[i]];
    }
  }

  dealBjCard() {
    if (!this.bjShoe || this.bjShoe.length < 10) {
      this.resetBjShoe();
    }
    return this.bjShoe.pop();
  }

  calculateBjScore(cards) {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
      if (card.rank === 14) {
        aces++;
        total += 11;
      } else if (card.rank >= 10) {
        total += 10;
      } else {
        total += card.rank;
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return {
      total,
      isBust: total > 21,
      isBlackjack: cards.length === 2 && total === 21,
      isSoft: aces > 0
    };
  }

  updateBlackjackBetDisplay() {
    if (this.bjBankrollEl) this.bjBankrollEl.textContent = `$${this.bjBankroll.toLocaleString()}`;
    if (this.bjCurrentBetEl) this.bjCurrentBetEl.textContent = `$${this.bjCurrentBet.toLocaleString()}`;
    if (this.bjActiveBetValEl) this.bjActiveBetValEl.textContent = `$${this.bjCurrentBet.toLocaleString()}`;
  }

  updateBlackjackTableUI() {
    this.updateBlackjackBetDisplay();
    if (this.bjBankrollEl) this.bjBankrollEl.textContent = `$${this.bjBankroll.toLocaleString()}`;
  }

  renderBlackjackCards(revealDealerHole = false) {
    if (this.bjPlayerCardsEl) {
      this.bjPlayerCardsEl.innerHTML = '';
      this.bjPlayerCards.forEach(card => {
        this.bjPlayerCardsEl.appendChild(this.renderCardDOM(card, false));
      });
    }

    if (this.bjDealerCardsEl) {
      this.bjDealerCardsEl.innerHTML = '';
      this.bjDealerCards.forEach((card, idx) => {
        const isHidden = (idx === 1 && !revealDealerHole);
        this.bjDealerCardsEl.appendChild(this.renderCardDOM(card, isHidden));
      });
    }

    // Update Player Score
    const pScore = this.calculateBjScore(this.bjPlayerCards);
    if (this.bjPlayerScoreEl) {
      if (this.bjPlayerCards.length === 0) {
        this.bjPlayerScoreEl.textContent = 'Your Score: 0';
      } else if (pScore.isBlackjack) {
        this.bjPlayerScoreEl.textContent = 'BLACKJACK! (21)';
      } else if (pScore.isBust) {
        this.bjPlayerScoreEl.textContent = `BUSTED (${pScore.total})`;
      } else if (pScore.isSoft && pScore.total < 21) {
        this.bjPlayerScoreEl.textContent = `Score: ${pScore.total} (Soft)`;
      } else {
        this.bjPlayerScoreEl.textContent = `Your Score: ${pScore.total}`;
      }
    }

    // Update Dealer Score
    if (this.bjDealerScoreEl) {
      if (this.bjDealerCards.length === 0) {
        this.bjDealerScoreEl.textContent = 'Dealer Score: ?';
      } else if (!revealDealerHole) {
        const upCard = this.bjDealerCards[0];
        const upVal = upCard.rank === 14 ? 11 : (upCard.rank >= 10 ? 10 : upCard.rank);
        this.bjDealerScoreEl.textContent = `Dealer Shows: ${upVal} + ?`;
      } else {
        const dScore = this.calculateBjScore(this.bjDealerCards);
        if (dScore.isBlackjack) {
          this.bjDealerScoreEl.textContent = 'DEALER BLACKJACK! (21)';
        } else if (dScore.isBust) {
          this.bjDealerScoreEl.textContent = `DEALER BUST (${dScore.total})`;
        } else {
          this.bjDealerScoreEl.textContent = `Dealer Score: ${dScore.total}`;
        }
      }
    }
  }

  startBlackjackGame(slotId, bankroll, startingBet) {
    this.bjSlotId = slotId;
    this.bjBankroll = bankroll;
    this.bjCurrentBet = Math.min(startingBet || 50, bankroll);
    this.bjSelectedChip = 25;
    this.bjDealerCards = [];
    this.bjPlayerCards = [];
    this.bjHandActive = false;
    this.bjHoleRevealed = false;

    this.resetBjShoe();
    this.showBlackjackView();
    this.renderBlackjackCards(false);

    if (this.bjStatusMsgEl) {
      this.bjStatusMsgEl.textContent = `Solar Blackjack Arena Active! Bet is $${this.bjCurrentBet.toLocaleString()}. Press DEAL to play.`;
    }

    // Show betting controls initially
    if (this.bjBettingControls) this.bjBettingControls.classList.remove('hidden');
    if (this.bjPlayControls) this.bjPlayControls.classList.add('hidden');
    if (this.bjPostControls) this.bjPostControls.classList.add('hidden');

    // Automatically deal first hand with chosen bet
    setTimeout(() => {
      this.dealBlackjackHand();
    }, 300);
  }

  dealBlackjackHand() {
    if (this.bjBankroll < 10) {
      this.bjBankroll = 500;
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = 'Bankroll recharged with $500 Casino Credit!';
      }
    }

    this.bjCurrentBet = Math.min(this.bjCurrentBet, this.bjBankroll);
    if (this.bjCurrentBet < 10) this.bjCurrentBet = 10;

    // Deduct bet from bankroll
    this.bjBankroll -= this.bjCurrentBet;
    this.bjHandActive = true;
    this.bjHoleRevealed = false;
    this.updateBlackjackBetDisplay();

    // Reset hands
    this.bjPlayerCards = [this.dealBjCard(), this.dealBjCard()];
    this.bjDealerCards = [this.dealBjCard(), this.dealBjCard()];

    sounds.playShuffle();
    sounds.playChip();
    sounds.playCardDealingSequence(4);

    this.renderBlackjackCards(false);

    // Switch to Play Controls
    if (this.bjBettingControls) this.bjBettingControls.classList.add('hidden');
    if (this.bjPostControls) this.bjPostControls.classList.add('hidden');
    if (this.bjPlayControls) this.bjPlayControls.classList.remove('hidden');

    // Enable/disable Double Down and Surrender based on bankroll
    const btnDouble = document.getElementById('btn-bj-double');
    const btnSurrender = document.getElementById('btn-bj-surrender');
    if (btnDouble) btnDouble.disabled = (this.bjBankroll < this.bjCurrentBet);
    if (btnSurrender) btnSurrender.disabled = false;

    const pScore = this.calculateBjScore(this.bjPlayerCards);

    // Check for Natural Blackjack (Player 21)
    if (pScore.isBlackjack) {
      this.bjHoleRevealed = true;
      this.renderBlackjackCards(true);
      const dScore = this.calculateBjScore(this.bjDealerCards);

      if (dScore.isBlackjack) {
        // Push
        this.bjBankroll += this.bjCurrentBet;
        if (this.bjStatusMsgEl) {
          this.bjStatusMsgEl.textContent = 'Push! Both Player and Dealer have Natural Blackjack!';
        }
        sounds.playCheck();
      } else {
        // Natural 3:2 payout!
        const winProfit = Math.floor(this.bjCurrentBet * 1.5);
        this.bjBankroll += (this.bjCurrentBet + winProfit);
        if (this.bjStatusMsgEl) {
          this.bjStatusMsgEl.textContent = `SOLAR NATURAL BLACKJACK! Paid 3:2 (+$$${winProfit.toLocaleString()})!`;
        }
        sounds.playJackpot();
      }
      this.finishBlackjackHand();
      return;
    }

    if (this.bjStatusMsgEl) {
      this.bjStatusMsgEl.textContent = `Your Turn: Score is ${pScore.total}. Hit, Stand, Double Down, or Surrender.`;
    }
  }

  hitBlackjack() {
    if (!this.bjHandActive) return;

    // Draw card
    const card = this.dealBjCard();
    this.bjPlayerCards.push(card);
    sounds.playCard();

    // Disable double down & surrender after 1st hit
    const btnDouble = document.getElementById('btn-bj-double');
    const btnSurrender = document.getElementById('btn-bj-surrender');
    if (btnDouble) btnDouble.disabled = true;
    if (btnSurrender) btnSurrender.disabled = true;

    this.renderBlackjackCards(false);
    const pScore = this.calculateBjScore(this.bjPlayerCards);

    if (pScore.isBust) {
      this.bjHoleRevealed = true;
      this.renderBlackjackCards(true);
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = `Player Busts with ${pScore.total}! Hand lost (-$$${this.bjCurrentBet.toLocaleString()}).`;
      }
      sounds.playLose();
      this.finishBlackjackHand();
    } else if (pScore.total === 21) {
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = '21! Standing automatically...';
      }
      setTimeout(() => this.standBlackjack(), 500);
    } else {
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = `Hit! Current score is ${pScore.total}. Hit again or Stand?`;
      }
    }
  }

  standBlackjack() {
    if (!this.bjHandActive) return;

    sounds.playCheck();
    this.bjHoleRevealed = true;
    this.renderBlackjackCards(true);

    // Dealer AI: dealer must stand on 17 (all 17s)
    let dScore = this.calculateBjScore(this.bjDealerCards);
    while (dScore.total < 17) {
      const card = this.dealBjCard();
      this.bjDealerCards.push(card);
      dScore = this.calculateBjScore(this.bjDealerCards);
    }

    this.renderBlackjackCards(true);
    const pScore = this.calculateBjScore(this.bjPlayerCards);

    // Settle Hand
    if (dScore.isBust) {
      // Dealer busts -> Player wins 1:1
      this.bjBankroll += this.bjCurrentBet * 2;
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = `Dealer Busted with ${dScore.total}! You Win +$$${this.bjCurrentBet.toLocaleString()}!`;
      }
      sounds.playWin();
    } else if (pScore.total > dScore.total) {
      // Player wins 1:1
      this.bjBankroll += this.bjCurrentBet * 2;
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = `You Win! Score ${pScore.total} beats Dealer's ${dScore.total} (+$$${this.bjCurrentBet.toLocaleString()})!`;
      }
      sounds.playWin();
    } else if (pScore.total < dScore.total) {
      // Dealer wins
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = `Dealer Wins with ${dScore.total} against your ${pScore.total} (-$$${this.bjCurrentBet.toLocaleString()}).`;
      }
      sounds.playLose();
    } else {
      // Push (Tie)
      this.bjBankroll += this.bjCurrentBet;
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = `Push! Standoff at ${pScore.total}. Bet of $${this.bjCurrentBet.toLocaleString()} returned.`;
      }
      sounds.playCheck();
    }

    this.finishBlackjackHand();
  }

  doubleDownBlackjack() {
    if (!this.bjHandActive || this.bjPlayerCards.length !== 2) return;

    const extra = Math.min(this.bjCurrentBet, this.bjBankroll);
    this.bjBankroll -= extra;
    this.bjCurrentBet += extra;
    this.updateBlackjackBetDisplay();

    sounds.playChip();
    sounds.playCard();

    // Deal exactly 1 card
    this.bjPlayerCards.push(this.dealBjCard());
    this.renderBlackjackCards(false);

    const pScore = this.calculateBjScore(this.bjPlayerCards);
    if (pScore.isBust) {
      this.bjHoleRevealed = true;
      this.renderBlackjackCards(true);
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = `Double Down Busted with ${pScore.total}! Hand lost (-$$${this.bjCurrentBet.toLocaleString()}).`;
      }
      sounds.playLose();
      this.finishBlackjackHand();
    } else {
      setTimeout(() => this.standBlackjack(), 400);
    }
  }

  surrenderBlackjack() {
    if (!this.bjHandActive || this.bjPlayerCards.length !== 2) return;

    sounds.playFold();
    const refund = Math.floor(this.bjCurrentBet / 2);
    this.bjBankroll += refund;
    this.updateBlackjackBetDisplay();

    this.bjHoleRevealed = true;
    this.renderBlackjackCards(true);

    if (this.bjStatusMsgEl) {
      this.bjStatusMsgEl.textContent = `Hand Surrendered. 50% refunded ($$${refund.toLocaleString()}).`;
    }

    this.finishBlackjackHand();
  }

  finishBlackjackHand() {
    this.bjHandActive = false;
    this.updateBlackjackBetDisplay();
    this.saveBlackjackSlotData();

    // Switch to post-round controls (Next Hand button)
    if (this.bjPlayControls) this.bjPlayControls.classList.add('hidden');
    if (this.bjPostControls) this.bjPostControls.classList.remove('hidden');
  }

  resetBlackjackForNewHand() {
    if (this.bjBankroll < 10) {
      this.bjBankroll = 500;
      if (this.bjStatusMsgEl) {
        this.bjStatusMsgEl.textContent = 'Bankroll recharged with $500 Casino Line of Credit!';
      }
    }

    this.bjCurrentBet = Math.min(this.bjCurrentBet, this.bjBankroll);
    if (this.bjCurrentBet < 10) this.bjCurrentBet = 10;

    this.bjPlayerCards = [];
    this.bjDealerCards = [];
    this.bjHandActive = false;
    this.bjHoleRevealed = false;

    this.renderBlackjackCards(false);
    this.updateBlackjackBetDisplay();

    if (this.bjStatusMsgEl) {
      this.bjStatusMsgEl.textContent = `Ready for next hand! Active Bet: $${this.bjCurrentBet.toLocaleString()}. Press DEAL CARDS.`;
    }

    // Switch to betting controls
    if (this.bjPostControls) this.bjPostControls.classList.add('hidden');
    if (this.bjPlayControls) this.bjPlayControls.classList.add('hidden');
    if (this.bjBettingControls) this.bjBettingControls.classList.remove('hidden');
    sounds.playClick();
  }
}


// Launch application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.pokerGame = new PokerApp();
});
