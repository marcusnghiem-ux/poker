/* ==========================================================================
   ROYAL TEXAS HOLD'EM - ADVANCED STRATEGIC POKER ENGINE
   Features:
   - Sklansky Pre-Flop Starting Hand Tiers (Premium, Strong, Speculative, Trash)
   - Board Texture & Draw Outs Detection (Flush & Straight semi-bluffs)
   - Continuation Bets (C-Bet) & Aggression memory
   - Pot Odds & Implied Odds Math
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

// Automatically unlock Web Audio on first touch for iOS / Safari / Touchscreens
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

// --- STRATEGIC EVALUATOR FOR BOTS ---
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
  if (uniqueRanks.includes(14)) uniqueRanks.unshift(1); // Ace-low

  let straightDraw = false;
  for (let i = 0; i <= uniqueRanks.length - 4; i++) {
    if (uniqueRanks[i + 3] - uniqueRanks[i] === 3) {
      straightDraw = true;
      break;
    }
  }

  return { flushDraw, straightDraw };
}

// --- GAME CONTROLLER ---
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

    // Advanced Bot Personalities
    this.players = [
      { id: 0, name: 'You', style: 'Hero', isBot: false, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false },
      { id: 1, name: 'Viper', style: 'Shark (TAG)', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false,
        aggression: 1.5, cbetFreq: 0.80, bluffFreq: 0.22, semiBluff: 0.65, callTightness: 0.85, wasPreflopRaiser: false },
      { id: 2, name: 'Atlas', style: 'Solid (TAG)', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false,
        aggression: 1.1, cbetFreq: 0.60, bluffFreq: 0.14, semiBluff: 0.45, callTightness: 1.0, wasPreflopRaiser: false },
      { id: 3, name: 'Luna', style: 'Nit (Rock)', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false,
        aggression: 0.7, cbetFreq: 0.35, bluffFreq: 0.04, semiBluff: 0.20, callTightness: 1.35, wasPreflopRaiser: false },
      { id: 4, name: 'Duke', style: 'Maniac', isBot: true, chips: 1000, cards: [], currentBet: 0, totalBet: 0, folded: false, allIn: false,
        aggression: 1.8, cbetFreq: 0.90, bluffFreq: 0.38, semiBluff: 0.80, callTightness: 0.70, wasPreflopRaiser: false }
    ];

    this.bindDOM();
    this.initAudioToggle();
    this.startNewHand();
  }

  bindDOM() {
    this.announcementEl = document.getElementById('dealer-announcement');
    this.potEl = document.getElementById('pot-amount');
    this.handNumEl = document.getElementById('hand-number');
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

    this.sliderEl.addEventListener('input', () => {
      const val = Number(this.sliderEl.value);
      this.sliderValEl.textContent = `$${val}`;
      if (this.currentBet === 0) {
        this.raiseText.textContent = `Bet $${val}`;
      } else {
        this.raiseText.textContent = `Raise to $${val}`;
      }
    });

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

    this.btnFold.addEventListener('click', () => this.handleHeroAction('fold'));
    this.btnCheckCall.addEventListener('click', () => this.handleHeroAction('check_call'));
    this.btnRaise.addEventListener('click', () => this.handleHeroAction('raise', Number(this.sliderEl.value)));
    this.btnAllin.addEventListener('click', () => this.handleHeroAction('raise', this.players[0].chips + this.players[0].currentBet));
    this.btnNextHand.addEventListener('click', () => {
      this.btnNextHand.classList.add('hidden');
      this.dealerIdx = (this.dealerIdx + 1) % this.players.length;
      this.startNewHand();
    });

    const modal = document.getElementById('ranks-modal');
    document.getElementById('rules-btn').addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('close-modal-btn').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  initAudioToggle() {
    const btn = document.getElementById('sound-toggle-btn');
    btn.addEventListener('click', () => {
      sounds.enabled = !sounds.enabled;
      btn.textContent = sounds.enabled ? '🔊 Sound' : '🔇 Muted';
    });
  }

  setAnnouncement(msg) { this.announcementEl.textContent = msg; }
  getTotalPot() { return this.players.reduce((sum, p) => sum + p.totalBet, 0); }

  updateTableUI() {
    this.potEl.textContent = `$${this.getTotalPot()}`;
    this.handNumEl.textContent = this.handNumber;

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
    this.stageBadgeEl.textContent = 'PRE-FLOP';
    this.communityCards = [];
    this.deck.reset();

    for (let i = 0; i < 5; i++) {
      document.getElementById(`cards-${i}`).innerHTML = '';
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
    this.setAnnouncement('New hand dealt! Blinds posted. Action starts.');

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
      // Realistic variable deliberation time (800ms - 1700ms)
      const thinkTime = 800 + Math.random() * 900;
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

  runBotStrategicTurn(bot) {
    const toCall = this.currentBet - bot.currentBet;
    const isPreflop = (this.communityCards.length === 0);
    const pot = this.getTotalPot();

    // 1. Pre-Flop Decision Tree
    if (isPreflop) {
      const tier = evaluatePreflopTier(bot.cards);

      if (toCall === 0) {
        // In Big Blind without raise
        if (tier === 1 || (tier === 2 && Math.random() < 0.6 * bot.aggression)) {
          const raiseAmt = Math.min(bot.chips, this.minRaise * 3);
          this.postBet(bot, raiseAmt);
          this.minRaise = raiseAmt - this.currentBet;
          this.currentBet = bot.currentBet;
          bot.wasPreflopRaiser = true;
          this.hasActed.clear();
          this.showActionBubble(bot.id, `Raise to $${bot.currentBet}`);
          this.setAnnouncement(`${bot.name} raises to $${bot.currentBet} from the blinds!`);
        } else {
          sounds.playCheck();
          this.showActionBubble(bot.id, 'Check');
          this.setAnnouncement(`${bot.name} checks his option.`);
        }
      } else {
        // Facing pre-flop action
        if (tier === 1) {
          // Monster: 3-bet or call
          if (Math.random() < 0.75 * bot.aggression && bot.chips > toCall) {
            const raiseTarget = Math.min(bot.chips + bot.currentBet, this.currentBet + Math.max(this.minRaise * 2, Math.floor(pot * 0.7)));
            const needed = raiseTarget - bot.currentBet;
            this.postBet(bot, needed);
            this.minRaise = bot.currentBet - this.currentBet;
            this.currentBet = bot.currentBet;
            bot.wasPreflopRaiser = true;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `3-Bet $${bot.currentBet}`);
            this.setAnnouncement(`${bot.name} 3-bets to $${bot.currentBet} with premium holdings!`);
          } else {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls $${called}.`);
          }
        } else if (tier === 2) {
          if (toCall <= this.bigBlind * 4 || Math.random() < 0.75) {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls with strong cards.`);
          } else {
            bot.folded = true;
            this.showActionBubble(bot.id, 'Fold');
            this.setAnnouncement(`${bot.name} folds.`);
          }
        } else if (tier === 3) {
          // Speculative (set mining / suited): call only cheap bets
          if (toCall <= this.bigBlind * 2.5 && bot.chips > toCall * 6) {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls to see the flop.`);
          } else {
            bot.folded = true;
            this.showActionBubble(bot.id, 'Fold');
            this.setAnnouncement(`${bot.name} folds.`);
          }
        } else {
          // Trash: Fold
          bot.folded = true;
          this.showActionBubble(bot.id, 'Fold');
          this.setAnnouncement(`${bot.name} folds.`);
        }
      }
    } else {
      // 2. Post-Flop Decision Tree
      const best = evaluateBestHand(bot.cards, this.communityCards);
      let strength = best.category / 8.0;

      // Draw outs
      const { flushDraw, straightDraw } = detectDraws(bot.cards, this.communityCards);
      if (flushDraw) strength += 0.22;
      if (straightDraw) strength += 0.16;

      const potOdds = toCall / (pot + toCall);
      const isDrawing = (flushDraw || straightDraw);
      const canSemiBluff = isDrawing && (Math.random() < bot.semiBluff);

      if (toCall === 0) {
        // Nobody bet yet:
        // A: Continuation bet (C-Bet) if pre-flop aggressor
        if (bot.wasPreflopRaiser && this.communityCards.length === 3 && Math.random() < bot.cbetFreq) {
          const cbet = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.5 * bot.aggression)));
          if (cbet > 0) {
            this.postBet(bot, cbet);
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `C-Bet $${cbet}`);
            this.setAnnouncement(`${bot.name} fires a continuation bet of $${cbet}!`);
          } else {
            sounds.playCheck();
            this.showActionBubble(bot.id, 'Check');
            this.setAnnouncement(`${bot.name} checks.`);
          }
        } else if (strength >= 0.55) {
          // Value bet
          const betSize = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.65 * bot.aggression)));
          if (betSize > 0) {
            this.postBet(bot, betSize);
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Bet $${betSize}`);
            this.setAnnouncement(`${bot.name} value bets $${betSize} (${best.desc}).`);
          } else {
            sounds.playCheck();
            this.showActionBubble(bot.id, 'Check');
            this.setAnnouncement(`${bot.name} checks.`);
          }
        } else if (canSemiBluff) {
          // Semi-bluff with draw
          const bluffSize = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.5)));
          if (bluffSize > 0) {
            this.postBet(bot, bluffSize);
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Semi-Bluff $${bluffSize}`);
            this.setAnnouncement(`${bot.name} semi-bluffs $${bluffSize} on a draw!`);
          } else {
            sounds.playCheck();
            this.showActionBubble(bot.id, 'Check');
            this.setAnnouncement(`${bot.name} checks.`);
          }
        } else if (Math.random() < bot.bluffFreq && this.communityCards.length === 5) {
          // River bluff probe
          const probeSize = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(pot * 0.7)));
          if (probeSize > 0) {
            this.postBet(bot, probeSize);
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Bluff $${probeSize}`);
            this.setAnnouncement(`${bot.name} fires a bold river bet of $${probeSize}!`);
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
        // Facing a bet:
        if (strength >= 0.80) {
          // Monster: re-raise or call
          if (Math.random() < 0.65 * bot.aggression && bot.chips > toCall) {
            const raiseTarget = Math.min(bot.chips + bot.currentBet, this.currentBet + Math.max(this.minRaise, Math.floor(pot * 0.65)));
            const needed = raiseTarget - bot.currentBet;
            this.postBet(bot, needed);
            this.minRaise = bot.currentBet - this.currentBet;
            this.currentBet = bot.currentBet;
            this.hasActed.clear();
            this.showActionBubble(bot.id, `Raise to $${bot.currentBet}`);
            this.setAnnouncement(`${bot.name} raises to $${bot.currentBet} with monster hand!`);
          } else {
            const called = this.postBet(bot, toCall);
            this.showActionBubble(bot.id, `Call $${called}`);
            this.setAnnouncement(`${bot.name} calls $${called}.`);
          }
        } else if (strength >= 0.50 || (canSemiBluff && Math.random() < 0.4)) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `Call $${called}`);
          this.setAnnouncement(`${bot.name} calls $${called}.`);
        } else if (strength >= potOdds * bot.callTightness && toCall < bot.chips * 0.35) {
          const called = this.postBet(bot, toCall);
          this.showActionBubble(bot.id, `Call $${called}`);
          this.setAnnouncement(`${bot.name} gets pot odds and calls $${called}.`);
        } else {
          bot.folded = true;
          this.showActionBubble(bot.id, 'Fold');
          this.setAnnouncement(`${bot.name} folds to the bet.`);
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
      this.setAnnouncement('Flop dealt! First player after the button acts.');
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
    this.setAnnouncement(`🏆 ${winner.name} wins $${pot}! (All opponents folded)`);
    this.updateTableUI();
    this.finishHand();
  }

  resolveShowdown() {
    this.stageBadgeEl.textContent = 'SHOWDOWN';
    sounds.playWin();

    this.players.forEach((p, idx) => {
      if (!p.folded && p.isBot) {
        const container = document.getElementById(`cards-${idx}`);
        container.innerHTML = '';
        p.cards.forEach(c => container.appendChild(this.renderCardDOM(c)));
      }
    });

    const active = this.players.filter(p => !p.folded);
    const evaluated = active.map(p => ({
      player: p,
      eval: evaluateBestHand(p.cards, this.communityCards)
    }));

    evaluated.sort((a, b) => compareScores(b.eval, a.eval));
    const winnerObj = evaluated[0];
    const pot = this.getTotalPot();
    winnerObj.player.chips += pot;

    winnerObj.eval.bestCards.forEach(c => {
      const commSlots = document.querySelectorAll('.community-cards-box .card');
      commSlots.forEach(el => {
        if (el.textContent.includes(c.label) && el.textContent.includes(c.suit.symbol)) {
          el.classList.add('winning-highlight');
        }
      });
    });

    this.setAnnouncement(`🏆 ${winnerObj.player.name} wins $${pot} with ${winnerObj.eval.desc}!`);
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

window.addEventListener('DOMContentLoaded', () => {
  window.pokerGame = new PokerApp();
});
