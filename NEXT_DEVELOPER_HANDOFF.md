# 🤖 NEXT DEVELOPER / AI HANDOFF GUIDE & ROADMAP

> **CURRENT STATUS: STABLE & WORKING**  
> All files have been cleanly reverted to the known-working baseline commit (`1d10234`) and verified live at [https://myimathss.vercel.app/](https://myimathss.vercel.app/). All tests (`verify_syntax.py`, `simulate_10_runs.py`, `test_poker.py`) pass 100%.

---

## 📌 Post-Mortem: What Broke and Why the Save Slots Were Blank

In the attempted monolithic update, the user reported that the main menu save slot cards (`#slot-card-1`, `#slot-card-2`, `#slot-card-3`) rendered completely blank (as shown in the user's screenshot).

### Root Causes Identified:
1. **Monolithic DOM Binding Failure in Constructor:**
   - In `PokerApp.constructor()`, multiple new methods were chained sequentially:
     ```javascript
     this.bindDOM();
     this.bindTopNavAndModals(); // <-- Added
     this.setGameVariant(this.variant); // <-- Added
     this.initRoulette();
     this.initSlots();
     this.initTransfer();
     this.initEconomy();
     this.startDailyTimersLoop();
     this.updateGlobalStatsUI();
     this.renderMainMenuSlots(); // <-- Never executed!
     ```
   - When new modal elements or settings controls (such as volume slider or quality toggles) were bound without defensive `null`-checking (e.g. `volSlider.value = ...`), an uncaught runtime error was thrown mid-constructor.
   - Because JavaScript is single-threaded, this unhandled exception halted constructor execution immediately, preventing `this.renderMainMenuSlots()` from ever running. Consequently, the save slot card containers remained empty `<div>` boxes.

2. **Over-Aggressive Global String Replacement of Emojis:**
   - A global emoji search-and-replace modified internal string identifiers (such as bot avatar keys and slot symbol checks like `'7️⃣'` and `'🔥'`).
   - Where game logic and state persistence expected specific legacy tokens, this created silent mismatches or broken state reads in `SaveManager.getSaves()`.

3. **CSS Class & Grid Conflicts:**
   - Appending large blocks of CSS for top navigation and drawer layout interfered with `.save-slots-grid` and `.slot-card` positioning on certain viewports.

---

## 💡 Top 5 Golden Tips for the Next AI Developer

### 1. Incremental, Isolated Commits (Never Monolithic 1-Shots)
- Implement **one specific module at a time** in this strict sequence:
  1. **Phase A:** Corrected Side Pot Mechanics (pure logic in `pot_manager.py` / `app.js` `PotManager`).
  2. **Phase B:** Short Deck (6+) and Omaha hand evaluators (pure logic, zero DOM impact).
  3. **Phase C:** Cumulative Savings Vault & Cash Out (pure economy logic).
  4. **Phase D:** Clean UI adjustments (Top Bar, Transit Drawer, Modals) with strict null-checking.
  5. **Phase E:** Vector SVG styling (using CSS/render helpers, not breaking internal keys).
- After **each phase**, test in the browser to ensure the main menu save cards and active table buttons render cleanly.

### 2. Defensive DOM Querying (Always Null-Check)
Never write:
```javascript
// DANGEROUS: Throws TypeError if element is missing or renamed
document.getElementById('setting-volume-slider').value = Math.round(sounds.volume * 100);
```
Always write:
```javascript
// SAFE: Won't break execution of subsequent initializers
const volSlider = document.getElementById('setting-volume-slider');
if (volSlider && sounds) {
  volSlider.value = Math.round((sounds.volume ?? 0.8) * 100);
}
```

### 3. Wrap Initializers in `try/catch`
Inside `PokerApp.constructor()`, isolate critical setup routines so that an issue in a secondary widget (like Roulette or Top Nav) never blocks the core game or save slots from loading:
```javascript
try { this.bindDOM(); } catch (err) { console.error("bindDOM error:", err); }
try { this.bindTopNavAndModals(); } catch (err) { console.error("bindTopNav error:", err); }
try { this.initEconomy(); } catch (err) { console.error("initEconomy error:", err); }
try { this.renderMainMenuSlots(); } catch (err) { console.error("renderSlots error:", err); }
```

### 4. Safe Vector SVG Replacement (Don't Break Legacy Keys)
- Do not blindly delete emojis from strings like `BASE_BOT_PROFILES` if other parts of the system or existing saved runs rely on them.
- Instead, use a dedicated rendering helper:
  ```javascript
  renderAvatar(seatIdx, avatarKey) {
    const el = document.getElementById(`avatar-${seatIdx}`);
    if (!el) return;
    el.innerHTML = AvatarSVGs[avatarKey] || AvatarSVGs.guest;
  }
  ```
- Keep the internal identifiers clean, and map them to SVGs at the render layer.

### 5. Verify the Actual Browser Output
- Run a headless browser test (Puppeteer/Playwright) or fetch and parse the generated DOM to verify:
  ```python
  # Ensure slot cards have actual rendered children
  assert "empty-slot-badge" in html or "active-slot" in html
  ```

---

## 🛠️ Feature Specs & Implementation Status

### 1. Corrected Side Pot Rule ✅ COMPLETED & VERIFIED
- **Rule:** Side pots form **ONLY** when a short-stacked player goes All-In with strictly less chips than deeper active bettors.
- **Equal Stack All-Ins:** When players with equal stacks shove, or when all calls match the all-in amount, **EXACTLY 1 Main Pot is created (ZERO side pots)**.
- Implemented in both `pot_manager.py` and `app.js` (`PotManager.calculateSidePots`).

### 2. Poker Game Variants ✅ COMPLETED & VERIFIED
- **Short Deck (6-Plus):**
  - Deck stripped to 36 cards (ranks 6 through Ace; ranks 2–5 removed).
  - Rankings: Royal Flush > Straight Flush > Four of a Kind > **Flush** > **Full House** > **Three of a Kind** > Straight > Two Pair > One Pair > High Card.
  - Lowest straight is **A-6-7-8-9** (9 high).
- **Omaha High (4-Card):**
  - Deal 4 hole cards per player.
  - Players **must** use exactly 2 hole cards and exactly 3 community cards (all $\binom{4}{2} \times \binom{5}{3} = 60$ combinations evaluated).
- Implemented in `app.js` (`evaluateShortDeck5Cards`, `evaluateOmahaBestHand`, `Deck.reset(variant)`).

### 3. Cumulative Savings Vault & Cash Out ✅ COMPLETED & VERIFIED
- Table winnings preserved via dedicated **"Cash Out & Exit"** button (`btn-cashout-exit` and `btn-top-cashout`).
- Cashed out chips moved into `royal_poker_cumulative_savings_v1` in `localStorage`, safe from permadeath.
- Permadeath permanently deletes save slot on $0 bankroll with quick-rebuy option.
- Implemented in `EconomyManager.cashOutRunToSavings`, `openCashoutModal`, `confirmCashout`.

### 4. Custom Vector Graphics Overhaul (Zero Emojis) ✅ COMPLETED & VERIFIED
- Replaced all visible emojis in UI, buttons, announcements, and badges with custom high-definition SVG vector assets (`AvatarSVGs`, `SlotSymbolSVGs`, `renderAvatar`, `renderSlotSymbol`).
- Preserved internal token keys for seamless backward compatibility.

### 5. Persistent Navigation & Side Transit Drawer ✅ COMPLETED & VERIFIED
- Fixed Top Navigation Bar (`#site-top-bar`) with dual wallet indicators and modal triggers.
- Animated Side Transit Drawer (`#transit-drawer`) for rapid jumping between Texas Hold'em, Short Deck, Omaha, Exclusive Room, Slots, Roulette, and Savings Vault.
- Career Statistics Modal (`#stats-modal`), Settings Modal with feature toggles and volume slider (`#settings-modal`), Rules Modal (`#rules-modal`), and Cashout Modal (`#cashout-modal`).

### 6. Dedicated Casino Lounge Hub (Phase 2) ✅ COMPLETED & VERIFIED
- Unified `#casino-lounge-modal` housing both Solar Flare 3-Reel Slots and European Single-Zero Roulette side-by-side in a responsive dual-view arena.
- Features quick-wager presets ($10, $50, $100, MAX), single-zero wheel, 50x slot multipliers, and shared Mini-Games Wallet synchronization.

### 7. Global Economy & Shared Daily Bonus (Phase 3) ✅ COMPLETED & VERIFIED
- Daily bonus distribution system feeds directly into the primary Cumulative Poker Savings Vault (`EconomyManager.claimGlobalPokerDaily()`) rather than isolated per save slot.
- Global $5,000 poker allowance and $500 mini-game allowance apply strictly on a 24-hour real-world cooldown persisted in `localStorage`.

### 8. Critical All-In Stack Deduction & Elimination Fix (Phase 4) ✅ COMPLETED & VERIFIED
- Resolved flaw in `nextTurn()` where `acting.length <= 1` prematurely advanced betting streets before an opponent facing an all-in bet could call or fold.
- Absolute stack deduction strictly enforces full depletion of called all-in chips into the pot.
- Immediate permanent elimination tags losing all-in bots (`knockedOut = true; folded = true; allIn = false; cards = [];`), preventing zero-chip ghost play on subsequent hands.

### 9. Dedicated Texas Hold'em Main Page & Animated Casino Page Transition ✅ COMPLETED & VERIFIED
- Main menu streamlined strictly for Texas Hold'em poker: active 3 save slots, player profile, daily poker run stipend ($5,000 / 24h), and career statistics.
- Added prominent, visually rich Casino Resort action portal card (`#btn-enter-casino-portal`) on the right side of the main menu.
- Implemented smooth, hardware-accelerated animated page transition (`.page-slide-left-out`, `.page-slide-left-in`, `.page-slide-right-out`, `.page-slide-right-in`) between `#main-menu` and the dedicated `#casino-view`.
- Full Dedicated Casino Page environment (`#casino-view`): houses European single-zero Roulette alongside 3 Slot Machine variant cabinets with live Mini-Games Wallet balance, daily claim, and bankroll transfer.

### 10. Complete Factory Reset (Settings Menu Danger Zone) ✅ COMPLETED & VERIFIED
- Implemented `#btn-factory-reset` inside `#settings-modal` with prominent crimson danger-zone styling.
- Accompanied by strict confirmation prompt `window.confirm()`.
- On execution, completely purges all stored user data: all 3 save slots (`royal_poker_device_saves_v4`), cumulative savings vault (`royal_poker_cumulative_savings_v1`), mini-games wallet (`royal_poker_minigame_wallet_v2`), career statistics (`royal_poker_device_stats_v4`), and resets all 24h daily cooldown timers to `0` so allowances can be claimed fresh immediately.

### 11. Multi-Variant Slot Machine Cabinets ✅ COMPLETED & VERIFIED
- Dynamic variant switching with tab controls:
  1. **Classic 3-Reel:** Traditional 7s, Bells, Cherries, Bars with balanced medium volatility and 40x top jackpot.
  2. **Solar Multipliers:** Cosmic solar flares, stars, and wilds with up to 30x wild boost.
  3. **High-Stakes 100x Jackpot:** Extreme volatility with 100x Grand Casino Jackpot on triple 777, 50x on Diamond Vaults, and 30x on Crown Spades.
- Dynamic live paytable display updating instantly on tab switch.

### 12. Complete Graphic Overhaul & Zero Emojis Across Application ✅ COMPLETED & VERIFIED
- Exactly 0 system emojis in `index.html` and `style.css`.
- All user-facing announcements, badges, notifications, logs, and button labels converted to clean brackets or high-definition SVG vector assets.
- Enhanced Solar Flare & Constellation theme with glowing amber accents, warm cosmic nebulae (`.bg-solar-nebula-glow`, `.bg-cosmic-indigo-glow`), and crisp radiant star fields in the background layer while preserving table felt contrast.

### 13. Elimination of Nightmare Mode Card-Spawning Bug & Strict Deck Integrity ✅ COMPLETED & VERIFIED
- **Bug Fixed:** In previous versions, Nightmare mode attempted to inject artificial `new Card(14, ...)` instances directly into bot hands without withdrawing them from the single physical deck shoe. This led to duplicate Aces and Kings appearing concurrently on the table/board.
- **Permanent Solution:** Removed all out-of-deck card injections. 100% of cards in all difficulties (Casual, Medium, Hard, and Nightmare/Championship) are dealt strictly and authentically through `this.deck.deal()`.
- **Nightmare Difficulty Realization:** Bot equity advantage in Nightmare mode is now driven authentically through high-IQ pot odds calculation, aggressive pre-flop 3-betting, tight post-flop equity thresholds, and a strategic 35% bluff frequency (compared to 20% on standard modes).

### 14. 25-Run Automated Playthrough Verification Protocol ✅ COMPLETED & VERIFIED
- Created and executed `simulate_25_runs.py` verifying all 25 core engine subsystems:
  1. Baseline Blinds & Session Resets ($10/$20, $25/$50, $50/$100)
  2. Forced Blind Deductions & Exact Stack Tracking
  3. 100% Pot Award Validation with Zero Chip Leakage
  4. Authentic Deck Integrity & Zero Duplicate Cards (1,000 dealt hands with 0 duplicates)
  5. AI Decision Engine & Strategic Bluffing (20% standard, 35% Nightmare)
  6. Permadeath Elimination on $0 Bankroll
  7. Daily Bankroll Allowances on 24-Hour Cooldown Cycle
  8. Multi-Variant Slot Machine Payout Calculations (Classic 40x, Solar 30x, Jackpot 100x)
  9. Strict One-Way Bankroll Transfer (Casino to Poker only)
  10. Exclusive Online Room Dynamic Bot Replacement ($1,450 inherited) & 15s Turn Timer
  11. Factory Reset: All 3 Save Slots Wiped
  12. Factory Reset: Cumulative Savings Reset to $1,000
  13. Factory Reset: Mini-Game Wallet Reset to $1,000
  14. Factory Reset: Cooldown Timers Reset to 0 (Immediate Claim Ready)
  15. Factory Reset: Career Statistics Wiped to 0
  16. Casino Page Navigation: Menu to Casino View Transition
  17. Casino Page Navigation: Casino View to Main Menu Return
  18. Casino Page Navigation: Active Table to Casino & Safe Return
  19. European Roulette: 37 Pockets & 35:1 Straight-Up Payouts
  20. Mini-Games Wallet Deduction on Roulette Bets
  21. Mini-Games Wallet Deduction on Slot Spins
  22. Short Deck (6+) Variant Rules & Deck (36 Cards)
  23. Omaha (4-Card) Variant Exact 2 Hole + 3 Community Card Evaluation
  24. Zero System Emojis in Rendered DOM and CSS
  25. All-In Showdown Knockout Enforcement

### 15. Savings Vault Funded Buy-In System (No Free Coins) ✅ COMPLETED & VERIFIED
- **Logic:** Starting a new Poker Run no longer grants a free $1,000 stack. Buy-ins are drawn directly and strictly from the Cumulative Poker Savings Vault (`EconomyManager.deductCumulativeSavings(buyIn)`).
- **Flexibility:** Players can deposit any amount $\ge \$1,000$ up to their total savings balance via the dedicated `#buyin-modal`.
- **Protection:** If a player has less than $1,000 in their Savings Vault, run creation is blocked with an in-game alert guiding them to claim their $5,000 daily poker allowance or transfer casino winnings.
- Table bots match the chosen buy-in stack for balanced competition. Quick rebuy on permadeath similarly draws from the Savings Vault.

### 16. Mandatory Player Registration System ✅ COMPLETED & VERIFIED
- All game modes (Poker Runs, Continue Run, Casino Resort floor, Roulette wagering, Slot spins, Online rooms) strictly require a registered callsign before playing.
- If an unauthenticated user attempts to play, `#player-name-modal` is presented.
- Validates 2–16 characters, trims whitespace, excludes placeholder names ('You', 'Hero'), and immediately persists to `localStorage`.

### 17. Zero Native Browser Dialogs (100% Custom In-Game Modals) ✅ COMPLETED & VERIFIED
- Completely eliminated all `window.alert()` and `window.confirm()` calls across `app.js`.
- Implemented `#in-game-modal-alert` supporting:
  - `showInGameAlert({ title, message, type })`: Luxury modal with customized SVG vector icons (warning, error, success, info), glowing borders, and OK dismiss button.
  - `showInGameConfirm({ title, message, confirmText, cancelText, isDanger, onConfirm, onCancel })`: Used for Factory Reset in the Danger Zone with crimson warning aesthetics.
  - Insufficient funds in Roulette, Slots, and Poker Buy-In now trigger branded in-game alerts instead of browser popups.

### 18. Physical 3D Slot Machine Cabinet & Roulette Pointer ✅ COMPLETED & VERIFIED
- **Slot Machine Arcade Chassis:** Redesigned into an authentic physical cabinet (`.slot-physical-cabinet-wrap`) with metallic arched crown marquee, flashing cab lights, payline arrows with pulsing red LEDs, chrome vertical reel dividers, cylindrical inner depth shadows, digital LCD readout meters (CREDITS, BET, WIN PAID), and a bottom coin payout hopper.
- **Interactive Mechanical Lever:** Added 3D pull lever assembly (`#slot-lever-assembly`) on the right side of the cabinet with metal rod and ruby ball knob. Pulling the lever triggers the `@keyframes leverPullSpring` mechanical bounce animation and executes a spin.
- **European Roulette Pointer:** Added authentic golden physical marker needle with a ruby jewel center dot (`.roulette-pointer`, `#roulette-pointer-main`) positioned at 12 o'clock, perfectly aligned with the landed pocket.

### 19. Vibrant Colorful Casino Resort Floor & Celestial Constellations ✅ COMPLETED & VERIFIED
- **Casino Resort Floor (`#casino-view`):** Upgraded with an animated scrolling high-roller neon ticker marquee (`.casino-neon-ticker`), cyber cyan, electric magenta, and gold ambient neon light washes, and rich jewel-tone borders.
- **Celestial Constellations:** Expanded background SVG with Pegasus Wing, Cassiopeia (Celestial Throne), and Cygnus (Northern Cross), accompanied by twinkling and radiating starfield animations (`@keyframes starTwinkle`, `@keyframes starRadiance`).

### 20. 25-Run Performance & 25-Run Graphics/Alerts Benchmark Suites ✅ COMPLETED & VERIFIED
- **`simulate_performance_25_runs.py` (25/25 PASS):** Rigorous algorithmic benchmarks covering 52-card shuffles, 5-card/7-card/Short Deck/Omaha evaluations, pot odds, side pot latency, JSON serialization, 60 FPS trigonometry, and 100-hand tournament runtime.
- **`simulate_graphics_and_alerts_25_runs.py` (25/25 PASS):** Validates zero emojis in HTML/CSS, zero native browser alerts/confirms, in-game alert modal DOM, name gating, savings buy-in deductions, roulette pointer presence, slot cabinet components, neon ticker, and constellations.

---

## 🚀 Git & Deployment Quick Reference
- Working Directory: `c:\Users\marcu\OneDrive\Desktop\python\texas hold'em`
- Branch: `main`
- Origin Remote: `https://github.com/marcusnghiem-ux/poker.git` (Powers Vercel)
- Texas Hold'em Remote: `https://github.com/marcusnghiem-ux/texas-holdem.git`
- Production URL: `https://solarflare-hub-iota.vercel.app/`

### 21. v1.01 Release: Solar Flare Visual Overhaul, Animations & Universal Buy-In ✅ COMPLETED & VERIFIED
- **Production Deployment Target:** `https://solarflare-hub-iota.vercel.app/`
- **Update Log Modal (v1.01):**
  - Added `#btn-update-log-trigger` in top navigation bar (`.site-top-bar`) and `#menu-update-log-trigger` in `.menu-hero`.
  - Detailed modal `#update-log-modal` titled **"1.01 - Solar Flare Graphics & Visual Overhaul"** detailing geometry dash vector art, card deal/fold physics, flying chip animations, universal save file buy-in prompt, and expanded wagering controls.
- **Solar Flare Geometric Dash Vector Artwork (Photos 1 & 2):**
  - **Photo 1 Geometry:** Top and bottom fiery molten sawblades (`.solar-sawblade-svg`), rotating 8-spoke radiant gear medallions (`.gear-sun-medallion`), diagonal glowing laser arrows (`.laser-energy-arrow`), and floating diamond shards.
  - **Photo 2 Geometry:** Cosmic celestial space portal disc (`.cosmic-portal-disc`) with midnight indigo interior, molten planetary crust framing, zig-zag constellation beams, and radiant 4-pointed orbital starbursts.
- **Motion & Table Physics Animations:**
  - **Card Dealing:** Newly dealt cards play 3D rotational flip and glide-in animation (`.card-deal-anim`).
  - **Card Folding:** Folded hands tilt and gracefully muck into the discard zone (`.card-folded-anim`).
  - **Betting Chips Flight:** Posting bets triggers flying chip tokens (`.flying-chip-token`) traveling from player seats directly into the table pot.
  - **Victory Pot Sweep:** Showdown and fold wins trigger `.pot-victory-sweep` pulsing glow and flying chips from pot to winner stack.
- **Universal Save File Buy-In Selection (Min $1,000):**
  - Entering ANY save slot (starting a new run or continuing an active run) prompts the player for how much to enter with (minimum $1,000) drawn from their Cumulative Savings Vault. Zero free chip spawns.
- **Preset & Custom Casino Wagers:**
  - European Roulette and Slot Machines feature exact preset buttons: `$10`, `$50`, `$100`, `$1,000`, and `Custom`.
  - Clicking `Custom` opens `#custom-wager-modal` with numeric validation ($\ge \$10$ and $\le$ wallet balance).
- **Zero Emojis:** Strictly 0 emojis in rendered HTML and CSS.
- **75 Simulation Runs:** 25 Engine Performance + 25 Graphics/Alerts + 25 Gameplay Simulation runs all passing 100%.
### 22. v1.015 Release: Royal Solar Craps, 3-Hour Allowances & Scaled Background Geometry ✅ COMPLETED & VERIFIED
- **Production Target:** `https://solarflare-hub-iota.vercel.app/`
- **Update Log Hierarchy:**
  - Header & Trigger pill updated to **v1.015**.
  - Latest notes for 1.015 placed **first** at top of `#update-log-modal`.
  - All existing 1.01 release notes pushed down cleanly under an archive divider.
- **Royal Solar Craps Table (`#craps-arena-card`):**
  - Added Craps as a third premier game to the Solar Flare Casino Resort alongside European Roulette and 100x Slots.
  - Implements authentic Las Vegas Craps rules:
    - Pass Line (1:1 payout, wins 7/11, loses 2/3/12 on come-out).
    - Don't Pass (1:1 payout, wins 2/3, pushes 12, loses 7/11 on come-out).
    - Point Phase: Tracks ON/OFF puck indicator (`#craps-point-display`), hit point wins Pass Line, 7-out wins Don't Pass.
    - Single-Roll Field Bet: 2 pays 2:1, 12 pays 3:1, 3/4/9/10/11 pay 1:1, 5/6/7/8 lose.
    - One-Roll Props: Any 7 (4:1 payout), Any Craps 2/3/12 (7:1 payout).
    - Hardways: Hard 6 (9:1) and Hard 8 (9:1).
  - Authentic 3D tumbling dice physics (`@keyframes diceTumble`) and pure SVG dice graphics (`renderCrapsDieSVG()`, strictly zero emojis).
  - Standardized wager controls: `$10`, `$50`, `$100`, `$1,000`, and `Custom` presets.
- **Accelerated 3-Hour Allowance Cycle:**
  - Reduced `EconomyManager.CYCLE_MS` from 24 hours to **3 hours** (`3 * 60 * 60 * 1000 = 10,800,000ms`).
  - Increased Mini-Game allowance from $500 to **$1,000** each claim/cashout.
  - Real-time countdown timers synchronized across all UI headers, casino floors, and economy dashboards.
- **Refined Background Geometry (Slightly Smaller, Clean & Uncluttered):**
  - Rescaled molten sawblade trims to 36px height (`.solar-sawblade-svg`) with 0.42 opacity.
  - Added Central Solar Diamond Core with glowing inner 3x3 dot matrix (Photo 1 motif).
  - Added Triple Glowing Neon Chevrons `>>>` on right edge (Photo 2 motif).
  - Rescaled laser wave arrows (`scale(0.68)`) and cosmic portal disc (`scale(0.72)`) for high-contrast gameplay visibility.
- **75 Simulation Runs:** 25 Engine Performance + 25 Graphics/Alerts + 25 Gameplay Simulation runs all passing 100%.

- Verification Suite:
  - `python verify_syntax.py`
  - `python simulate_10_runs.py`
  - `python simulate_25_runs.py`
  - `python simulate_performance_25_runs.py`
  - `python simulate_graphics_and_alerts_25_runs.py`
  - `python test_poker.py`
  - `python scratch/check_index_ids.py`
  - `python scratch/find_emojis.py`
  - `python scratch/test_allin_elimination.py`
  - `python scratch/test_factory_reset_and_variants.py`
## 23. RELEASE 1.02: SLOT FIX, QUICK CRAPS, EXPLICIT WIN/LOSS, TOP-LAYER ALERTS & SOLAR FLARE DECO

### Changes Completed in v1.02
- **Slot Machine Engine Bug Fix:**
  - Resolved ReferenceError: payout is not defined in showCasinoView().
  - Resolved infinite recursive loop in 
equirePlayerName() when player was already registered, permanently fixing slot button clicks and mechanical lever pulls.
- **Explicit Win & Loss Reporting:**
  - Every single spin, dice roll, and roulette wheel spin explicitly displays the net amount won or lost (e.g. +,500 Won! (Net profit: +,450) or LOST - on this spin).
- **Quick Craps Dashboard Portal:**
  - Added #btn-quick-craps-portal positioned directly above the Casino Resort card on the main poker dashboard at ~40% compact scale for instant dice action.
- **In-Game Craps Rules Guide:**
  - Integrated #btn-craps-rules button with modal dialog explaining Come-Out rolls, Point phase, Single-roll Field wagers, Any 7, Any Craps, and Hardways.
- **Top-Layer In-Game Alerts:**
  - Fixed #in-game-modal-alert to position: fixed !important; inset: 0 !important; z-index: 9999999 !important; with .in-game-alert-card centered at max-width: 480px (normal size) ensuring zero browser alerts and total visibility above headers, drawers, and canvases.
- **Layer 0 Solar Flare Geometric Art & Starfield:**
  - Enriched Layer 0 directly capturing all 4 Geometry Dash Solar Flare reference screenshots:
    - Cosmic perspective grid lattice (48px warm gold lines).
    - Deep celestial blue constellation portal with glowing star nodes and constellation lines (Screenshot 2).
    - Blazing solar sun with radiant corona rings and satellite diamonds (Screenshots 1, 3, 4).
    - Rotating solar spiky cogs/gears with 8 and 12 triangular teeth and slow spin keyframe animations (Screenshots 1, 3, 4).
    - Signature neon white zigzag wave trail with pink arrow ship head (Screenshots 1, 2, 3, 4).
    - Floating amber rhombus shards and radiant 4-pointed sparkle stars.
    - Subtle top and bottom sawtooth border trims.
- **Full Verification:**
  - 25 Engine Performance + 25 Graphics/Alerts + 25 Gameplay Simulation runs (75/75 tests passing).
  - 100% SVG vector graphics (0 system emojis in rendered HTML/CSS).
