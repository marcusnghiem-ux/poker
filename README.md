# ♠ ♥ ♦ ♣ Royal Texas Hold'em (Web & Python)

A full-featured Texas Hold'em Poker suite featuring both an **interactive Web App for iPad, iPhone, and desktop browsers** and a **terminal-based Python tournament engine** with aggressive AI bots, dynamic blind escalation, player-favoring adrenaline pot-building mechanics, 3 save slots, and side pot management.

---

## 🌟 Key Features

* **Interactive Main Menu & 3 Save Slots:**
  - Save runs across **3 dedicated save slots** (`localStorage` for Web, JSON profiles for Python).
  - Slot cards display live statistics: **current bankroll, round count, bot difficulty, win/loss record**, and blinds.
  - Continue previous runs, start new campaigns, or overwrite/delete existing saves anytime.
* **Bot Difficulty Selection:**
  - Choose between **Easy**, **Medium**, or **Hard (Aggressive)** when creating any run.
  - Hard mode features relentless pre-flop 3-betting, continuation bets, fearless multi-street bluffs, and light calls.
* **Adrenaline / Pot-Building Mechanics:**
  - Whenever the player receives a strong starting hand (Tier 1 Monster or Tier 2 Strong), the engine adapts card distribution so a rival bot receives a competitive hand (~25% chance of being slightly better).
  - The rival bot gains temporary aggression boosts to spark massive pots and dramatic showdowns.
* **Dynamic Blind Structure:**
  - Small and Big Blinds automatically escalate every 5 rounds ($10/$20 → $20/$40 → $40/$80 → $80/$160 → $160/$320+) to enforce tournament pressure.
* **Side Pot Calculation:**
  - Mathematical partitioning of main and side pots for multi-way all-in situations.
* **Comprehensive Rules & Poker Guide:**
  - Dedicated interactive rules modal explaining 10 hand rankings (with card examples), game flow, betting rounds, dynamic blinds, and bot personas.

---

## 📱 Play on iPad / Mobile (Web Edition)

The game includes a self-contained, luxury-styled web app ready for mobile and tablet touchscreens:

1. **Host on GitHub Pages**:
   - In your GitHub repository settings, navigate to **Pages**.
   - Under **Build and deployment**, set branch to `main` and folder to `/(root)`.
   - Click **Save**.
2. **Open on iPad or Mobile**:
   - Open Safari and navigate to your GitHub Pages URL:  
     `https://marcusnghiem-ux.github.io/texas-holdem/`
   - Tap the Safari **Share** icon (square with arrow up).
   - Select **"Add to Home Screen"** to play in full screen like a native iPad app!

### Web Features:
- Clean Main Menu with 3 clickable Save Cards & delete confirmations.
- Touch-friendly table controls (Check/Call, Bet/Raise slider, All-In, Fold).
- Synthesized casino sound effects (chips, cards, knocks, victory arpeggios).
- 4 distinct AI personas: **Viper** (Shark), **Atlas** (Solid), **Luna** (Nit), and **Duke** (Maniac).
- Real-time side pots container, hand rank badges, and dynamic blind banners.

---

## 💻 Terminal / Python Edition

To run the Python version on Windows, macOS, or Linux:

1. Open your terminal or PowerShell in the project directory:
   ```powershell
   python main.py
   ```
2. Interact with the CLI Main Menu:
   - Select **[1]**, **[2]**, or **[3]** to start, continue, or manage a save slot.
   - Choose your name, starting chips, number of AI bots (1 to 5), and difficulty setting.
   - Press **[R]** to view the in-terminal Rules & Info guide.
   - Execute moves during play: `[C]`heck / `[C]`all, `[B]`et / `[R]`aise, `[A]`ll-In, or `[F]`old.

---

## 🧪 Automated Testing & Simulation

Run the automated test suite verifying 10–20 hands simulation, side pots, hand evaluation, blind escalation, and JSON save/load:

```powershell
python -m unittest test_poker.py
```

---

## 📁 Project Structure

| File | Description |
|---|---|
| [`index.html`](index.html) | Web interface featuring the Main Menu, 3 Save Slots, table arena, and Rules Guide |
| [`style.css`](style.css) | Luxury casino dark theme styling, slot card layouts, and responsive touch adjustments |
| [`app.js`](app.js) | Web game engine with adrenaline dealing, aggressive AI, dynamic blinds, and side pots |
| [`main.py`](main.py) | Python CLI Main Menu, JSON save manager (3 slots), and tournament controller |
| [`game.py`](game.py) | Python `TexasHoldemGame` engine with adrenaline distribution, blinds, and side pots |
| [`player.py`](player.py) | Human player and `AIPlayer` bots with difficulty scaling and aggression heuristics |
| [`pot_manager.py`](pot_manager.py) | Main and side pot manager for multi-way all-in scenarios |
| [`evaluator.py`](evaluator.py) | 7-card combinatorial evaluator and kicker tie-breaking logic |
| [`card.py`](card.py) | Deck handling and side-by-side ANSI/ASCII card graphics |
| [`test_poker.py`](test_poker.py) | Automated test suite (15-hand simulation, side-pots, adrenaline, blinds, saves) |
