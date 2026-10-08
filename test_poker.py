import unittest
from card import Card, Deck, render_cards_ascii
from evaluator import (
    evaluate_5_cards, evaluate_hand,
    STRAIGHT_FLUSH, FOUR_OF_A_KIND, FULL_HOUSE, FLUSH, STRAIGHT,
    THREE_OF_A_KIND, TWO_PAIR, ONE_PAIR, HIGH_CARD
)
from pot_manager import PotManager
from player import AIPlayer, Player


class TestTexasHoldem(unittest.TestCase):

    def test_deck(self):
        deck = Deck()
        self.assertEqual(len(deck), 52)
        dealt = deck.deal(5)
        self.assertEqual(len(dealt), 5)
        self.assertEqual(len(deck), 47)

    def test_wheel_straight(self):
        # A, 2, 3, 4, 5
        cards = [
            Card(14, 'Spades'),
            Card(2, 'Hearts'),
            Card(3, 'Diamonds'),
            Card(4, 'Clubs'),
            Card(5, 'Spades')
        ]
        score, desc = evaluate_5_cards(cards)
        self.assertEqual(score[0], STRAIGHT)
        self.assertEqual(score[1][0], 5)

    def test_full_house(self):
        cards = [
            Card(10, 'Spades'),
            Card(10, 'Hearts'),
            Card(10, 'Diamonds'),
            Card(4, 'Clubs'),
            Card(4, 'Spades')
        ]
        score, desc = evaluate_5_cards(cards)
        self.assertEqual(score[0], FULL_HOUSE)
        self.assertEqual(score[1], (10, 4))

    def test_four_of_a_kind(self):
        cards = [
            Card(13, 'Spades'),
            Card(13, 'Hearts'),
            Card(13, 'Diamonds'),
            Card(13, 'Clubs'),
            Card(7, 'Spades')
        ]
        score, desc = evaluate_5_cards(cards)
        self.assertEqual(score[0], FOUR_OF_A_KIND)
        self.assertEqual(score[1], (13, 7))

    def test_7_card_evaluator(self):
        hole = [Card(14, 'Spades'), Card(14, 'Hearts')]
        comm = [
            Card(14, 'Diamonds'),
            Card(9, 'Clubs'),
            Card(9, 'Spades'),
            Card(2, 'Hearts'),
            Card(3, 'Clubs')
        ]
        score, desc, best = evaluate_hand(hole, comm)
        self.assertEqual(score[0], FULL_HOUSE)
        self.assertEqual(score[1], (14, 9))
        self.assertEqual(len(best), 5)

    def test_side_pots(self):
        p1 = Player("P1", 0)
        p1.total_bet = 50
        p1.all_in = True

        p2 = Player("P2", 0)
        p2.total_bet = 100

        p3 = Player("P3", 0)
        p3.total_bet = 150

        pots = PotManager.calculate_side_pots([p1, p2, p3])
        self.assertEqual(len(pots), 3)
        self.assertEqual(pots[0].amount, 150)  # 50 * 3
        self.assertEqual(pots[1].amount, 100)  # 50 * 2
        self.assertEqual(pots[2].amount, 50)   # 50 * 1

    def test_ai_decision(self):
        bot = AIPlayer("Bot", 1000, "Balanced")
        bot.cards = [Card(14, 'Spades'), Card(14, 'Hearts')]
        action, amt = bot.decide_action(to_call=0, min_raise=20, pot=40, community_cards=[])
        self.assertIn(action, ["check", "raise"])


if __name__ == "__main__":
    unittest.main()
