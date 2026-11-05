/* ==========================================================================
   ROYAL TEXAS HOLD'EM - ADVANCED STRATEGIC POKER ENGINE
   Features:
   - Sklansky Pre-Flop Starting Hand Tiers & Combinatorics
   - Single Main Pot with Clean Side Pot on All-In
   - Realistic All-In Shoves & Auto Dramatic Runout
   - Busted Zero Money System & Main Menu Reset
   - Online Multiplayer Room (Password: "helloworld") via WebRTC/PeerJS
   - Global Game Stats Counter & 3 Persistent Save Slots
   ========================================================================== */

// ============================================================================
// AUDIO SYNTHESIZER (Web Audio API - No External Files)
// ============================================================================
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
window.addEventListener('touchstart', () => sounds.init(), { once: true, passive: true });
window.addEventListener('pointerdown', () => sounds.init(), { once: true, passive: true });

// ============================================================================
// CARDS & DECK
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

// ============================================================================
// 7-CARD COMBINATORIAL HAND EVALUATOR
// ============================================================================
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
        return { category: HAND_RANKS.ONE_PAIR, desc: `Pocket Pair of ${RANK_FULL[holeCards[0].rank]}s`, bestCards: holeCards };
      }
      const high = Math.max(holeCards[0].rank, holeCards[1].rank);
      return { category: HAND_RANKS.HIGH_CARD, desc: `High Card ${RANK_LABELS[high]}`, bestCards: holeCards };
    }
    return { category: HAND_RANKS.HIGH_CARD, desc: 'Starting Hand', bestCards: holeCards };
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
// POT MANAGER: Single Main Pot + Clean Side Pot
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

    const excess = contributors.reduce((acc, p) => acc + Math.max(0, p.totalBet - prevLevel), 0);
    if (excess > 0 && pots.length > 0) {
      pots[pots.length - 1].amount += excess;
    }

    return pots;
  }
}

// ============================================================================
// STATS & SAVE MANAGER
// ============================================================================
class SaveManager {
  static STORAGE_KEY = 'royal_texas_holdem_saves';
  static GLOBAL_KEY = 'royal_poker_global_stats';

  static getGlobalStats() {
    try {
      const data = localStorage.getItem(SaveManager.GLOBAL_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return { totalHands: 0, handsWon: 0, biggestPot: 0 };
  }

  static recordHandStats(won, pot) {
    const stats = SaveManager.getGlobalStats();
    stats.totalHands++;
    if (won) stats.handsWon++;
    if (pot > stats.biggestPot) stats.biggestPot = pot;
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
// BOT PROFILES & DIFFICULTY
// ============================================================================
const BASE_BOT_PROFILES = {
  1: { name: 'Viper', style: 'Shark (TAG)', avatar: '🐍', aggression: 2.10, cbetFreq: 0.96, bluffFreq: 0.30, callTightness: 0.70 },
  2: { name: 'Atlas', style: 'Solid (TAG)', avatar: '🛡️', aggression: 1.54, cbetFreq: 0.75, bluffFreq: 0.20, callTightness: 0.85 },
  3: { name: 'Luna', style: 'Nit (Rock)', avatar: '🌙', aggression: 1.00, cbetFreq: 0.50, bluffFreq: 0.08, callTightness: 1.15 },
  4: { name: 'Duke', style: 'Maniac', avatar: '🦁', aggression: 2.60, cbetFreq: 1.00, bluffFreq: 0.50, callTightness: 0.55 }
};

// ============================================================================
// MAIN POKER CONTROLLER
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
    this.activeSlotId = 1;
    this.difficulty = 'medium';
    this.isOnlineRoom = false;
    this.isHost = true;
    this.peer = null;
    this.connections = [];
    this.myPeerId = null;
    this.waitingForNextHand = false;
    this.allInAutoRunout = false;

    this.players = [
      { id: 0, name: 'You', style: 'Hero', isBot: false, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false },
      { id: 1, name: 'Viper', style: 'Shark (TAG)', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false, ...BASE_BOT_PROFILES[1] },
      { id: 2, name: 'Atlas', style: 'Solid (TAG)', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false, ...BASE_BOT_PROFILES[2] },
      { id: 3, name: 'Luna', style: 'Nit (Rock)', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false, ...BASE_BOT_PROFILES[3] },
      { id: 4, name: 'Duke', style: 'Maniac', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false, ...BASE_BOT_PROFILES[4] }
    ];

    this.bindDOM();
    this.updateGlobalStatsUI();
    this.renderMainMenuSlots();

    // Check if URL has ?room=helloworld
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('room') === 'helloworld') {
      this.promptOnlineRoomPassword();
    }
  }

  getBlindsForHand(h) {
    if (h <= 5) return { sb: 10, bb: 20 };
    if (h <= 10) return { sb: 20, bb: 40 };
    if (h <= 15) return { sb: 40, bb: 80 };
    if (h <= 20) return { sb: 80, bb: 160 };
    return { sb: 160, bb: 320 };
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
    this.btnCopyInvite = document.getElementById('btn-copy-invite');
    this.waitingRoundOverlay = document.getElementById('waiting-round-overlay');

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

    // Navigation & Modals
    this.btnBackMenu.addEventListener('click', () => {
      this.saveCurrentGame();
      this.showMenuView();
    });

    const openRules = () => this.rulesModal.classList.remove('hidden');
    this.rulesBtn.addEventListener('click', openRules);
    this.menuRulesBtn.addEventListener('click', openRules);
    this.closeRulesBtn.addEventListener('click', () => this.rulesModal.classList.add('hidden'));

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
    this.menuSoundBtn.addEventListener('click', toggleAudio);
    this.soundToggleBtn.addEventListener('click', toggleAudio);

    // Online Room Auth
    this.btnOpenOnlineRoom.addEventListener('click', () => this.promptOnlineRoomPassword());
    this.closeAuthBtn.addEventListener('click', () => this.authModal.classList.add('hidden'));
    this.btnCancelAuth.addEventListener('click', () => this.authModal.classList.add('hidden'));
    this.btnSubmitAuth.addEventListener('click', () => this.handleOnlineAuthSubmit());
    this.roomPassInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleOnlineAuthSubmit();
    });

    // Copy Invite Link
    this.btnCopyInvite.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}?room=helloworld`;
      navigator.clipboard.writeText(url).then(() => {
        this.btnCopyInvite.textContent = '✅ Copied!';
        setTimeout(() => this.btnCopyInvite.textContent = '📋 Share', 2000);
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

    // Slider
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
    
    // CRITICAL ALL-IN FIX: Player pushes ENTIRE stack
    this.btnAllin.addEventListener('click', () => {
      const hero = this.players[0];
      const allInAmount = hero.chips + hero.currentBet;
      this.handleHeroAction('allin', allInAmount);
    });

    this.btnNextHand.addEventListener('click', () => {
      this.btnNextHand.classList.add('hidden');
      this.dealerIdx = (this.dealerIdx + 1) % this.players.length;
      this.startNewHand();
    });
  }

  updateGlobalStatsUI() {
    const stats = SaveManager.getGlobalStats();
    document.getElementById('stat-total-hands').textContent = stats.totalHands.toLocaleString();
    document.getElementById('stat-hands-won').textContent = stats.handsWon.toLocaleString();
    document.getElementById('stat-biggest-pot').textContent = `$${stats.biggestPot.toLocaleString()}`;
  }

  showMenuView() {
    this.gameView.classList.add('hidden');
    this.mainMenuView.classList.remove('hidden');
    this.updateGlobalStatsUI();
    this.renderMainMenuSlots();
  }

  showGameView() {
    this.mainMenuView.classList.add('hidden');
    this.gameView.classList.remove('hidden');
  }

  // ==========================================================================
  // ONLINE PRIVATE ROOM (Password: "helloworld")
  // ==========================================================================
  promptOnlineRoomPassword() {
    this.roomPassInput.value = '';
    this.authErrorMsg.classList.add('hidden');
    this.authModal.classList.remove('hidden');
    setTimeout(() => this.roomPassInput.focus(), 150);
  }

  handleOnlineAuthSubmit() {
    const entered = this.roomPassInput.value.trim().toLowerCase();
    if (entered !== 'helloworld') {
      this.authErrorMsg.classList.remove('hidden');
      return;
    }

    const playerName = this.roomNameInput.value.trim() || 'Player';
    this.authModal.classList.add('hidden');
    this.startOnlineRoom(playerName);
  }

  startOnlineRoom(playerName) {
    this.isOnlineRoom = true;
    this.players[0].name = playerName;
    document.getElementById('hero-name').textContent = playerName;
    this.onlineRoomBadge.classList.remove('hidden');

    this.handNumber = 0;
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.dealerIdx = 0;

    // Initialize $1000 for all players
    this.players.forEach(p => {
      p.chips = 1000;
      p.cards = [];
      p.currentBet = 0;
      p.totalBet = 0;
      p.folded = false;
      p.allIn = false;
    });

    this.initP2PNetwork();
    this.showGameView();
    this.startNewHand();
  }

  initP2PNetwork() {
    if (typeof Peer === 'undefined') return;

    try {
      this.peer = new Peer();
      this.peer.on('open', (id) => {
        this.myPeerId = id;
      });

      this.peer.on('connection', (conn) => {
        this.connections.push(conn);
        conn.on('data', (data) => {
          this.handlePeerMessage(data, conn);
        });
      });
    } catch (e) {
      console.warn('P2P fallback to local simulation');
    }
  }

  handlePeerMessage(data, conn) {
    if (data.type === 'join') {
      // Find an empty bot seat to replace
      const botIndex = this.players.findIndex(p => p.isBot);
      if (botIndex !== -1) {
        this.players[botIndex].name = data.name;
        this.players[botIndex].isBot = false;
        this.players[botIndex].style = 'Friend (Online)';
        document.getElementById(`name-${botIndex}`).textContent = data.name;
        document.getElementById(`style-${botIndex}`).textContent = 'Friend (Online)';
        document.getElementById(`avatar-${botIndex}`).textContent = '👤';
        this.setAnnouncement(`👋 ${data.name} joined the private room!`);
      }
    }
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
        cardEl.className = 'slot-card';
        cardEl.onclick = null;

        const heroChips = (slotData.players && slotData.players[0]) ? slotData.players[0].chips : 1000;
        const handsWon = slotData.winRecord ? slotData.winRecord.won : 0;
        const totalHands = slotData.winRecord ? slotData.winRecord.total : 0;
        const winPercent = totalHands > 0 ? Math.round((handsWon / totalHands) * 100) : 0;
        const diffLabel = (slotData.difficulty || 'medium').toUpperCase();
        const diffClass = `diff-${slotData.difficulty || 'medium'}`;
        const isBusted = (heroChips <= 0);

        cardEl.innerHTML = `
          <div>
            <div class="slot-header">
              <span class="slot-name">SLOT ${slotId}</span>
              <span class="diff-badge ${diffClass}">${diffLabel}</span>
            </div>
            <div class="slot-body">
              <div class="slot-bankroll-wrap">
                <span class="slot-stat-label">Hero Bankroll</span>
                <span class="slot-bankroll-val" style="${isBusted ? 'color: #ff4d4d;' : ''}">
                  ${isBusted ? '$0 (BUSTED)' : `$${heroChips.toLocaleString()}`}
                </span>
              </div>
              <div class="slot-meta-row">
                <span>Hand #${slotData.handNumber || 1}</span>
                <span>Blinds: $${slotData.smallBlind || 10} / $${slotData.bigBlind || 20}</span>
              </div>
              <div class="slot-meta-row">
                <span>Wins: ${handsWon} / ${totalHands} (${winPercent}%)</span>
              </div>
            </div>
          </div>
          <div class="slot-actions-row">
            ${isBusted ? `
              <button class="btn-slot-reset" id="btn-reset-${slotId}">
                🔄 Reset & Rebuy $1,000
              </button>
            ` : `
              <button class="btn-slot-continue" id="btn-continue-${slotId}">
                <span>▶</span> Continue
              </button>
            `}
            <button class="btn-slot-delete" id="btn-delete-${slotId}">
              <span>🗑</span> Delete
            </button>
          </div>
        `;

        if (isBusted) {
          document.getElementById(`btn-reset-${slotId}`).addEventListener('click', (e) => {
            e.stopPropagation();
            this.startNewGame(slotId, slotData.difficulty || 'medium');
          });
        } else {
          document.getElementById(`btn-continue-${slotId}`).addEventListener('click', (e) => {
            e.stopPropagation();
            this.loadGame(slotId);
          });
        }

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
    this.isOnlineRoom = false;
    this.onlineRoomBadge.classList.add('hidden');
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

    this.saveCurrentGame();
    this.showGameView();
    this.startNewHand();
  }

  loadGame(slotId) {
    const save = SaveManager.getSave(slotId);
    if (!save) return;

    this.isOnlineRoom = false;
    this.onlineRoomBadge.classList.add('hidden');
    this.activeSlotId = slotId;
    this.difficulty = save.difficulty || 'medium';
    this.handNumber = Math.max(0, (save.handNumber || 1) - 1);
    this.smallBlind = save.smallBlind || 10;
    this.bigBlind = save.bigBlind || 20;
    this.winRecord = save.winRecord || { won: 0, total: 0 };
    this.dealerIdx = save.dealerIdx || 0;

    if (save.players && Array.isArray(save.players)) {
      save.players.forEach(savedP => {
        const p = this.players.find(x => x.id === savedP.id);
        if (p) p.chips = savedP.chips;
      });
    }

    this.showGameView();
    this.startNewHand();
  }

  saveCurrentGame() {
    if (this.isOnlineRoom) return;
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

  // CLEAN SINGLE POT DISPLAY WITH OPTIONAL SIDE POT PILL
  updateTableUI() {
    const totalPot = this.getTotalPot();
    this.potEl.textContent = `$${totalPot.toLocaleString()}`;
    this.handNumEl.textContent = this.handNumber;
    this.blindsIndicatorEl.textContent = `Blinds: $${this.smallBlind} / $${this.bigBlind}`;

    // Clean Side Pot: only show if someone is all-in with unequal bets
    const pots = PotManager.calculateSidePots(this.players);
    if (pots.length > 1 && pots[1].amount > 0) {
      this.sidePotText.textContent = `Main Pot: $${pots[0].amount.toLocaleString()} | Side Pot: $${pots[1].amount.toLocaleString()}`;
      this.sidePotWrapper.classList.remove('hidden');
    } else {
      this.sidePotWrapper.classList.add('hidden');
    }

    this.players.forEach((p, idx) => {
      document.getElementById(`chips-${idx}`).textContent = p.chips.toLocaleString();
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
      seatEl.style.opacity = p.folded ? '0.35' : (p.chips === 0 && !p.allIn ? '0.2' : '1');
    });

    const hero = this.players[0];
    if (!hero.folded && hero.cards.length === 2) {
      const best = evaluateBestHand(hero.cards, this.communityCards);
      this.heroHandBadge.textContent = best.desc;
      this.heroHandBadge.classList.remove('hidden');
    } else {
      this.heroHandBadge.classList.add('hidden');
    }
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

  startNewHand() {
    this.handNumber++;
    this.allInAutoRunout = false;

    // Check dynamic blinds every 5 hands
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
      if (p.isBot) p.wasPreflopRaiser = false;
    });

    sounds.playCard();
    this.setAnnouncement('New hand dealt! Blinds posted.');

    // Deal 2 hole cards
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

    // Small and Big Blinds
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

    const active = this.players.filter(p => !p.folded);
    if (active.length === 1) {
      this.resolveEarlyWin(active[0]);
      return;
    }

    const acting = this.players.filter(p => !p.folded && !p.allIn);

    // If all or all-but-one remaining players are all-in: TRIGGER DRAMATIC AUTO-RUNOUT
    if (acting.length <= 1 && active.length >= 2) {
      const allMatched = acting.length === 0 || acting[0].currentBet === this.currentBet;
      if (allMatched) {
        this.runoutAllInBoard();
        return;
      }
    }

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
      const thinkTime = 700 + Math.random() * 600;
      setTimeout(() => this.runBotStrategicTurn(p), thinkTime);
    } else {
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
      if (!p.folded && p.isBot) {
        const container = document.getElementById(`cards-${idx}`);
        container.innerHTML = '';
        p.cards.forEach(c => container.appendChild(this.renderCardDOM(c)));
      }
    });

    const runNextStreet = () => {
      if (this.communityCards.length === 0) {
        // Deal Flop
        this.deck.deal();
        for (let i = 0; i < 3; i++) {
          const c = this.deck.deal();
          this.communityCards.push(c);
          document.getElementById(`flop-${i + 1}`).appendChild(this.renderCardDOM(c));
        }
        sounds.playCard();
        this.stageBadgeEl.textContent = 'THE FLOP';
        this.updateTableUI();
        setTimeout(runNextStreet, 1100);
      } else if (this.communityCards.length === 3) {
        // Deal Turn
        this.deck.deal();
        const c = this.deck.deal();
        this.communityCards.push(c);
        document.getElementById('turn').appendChild(this.renderCardDOM(c));
        sounds.playCard();
        this.stageBadgeEl.textContent = 'THE TURN';
        this.updateTableUI();
        setTimeout(runNextStreet, 1100);
      } else if (this.communityCards.length === 4) {
        // Deal River
        this.deck.deal();
        const c = this.deck.deal();
        this.communityCards.push(c);
        document.getElementById('river').appendChild(this.renderCardDOM(c));
        sounds.playCard();
        this.stageBadgeEl.textContent = 'THE RIVER';
        this.updateTableUI();
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
    } else if (action === 'allin') {
      // Entire bankroll goes into the pot
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
  // BOT AI DECISION TREE: REALISTIC ALL-IN CALLS & AGGRESSION
  // ==========================================================================
  runBotStrategicTurn(bot) {
    const toCall = this.currentBet - bot.currentBet;
    const isPreflop = (this.communityCards.length === 0);
    const pot = this.getTotalPot();
    const isHeroAllIn = this.players[0].allIn;

    if (isPreflop) {
      const tier = evaluatePreflopTier(bot.cards);

      // FACING AN ALL-IN SHOVE
      if (toCall > this.bigBlind * 4 || isHeroAllIn) {
        // Monster hands (Tier 1: AA, KK, QQ, JJ, AKs) ALWAYS call all-ins
        if (tier === 1) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `CALL ALL-IN!`);
          this.setAnnouncement(`🔥 ${bot.name} SNAPS CALL with monster pocket pair!`);
        } else if (tier === 2 && Math.random() < 0.65) {
          // Strong hands call all-in with high probability
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `CALL ALL-IN!`);
          this.setAnnouncement(`🔥 ${bot.name} calls your all-in shove with ${RANK_LABELS[bot.cards[0].rank]}-${RANK_LABELS[bot.cards[1].rank]}!`);
        } else if (bot.style.includes('Maniac') && Math.random() < 0.5) {
          // Duke the Maniac gambles
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `GAMBLE CALL!`);
          this.setAnnouncement(`🔥 Duke gambles and calls the all-in!`);
        } else {
          bot.folded = true;
          this.showActionBubble(bot.id, 'Fold');
          this.setAnnouncement(`${bot.name} folds to the shove.`);
        }
      } else if (toCall === 0) {
        if (tier <= 2 && Math.random() < 0.7) {
          const raiseAmt = Math.min(bot.chips, this.minRaise * 3);
          this.postBet(bot, raiseAmt);
          this.minRaise = raiseAmt - this.currentBet;
          this.currentBet = bot.currentBet;
          bot.wasPreflopRaiser = true;
          this.hasActed.clear();
          this.showActionBubble(bot.id, `Raise to $${bot.currentBet}`);
          this.setAnnouncement(`${bot.name} raises to $${bot.currentBet}!`);
        } else {
          sounds.playCheck();
          this.showActionBubble(bot.id, 'Check');
          this.setAnnouncement(`${bot.name} checks.`);
        }
      } else {
        if (tier === 1) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `Call $${called}`);
          this.setAnnouncement(`${bot.name} calls $${called}.`);
        } else if (tier <= 3 || Math.random() < 0.6) {
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
      // POST-FLOP DECISIONS
      const best = evaluateBestHand(bot.cards, this.communityCards);
      const isStrong = best.category >= HAND_RANKS.TWO_PAIR;
      const isPair = best.category >= HAND_RANKS.ONE_PAIR;

      if (toCall > 0) {
        if (isStrong || (isPair && Math.random() < 0.75)) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `Call $${called}`);
          this.setAnnouncement(`${bot.name} calls with ${best.desc}.`);
        } else if (Math.random() < 0.35) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `Call $${called}`);
          this.setAnnouncement(`${bot.name} calls $${called}.`);
        } else {
          bot.folded = true;
          this.showActionBubble(bot.id, 'Fold');
          this.setAnnouncement(`${bot.name} folds.`);
        }
      } else {
        if (isStrong && Math.random() < 0.8) {
          const betAmt = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.6)));
          this.postBet(bot, betAmt);
          this.currentBet = bot.currentBet;
          this.hasActed.clear();
          this.showActionBubble(bot.id, `Bet $${betAmt}`);
          this.setAnnouncement(`${bot.name} bets $${betAmt} (${best.desc}).`);
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
    SaveManager.recordHandStats(heroWon, pot);
    this.updateGlobalStatsUI();

    this.setAnnouncement(`🏆 ${winner.name} wins $${pot}! (Opponents folded)`);
    this.updateTableUI();
    this.finishHand();
  }

  // ==========================================================================
  // SHOWDOWN & SIDE POT SETTLEMENT
  // ==========================================================================
  resolveShowdown() {
    this.stageBadgeEl.textContent = 'SHOWDOWN';
    sounds.playWin();

    // Reveal bot cards
    this.players.forEach((p, idx) => {
      if (!p.folded && p.isBot) {
        const container = document.getElementById(`cards-${idx}`);
        container.innerHTML = '';
        p.cards.forEach(c => container.appendChild(this.renderCardDOM(c)));
      }
    });

    const pots = PotManager.calculateSidePots(this.players);
    let heroWonAny = false;
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
        announcements.push(`🤝 Chop! ${names} split ${potLabel} ($${pot.amount})!`);
      }
    });

    if (heroWonAny) this.winRecord.won++;
    this.winRecord.total++;
    SaveManager.recordHandStats(heroWonAny, totalPotAmount);
    this.updateGlobalStatsUI();

    this.setAnnouncement(announcements.join(' '));
    this.updateTableUI();
    this.finishHand();
  }

  // ZERO MONEY COMPLETE KNOCKOUT & RESET
  finishHand() {
    this.actionPanelEl.classList.remove('disabled');
    this.btnFold.disabled = true;
    this.btnCheckCall.disabled = true;
    this.btnRaise.disabled = true;
    this.btnAllin.disabled = true;
    this.sliderEl.disabled = true;

    this.saveCurrentGame();

    const hero = this.players[0];
    if (hero.chips === 0) {
      // ZERO MONEY COMPLETELY: Must exit to main menu to reset!
      this.setAnnouncement('💀 YOU WENT BUST! Zero chips left. Return to Main Menu to reset.');
      this.btnNextHand.textContent = '🏠 Exit to Menu (Reset $1,000)';
      this.btnNextHand.onclick = () => {
        this.btnNextHand.onclick = null;
        this.btnNextHand.textContent = 'Deal Next Hand';
        this.showMenuView();
      };
      this.btnNextHand.classList.remove('hidden');
      return;
    }

    const surviving = this.players.filter(p => p.chips > 0);
    if (surviving.length === 1 && surviving[0].id === 0) {
      this.setAnnouncement('🎉 YOU WON THE ENTIRE TABLE! Congratulations Champion! 🎉');
      return;
    }

    this.btnNextHand.classList.remove('hidden');
  }
}

// Launch application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.pokerGame = new PokerApp();
});
