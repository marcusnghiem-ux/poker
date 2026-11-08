import unittest
import json
import re

def calculate_bot_starting_stack(player_buy_in):
    buy_in = int(player_buy_in)
    if buy_in < 2000:
        return buy_in
    s = str(buy_in)
    d = int(s[0])
    mag = 10 ** (len(s) - 1)
    min_val = max(100, int((d - 0.5) * mag))
    max_val = int((d + 0.5) * mag)
    step = 100 if mag >= 10000 else 25
    steps = max(1, (max_val - min_val) // step)
    import random
    chosen = random.randrange(0, steps)
    return min_val + chosen * step

class TestUpdate119(unittest.TestCase):

    def test_bot_stack_below_2000(self):
        self.assertEqual(calculate_bot_starting_stack(1000), 1000)
        self.assertEqual(calculate_bot_starting_stack(1500), 1500)
        self.assertEqual(calculate_bot_starting_stack(1999), 1999)

    def test_bot_stack_10000_bounds(self):
        # User specified: if player brings 10,000, 5000 <= x < 15000 randomized
        for _ in range(500):
            stack = calculate_bot_starting_stack(10000)
            self.assertGreaterEqual(stack, 5000)
            self.assertLess(stack, 15000)
            self.assertEqual(stack % 100, 0)

    def test_bot_stack_2000_bounds(self):
        # 2000 -> [1500, 2500)
        for _ in range(500):
            stack = calculate_bot_starting_stack(2000)
            self.assertGreaterEqual(stack, 1500)
            self.assertLess(stack, 2500)
            self.assertEqual(stack % 25, 0)

    def test_bot_stack_high_roller_bounds(self):
        # 25,000 -> d=2, mag=10,000 -> [15,000, 25,000)
        for _ in range(500):
            stack = calculate_bot_starting_stack(25000)
            self.assertGreaterEqual(stack, 15000)
            self.assertLess(stack, 25000)

        # 50,000 -> d=5, mag=10,000 -> [45,000, 55,000)
        for _ in range(500):
            stack = calculate_bot_starting_stack(50000)
            self.assertGreaterEqual(stack, 45000)
            self.assertLess(stack, 55000)

    def test_infinite_money_glitch_protection_in_js(self):
        with open('app.js', 'r', encoding='utf-8') as f:
            js = f.read()

        # Check safeguard in startNewGame
        self.assertIn('if (!isPrePaid) {', js)
        self.assertIn('const savings = EconomyManager.getCumulativeSavings();', js)
        self.assertIn('if (savings < startingStack) {', js)
        self.assertIn('EconomyManager.deductCumulativeSavings(startingStack);', js)

        # Check safeguard in btnQuickRebuy
        self.assertIn('Quick Rebuy requires a $1,000 buy-in from your Savings Vault', js)

        # Check safeguard in teleportToTexasHoldem
        self.assertIn('Starting a Texas Hold\'em run requires a minimum $1,000 buy-in', js)

    def test_stats_current_and_lifetime_earnings(self):
        with open('index.html', 'r', encoding='utf-8') as f:
            html = f.read()

        self.assertIn('id="stat-career-current-earnings"', html)
        self.assertIn('id="stat-career-lifetime-earnings"', html)
        self.assertIn('id="stat-breakdown-current-earnings"', html)
        self.assertIn('id="stat-breakdown-lifetime-earnings"', html)

        with open('app.js', 'r', encoding='utf-8') as f:
            js = f.read()

        self.assertIn('totalLifetimeEarnings', js)
        self.assertIn('sCurrentEarnings', js)
        self.assertIn('sLifetimeEarnings', js)

    def test_update_12_announcement(self):
        with open('index.html', 'r', encoding='utf-8') as f:
            html = f.read()

        self.assertIn('UPDATE 1.2 IS COMING &bull; BIG EXPANSION', html)
        self.assertIn('UPDATE 1.2 IS COMING', html)
        self.assertIn('lb-major-expansion-card', html)

    def test_zero_stray_version_labels(self):
        with open('index.html', 'r', encoding='utf-8') as f:
            html = f.read()

        # Verify 1.19 is active
        self.assertIn('Update 1.19', html)
        self.assertIn('v1.19 CURRENT', html)
        self.assertIn('UPDATE 1.19', html)

        # Ensure no obsolete 1.13 in active UI elements
        self.assertNotIn('<span class="update-pill-text">Update 1.13</span>', html)
        self.assertNotIn('START PLAYING UPDATE 1.13', html)
        self.assertNotIn('v1.13.</span', html)

if __name__ == '__main__':
    unittest.main()

