# ♠ ♥ ♦ ♣ Royal Texas Hold'em (Web & Python)

A full-featured Texas Hold'em Poker suite featuring both an **interactive Web App for iPad, iPhone, and desktop browsers** and a **terminal-based Python tournament engine** with smart AI bots, side pot calculations, and realistic poker dynamics.

---

## 📱 Play on iPad / Mobile (Web Edition)

The game includes a self-contained, luxury-styled web app ready for mobile and tablet touchscreens:

1. **Host on GitHub Pages**:
   - In your GitHub repository settings, go to **Pages**.
   - Under **Build and deployment**, set branch to `main` and folder to `/(root)`.
   - Click **Save**.
2. **Open on iPad**:
   - Open Safari and navigate to your GitHub Pages URL:  
     `https://marcusnghiem-ux.github.io/<repository-name>/`
   - Tap the Safari **Share** icon (square with arrow up).
   - Select **"Add to Home Screen"** to play in full screen like a native iPad app!

### Web Features:
- Touch-friendly controls (Check/Call, Bet/Raise slider, All-In, Fold).
- Synthesized casino sound effects (chips, cards, checks).
- 4 AI personas (Viper, Atlas, Luna, Duke).
- Live hand evaluation and win percentage hints.

---

## 💻 Terminal / Python Edition

To run the Python version on Windows, macOS, or Linux:

1. Open your terminal or PowerShell in the project directory:
   ```powershell
   python main.py
   ```
2. Follow the on-screen prompts:
   - Enter your name and starting chip count.
   - Choose the number of AI opponents (1 to 5).
   - Choose your move: `[C]`heck / `[C]`all, `[B]`et / `[R]`aise, `[A]`ll-In, or `[F]`old.

> **Tip for iPad users wanting Python**: You can run `main.py` directly on your iPad in Safari using **GitHub Codespaces** (free on GitHub), or using apps like **Pythonista 3** or **Carnets**.

---

## 📁 Project Structure

| File | Description |
|---|---|
| [`index.html`](index.html) | Web interface optimized for iPad, mobile, and desktop |
| [`style.css`](style.css) | Luxury casino dark theme styling and responsive layouts |
| [`app.js`](app.js) | Client-side poker game engine, AI logic, and audio synthesizer |
| [`main.py`](main.py) | Python tournament launcher and interactive CLI loop |
| [`game.py`](game.py) | Python `TexasHoldemGame` controller and blind progression |
| [`evaluator.py`](evaluator.py) | 7-card evaluator and kicker tie-breaking logic |
| [`pot_manager.py`](pot_manager.py) | Main and side pot manager for all-in scenarios |
| [`player.py`](player.py) | Python human player and AI bots with distinct personalities |
| [`card.py`](card.py) | Deck handling and ASCII card graphics |
| [`test_poker.py`](test_poker.py) | Unit tests verifying hand evaluation and pot logic |
