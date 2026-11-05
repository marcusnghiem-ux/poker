/* ==========================================================================
   ROYAL TEXAS HOLD'EM - ADVANCED CASINO ENGINE
   Features:
   - Peer-to-Peer Friends Online Multiplayer via PeerJS (No Leaked Passwords)
   - 5-Second Joining Window Between Hands + Mid-Round Waiting Screen
   - Device-Isolated Private 3 Save Slots (Online games never alter solo saves)
   - Expanded Global Stats (Hands, Won, Win Rate %, Biggest Pot, Best Streak, Best Hand)
   - Single Main Pot with Clean All-In Side Pot
   - Realistic All-In Shoves & Auto Dramatic Board Runout
   - Dynamic Blinds Escalation every 5 hands
   - Busted Zero Money System with Main Menu Reset Option
   ========================================================================== */

// ============================================================================
// 1. AUDIO SYNTHESIZER (Web Audio API - Pure synthesized sound, zero assets)
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

  playCheck() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
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
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.22, this.ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.1);
        osc.stop(this.ctx.currentTime + idx * 0.1 + 0.25);
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
      onlineHandsPlayed: 0
    };
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
      { id: 0, name: 'You', style: 'Hero', avatar: '👑', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, isBot: false, isRemote: false },
      { id: 1, name: 'Viper', style: 'Shark (TAG)', avatar: '🐍', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, isBot: true, isRemote: false },
      { id: 2, name: 'Atlas', style: 'Solid (TAG)', avatar: '🛡️', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, isBot: true, isRemote: false },
      { id: 3, name: 'Luna', style: 'Nit (Rock)', avatar: '🌙', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, isBot: true, isRemote: false },
      { id: 4, name: 'Duke', style: 'Maniac', avatar: '🦁', chips: 1000, currentBet: 0, totalBet: 0, cards: [], folded: false, allIn: false, isBot: true, isRemote: false }
    ];

    this.bindDOM();
    this.updateGlobalStatsUI();
    this.renderMainMenuSlots();

    // Check if URL has ?room=join or ?room=private
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('room') === 'join' || urlParams.get('room') === 'private') {
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
    this.onlineRoomStatusText = document.getElementById('online-room-status-text');
    this.btnCopyInvite = document.getElementById('btn-copy-invite');

    // 5s Countdown & Mid-Round Waiting Overlays
    this.countdownOverlay = document.getElementById('dealer-countdown-overlay');
    this.countdownNumber = document.getElementById('countdown-number');
    this.waitingRoundOverlay = document.getElementById('waiting-round-overlay');
    this.waitingRoundText = document.getElementById('waiting-round-text');

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

    // Back to Menu
    this.btnBackMenu.addEventListener('click', () => {
      if (!this.isOnlineRoom) {
        this.saveCurrentGame();
      }
      this.showMenuView();
    });

    // Rules Modal
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

    // Copy Invite Link (Safe link, never leaks password)
    this.btnCopyInvite.addEventListener('click', () => {
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
    this.btnFold.addEventListener('click', () => this.handleActionClick('fold'));
    this.btnCheckCall.addEventListener('click', () => this.handleActionClick('check_call'));
    this.btnRaise.addEventListener('click', () => this.handleActionClick('raise', Number(this.sliderEl.value)));
    this.btnAllin.addEventListener('click', () => this.handleActionClick('allin'));

    // Deal Next Hand button
    this.btnNextHand.addEventListener('click', () => {
      this.btnNextHand.classList.add('hidden');
      if (this.isOnlineRoom && !this.isHost) {
        // Guest waits for host
        return;
      }
      this.startNewHand();
    });
  }

  // ==========================================================================
  // VIEW NAVIGATION & STATS
  // ==========================================================================
  showMenuView() {
    this.gameView.classList.add('hidden');
    this.mainMenuView.classList.remove('hidden');
    this.countdownOverlay.classList.add('hidden');
    this.waitingRoundOverlay.classList.add('hidden');
    this.updateGlobalStatsUI();
    this.renderMainMenuSlots();
  }

  showGameView() {
    this.mainMenuView.classList.add('hidden');
    this.gameView.classList.remove('hidden');
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
  // ONLINE PRIVATE ROOM (No Password Leaked, P2P Peer Coordination)
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
    this.setAnnouncement('👑 You are the Table Host! Starting table...');

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

    this.startNewHand();
  }

  handleNewGuestConnection(conn) {
    conn.on('data', (data) => {
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
    this.players[seatIdx].name = name;
    this.players[seatIdx].style = 'Friend (Online)';
    this.players[seatIdx].avatar = '👤';
    this.players[seatIdx].chips = 1000;
    this.players[seatIdx].isBot = false;
    this.players[seatIdx].isRemote = true;
    this.players[seatIdx].peerConn = conn;

    document.getElementById(`name-${seatIdx}`).textContent = name;
    document.getElementById(`style-${seatIdx}`).textContent = 'Friend (Online)';
    document.getElementById(`avatar-${seatIdx}`).textContent = '👤';
    document.getElementById(`chips-${seatIdx}`).textContent = '1000';

    this.guestConnections.push({ conn, name, seatIdx, chips: 1000, waiting: false });

    conn.send({
      type: 'seated',
      seat: seatIdx,
      name: name,
      chips: 1000,
      tableState: this.serializeTableStateFor(seatIdx)
    });

    this.setAnnouncement(`👋 ${name} sat down at Seat ${seatIdx}!`);
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

    conn.on('data', (data) => {
      this.handleGuestReceivedData(data);
    });

    conn.on('close', () => {
      this.setAnnouncement('⚠️ Disconnected from table host. Returning to menu.');
      setTimeout(() => this.showMenuView(), 2500);
    });
  }

  handleGuestReceivedData(data) {
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
  }

  handleActionClick(action, amt = 0) {
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
          <div class="empty-slot-icon">➕</div>
          <div class="empty-slot-title">SLOT ${slotId}</div>
          <div class="empty-slot-subtitle">Empty &bull; Click to Start New Game</div>
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

        cardEl.innerHTML = `
          <div class="slot-header">
            <span class="slot-badge">SLOT ${slotId}</span>
            <span class="slot-diff ${slotData.difficulty}">${slotData.difficulty.toUpperCase()}</span>
          </div>
          <div class="slot-bankroll">$${(slotData.chips || 1000).toLocaleString()}</div>
          <div class="slot-stats-grid">
            <div class="slot-stat-item">
              <span class="slot-stat-lbl">Hand</span>
              <span class="slot-stat-val">#${slotData.handNumber || 1}</span>
            </div>
            <div class="slot-stat-item">
              <span class="slot-stat-lbl">Won</span>
              <span class="slot-stat-val">${slotData.winRecord ? slotData.winRecord.won : 0}</span>
            </div>
            <div class="slot-stat-item">
              <span class="slot-stat-lbl">Win Rate</span>
              <span class="slot-stat-val">${winPercent}%</span>
            </div>
          </div>
          <div class="slot-actions">
            <button class="btn btn-primary slot-btn-play">Continue Run</button>
            <button class="btn btn-secondary slot-btn-del" title="Delete Profile">🗑️</button>
          </div>
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
    this.isOnlineRoom = false;
    this.isHost = false;
    this.onlineRoomBadge.classList.add('hidden');
    this.handNumber = 0;
    this.winRecord = { won: 0, total: 0 };
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.dealerIdx = 0;

    this.players[0].name = 'You';
    this.players[0].chips = 1000;
    this.players[0].isBot = false;
    this.players[0].isRemote = false;
    document.getElementById('hero-name').textContent = 'You';

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
    }

    document.getElementById('difficulty-indicator').textContent = this.difficulty.toUpperCase();
    this.saveCurrentGame();
    this.showGameView();
    this.startNewHand();
  }

  loadGame(slotId) {
    const data = SaveManager.getSave(slotId);
    if (!data) return;

    this.activeSlot = slotId;
    this.difficulty = data.difficulty || 'medium';
    this.isOnlineRoom = false;
    this.isHost = false;
    this.onlineRoomBadge.classList.add('hidden');
    this.handNumber = (data.handNumber || 1) - 1;
    this.winRecord = data.winRecord || { won: 0, total: 0 };

    this.players[0].chips = data.chips || 1000;
    this.players[0].name = 'You';
    this.players[0].isBot = false;
    this.players[0].isRemote = false;
    document.getElementById('hero-name').textContent = 'You';

    if (data.botChips && Array.isArray(data.botChips)) {
      data.botChips.forEach((bc, idx) => {
        if (this.players[idx + 1]) this.players[idx + 1].chips = bc;
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
    }

    document.getElementById('difficulty-indicator').textContent = this.difficulty.toUpperCase();
    this.showGameView();
    this.startNewHand();
  }

  saveCurrentGame() {
    if (this.isOnlineRoom) return; // Online room state is session-only and never overwrites solo saves!

    const botChips = [
      this.players[1].chips,
      this.players[2].chips,
      this.players[3].chips,
      this.players[4].chips
    ];

    SaveManager.saveSlot(this.activeSlot, {
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
      cardEl.className = 'card card-hidden';
      cardEl.innerHTML = `<div class="card-back-pattern"></div>`;
      return cardEl;
    }

    cardEl.className = `card card-${card.suit.color}`;
    cardEl.innerHTML = `
      <div class="card-corner top-left">
        <span class="card-rank">${card.label}</span>
        <span class="card-suit">${card.suit.symbol}</span>
      </div>
      <div class="card-center-suit">${card.suit.symbol}</div>
      <div class="card-corner bottom-right">
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

    this.players.forEach((p, idx) => {
      document.getElementById(`chips-${idx}`).textContent = p.chips.toLocaleString();
      const seatEl = document.getElementById(`seat-${idx}`);
      seatEl.classList.toggle('folded-seat', p.folded);

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
    if (this.players[0].cards.length === 2 && !this.players[0].folded) {
      const best = evaluateBestHand(this.players[0].cards, this.communityCards);
      this.heroHandBadge.textContent = best.desc;
      this.heroHandBadge.classList.remove('hidden');
    } else {
      this.heroHandBadge.classList.add('hidden');
    }
  }

  startNewHand() {
    this.handInProgress = true;
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
      document.getElementById(`seat-${i}`).classList.remove('adrenaline-threat', 'current-turn', 'folded-seat');
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

    // Deal 2 hole cards to each player
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

    // ADRENALINE MECHANIC (Solo mode only):
    // When human player receives a strong starting hand, adjust bot cards so at least one bot has high drama
    if (!this.isOnlineRoom && !this.players[0].folded) {
      const heroTier = evaluatePreflopTier(this.players[0].cards);
      if (heroTier <= 2) {
        const botIndices = [1, 2, 3, 4].filter(i => !this.players[i].folded);
        if (botIndices.length > 0) {
          const rivalIdx = botIndices[Math.floor(Math.random() * botIndices.length)];
          // 25% chance of slightly better hand, 75% competitive
          if (Math.random() < 0.25) {
            this.players[rivalIdx].cards = [new Card(14, SUITS[1]), new Card(14, SUITS[2])]; // Pocket Aces
          } else {
            this.players[rivalIdx].cards = [new Card(13, SUITS[0]), new Card(13, SUITS[3])]; // Pocket Kings
          }
          document.getElementById(`seat-${rivalIdx}`).classList.add('adrenaline-threat');
        }
      }
    }

    // Small & Big Blinds
    const sbIdx = (this.dealerIdx + 1) % this.players.length;
    const bbIdx = (this.dealerIdx + 2) % this.players.length;

    this.postBet(this.players[sbIdx], Math.min(this.smallBlind, this.players[sbIdx].chips));
    this.postBet(this.players[bbIdx], Math.min(this.bigBlind, this.players[bbIdx].chips));
    this.currentBet = this.bigBlind;
    this.minRaise = this.bigBlind;

    this.updateTableUI();
    this.broadcastTableState();

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
    this.broadcastTableState();

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
      const thinkTime = 700 + Math.random() * 500;
      setTimeout(() => this.runBotStrategicTurn(p), thinkTime);
    } else if (p.isRemote) {
      // Remote guest friend's turn: Host waits for message from guest
      this.actionPanelEl.classList.add('disabled');
      this.setAnnouncement(`Waiting for ${p.name}'s action...`);
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

      // Facing an all-in shove
      if (toCall > this.bigBlind * 4 || isHeroAllIn) {
        if (tier === 1) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `CALL ALL-IN!`);
          this.setAnnouncement(`🔥 ${bot.name} SNAPS CALL with monster pocket pair!`);
        } else if (tier === 2 && Math.random() < 0.65) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `CALL ALL-IN!`);
          this.setAnnouncement(`🔥 ${bot.name} calls the all-in shove with strong cards!`);
        } else if (bot.style.includes('Maniac') && Math.random() < 0.5) {
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
      // Post-Flop Decisions
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

    const heroHandEval = this.players[0].cards.length === 2 ? evaluateBestHand(this.players[0].cards, this.communityCards) : null;
    SaveManager.recordHandStats(heroWon, pot, heroHandEval, this.isOnlineRoom);
    this.updateGlobalStatsUI();

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
        eval: evaluateBestHand(p.cards, this.communityCards)
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
      } else {
        const names = tiedWinners.map(w => w.player.name).join(' & ');
        announcements.push(`🤝 Chop! ${names} split ${potLabel} ($${pot.amount})!`);
      }
    });

    if (heroWonAny) this.winRecord.won++;
    this.winRecord.total++;

    if (!heroBestEval && this.players[0].cards.length === 2) {
      heroBestEval = evaluateBestHand(this.players[0].cards, this.communityCards);
    }
    SaveManager.recordHandStats(heroWonAny, totalPotAmount, heroBestEval, this.isOnlineRoom);
    this.updateGlobalStatsUI();

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
      // ZERO MONEY COMPLETELY: Player knocked out, must return to Main Menu to reset bankroll!
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

    if (this.isOnlineRoom && this.isHost) {
      // 1. Seat any waiting friends who connected mid-hand
      this.guestConnections.forEach(g => {
        if (g.waiting) {
          g.waiting = false;
          const s = g.seatIdx;
          this.players[s].name = g.name;
          this.players[s].style = 'Friend (Online)';
          this.players[s].avatar = '👤';
          this.players[s].chips = 1000;
          this.players[s].isBot = false;
          this.players[s].isRemote = true;
          this.players[s].peerConn = g.conn;

          document.getElementById(`name-${s}`).textContent = g.name;
          document.getElementById(`style-${s}`).textContent = 'Friend (Online)';
          document.getElementById(`avatar-${s}`).textContent = '👤';
          document.getElementById(`chips-${s}`).textContent = '1000';

          g.conn.send({
            type: 'seated',
            seat: s,
            name: g.name,
            chips: 1000,
            tableState: this.serializeTableStateFor(s)
          });
          this.setAnnouncement(`👋 ${g.name} joined the table for the next hand!`);
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

  // 5-Second Joining Window countdown timer between hands
  start5SecondJoiningCountdown(onComplete) {
    let seconds = 5;
    this.countdownOverlay.classList.remove('hidden');
    this.countdownNumber.textContent = seconds;
    sounds.playCheck();
    this.broadcastCountdownTick(seconds);

    const timer = setInterval(() => {
      seconds--;
      if (seconds > 0) {
        this.countdownNumber.textContent = seconds;
        sounds.playCheck();
        this.broadcastCountdownTick(seconds);
      } else {
        clearInterval(timer);
        this.countdownOverlay.classList.add('hidden');
        this.broadcastCountdownTick(0);
        if (onComplete) onComplete();
      }
    }, 1000);
  }
}

// Launch application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.pokerGame = new PokerApp();
});
