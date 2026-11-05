/* ==========================================================================
   ROYAL TEXAS HOLD'EM - ADVANCED STRATEGIC POKER ENGINE
   Features:
   - Main Menu & 3-Slot LocalStorage Save System
   - Sklansky Pre-Flop Starting Hand Tiers
   - Board Texture & Draw Outs Detection (Flush & Straight semi-bluffs)
   - Adrenaline Confrontation Mechanics (Hero Tier 1/2 rivals)
   - Dynamic Blind Structure (Escalates every 5 hands)
   - True Multi-Pot & Side Pot Manager (all-in support)
   - Difficulty Tuning (Easy, Medium, Hard aggression scaling)
   - Unique AI Personas: Viper (Shark), Atlas (Solid), Luna (Nit), Duke (Maniac)
   ========================================================================== */

class SoundManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }
  playChip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
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
  }
  playCard() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
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
  }
  playCheck() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }
  playWin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.1);
      osc.stop(this.ctx.currentTime + idx * 0.1 + 0.25);
    });
  }
}

const sounds = new SoundManager();

// Automatically unlock Web Audio on first touch
window.addEventListener('touchstart', () => sounds.init(), { once: true, passive: true });
window.addEventListener('pointerdown', () => sounds.init(), { once: true, passive: true });

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
  reset() {
    this.cards = [];
    for (const suit of SUITS) {
      for (let r = 2; r <= 14; r++) {
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

const HAND_RANKS = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8
};

function getCombinations(arr, k) {
  if (k === 1) return arr.map(e => [e]);
  const combos = [];
  arr.forEach((item, idx) => {
    const smallerCombos = getCombinations(arr.slice(idx + 1), k - 1);
    smallerCombos.forEach(sc => combos.push([item, ...sc]));
  });
  return combos;
}

function evaluate5Cards(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit.name);
  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  let straightHigh = 0;
  const uniqueRanks = [...new Set(ranks)];
  if (uniqueRanks.length === 5) {
    if (ranks[0] - ranks[4] === 4) {
      isStraight = true;
      straightHigh = ranks[0];
    } else if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const freqPairs = Object.entries(counts).map(([r, c]) => ({ rank: Number(r), count: c }));
  freqPairs.sort((a, b) => b.count - a.count || b.rank - a.rank);

  const freqs = freqPairs.map(f => f.count);
  const orderedRanks = freqPairs.map(f => f.rank);

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

function evaluateBestHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    if (holeCards.length === 2) {
      if (holeCards[0].rank === holeCards[1].rank) {
        return { category: HAND_RANKS.ONE_PAIR, desc: `Pocket Pair of ${RANK_FULL[holeCards[0].rank]}s`, bestCards: holeCards, score: [holeCards[0].rank] };
      }
      const sorted = [...holeCards].sort((a, b) => b.rank - a.rank);
      return { category: HAND_RANKS.HIGH_CARD, desc: `High Card ${RANK_LABELS[sorted[0].rank]}`, bestCards: holeCards, score: [sorted[0].rank, sorted[1].rank] };
    }
    return { category: HAND_RANKS.HIGH_CARD, desc: 'Starting Hand', bestCards: holeCards, score: [0] };
  }

  const combos = getCombinations(allCards, 5);
  let best = null;
  for (const combo of combos) {
    const res = evaluate5Cards(combo);
    res.bestCards = combo;
    if (!best || compareScores(res, best) > 0) {
      best = res;
    }
  }
  return best;
}

// Sklansky Pre-Flop Starting Hand Tiers
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

  // Tier 3: Playable / Speculative (pocket pairs, suited connectors, suited Aces)
  if (isPair) return 3;
  if (isSuited && r1 === 14) return 3;
  if (isSuited && (r1 - r2 === 1) && r2 >= 5) return 3;
  if (isSuited && r1 >= 11 && r2 >= 9) return 3;
  if (!isSuited && r1 >= 13 && r2 >= 10) return 3;

  // Tier 4: Trash
  return 4;
}

function detectDraws(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) return { flushDraw: false, straightDraw: false };

  // Flush draw
  const suitCounts = {};
  allCards.forEach(c => suitCounts[c.suit.name] = (suitCounts[c.suit.name] || 0) + 1);
  const flushDraw = Object.values(suitCounts).some(cnt => cnt === 4);

  // Straight draw
  const uniqueRanks = [...new Set(allCards.map(c => c.rank))].sort((a, b) => a - b);
  if (uniqueRanks.includes(14)) uniqueRanks.unshift(1);

  let straightDraw = false;
  for (let i = 0; i <= uniqueRanks.length - 4; i++) {
    if (uniqueRanks[i + 3] - uniqueRanks[i] === 3) {
      straightDraw = true;
      break;
    }
  }

  return { flushDraw, straightDraw };
}

// ============================================================================
// SIDE POT MANAGER (Mirrors Python PotManager)
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

    // Excess chips contributed by folded or all-in players beyond highest active tier
    const excess = contributors.reduce((acc, p) => acc + Math.max(0, p.totalBet - prevLevel), 0);
    if (excess > 0 && pots.length > 0) {
      pots[pots.length - 1].amount += excess;
    }

    return pots;
  }
}

// ============================================================================
// SAVE STATE SYSTEM
// ============================================================================
class SaveManager {
  static STORAGE_KEY = 'royal_texas_holdem_saves';

  static getSaves() {
    try {
      const data = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Could not read saves from localStorage:', e);
    }
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
    } catch (e) {
      console.warn('Could not write save to localStorage:', e);
    }
  }

  static deleteSlot(slotId) {
    const saves = SaveManager.getSaves();
    saves[`slot_${slotId}`] = null;
    try {
      localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(saves));
    } catch (e) {
      console.warn('Could not delete save from localStorage:', e);
    }
  }
}

// Bot base profiles with ~40% increased aggression, +20% c-bet, -15% call tightness, +30% bluff
const BASE_BOT_PROFILES = {
  1: { // Viper (Shark - TAG)
    aggression: 2.10,
    cbetFreq: 0.96,
    bluffFreq: 0.286,
    semiBluff: 0.75,
    callTightness: 0.72
  },
  2: { // Atlas (Solid - TAG)
    aggression: 1.54,
    cbetFreq: 0.72,
    bluffFreq: 0.182,
    semiBluff: 0.55,
    callTightness: 0.85
  },
  3: { // Luna (Nit - Rock)
    aggression: 0.98,
    cbetFreq: 0.42,
    bluffFreq: 0.052,
    semiBluff: 0.25,
    callTightness: 1.15
  },
  4: { // Duke (Maniac)
    aggression: 2.52,
    cbetFreq: 1.0,
    bluffFreq: 0.494,
    semiBluff: 0.90,
    callTightness: 0.595
  }
};

const DIFFICULTY_MODS = {
  easy: {
    aggressionMult: 0.6,
    bluffMult: 0.3,
    cbetMult: 0.5,
    callTightnessMult: 1.3
  },
  medium: {
    aggressionMult: 1.0,
    bluffMult: 1.0,
    cbetMult: 1.0,
    callTightnessMult: 1.0
  },
  hard: {
    aggressionMult: 1.4,
    bluffMult: 1.5,
    cbetMult: 1.2,
    callTightnessMult: 0.7
  }
};

// ============================================================================
// MAIN GAME CONTROLLER
// ============================================================================
class PokerApp {
  constructor() {
    this.deck = new Deck();
    this.communityCards = [];
    this.handNumber = 1;
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.dealerIdx = 0;
    this.currentBet = 0;
    this.minRaise = 20;
    this.activeSlotId = null;
    this.difficulty = 'medium';
    this.winRecord = { won: 0, total: 0 };
    this.pendingSlotTarget = null;
    this.pendingDeleteSlot = null;

    this.players = [
      { id: 0, name: 'You', style: 'Hero', isBot: false, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false },
      { id: 1, name: 'Viper', style: 'Shark (TAG)', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false, wasPreflopRaiser: false, adrenalineBoost: false },
      { id: 2, name: 'Atlas', style: 'Solid (TAG)', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false, wasPreflopRaiser: false, adrenalineBoost: false },
      { id: 3, name: 'Luna', style: 'Nit (Rock)', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false, wasPreflopRaiser: false, adrenalineBoost: false },
      { id: 4, name: 'Duke', style: 'Maniac', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false, wasPreflopRaiser: false, adrenalineBoost: false }
    ];

    this.applyDifficulty();
    this.bindDOM();
    this.renderMainMenuSlots();
  }

  // Calculate dynamic blinds according to hand number
  getBlindsForHand(handNum) {
    if (handNum <= 5) return { sb: 10, bb: 20 };
    if (handNum <= 10) return { sb: 20, bb: 40 };
    if (handNum <= 15) return { sb: 40, bb: 80 };
    if (handNum <= 20) return { sb: 80, bb: 160 };
    return { sb: 160, bb: 320 };
  }

  applyDifficulty() {
    const mods = DIFFICULTY_MODS[this.difficulty] || DIFFICULTY_MODS.medium;
    this.players.forEach(p => {
      if (p.isBot) {
        const base = BASE_BOT_PROFILES[p.id];
        p.aggression = Math.round(base.aggression * mods.aggressionMult * 100) / 100;
        p.cbetFreq = Math.min(1.0, Math.round(base.cbetFreq * mods.cbetMult * 100) / 100);
        p.bluffFreq = Math.min(1.0, Math.round(base.bluffFreq * mods.bluffMult * 100) / 100);
        p.semiBluff = base.semiBluff;
        p.callTightness = Math.round(base.callTightness * mods.callTightnessMult * 100) / 100;
      }
    });

    const diffBadge = document.getElementById('difficulty-indicator');
    if (diffBadge) {
      diffBadge.textContent = this.difficulty.toUpperCase();
      diffBadge.className = `badge diff-${this.difficulty}`;
    }
  }

  bindDOM() {
    // Menu elements
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

    // Arena elements
    this.announcementEl = document.getElementById('dealer-announcement');
    this.potEl = document.getElementById('pot-amount');
    this.sidePotsContainer = document.getElementById('side-pots-container');
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

    // Navigation & Modals wiring
    this.btnBackMenu.addEventListener('click', () => {
      this.saveCurrentGame();
      this.showMenuView();
    });

    const openRules = () => this.rulesModal.classList.remove('hidden');
    this.rulesBtn.addEventListener('click', openRules);
    this.menuRulesBtn.addEventListener('click', openRules);
    this.closeRulesBtn.addEventListener('click', () => this.rulesModal.classList.add('hidden'));
    this.rulesModal.addEventListener('click', (e) => {
      if (e.target === this.rulesModal) this.rulesModal.classList.add('hidden');
    });

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
      const text = sounds.enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      const shortText = sounds.enabled ? '🔊 Sound' : '🔇 Muted';
      this.menuSoundBtn.innerHTML = `<span class="btn-icon">${sounds.enabled ? '🔊' : '🔇'}</span> Sound: ${sounds.enabled ? 'ON' : 'OFF'}`;
      this.soundToggleBtn.textContent = shortText;
    };
    this.menuSoundBtn.addEventListener('click', toggleAudio);
    this.soundToggleBtn.addEventListener('click', toggleAudio);

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
    this.closeDiffBtn.addEventListener('click', () => this.diffModal.classList.add('hidden'));

    // Delete Modal
    this.closeDeleteBtn.addEventListener('click', () => this.deleteModal.classList.add('hidden'));
    this.btnCancelDelete.addEventListener('click', () => this.deleteModal.classList.add('hidden'));
    this.btnConfirmDelete.addEventListener('click', () => {
      if (this.pendingDeleteSlot) {
        SaveManager.deleteSlot(this.pendingDeleteSlot);
        this.pendingDeleteSlot = null;
        this.deleteModal.classList.add('hidden');
        this.renderMainMenuSlots();
      }
    });

    // Betting Slider
    this.sliderEl.addEventListener('input', () => {
      const val = Number(this.sliderEl.value);
      this.sliderValEl.textContent = `$${val}`;
      if (this.currentBet === 0) {
        this.raiseText.textContent = `Bet $${val}`;
      } else {
        this.raiseText.textContent = `Raise to $${val}`;
      }
    });

    // Quick bets
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
    this.btnFold.addEventListener('click', () => this.handleHeroAction('fold'));
    this.btnCheckCall.addEventListener('click', () => this.handleHeroAction('check_call'));
    this.btnRaise.addEventListener('click', () => this.handleHeroAction('raise', Number(this.sliderEl.value)));
    this.btnAllin.addEventListener('click', () => this.handleHeroAction('raise', this.players[0].chips + this.players[0].currentBet));
    this.btnNextHand.addEventListener('click', () => {
      this.btnNextHand.classList.add('hidden');
      this.dealerIdx = (this.dealerIdx + 1) % this.players.length;
      this.startNewHand();
    });
  }

  showMenuView() {
    this.gameView.classList.add('hidden');
    this.mainMenuView.classList.remove('hidden');
    this.renderMainMenuSlots();
  }

  showGameView() {
    this.mainMenuView.classList.add('hidden');
    this.gameView.classList.remove('hidden');
  }

  // ==========================================================================
  // SAVE SLOTS RENDERING & INTERACTIONS
  // ==========================================================================
  renderMainMenuSlots() {
    const saves = SaveManager.getSaves();

    for (let slotId = 1; slotId <= 3; slotId++) {
      const cardEl = document.getElementById(`slot-card-${slotId}`);
      if (!cardEl) continue;
      cardEl.innerHTML = '';

      const slotData = saves[`slot_${slotId}`];

      if (!slotData) {
        // Empty slot
        cardEl.className = 'slot-card empty-slot';
        cardEl.innerHTML = `
          <div class="empty-slot-icon">➕</div>
          <div class="empty-slot-title">SLOT ${slotId}</div>
          <div class="empty-slot-subtitle">Empty &bull; Click to Start New Game</div>
        `;
        cardEl.onclick = () => {
          this.pendingSlotTarget = slotId;
          this.diffModal.classList.remove('hidden');
        };
      } else {
        // Occupied slot
        cardEl.className = 'slot-card';
        cardEl.onclick = null;

        const heroChips = (slotData.players && slotData.players[0]) ? slotData.players[0].chips : 1000;
        const handsWon = slotData.winRecord ? slotData.winRecord.won : 0;
        const totalHands = slotData.winRecord ? slotData.winRecord.total : 0;
        const winPercent = totalHands > 0 ? Math.round((handsWon / totalHands) * 100) : 0;
        const diffLabel = (slotData.difficulty || 'medium').toUpperCase();
        const diffClass = `diff-${slotData.difficulty || 'medium'}`;

        cardEl.innerHTML = `
          <div>
            <div class="slot-header">
              <span class="slot-name">SLOT ${slotId}</span>
              <span class="diff-badge ${diffClass}">${diffLabel}</span>
            </div>
            <div class="slot-body">
              <div class="slot-bankroll-wrap">
                <span class="slot-stat-label">Hero Bankroll</span>
                <span class="slot-bankroll-val">$${heroChips.toLocaleString()}</span>
              </div>
              <div class="slot-meta-row">
                <span>Round: Hand #${slotData.handNumber || 1}</span>
                <span>Blinds: $${slotData.smallBlind || 10} / $${slotData.bigBlind || 20}</span>
              </div>
              <div class="slot-meta-row">
                <span>Wins: ${handsWon} / ${totalHands}</span>
                <span>Win Rate: ${winPercent}%</span>
              </div>
            </div>
          </div>
          <div class="slot-actions-row">
            <button class="btn-slot-continue" id="btn-continue-${slotId}">
              <span>▶</span> Continue
            </button>
            <button class="btn-slot-delete" id="btn-delete-${slotId}">
              <span>🗑</span> Delete
            </button>
          </div>
        `;

        document.getElementById(`btn-continue-${slotId}`).addEventListener('click', (e) => {
          e.stopPropagation();
          this.loadGame(slotId);
        });

        document.getElementById(`btn-delete-${slotId}`).addEventListener('click', (e) => {
          e.stopPropagation();
          this.pendingDeleteSlot = slotId;
          document.getElementById('delete-slot-name').textContent = `Save Slot ${slotId}`;
          this.deleteModal.classList.remove('hidden');
        });
      }
    }
  }

  startNewGame(slotId, difficulty) {
    this.activeSlotId = slotId;
    this.difficulty = difficulty || 'medium';
    this.handNumber = 0;
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.winRecord = { won: 0, total: 0 };
    this.dealerIdx = 0;

    this.players.forEach(p => {
      p.chips = 1000;
      p.cards = [];
      p.currentBet = 0;
      p.totalBet = 0;
      p.folded = false;
      p.allIn = false;
    });

    this.applyDifficulty();
    this.saveCurrentGame();
    this.showGameView();
    this.startNewHand();
  }

  loadGame(slotId) {
    const save = SaveManager.getSave(slotId);
    if (!save) return;

    this.activeSlotId = slotId;
    this.difficulty = save.difficulty || 'medium';
    this.handNumber = Math.max(0, (save.handNumber || 1) - 1);
    this.smallBlind = save.smallBlind || 10;
    this.bigBlind = save.bigBlind || 20;
    this.winRecord = save.winRecord || { won: 0, total: 0 };
    this.dealerIdx = (save.dealerIdx !== undefined) ? save.dealerIdx : 0;

    if (save.players && Array.isArray(save.players)) {
      save.players.forEach(savedP => {
        const p = this.players.find(x => x.id === savedP.id);
        if (p) p.chips = savedP.chips;
      });
    }

    this.applyDifficulty();
    this.showGameView();
    this.startNewHand();
  }

  saveCurrentGame() {
    if (!this.activeSlotId) return;
    const data = {
      slotId: this.activeSlotId,
      difficulty: this.difficulty,
      handNumber: this.handNumber,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      winRecord: this.winRecord,
      dealerIdx: this.dealerIdx,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips
      }))
    };
    SaveManager.saveSlot(this.activeSlotId, data);
  }

  setAnnouncement(msg) { this.announcementEl.textContent = msg; }
  getTotalPot() { return this.players.reduce((sum, p) => sum + p.totalBet, 0); }

  updateSidePotsUI() {
    const pots = PotManager.calculateSidePots(this.players);
    this.sidePotsContainer.innerHTML = '';

    if (pots.length > 1) {
      pots.forEach((pot, idx) => {
        const pill = document.createElement('div');
        pill.className = 'side-pot-pill';
        const name = (idx === 0) ? 'Main Pot' : `Side Pot ${idx}`;
        pill.innerHTML = `<span class="side-pot-name">${name}:</span><span class="side-pot-val">$${pot.amount}</span>`;
        this.sidePotsContainer.appendChild(pill);
      });
    }
  }

  updateTableUI() {
    this.potEl.textContent = `$${this.getTotalPot()}`;
    this.handNumEl.textContent = this.handNumber;
    this.blindsIndicatorEl.textContent = `Blinds: $${this.smallBlind} / $${this.bigBlind}`;

    this.players.forEach((p, idx) => {
      document.getElementById(`chips-${idx}`).textContent = p.chips;
      const dealerBtn = document.getElementById(`dealer-btn-${idx}`);
      if (idx === this.dealerIdx) dealerBtn.classList.remove('hidden');
      else dealerBtn.classList.add('hidden');

      const betBadge = document.getElementById(`bet-badge-${idx}`);
      if (p.currentBet > 0) {
        betBadge.textContent = `$${p.currentBet}`;
        betBadge.classList.remove('hidden');
      } else {
        betBadge.classList.add('hidden');
      }

      const seatEl = document.getElementById(`seat-${idx}`);
      seatEl.style.opacity = p.folded ? '0.35' : '1';
    });

    const hero = this.players[0];
    if (!hero.folded && hero.cards.length === 2) {
      const best = evaluateBestHand(hero.cards, this.communityCards);
      this.heroHandBadge.textContent = best.desc;
      this.heroHandBadge.classList.remove('hidden');
    } else {
      this.heroHandBadge.classList.add('hidden');
    }

    this.updateSidePotsUI();
  }

  renderCardDOM(card, hidden = false) {
    const cardEl = document.createElement('div');
    if (hidden) {
      cardEl.className = 'card back';
      return cardEl;
    }
    cardEl.className = `card ${card.suit.color}`;
    cardEl.innerHTML = `
      <div class="card-top">
        <span>${card.label}</span>
        <span>${card.suit.symbol}</span>
      </div>
      <div class="card-center">${card.suit.symbol}</div>
      <div class="card-bottom">
        <span>${card.label}</span>
        <span>${card.suit.symbol}</span>
      </div>
    `;
    return cardEl;
  }

  showActionBubble(playerIdx, text) {
    const b = document.getElementById(`action-bubble-${playerIdx}`);
    b.textContent = text;
    b.classList.remove('hidden');
    setTimeout(() => b.classList.add('hidden'), 2200);
  }

  // ==========================================================================
  // ADRENALINE MECHANIC: Generate competitive rival hand
  // ==========================================================================
  swapAdrenalineHand(bot, targetTier, isBetter, heroCards) {
    // Return bot's current 2 cards to deck
    this.deck.cards.push(...bot.cards);
    bot.cards = [];

    const remaining = this.deck.cards;
    const candidatePairs = [];

    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        const pair = [remaining[i], remaining[j]];
        const tier = evaluatePreflopTier(pair);

        if (isBetter) {
          if (tier === 1) {
            if (heroCards.length === 2) {
              const heroHigh = Math.max(heroCards[0].rank, heroCards[1].rank);
              const pairHigh = Math.max(pair[0].rank, pair[1].rank);
              if (pairHigh >= heroHigh || pair[0].rank === pair[1].rank) {
                candidatePairs.push(pair);
              }
            } else {
              candidatePairs.push(pair);
            }
          }
        } else {
          if (tier === targetTier) {
            candidatePairs.push(pair);
          }
        }
      }
    }

    let chosenPair = null;
    if (candidatePairs.length > 0) {
      chosenPair = candidatePairs[Math.floor(Math.random() * candidatePairs.length)];
    } else {
      // Fallback
      for (let i = 0; i < remaining.length; i++) {
        for (let j = i + 1; j < remaining.length; j++) {
          const pair = [remaining[i], remaining[j]];
          if (evaluatePreflopTier(pair) <= (isBetter ? 1 : targetTier)) {
            candidatePairs.push(pair);
          }
        }
      }
      if (candidatePairs.length > 0) {
        chosenPair = candidatePairs[Math.floor(Math.random() * candidatePairs.length)];
      }
    }

    if (chosenPair) {
      const idx0 = this.deck.cards.indexOf(chosenPair[0]);
      if (idx0 !== -1) this.deck.cards.splice(idx0, 1);
      const idx1 = this.deck.cards.indexOf(chosenPair[1]);
      if (idx1 !== -1) this.deck.cards.splice(idx1, 1);
      bot.cards = chosenPair;
    } else {
      bot.cards = [this.deck.deal(), this.deck.deal()];
    }

    // Refresh bot card DOM elements
    const botContainer = document.getElementById(`cards-${bot.id}`);
    botContainer.innerHTML = '';
    bot.cards.forEach(() => botContainer.appendChild(this.renderCardDOM(null, true)));
  }

  startNewHand() {
    this.handNumber++;

    // 1. Dynamic Blind Structure Check
    const prevSB = this.smallBlind;
    const newBlinds = this.getBlindsForHand(this.handNumber);
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
      document.getElementById(`seat-${i}`).classList.remove('adrenaline-threat', 'current-turn');
    }
    ['flop-1', 'flop-2', 'flop-3', 'turn', 'river'].forEach(id => {
      document.getElementById(id).innerHTML = '';
    });

    this.players.forEach(p => {
      p.cards = [];
      p.currentBet = 0;
      p.totalBet = 0;
      p.folded = (p.chips <= 0);
      p.allIn = (p.chips === 0);
      if (p.isBot) {
        p.wasPreflopRaiser = false;
        p.adrenalineBoost = false;
      }
    });

    sounds.playCard();
    this.setAnnouncement('New hand dealt! Blinds posted. Action begins.');

    // Deal standard hole cards
    for (let c = 0; c < 2; c++) {
      this.players.forEach((p, idx) => {
        if (!p.folded) {
          const card = this.deck.deal();
          p.cards.push(card);
          const isHidden = (idx !== 0);
          const el = this.renderCardDOM(card, isHidden);
          document.getElementById(`cards-${idx}`).appendChild(el);
        }
      });
    }

    // 2. Adrenaline Mechanic Execution
    const hero = this.players[0];
    if (!hero.folded && hero.cards.length === 2) {
      const heroTier = evaluatePreflopTier(hero.cards);
      if (heroTier === 1 || heroTier === 2) {
        const eligibleBots = this.players.filter(p => p.isBot && !p.folded && p.chips > 0);
        if (eligibleBots.length > 0) {
          const chosenBot = eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
          const isSlightlyBetter = (Math.random() < 0.25);
          const targetTier = isSlightlyBetter ? Math.max(1, heroTier - 1) : heroTier;

          this.swapAdrenalineHand(chosenBot, targetTier, isSlightlyBetter, hero.cards);
          chosenBot.adrenalineBoost = true;

          const seatEl = document.getElementById(`seat-${chosenBot.id}`);
          if (seatEl) seatEl.classList.add('adrenaline-threat');
          this.setAnnouncement(`⚡ High Stakes confrontation! ${chosenBot.name} looks primed for action.`);
        }
      }
    }

    const sbIdx = (this.dealerIdx + 1) % this.players.length;
    const bbIdx = (this.dealerIdx + 2) % this.players.length;

    this.postBet(this.players[sbIdx], Math.min(this.smallBlind, this.players[sbIdx].chips));
    this.postBet(this.players[bbIdx], Math.min(this.bigBlind, this.players[bbIdx].chips));
    this.currentBet = this.bigBlind;
    this.minRaise = this.bigBlind;

    this.updateTableUI();

    const utgIdx = (bbIdx + 1) % this.players.length;
    this.startBettingRound('pre-flop', utgIdx);
  }

  triggerBlindsIncreasedAlert() {
    this.blindsBannerText.textContent = `BLINDS INCREASED! Now $${this.smallBlind} / $${this.bigBlind}`;
    this.blindsBanner.classList.remove('hidden');
    sounds.playWin();
    setTimeout(() => {
      this.blindsBanner.classList.add('hidden');
    }, 3500);
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

    const active = this.players.filter(p => !p.folded);
    if (active.length === 1) {
      this.resolveEarlyWin(active[0]);
      return;
    }

    const acting = this.players.filter(p => !p.folded && !p.allIn);
    const allMatched = acting.every(p => p.currentBet === this.currentBet);
    const allActed = acting.every(p => this.hasActed.has(p.id));

    if ((allMatched && allActed) || acting.length <= 1) {
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
      const thinkTime = 700 + Math.random() * 800;
      setTimeout(() => this.runBotStrategicTurn(p), thinkTime);
    } else {
      this.promptHeroTurn(p);
    }
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
  }

  handleHeroAction(action, amt = 0) {
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
    }

    this.hasActed.add(hero.id);
    this.actingIdx = (this.actingIdx + 1) % this.players.length;
    setTimeout(() => this.nextTurn(), 500);
  }

  // ==========================================================================
  // AGGRESSIVE BOT AI DECISION TREE
  // ==========================================================================
  runBotStrategicTurn(bot) {
    const toCall = this.currentBet - bot.currentBet;
    const isPreflop = (this.communityCards.length === 0);
    const pot = this.getTotalPot();

    // Aggression multiplier boosted for Adrenaline rival
    const effectiveAggression = bot.aggression * (bot.adrenalineBoost ? 1.5 : 1.0);

    if (isPreflop) {
      const tier = evaluatePreflopTier(bot.cards);

      if (toCall === 0) {
        // Uncontested pre-flop
        if (tier === 1 || (tier === 2 && Math.random() < 0.75 * effectiveAggression)) {
          const raiseAmt = Math.min(bot.chips, this.minRaise * 3);
          this.postBet(bot, raiseAmt);
          this.minRaise = raiseAmt - this.currentBet;
          this.currentBet = bot.currentBet;
          bot.wasPreflopRaiser = true;
          this.hasActed.clear();
          this.showActionBubble(bot.id, `Raise to $${bot.currentBet}`);
          this.setAnnouncement(`${bot.name} fires a raise to $${bot.currentBet}!`);
        } else {
          sounds.playCheck();
          this.showActionBubble(bot.id, 'Check');
          this.setAnnouncement(`${bot.name} checks.`);
        }
      } else {
        // Facing a bet pre-flop
        if (tier === 1) {
          // Monster: heavy 3-bet or call
          if (Math.random() < 0.85 * effectiveAggression && bot.chips > toCall) {
            const raiseTarget = Math.min(bot.chips + bot.currentBet, this.currentBet + Math.max(this.minRaise * 2, Math.floor(pot * 0.75)));
            const needed = raiseTarget - bot.currentBet;
            this.postBet(bot, needed);
            this.minRaise = bot.currentBet - this.currentBet;
            this.currentBet = bot.currentBet;
            bot.wasPreflopRaiser = true;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `3-Bet $${bot.currentBet}`);
            this.setAnnouncement(`${bot.name} launches a powerful 3-bet to $${bot.currentBet}!`);
          } else {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls $${called}.`);
          }
        } else if (tier === 2) {
          // Strong: call or re-raise
          if (Math.random() < 0.45 * effectiveAggression && bot.chips > toCall * 2) {
            const raiseTarget = Math.min(bot.chips + bot.currentBet, this.currentBet + this.minRaise * 2);
            const needed = raiseTarget - bot.currentBet;
            this.postBet(bot, needed);
            this.minRaise = bot.currentBet - this.currentBet;
            this.currentBet = bot.currentBet;
            bot.wasPreflopRaiser = true;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Raise $${bot.currentBet}`);
            this.setAnnouncement(`${bot.name} raises with strong cards to $${bot.currentBet}!`);
          } else if (toCall <= this.bigBlind * 6 || Math.random() < 0.88) {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls with strong holdings.`);
          } else {
            bot.folded = true;
            this.showActionBubble(bot.id, 'Fold');
            this.setAnnouncement(`${bot.name} folds.`);
          }
        } else if (tier === 3) {
          // Speculative: calls much more freely post-tuning
          if (toCall <= this.bigBlind * 3.5 || (bot.chips > toCall * 3 && Math.random() < 0.65)) {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls to see the flop.`);
          } else {
            bot.folded = true;
            this.showActionBubble(bot.id, 'Fold');
            this.setAnnouncement(`${bot.name} folds.`);
          }
        } else {
          // Trash: fold unless cheap or bluff opportunity
          if (toCall <= this.bigBlind && Math.random() < 0.35) {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} defends his blind.`);
          } else {
            bot.folded = true;
            this.showActionBubble(bot.id, 'Fold');
            this.setAnnouncement(`${bot.name} folds.`);
          }
        }
      }
    } else {
      // Post-Flop Decision Tree
      const best = evaluateBestHand(bot.cards, this.communityCards);
      let strength = best.category / 8.0;

      // Draw outs
      const { flushDraw, straightDraw } = detectDraws(bot.cards, this.communityCards);
      if (flushDraw) strength += 0.25;
      if (straightDraw) strength += 0.18;

      const potOdds = toCall / (pot + toCall);
      const isDrawing = (flushDraw || straightDraw);
      const canSemiBluff = isDrawing && (Math.random() < bot.semiBluff);

      if (toCall === 0) {
        // Nobody bet yet:
        if (bot.wasPreflopRaiser && this.communityCards.length === 3 && Math.random() < bot.cbetFreq) {
          // C-Bet
          const cbet = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.55 * effectiveAggression)));
          if (cbet > 0) {
            this.postBet(bot, cbet);
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `C-Bet $${cbet}`);
            this.setAnnouncement(`${bot.name} fires an aggressive C-Bet of $${cbet}!`);
          } else {
            sounds.playCheck();
            this.showActionBubble(bot.id, 'Check');
            this.setAnnouncement(`${bot.name} checks.`);
          }
        } else if (strength >= 0.38) {
          // Value / Pressure Bet (marginal hands bet more often now)
          const betSize = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.65 * effectiveAggression)));
          if (betSize > 0) {
            this.postBet(bot, betSize);
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Bet $${betSize}`);
            this.setAnnouncement(`${bot.name} bets $${betSize} with ${best.desc}.`);
          } else {
            sounds.playCheck();
            this.showActionBubble(bot.id, 'Check');
            this.setAnnouncement(`${bot.name} checks.`);
          }
        } else if (canSemiBluff) {
          // Semi-bluff with draw
          const bluffSize = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.55 * effectiveAggression)));
          if (bluffSize > 0) {
            this.postBet(bot, bluffSize);
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Semi-Bluff $${bluffSize}`);
            this.setAnnouncement(`${bot.name} semi-bluffs $${bluffSize} on a drawing board!`);
          } else {
            sounds.playCheck();
            this.showActionBubble(bot.id, 'Check');
            this.setAnnouncement(`${bot.name} checks.`);
          }
        } else if (Math.random() < bot.bluffFreq * 1.2 && this.communityCards.length >= 4) {
          // River / Turn Bluff probe
          const probeSize = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.7 * effectiveAggression)));
          if (probeSize > 0) {
            this.postBet(bot, probeSize);
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Bluff $${probeSize}`);
            this.setAnnouncement(`${bot.name} fires a bold bluff bet of $${probeSize}!`);
          } else {
            sounds.playCheck();
            this.showActionBubble(bot.id, 'Check');
            this.setAnnouncement(`${bot.name} checks.`);
          }
        } else {
          sounds.playCheck();
          this.showActionBubble(bot.id, 'Check');
          this.setAnnouncement(`${bot.name} checks.`);
        }
      } else {
        // Facing a bet: Fold LESS often, call & raise more with marginal hands
        if (strength >= 0.72) {
          // Monster: raise or call
          if (Math.random() < 0.70 * effectiveAggression && bot.chips > toCall) {
            const raiseTarget = Math.min(bot.chips + bot.currentBet, this.currentBet + Math.max(this.minRaise, Math.floor(pot * 0.7)));
            const needed = raiseTarget - bot.currentBet;
            this.postBet(bot, needed);
            this.minRaise = bot.currentBet - this.currentBet;
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Raise to $${bot.currentBet}`);
            this.setAnnouncement(`${bot.name} counters with a raise to $${bot.currentBet}!`);
          } else {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls $${called}.`);
          }
        } else if (strength >= 0.30 || (canSemiBluff && Math.random() < 0.65)) {
          // Marginal hand / Pair / Draw: call or raise
          if (Math.random() < 0.28 * effectiveAggression && bot.chips > toCall * 2) {
            const raiseTarget = Math.min(bot.chips + bot.currentBet, this.currentBet + this.minRaise);
            const needed = raiseTarget - bot.currentBet;
            this.postBet(bot, needed);
            this.minRaise = bot.currentBet - this.currentBet;
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Raise to $${bot.currentBet}`);
            this.setAnnouncement(`${bot.name} applies pressure and raises to $${bot.currentBet}!`);
          } else {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls with a competitive hand.`);
          }
        } else if (strength >= (potOdds * bot.callTightness * 0.85) || toCall <= this.bigBlind * 2.5 || Math.random() < bot.bluffFreq) {
          // Stubborn calls & float bets
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `Call $${called}`);
          this.setAnnouncement(`${bot.name} calls $${called}.`);
        } else {
          bot.folded = true;
          this.showActionBubble(bot.id, 'Fold');
          this.setAnnouncement(`${bot.name} folds.`);
        }
      }
    }

    this.hasActed.add(bot.id);
    this.actingIdx = (this.actingIdx + 1) % this.players.length;
    setTimeout(() => this.nextTurn(), 600);
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
      this.setAnnouncement('Flop dealt! First active player after the button acts.');
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

    if (winner.id === 0) {
      this.winRecord.won++;
    }
    this.winRecord.total++;

    this.setAnnouncement(`🏆 ${winner.name} wins $${pot}! (All opponents folded)`);
    this.updateTableUI();
    this.finishHand();
  }

  // ==========================================================================
  // SIDE POT FIX & SHOWDOWN RESOLUTION
  // ==========================================================================
  resolveShowdown() {
    this.stageBadgeEl.textContent = 'SHOWDOWN';
    sounds.playWin();

    // Reveal hole cards for all surviving bots
    this.players.forEach((p, idx) => {
      if (!p.folded && p.isBot) {
        const container = document.getElementById(`cards-${idx}`);
        container.innerHTML = '';
        p.cards.forEach(c => container.appendChild(this.renderCardDOM(c)));
      }
    });

    const pots = PotManager.calculateSidePots(this.players);
    let heroWonAny = false;
    const announcements = [];

    pots.forEach((pot, pIdx) => {
      const potLabel = pots.length === 1 ? 'Main Pot' : (pIdx === 0 ? 'Main Pot' : `Side Pot ${pIdx}`);
      const eligible = pot.eligiblePlayers.filter(p => !p.folded);

      if (eligible.length === 0) return;

      if (eligible.length === 1) {
        const winner = eligible[0];
        winner.chips += pot.amount;
        if (winner.id === 0) heroWonAny = true;
        announcements.push(`${winner.name} takes ${potLabel} ($${pot.amount}) uncontested.`);
        return;
      }

      const evaluated = eligible.map(p => ({
        player: p,
        eval: evaluateBestHand(p.cards, this.communityCards)
      }));

      evaluated.sort((a, b) => compareScores(b.eval, a.eval));
      const bestScore = evaluated[0].eval;
      const tiedWinners = evaluated.filter(item => compareScores(item.eval, bestScore) === 0);

      const share = Math.floor(pot.amount / tiedWinners.length);
      const remainder = pot.amount % tiedWinners.length;

      tiedWinners.forEach((w, wIdx) => {
        w.player.chips += share + (wIdx < remainder ? 1 : 0);
        if (w.player.id === 0) heroWonAny = true;

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
      } else {
        const names = tiedWinners.map(w => w.player.name).join(' & ');
        announcements.push(`🤝 Chop! ${names} split ${potLabel} ($${pot.amount}) with ${bestScore.desc}!`);
      }
    });

    if (heroWonAny) {
      this.winRecord.won++;
    }
    this.winRecord.total++;

    this.setAnnouncement(announcements.join(' '));
    this.updateTableUI();
    this.finishHand();
  }

  finishHand() {
    this.actionPanelEl.classList.remove('disabled');
    this.btnFold.disabled = true;
    this.btnCheckCall.disabled = true;
    this.btnRaise.disabled = true;
    this.btnAllin.disabled = true;
    this.sliderEl.disabled = true;

    // Auto-save current game state
    this.saveCurrentGame();

    const hero = this.players[0];
    if (hero.chips === 0) {
      this.setAnnouncement('💀 You ran out of chips! Rebuy $1,000 to keep playing.');
      this.btnNextHand.textContent = 'Rebuy $1,000 & Play';
      this.btnNextHand.onclick = () => {
        hero.chips = 1000;
        this.btnNextHand.textContent = 'Deal Next Hand';
        this.btnNextHand.onclick = null;
        this.btnNextHand.classList.add('hidden');
        this.dealerIdx = (this.dealerIdx + 1) % this.players.length;
        this.saveCurrentGame();
        this.startNewHand();
      };
      this.btnNextHand.classList.remove('hidden');
      return;
    }

    const surviving = this.players.filter(p => p.chips > 0);
    if (surviving.length === 1 && surviving[0].id === 0) {
      this.setAnnouncement('🎉 YOU WON THE ENTIRE TOURNAMENT! Congratulations Champion! 🎉');
      return;
    }

    this.btnNextHand.classList.remove('hidden');
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.pokerGame = new PokerApp();
});
