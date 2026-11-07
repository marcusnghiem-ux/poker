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
- Enhanced Solar Flare & Constellation theme with glowing amber accents, warm cosmic nebulae, and crisp radiant star fields in the background layer while preserving table felt contrast.

---

## 🚀 Git & Deployment Quick Reference
- Working Directory: `c:\Users\marcu\OneDrive\Desktop\python\texas hold'em`
- Branch: `main`
- Origin Remote: `https://github.com/marcusnghiem-ux/poker.git` (Powers Vercel)
- Texas Hold'em Remote: `https://github.com/marcusnghiem-ux/texas-holdem.git`
- Production URL: `https://myimathss.vercel.app/`
- Verification Suite:
  - `python verify_syntax.py`
  - `python simulate_10_runs.py`
  - `python test_poker.py`
  - `python scratch/check_index_ids.py`
  - `python scratch/test_allin_elimination.py`
  - `python scratch/test_factory_reset_and_variants.py`

