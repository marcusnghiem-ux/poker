import unittest
import math

class Card:
    def __init__(self, rank, suit='♠'):
        self.rank = rank
        self.suit = suit

def calculate_bj_score(cards):
    total = 0
    aces = 0
    for card in cards:
        if card.rank == 14: # Ace
            aces += 1
            total += 11
        elif card.rank >= 10:
            total += 10
        else:
            total += card.rank
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    return {
        'total': total,
        'isBust': total > 21,
        'isBlackjack': len(cards) == 2 and total == 21,
        'isSoft': aces > 0
    }

class TestBlackjackEngine(unittest.TestCase):
    def test_scores(self):
        # Ace + King = 21 (Natural Blackjack)
        hand1 = [Card(14), Card(13)]
        s1 = calculate_bj_score(hand1)
        self.assertEqual(s1['total'], 21)
        self.assertTrue(s1['isBlackjack'])
        self.assertFalse(s1['isBust'])

        # Ace + 6 = 17 (Soft 17)
        hand2 = [Card(14), Card(6)]
        s2 = calculate_bj_score(hand2)
        self.assertEqual(s2['total'], 17)
        self.assertFalse(s2['isBlackjack'])
        self.assertTrue(s2['isSoft'])

        # Ace + 6 + 10 = 17 (Hard 17, ace reduced to 1)
        hand3 = [Card(14), Card(6), Card(10)]
        s3 = calculate_bj_score(hand3)
        self.assertEqual(s3['total'], 17)
        self.assertFalse(s3['isSoft'])
        self.assertFalse(s3['isBust'])

        # Two Aces = 12 (11 + 1)
        hand4 = [Card(14), Card(14)]
        s4 = calculate_bj_score(hand4)
        self.assertEqual(s4['total'], 12)
        self.assertTrue(s4['isSoft'])

        # 10 + 6 + 7 = 23 (Bust)
        hand5 = [Card(10), Card(6), Card(7)]
        s5 = calculate_bj_score(hand5)
        self.assertEqual(s5['total'], 23)
        self.assertTrue(s5['isBust'])

    def test_natural_payout_3_to_2(self):
        bet = 100
        profit = math.floor(bet * 1.5)
        total_payout = bet + profit
        self.assertEqual(profit, 150)
        self.assertEqual(total_payout, 250)

    def test_dealer_stand_on_17(self):
        # Dealer must stand on 17 or higher
        dealer_cards = [Card(10), Card(7)]
        s = calculate_bj_score(dealer_cards)
        self.assertGreaterEqual(s['total'], 17)

        # Dealer draws on 16
        dealer_cards = [Card(10), Card(6)]
        s = calculate_bj_score(dealer_cards)
        self.assertLess(s['total'], 17)

    def test_surrender(self):
        bet = 100
        refund = math.floor(bet / 2)
        self.assertEqual(refund, 50)

    def test_double_down(self):
        bankroll = 500
        bet = 50
        # Deduct bet
        bankroll -= bet
        # Double down
        extra = min(bet, bankroll)
        bankroll -= extra
        bet += extra
        self.assertEqual(bet, 100)
        self.assertEqual(bankroll, 400)

if __name__ == '__main__':
    unittest.main()
