import unittest
import os
import tempfile
from card import Card, Deck, render_cards_ascii
from evaluator import (
    evaluate_5_cards, evaluate_hand,
    STRAIGHT_FLUSH, FOUR_OF_A_KIND, FULL_HOUSE, FLUSH, STRAIGHT,
    THREE_OF_A_KIND, TWO_PAIR, ONE_PAIR, HIGH_CARD
)
from pot_manager import PotManager
from player import AIPlayer, Player, HumanPlayer
from game import TexasHoldemGame
from main import save_game_state, load_game_state, get_slot_summary, delete_slot


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
        bot.fast_mode = True
        bot.cards = [Card(14, 'Spades'), Card(14, 'Hearts')]
        action, amt = bot.decide_action(to_call=0, min_raise=20, pot=40, community_cards=[])
        self.assertIn(action, ["check", "raise"])


class TestAutomatedSimulation(unittest.TestCase):
    """Runs 15 automated hands to detect logic bugs."""

    def test_simulate_full_game(self):
        """Simulate 15 hands with all bot players to check for crashes."""
        bots = [
            AIPlayer("Viper (A)", 1000, personality="Aggressive", difficulty="Hard"),
            AIPlayer("Luna (C)", 1000, personality="Conservative", difficulty="Medium"),
            AIPlayer("Atlas (B)", 1000, personality="Balanced", difficulty="Easy"),
            AIPlayer("Duke (A)", 1000, personality="Aggressive", difficulty="Medium"),
            AIPlayer("Sam (B)", 1000, personality="Balanced", difficulty="Hard"),
        ]
        total_starting_chips = sum(p.chips for p in bots)
        self.assertEqual(total_starting_chips, 5000)

        game = TexasHoldemGame(players=bots, small_blind=10, big_blind=20, fast_mode=True)

        for _ in range(15):
            if len(game.players) <= 1:
                break
            game.play_hand()
            game.prune_busted_players()
            game.advance_dealer()

        # Check all chip totals are conserved (total chips in = total chips out)
        surviving_chips = sum(p.chips for p in game.players)
        self.assertEqual(surviving_chips, total_starting_chips)

        # Check no negative chip counts
        for p in game.players:
            self.assertGreaterEqual(p.chips, 0)

        # Check blind escalation works
        if game.hand_number >= 11:
            self.assertEqual(game.small_blind, 40)
            self.assertEqual(game.big_blind, 80)
        elif game.hand_number >= 6:
            self.assertEqual(game.small_blind, 20)
            self.assertEqual(game.big_blind, 40)

    def test_side_pot_complex(self):
        """Test 3-way all-in with different bet levels."""
        p1 = Player("P1", 0)
        p1.total_bet = 100
        p1.all_in = True

        p2 = Player("P2", 0)
        p2.total_bet = 250
        p2.all_in = True

        p3 = Player("P3", 0)
        p3.total_bet = 500
        p3.all_in = False

        pots = PotManager.calculate_side_pots([p1, p2, p3])
        self.assertEqual(len(pots), 3)

        # Pot 1 (Main Pot): $100 from each player = $300, eligible: [p1, p2, p3]
        self.assertEqual(pots[0].amount, 300)
        self.assertEqual(set(pots[0].eligible_players), {p1, p2, p3})

        # Pot 2 (Side Pot 1): ($250 - $100) = $150 from p2 and p3 = $300, eligible: [p2, p3]
        self.assertEqual(pots[1].amount, 300)
        self.assertEqual(set(pots[1].eligible_players), {p2, p3})

        # Pot 3 (Side Pot 2): ($500 - $250) = $250 from p3 = $250, eligible: [p3]
        self.assertEqual(pots[2].amount, 250)
        self.assertEqual(set(pots[2].eligible_players), {p3})

        # Total chips conserved
        self.assertEqual(sum(p.amount for p in pots), 850)

    def test_adrenaline_mechanic(self):
        """Test that adrenaline dealing produces valid hands."""
        human = HumanPlayer("Hero", 1000)
        bots = [
            AIPlayer("Bot1", 1000, "Balanced"),
            AIPlayer("Bot2", 1000, "Conservative"),
            AIPlayer("Bot3", 1000, "Aggressive")
        ]
        game = TexasHoldemGame(players=[human] + bots, small_blind=10, big_blind=20, fast_mode=True)

        # 1. Human has Tier 1 hand (Pocket Aces)
        game.deck.reset()
        for p in game.players:
            p.reset_for_hand()

        # Place AA at top of deck so human is dealt AA without card duplication
        aa_cards = [Card(14, 'Spades'), Card(14, 'Hearts')]
        deck_without_aa = [c for c in game.deck.cards if c not in aa_cards]
        game.deck.cards = deck_without_aa + aa_cards

        human.cards = game.deck.deal(2)
        for b in bots:
            b.cards = game.deck.deal(2)

        activated = game.apply_adrenaline_mechanic()
        self.assertTrue(activated)
        self.assertTrue(game.adrenaline_active)

        # Exactly one bot receives adrenaline
        boosted_bots = [b for b in bots if getattr(b, "adrenaline_active", False)]
        self.assertEqual(len(boosted_bots), 1)

        # Boosted bot has a Tier 1 or Tier 2 hand
        boosted_bot = boosted_bots[0]
        bot_tier = boosted_bot.evaluate_preflop_tier()
        self.assertIn(bot_tier, [1, 2])

        # Verify card integrity: all 52 cards unique across hands and deck
        all_cards = human.cards + [c for b in bots for c in b.cards] + game.deck.cards
        self.assertEqual(len(all_cards), 52)
        self.assertEqual(len(set(all_cards)), 52)

        # 2. Human has Tier 4 trash (7-2 offsuit): should NOT trigger
        game.deck.reset()
        for p in game.players:
            p.reset_for_hand()

        trash_cards = [Card(7, 'Spades'), Card(2, 'Hearts')]
        deck_without_trash = [c for c in game.deck.cards if c not in trash_cards]
        game.deck.cards = deck_without_trash + trash_cards

        human.cards = game.deck.deal(2)
        for b in bots:
            b.cards = game.deck.deal(2)

        activated_trash = game.apply_adrenaline_mechanic()
        self.assertFalse(activated_trash)
        self.assertFalse(game.adrenaline_active)

        all_cards_trash = human.cards + [c for b in bots for c in b.cards] + game.deck.cards
        self.assertEqual(len(all_cards_trash), 52)
        self.assertEqual(len(set(all_cards_trash)), 52)

    def test_blind_escalation(self):
        """Test that blinds increase correctly every 5 hands."""
        bots = [AIPlayer("B1", 1000), AIPlayer("B2", 1000)]
        game = TexasHoldemGame(players=bots, small_blind=10, big_blind=20, fast_mode=True)

        escalation_schedule = [
            (1, 10, 20),
            (2, 10, 20),
            (5, 10, 20),
            (6, 20, 40),
            (10, 20, 40),
            (11, 40, 80),
            (15, 40, 80),
            (16, 80, 160),
            (20, 80, 160),
            (21, 160, 320),
            (25, 160, 320),
            (30, 160, 320),
        ]

        for hand, exp_sb, exp_bb in escalation_schedule:
            game.hand_number = hand
            game.update_blinds()
            self.assertEqual(game.small_blind, exp_sb, f"Hand {hand}: SB expected {exp_sb}, got {game.small_blind}")
            self.assertEqual(game.big_blind, exp_bb, f"Hand {hand}: BB expected {exp_bb}, got {game.big_blind}")

    def test_save_load(self):
        """Test save/load JSON round-trip."""
        with tempfile.TemporaryDirectory() as tmpdir:
            sample_state = {
                "player_name": "Marcus",
                "chips": 1450,
                "hand_number": 12,
                "difficulty": "Hard",
                "wins": 7,
                "losses": 5,
                "bot_chips": {
                    "Viper (A)": 850,
                    "Luna (C)": 920,
                    "Atlas (B)": 780
                },
                "small_blind": 40,
                "big_blind": 80
            }

            # Test save to slot 2
            saved = save_game_state(2, sample_state, save_dir=tmpdir)
            self.assertTrue(saved)

            # Test load from slot 2
            loaded = load_game_state(2, save_dir=tmpdir)
            self.assertIsNotNone(loaded)
            self.assertEqual(loaded["player_name"], "Marcus")
            self.assertEqual(loaded["chips"], 1450)
            self.assertEqual(loaded["hand_number"], 12)
            self.assertEqual(loaded["difficulty"], "Hard")
            self.assertEqual(loaded["wins"], 7)
            self.assertEqual(loaded["losses"], 5)
            self.assertEqual(loaded["bot_chips"], sample_state["bot_chips"])
            self.assertEqual(loaded["small_blind"], 40)
            self.assertEqual(loaded["big_blind"], 80)

            # Test summary string
            summary = get_slot_summary(2, save_dir=tmpdir)
            self.assertEqual(summary, "$1,450 | Round 12 | Hard | 7 Wins")

            # Test empty slot summary
            empty_summary = get_slot_summary(1, save_dir=tmpdir)
            self.assertEqual(empty_summary, "Empty - Start New Game")

            # Test delete slot
            deleted = delete_slot(2, save_dir=tmpdir)
            self.assertTrue(deleted)
            self.assertEqual(get_slot_summary(2, save_dir=tmpdir), "Empty - Start New Game")

    def test_ai_difficulty_scaling(self):
        """Test that AIPlayer scales personality traits according to difficulty."""
        # Easy
        bot_easy = AIPlayer("EasyBot", 1000, personality="Aggressive", difficulty="Easy")
        self.assertAlmostEqual(bot_easy.traits["aggression"], 2.0 * 0.6, places=2)
        self.assertAlmostEqual(bot_easy.traits["bluff_freq"], 0.38 * 0.3, places=2)
        self.assertAlmostEqual(bot_easy.traits["cbet_freq"], 0.85 * 0.5, places=2)
        self.assertAlmostEqual(bot_easy.traits["call_tightness"], 0.8 * 1.4, places=2)

        # Medium (base values)
        bot_med = AIPlayer("MedBot", 1000, personality="Aggressive", difficulty="Medium")
        self.assertEqual(bot_med.traits["aggression"], 2.0)
        self.assertEqual(bot_med.traits["bluff_freq"], 0.38)
        self.assertEqual(bot_med.traits["cbet_freq"], 0.85)
        self.assertEqual(bot_med.traits["call_tightness"], 0.8)

        # Hard
        bot_hard = AIPlayer("HardBot", 1000, personality="Aggressive", difficulty="Hard")
        self.assertAlmostEqual(bot_hard.traits["aggression"], 2.0 * 1.5, places=2)
        self.assertAlmostEqual(bot_hard.traits["bluff_freq"], min(1.0, 0.38 * 1.5), places=2)
        self.assertAlmostEqual(bot_hard.traits["cbet_freq"], min(1.0, 0.85 * 1.2), places=2)
        self.assertAlmostEqual(bot_hard.traits["call_tightness"], 0.8 * 0.65, places=2)


if __name__ == "__main__":
    unittest.main()
