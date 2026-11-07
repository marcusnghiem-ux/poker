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
    this.volume = parseFloat(localStorage.getItem('royal_poker_volume') || '0.8');
    this.ctx = null;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('royal_poker_volume', this.volume.toString());
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('royal_poker_sound_muted', (!this.enabled).toString());
    return this.enabled;
  }

  playChip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playCard() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {}
  }

  playShuffle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      for (let i = 0; i < 4; i++) {
        const time = this.ctx.currentTime + i * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320 + Math.random() * 150, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.035);
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.035);
      }
    } catch (e) {}
  }

  playCheck() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }

  playFold() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playRouletteClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.015);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.015);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.015);
    } catch (e) {}
  }

  playWin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.22, this.ctx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.09 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.09);
        osc.stop(this.ctx.currentTime + idx * 0.09 + 0.25);
      });
    } catch (e) {}
  }

  playFire() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(360, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {}
  }

  playSlotSpin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(740, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playSlotStop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }

  playJackpot() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.35);
      });
    } catch (e) {}
  }
}

const sounds = new SoundManager();
window.addEventListener('touchstart', () => sounds.init(), { once: true, passive: true });
window.addEventListener('pointerdown', () => sounds.init(), { once: true, passive: true });

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
    return { slot_1: null, slot_2: null, slot_3: null };
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
  static CYCLE_MS = 24 * 60 * 60 * 1000; // Persistent 24-hour cycle

  static getGlobalPokerClaimStatus() {
    let lastClaim = 0;
    try {
      const val = localStorage.getItem(EconomyManager.GLOBAL_POKER_CLAIM_KEY);
      if (val) lastClaim = parseInt(val, 10) || 0;
    } catch (e) {}

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

  static claimGlobalPokerDaily() {
    const status = EconomyManager.getGlobalPokerClaimStatus();
    if (!status.canClaim) {
      return { success: false, message: `24h cycle active! Next claim in ${status.text}` };
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

  static claimMiniGameDaily() {
    const status = EconomyManager.getMiniGameClaimStatus();
    if (!status.canClaim) {
      return { success: false, message: `24h cycle active! Next claim in ${status.text}` };
    }
    const wallet = EconomyManager.getMiniGameWallet();
    wallet.balance += 500;
    wallet.lastClaimTimestamp = Date.now();
    EconomyManager.saveMiniGameWallet(wallet);
    return { success: true, balance: wallet.balance };
  }

  static getPokerAllowances() {
    try {
      const data = localStorage.getItem(EconomyManager.POKER_ALLOWANCE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return { slot_1: 0, slot_2: 0, slot_3: 0 };
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

  static transferMiniGameToPoker(slotId, amount) {
    amount = Math.floor(Number(amount));
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Please enter a valid transfer amount.' };
    }
    const wallet = EconomyManager.getMiniGameWallet();
    if (wallet.balance < amount) {
      return { success: false, message: 'Transfer amount exceeds your available mini-game balance!' };
    }

    // Deduct from Mini-Game Wallet
    wallet.balance -= amount;
    EconomyManager.saveMiniGameWallet(wallet);

    // Strictly one-way injection to Poker Save Slot
    let slot = SaveManager.getSave(slotId);
    const customName = localStorage.getItem('royal_poker_username') || 'High Roller';
    if (slot) {
      slot.chips = (slot.chips || 0) + amount;
      SaveManager.saveSlot(slotId, slot);
    } else {
      slot = {
        name: customName,
        chips: 1000 + amount,
        stage: 1,
        difficulty: 'medium',
        handNumber: 0,
        winRecord: { won: 0, total: 0 }
      };
      SaveManager.saveSlot(slotId, slot);
    }

    return { success: true, newMiniBalance: wallet.balance, newSlotChips: slot.chips };
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
    try { this.bindTopNavAndModals(); } catch (err) { console.error("bindTopNav error:", err); }
    try { this.initCasinoLounge(); } catch (err) { console.error("initCasinoLounge error:", err); }
    try { this.setGameVariant(this.variant); } catch (err) { console.error("setGameVariant error:", err); }
    try { this.initRoulette(); } catch (err) { console.error("initRoulette error:", err); }
    try { this.initSlots(); } catch (err) { console.error("initSlots error:", err); }
    try { this.initTransfer(); } catch (err) { console.error("initTransfer error:", err); }
    try { this.initEconomy(); } catch (err) { console.error("initEconomy error:", err); }
    try { this.startDailyTimersLoop(); } catch (err) { console.error("startDailyTimersLoop error:", err); }
    try { this.updateGlobalStatsUI(); } catch (err) { console.error("updateGlobalStatsUI error:", err); }
    try { this.updateDualWalletUI(); } catch (err) { console.error("updateDualWalletUI error:", err); }
    try { this.renderMainMenuSlots(); } catch (err) { console.error("renderSlots error:", err); }

    // Check if URL has ?room=join or ?room=private
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('room') === 'join' || urlParams.get('room') === 'private') {
      this.promptOnlineRoomPassword();
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

    // Transit links in drawer
    document.querySelectorAll('.transit-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const dest = item.dataset.transit;
        this.toggleTransitDrawer(false);
        this.handleTransitNavigation(dest);
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
        this.openCasinoLounge('split');
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
          this.setAnnouncement(`[CLAIMED] Claimed $500 Daily Mini-Game Allowance! New balance: $${res.balance.toLocaleString()}`);
        } else {
          sounds.playCheck();
          this.setAnnouncement(`⚠️ ${res.message}`);
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
          alert('Insufficient Mini-Game funds! Claim your daily bonus or transfer chips.');
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
          alert('Insufficient Mini-Game funds! Claim your daily bonus or transfer chips.');
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
    if (this.menuSoundBtn) {
      this.menuSoundBtn.innerHTML = `<span class="btn-icon"></span> Sound: ${sounds.enabled ? 'ON' : 'OFF'}`;
    }
    if (this.soundToggleBtn) {
      this.soundToggleBtn.textContent = sounds.enabled ? 'Sound ON' : 'Sound OFF';
    }
    if (this.btnQuickSound) {
      this.btnQuickSound.title = sounds.enabled ? 'Mute Audio' : 'Unmute Audio';
      this.btnQuickSound.classList.toggle('audio-muted', !sounds.enabled);
    }
    const settingSoundToggle = document.getElementById('setting-sound-toggle');
    if (settingSoundToggle) {
      settingSoundToggle.checked = sounds.enabled;
    }
  }

  handleTransitNavigation(dest) {
    if (dest === 'texas') {
      this.setGameVariant('texas');
      this.showGameView();
      if (!this.handInProgress) this.startNewHand();
    } else if (dest === 'shortDeck') {
      if (!FeatureManager.isEnabled('shortDeck')) {
        alert('Short Deck (6+) variant is disabled in Settings.');
        return;
      }
      this.setGameVariant('shortDeck');
      this.showGameView();
      if (!this.handInProgress) this.startNewHand();
    } else if (dest === 'omaha') {
      if (!FeatureManager.isEnabled('omaha')) {
        alert('Omaha High (4-Card) variant is disabled in Settings.');
        return;
      }
      this.setGameVariant('omaha');
      this.showGameView();
      if (!this.handInProgress) this.startNewHand();
    } else if (dest === 'exclusive') {
      this.promptOnlineRoomPassword();
    } else if (dest === 'slots') {
      if (!FeatureManager.isEnabled('slots')) {
        alert('Slot Machine mini-game is disabled in Settings.');
        return;
      }
      const slotModal = document.getElementById('slots-modal');
      if (slotModal) slotModal.classList.remove('hidden');
      this.updateSlotsUI();
    } else if (dest === 'roulette') {
      if (!FeatureManager.isEnabled('roulette')) {
        alert('European Roulette is disabled in Settings.');
        return;
      }
      this.openRouletteModal();
    } else if (dest === 'vault') {
      const trModal = document.getElementById('transfer-modal');
      if (trModal) trModal.classList.remove('hidden');
      this.updateTransferModal();
    }
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
      alert('No active table chips to cash out!');
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
        this.setAnnouncement('⚠️ Mid-round lockdown active! You can only leave during the 5-second pause between hands.');
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

    // Sound toggle
    const toggleAudio = () => {
      sounds.enabled = !sounds.enabled;
      this.menuSoundBtn.innerHTML = `<span class="btn-icon">${sounds.enabled ? '🔊' : '🔇'}</span> Sound: ${sounds.enabled ? 'ON' : 'OFF'}`;
      this.soundToggleBtn.textContent = sounds.enabled ? '🔊 Sound' : '🔇 Muted';
    };
    if (this.menuSoundBtn) this.menuSoundBtn.addEventListener('click', toggleAudio);
    if (this.soundToggleBtn) this.soundToggleBtn.addEventListener('click', toggleAudio);

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
        this.btnCopyInvite.textContent = '✅ Copied!';
        setTimeout(() => this.btnCopyInvite.textContent = '📋 Share Link', 2000);
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
          this.startNewGame(this.pendingSlotTarget, diff);
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

    // Custom Profile & Username
    this.usernameInput = document.getElementById('player-username-input');
    this.btnSaveUsername = document.getElementById('btn-save-username');
    if (this.usernameInput) {
      const savedName = localStorage.getItem('royal_poker_username') || 'You';
      this.usernameInput.value = savedName;
      this.players[0].name = savedName;
      const saveName = () => {
        const val = (this.usernameInput.value || '').trim();
        if (val) {
          localStorage.setItem('royal_poker_username', val);
          this.players[0].name = val;
          const heroEl = document.getElementById('hero-name');
          if (heroEl) heroEl.textContent = val;
          this.renderMainMenuSlots();
          if (this.btnSaveUsername) {
            this.btnSaveUsername.textContent = 'Saved';
            setTimeout(() => { if (this.btnSaveUsername) this.btnSaveUsername.textContent = 'Save Name'; }, 1500);
          }
        }
      };
      if (this.btnSaveUsername) this.btnSaveUsername.addEventListener('click', saveName);
      this.usernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveName(); });
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
      if (this.btnBackIcon) this.btnBackIcon.textContent = '🔒';
      if (this.btnBackLabel) this.btnBackLabel.textContent = 'Locked';
      this.btnBackMenu.title = 'You cannot leave while a hand is in progress!';
    } else {
      this.btnBackMenu.classList.remove('menu-locked');
      if (this.btnBackIcon) this.btnBackIcon.textContent = '🏠';
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
        this.logMessage(`⏳ 15s turn limit expired for ${player.name} - Auto-folded!`, 'turn');
        this.setAnnouncement(`⏳ Turn time expired for ${player.name} — Auto-folded!`);
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
          this.setAnnouncement(`⏳ ${guestName} joined the room! Waiting for the next round.`);
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

    this.setAnnouncement(`👋 ${name} joined Exclusive Room & took over Seat ${seatIdx} ($${inheritedChips})!`);
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
      this.setAnnouncement(`👋 ${g.name} disconnected. Replaced by ${prof.name}.`);
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
      this.setAnnouncement('⚠️ Disconnected from table host. Returning to menu.');
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
      this.setAnnouncement(`🎉 Seated at Seat ${data.seat}! Waiting for hand to deal.`);
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
      this.setAnnouncement(`🔥 ${player.name} SHOVED ALL-IN ($${player.currentBet})!`);
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

    for (let slotId = 1; slotId <= 3; slotId++) {
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
            <div class="empty-slot-starting-chips">
              <span class="chips-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="1.8"/><circle cx="12" cy="12" r="5" stroke="#34d399" stroke-width="1.2"/><path d="M12 9v6M10 10.5c.8-.7 2.2-.7 3 0s-.5 1.5-1.5 1.5-1.5.8-.7 1.5 2.2.7 3 0" stroke="#fde047" stroke-width="1.4"/></svg>
              </span> $1,000 Starting Bankroll
            </div>
            <div class="empty-slot-cta">Select Difficulty &bull; Start Run</div>
          </div>
          <div class="slot-corner-bracket bottom-left"></div>
          <div class="slot-corner-bracket bottom-right"></div>
        `;
        cardEl.onclick = () => {
          this.pendingSlotTarget = slotId;
          this.diffModal.classList.remove('hidden');
        };
      } else {
        cardEl.className = 'slot-card active-slot';
        const winPercent = slotData.winRecord && slotData.winRecord.total > 0
          ? Math.round((slotData.winRecord.won / slotData.winRecord.total) * 100)
          : 0;
        const slotUser = slotData.username || localStorage.getItem('royal_poker_username') || 'Hero';
        const slotStage = slotData.stage || 1;
        const diffBadgeClass = slotData.difficulty === 'nightmare' ? 'diff-championship' : `diff-${slotData.difficulty}`;
        const diffBadgeLabel = slotData.difficulty === 'nightmare' ? 'CHAMPIONSHIP' : slotData.difficulty.toUpperCase();

        cardEl.innerHTML = `
          <div class="slot-corner-bracket top-left"></div>
          <div class="slot-corner-bracket top-right"></div>
          <div class="slot-header">
            <div class="slot-badge-wrap">
              <span class="slot-crown-icon">
                <svg width="16" height="13" viewBox="0 0 72 54" fill="none"><path d="M14 38 Q36 22 58 38 L54 44 Q36 34 18 44 Z" fill="#b91c1c"/><rect x="10" y="42" width="52" height="8" rx="2" fill="#ffd54f" stroke="#fef08a" stroke-width="1"/><path d="M12 42 L8 22 L20 30 L36 12 L52 30 L64 22 L60 42 Z" fill="#ffd54f" stroke="#fef08a" stroke-width="1.5"/><circle cx="36" cy="11" r="3" fill="#fff"/></svg>
              </span>
              <span class="slot-badge">SLOT ${slotId} &bull; ${slotUser}</span>
            </div>
            <span class="slot-diff ${diffBadgeClass}">${diffBadgeLabel}</span>
          </div>
          <div class="slot-bankroll-wrap">
            <span class="slot-bankroll-label">BANKROLL &bull; STAGE ${slotStage}</span>
            <div class="slot-bankroll">
              <span class="bankroll-currency">$</span>${(slotData.chips || 1000).toLocaleString()}
            </div>
          </div>
          <div class="slot-stats-grid">
            <div class="slot-stat-item">
              <span class="slot-stat-lbl">Stage/Round</span>
              <span class="slot-stat-val">S${slotStage} #h${slotData.handNumber || 1}</span>
            </div>
            <div class="slot-stat-item">
              <span class="slot-stat-lbl">Record</span>
              <span class="slot-stat-val">${slotData.winRecord ? slotData.winRecord.won : 0} Wins</span>
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

        cardEl.querySelector('.slot-btn-play').onclick = (e) => {
          e.stopPropagation();
          this.loadGame(slotId);
        };

        cardEl.querySelector('.slot-btn-del').onclick = (e) => {
          e.stopPropagation();
          this.pendingDeleteSlot = slotId;
          document.getElementById('delete-slot-name').textContent = `Save Slot ${slotId}`;
          this.deleteModal.classList.remove('hidden');
        };
      }
    }
  }

  startNewGame(slotId, difficulty) {
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

    const customName = localStorage.getItem('royal_poker_username') || 'You';
    this.players[0].name = customName;
    this.players[0].chips = 1000;
    this.players[0].knockedOut = false;
    this.players[0].isBot = false;
    this.players[0].isRemote = false;
    document.getElementById('hero-name').textContent = customName;

    for (let i = 1; i < 5; i++) {
      const prof = BASE_BOT_PROFILES[i];
      this.players[i].name = prof.name;
      this.players[i].style = prof.style;
      this.players[i].avatar = prof.avatar;
      this.players[i].chips = 1000;
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
      cardEl.className = 'card back card-hidden';
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
    cardEl.className = `card ${color} card-${color}`;
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
    for (let c = 0; c < holeCount; c++) {
      this.players.forEach((p, idx) => {
        if (!p.knockedOut && !p.folded) {
          const card = this.deck.deal();
          p.cards.push(card);
          const isHidden = (idx !== 0);
          const el = this.renderCardDOM(card, isHidden);
          document.getElementById(`cards-${idx}`).appendChild(el);
        }
      });
    }

    // DIFFICULTY & AI ENGINE: NIGHTMARE MODE ADVANTAGE
    // In Nightmare Mode, subtly bias the card distribution so bots receive slightly favored card deals (~55–60% equity edge)
    if (!this.isOnlineRoom && this.difficulty === 'nightmare' && !this.players[0].folded) {
      const activeBots = [1, 2, 3, 4].filter(i => !this.players[i].knockedOut && !this.players[i].folded);
      if (activeBots.length > 0 && Math.random() < 0.58) {
        const rivalIdx = activeBots[Math.floor(Math.random() * activeBots.length)];
        const suits = [SUITS[0], SUITS[1], SUITS[2], SUITS[3]];
        const premiumCombos = [
          [new Card(14, suits[0]), new Card(14, suits[1])], // AA
          [new Card(13, suits[0]), new Card(13, suits[1])], // KK
          [new Card(12, suits[0]), new Card(12, suits[1])], // QQ
          [new Card(14, suits[2]), new Card(13, suits[2])], // AKs
          [new Card(14, suits[3]), new Card(12, suits[3])]  // AQs
        ];
        this.players[rivalIdx].cards = premiumCombos[Math.floor(Math.random() * premiumCombos.length)];
        const rSeat = document.getElementById(`seat-${rivalIdx}`);
        if (rSeat) rSeat.classList.add('adrenaline-threat');
      }
    } else if (!this.isOnlineRoom && !this.players[0].folded) {
      // Standard drama mechanic on Easy/Medium/Hard
      const heroTier = evaluatePreflopTier(this.players[0].cards);
      if (heroTier <= 2) {
        const botIndices = [1, 2, 3, 4].filter(i => !this.players[i].knockedOut && !this.players[i].folded);
        if (botIndices.length > 0) {
          const rivalIdx = botIndices[Math.floor(Math.random() * botIndices.length)];
          if (Math.random() < 0.25) {
            this.players[rivalIdx].cards = [new Card(14, SUITS[1]), new Card(14, SUITS[2])]; // AA
          } else {
            this.players[rivalIdx].cards = [new Card(13, SUITS[0]), new Card(13, SUITS[3])]; // KK
          }
          const rSeat = document.getElementById(`seat-${rivalIdx}`);
          if (rSeat) rSeat.classList.add('adrenaline-threat');
        }
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
          this.logMessage(`⏳ 15s turn limit expired for ${p.name} - Auto-folded!`, 'turn');
          this.setAnnouncement(`⏳ Turn time expired for ${p.name} — Auto-folded!`);
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
    this.setAnnouncement('🔥 All-In Shove Called! Dealing out remaining board cards...');

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
      this.setAnnouncement(`🔥 YOU SHOVE ALL-IN WITH $${hero.currentBet}!`);
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
          this.setAnnouncement(`🔥 ${bot.name} SNAPS CALL with monster pocket pair!`);
        } else if ((tier === 2 && (preflopEquity >= potOdds || Math.random() < 0.70)) || (isNightmare && tier <= 2)) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `CALL ALL-IN!`);
          this.setAnnouncement(`🔥 ${bot.name} calls the all-in shove with strong pot odds!`);
        } else if (bot.style.includes('Maniac') && Math.random() < 0.45) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `GAMBLE CALL!`);
          this.setAnnouncement(`🔥 Duke gambles and calls the all-in!`);
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
          this.setAnnouncement(`⚡ ${bot.name} fires a pre-flop bluff raise to $${bot.currentBet}!`);
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
            this.setAnnouncement(`💀 ${bot.name} re-raises to $${bot.currentBet}!`);
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
          this.setAnnouncement(`⚡ ${bot.name} attacks the board with a high-pressure bluff raise to $${bot.currentBet}!`);
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
          this.setAnnouncement(`🎭 ${bot.name} fires a strategic bluff bet of $${bluffAmt}!`);
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
        sounds.playCard();
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

    this.setAnnouncement(`🏆 ${winner.name} wins $${pot}! (Opponents folded)`);
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
        announcements.push(`🏆 ${tiedWinners[0].player.name} wins ${potLabel} ($${pot.amount}) with ${tiedWinners[0].eval.desc}!`);
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
        announcements.push(`🤝 Chop! ${names} split ${potLabel} ($${pot.amount})!`);
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
      announcements.push(`💀 ${newlyEliminated.join(' & ')} lost all chips and was eliminated from the table!`);
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
        this.startNewGame(this.activeSlot || 1, this.difficulty || 'medium');
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
          this.setAnnouncement(`👋 ${g.name} replaced bot at Seat ${s} with $${inheritedChips} for next round!`);
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
        if (wagerType === 'max') {
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
    this.updateEconomyDashboard();
  }

  placeRouletteBet(type, val, targetEl) {
    if (this.rouletteSpinning) return;
    const chipAmt = this.selectedRouletteChip || 10;
    const wallet = EconomyManager.getMiniGameWallet();
    if (wallet.balance < chipAmt) {
      sounds.playCheck();
      const pill = document.getElementById('roulette-status-pill');
      if (pill) pill.textContent = '❌ Insufficient mini-game wallet funds!';
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

    // Center hub
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, 2 * Math.PI);
    ctx.fillStyle = '#78350f';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffd700';
    ctx.fill();

    ctx.restore();
  }

  spinRouletteWheel() {
    if (this.rouletteSpinning) return;
    const totalBet = Object.values(this.rouletteBets).reduce((sum, b) => sum + b.amount, 0);
    if (totalBet === 0) {
      sounds.playCheck();
      const pill = document.getElementById('roulette-status-pill');
      if (pill) pill.textContent = '⚠️ Place at least one bet before spinning!';
      return;
    }

    SaveManager.recordRouletteSpin();
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

  resolveRouletteSpin(winningNumber) {
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

    if (totalPayout > 0) {
      sounds.playWin();
      if (statusPill) statusPill.textContent = `🎉 WINNER! Paid out $${totalPayout.toLocaleString()}! (${winningDescriptions.join(', ')})`;
    } else {
      sounds.playFold();
      if (statusPill) statusPill.textContent = `No winning bets. Try your luck again!`;
    }

    this.updateRouletteUI();
  }

  // ==========================================================================
  // SOLAR FLARE 3-REEL SLOTS MINI-GAME
  // ==========================================================================
  initSlots() {
    this.slotsModal = document.getElementById('slots-modal');
    this.btnOpenSlots = document.getElementById('btn-open-slots');
    this.closeSlotsBtn = document.getElementById('close-slots-btn');
    this.btnSpinSlots = document.getElementById('btn-spin-slots');
    this.btnSlotsTransfer = document.getElementById('btn-slots-transfer');
    this.slotWager = 50;
    this.slotSpinning = false;

    if (this.btnOpenSlots) {
      this.btnOpenSlots.addEventListener('click', () => this.openSlotsModal());
    }
    if (this.closeSlotsBtn && this.slotsModal) {
      this.closeSlotsBtn.addEventListener('click', () => this.closeSlotsModal());
    }
    if (this.btnSpinSlots) {
      this.btnSpinSlots.addEventListener('click', () => this.spinSlotMachine());
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
        if (wagerVal === 'max') {
          this.slotWager = Math.max(10, wallet.balance);
        } else {
          this.slotWager = Number(wagerVal) || 50;
        }
        sounds.playChip();
        this.updateSlotsUI();
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
    this.updateEconomyDashboard();
  }

  spinSlotMachine() {
    if (this.slotSpinning) return;
    const wallet = EconomyManager.getMiniGameWallet();
    if (wallet.balance < this.slotWager) {
      sounds.playCheck();
      const winDisplay = document.getElementById('slots-win-display');
      if (winDisplay) winDisplay.textContent = '❌ Insufficient Mini-Game funds!';
      return;
    }

    this.slotSpinning = true;
    wallet.balance -= this.slotWager;
    EconomyManager.saveMiniGameWallet(wallet);
    this.updateSlotsUI();

    if (this.btnSpinSlots) this.btnSpinSlots.disabled = true;
    sounds.playSlotSpin();

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
      if (rand < 0.08) return '7️⃣';
      if (rand < 0.18) return '🔥';
      if (rand < 0.32) return '⭐';
      const suits = ['♠️', '♥️', '♦️', '♣️'];
      return suits[Math.floor(Math.random() * suits.length)];
    };

    const finalReels = [pickSymbol(), pickSymbol(), pickSymbol()];

    // Staggered reel stops
    SaveManager.recordSlotSpin();
    setTimeout(() => {
      if (reel1) {
        reel1.classList.remove('spinning');
        reel1.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(finalReels[0])}</div>`;
        sounds.playSlotStop();
      }
    }, 600);

    setTimeout(() => {
      if (reel2) {
        reel2.classList.remove('spinning');
        reel2.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(finalReels[1])}</div>`;
        sounds.playSlotStop();
      }
    }, 1050);

    setTimeout(() => {
      if (reel3) {
        reel3.classList.remove('spinning');
        reel3.innerHTML = `<div class="slot-symbol">${renderSlotSymbol(finalReels[2])}</div>`;
        sounds.playSlotStop();
      }
      this.resolveSlotSpin(finalReels);
    }, 1500);
  }

  resolveSlotSpin(reels) {
    this.slotSpinning = false;
    if (this.btnSpinSlots) this.btnSpinSlots.disabled = false;

    const [s1, s2, s3] = reels;
    let multiplier = 0;
    let title = '';

    // 1. Triple 777 (50x)
    if (s1 === '7️⃣' && s2 === '7️⃣' && s3 === '7️⃣') {
      multiplier = 50;
      title = 'JACKPOT 777! 50x WIN!';
    }
    // 2. Triple Wild Flare (30x)
    else if (s1 === '🔥' && s2 === '🔥' && s3 === '🔥') {
      multiplier = 30;
      title = 'SUPER WILD FLARE! 30x WIN!';
    }
    // 3. Triple Stars (20x)
    else if (s1 === '⭐' && s2 === '⭐' && s3 === '⭐') {
      multiplier = 20;
      title = '⭐ TRIPLE STARS! 20x WIN!';
    }
    // 4. Triple matching royal suits (10x)
    else if ((s1 === '♠️' || s1 === '♥️' || s1 === '♦️' || s1 === '♣️') && s1 === s2 && s2 === s3) {
      multiplier = 10;
      title = '♠️ ROYAL SUITS FLUSH! 10x WIN!';
    }
    // 5. Wild Boost: Pair + Wild (5x)
    else if (reels.filter(s => s === '🔥').length >= 1 && (
      (s1 === s2) || (s2 === s3) || (s1 === s3) || reels.filter(s => s === '🔥').length >= 2
    )) {
      multiplier = 5;
      title = 'WILD BOOST PAIR! 5x WIN!';
    }
    // 6. Any Matching Pair (2x)
    else if (s1 === s2 || s2 === s3 || s1 === s3) {
      multiplier = 2;
      title = 'MATCHING PAIR! 2x WIN!';
    }
    // 7. Lucky Symbol Push (1x)
    else if (reels.includes('7️⃣') || reels.includes('⭐')) {
      multiplier = 1;
      title = 'LUCKY PUSH! Wager Returned';
    } else {
      multiplier = 0;
      title = 'No Match. Try again!';
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

      if (banner && bannerTitle && bannerDetail) {
        banner.className = 'slots-result-banner win-glow';
        banner.classList.remove('hidden');
        bannerTitle.textContent = title;
        bannerDetail.textContent = `+ $${payout.toLocaleString()} Added to Mini-Game Wallet!`;
      }
      if (winDisplay) {
        winDisplay.textContent = `Won $${payout.toLocaleString()}! (${multiplier}x)`;
      }
    } else {
      sounds.playFold();
      if (banner && bannerTitle && bannerDetail) {
        banner.className = 'slots-result-banner';
        banner.classList.remove('hidden');
        bannerTitle.textContent = 'BET LOST';
        bannerDetail.textContent = `-$${this.slotWager.toLocaleString()} &bull; Spin again to win big!`;
      }
      if (winDisplay) {
        winDisplay.textContent = 'No win on this spin.';
      }
    }

    this.updateSlotsUI();
  }

  // ==========================================================================
  // BANKROLL TRANSFER TO POKER CAMPAIGN (Strict One-Way Separation)
  // ==========================================================================
  initTransfer() {
    this.transferModal = document.getElementById('transfer-modal');
    this.btnOpenTransfer = document.getElementById('btn-open-transfer');
    this.closeTransferBtn = document.getElementById('close-transfer-btn');
    this.btnCancelTransfer = document.getElementById('btn-cancel-transfer');
    this.btnConfirmTransfer = document.getElementById('btn-confirm-transfer');
    this.transferAmtInput = document.getElementById('transfer-amount-input');
    this.transferError = document.getElementById('transfer-error-msg');
    this.selectedTransferSlot = 1;

    if (this.btnOpenTransfer) {
      this.btnOpenTransfer.addEventListener('click', () => this.openTransferModal());
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

    // Preset buttons: +$100, +$250, +$500, All Winnings
    document.querySelectorAll('.t-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amtType = btn.dataset.amt;
        const wallet = EconomyManager.getMiniGameWallet();
        if (amtType === 'all') {
          if (this.transferAmtInput) this.transferAmtInput.value = wallet.balance;
        } else {
          if (this.transferAmtInput) this.transferAmtInput.value = Number(amtType) || 100;
        }
        sounds.playChip();
      });
    });
  }

  openTransferModal() {
    if (!this.transferModal) return;
    const wallet = EconomyManager.getMiniGameWallet();
    const balEl = document.getElementById('transfer-avail-balance');
    if (balEl) balEl.textContent = `$${wallet.balance.toLocaleString()}`;
    if (this.transferError) this.transferError.classList.add('hidden');
    if (this.transferAmtInput) this.transferAmtInput.value = Math.min(100, wallet.balance);

    this.renderTransferSlots();
    this.transferModal.classList.remove('hidden');
  }

  closeTransferModal() {
    if (this.transferModal) this.transferModal.classList.add('hidden');
  }

  renderTransferSlots() {
    const container = document.getElementById('transfer-slot-options');
    if (!container) return;
    container.innerHTML = '';
    const saves = SaveManager.getSaves();

    for (let slotId = 1; slotId <= 3; slotId++) {
      const slotData = saves[`slot_${slotId}`];
      const isSelected = (slotId === this.selectedTransferSlot);
      const card = document.createElement('div');
      card.className = `transfer-slot-card ${isSelected ? 'selected' : ''}`;
      card.dataset.slotId = slotId;

      const title = slotData ? `Slot ${slotId}: ${slotData.name || 'Hero'}` : `Slot ${slotId}: New Profile`;
      const chips = slotData ? `$${(slotData.chips || 0).toLocaleString()} chips` : `$1,000 baseline`;
      const stage = slotData ? `Stage ${slotData.stage || 1}` : `Fresh Start`;

      card.innerHTML = `
        <div class="t-slot-title">${title}</div>
        <div class="t-slot-chips">${chips}</div>
        <div class="t-slot-stage">${stage}</div>
      `;

      card.addEventListener('click', () => {
        this.selectedTransferSlot = slotId;
        document.querySelectorAll('.transfer-slot-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        sounds.playChip();
      });

      container.appendChild(card);
    }
  }

  executeTransfer() {
    const amt = Number(this.transferAmtInput ? this.transferAmtInput.value : 0);
    const wallet = EconomyManager.getMiniGameWallet();

    if (isNaN(amt) || amt <= 0 || amt > wallet.balance) {
      if (this.transferError) {
        this.transferError.textContent = '❌ Invalid transfer amount or exceeds available balance!';
        this.transferError.classList.remove('hidden');
      }
      sounds.playCheck();
      return;
    }

    const slotId = this.selectedTransferSlot || 1;
    const res = EconomyManager.transferMiniGameToPoker(slotId, amt);
    if (!res.success) {
      if (this.transferError) {
        this.transferError.textContent = `❌ ${res.message}`;
        this.transferError.classList.remove('hidden');
      }
      sounds.playCheck();
      return;
    }

    sounds.playWin();
    this.setAnnouncement(`💸 Injected $${amt.toLocaleString()} mini-game winnings into Poker Slot ${slotId}!`);

    // If currently playing in this save slot, update hero live chips
    if (!this.isOnlineRoom && this.activeSlot === slotId && this.players[0]) {
      this.players[0].chips += amt;
      this.updateTableUI();
    }

    this.renderMainMenuSlots();
    this.updateEconomyDashboard();
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
          this.setAnnouncement(`🎁 Claimed $500 Daily Mini-Game Allowance! New balance: $${res.balance.toLocaleString()}`);
        } else {
          sounds.playCheck();
          this.setAnnouncement(`⚠️ ${res.message}`);
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
          this.setAnnouncement(`⚠️ ${res.message}`);
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
}

// Launch application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.pokerGame = new PokerApp();
});
