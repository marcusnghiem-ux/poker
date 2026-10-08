import time
import random
from typing import List, Tuple, Optional
from collections import Counter
from card import Card, render_cards_ascii, COLOR_RESET, COLOR_GOLD, COLOR_CYAN, COLOR_DIM
from evaluator import (
    evaluate_hand, HIGH_CARD, ONE_PAIR, TWO_PAIR, THREE_OF_A_KIND,
    STRAIGHT, FLUSH, FULL_HOUSE, FOUR_OF_A_KIND, STRAIGHT_FLUSH
)


class Player:
    def __init__(self, name: str, chips: int, is_bot: bool = False):
        self.name = name
        self.chips = chips
        self.is_bot = is_bot
        self.cards: List[Card] = []
        self.current_bet: int = 0
        self.total_bet: int = 0
        self.folded: bool = False
        self.all_in: bool = False

    def reset_for_hand(self):
        self.cards = []
        self.current_bet = 0
        self.total_bet = 0
        self.folded = False
        self.all_in = (self.chips == 0)

    def reset_for_betting_round(self):
        self.current_bet = 0

    def post_bet(self, amount: int) -> int:
        """Puts chips into the pot. If chips run out, player is all-in."""
        actual_amount = min(amount, self.chips)
        self.chips -= actual_amount
        self.current_bet += actual_amount
        self.total_bet += actual_amount
        if self.chips == 0:
            self.all_in = True
        return actual_amount

    def render_hand(self, hidden: bool = False) -> str:
        return render_cards_ascii(self.cards, hidden=hidden)

    def __repr__(self) -> str:
        status = " (Folded)" if self.folded else (" (All-in)" if self.all_in else "")
        return f"{self.name} (${self.chips}){status}"


class AIPlayer(Player):
    PERSONALITIES = {
        "Conservative": {
            "cbet_freq": 0.40,
            "bluff_freq": 0.05,
            "aggression": 0.7,
            "call_tightness": 1.25,
            "semi_bluff": 0.20
        },
        "Balanced": {
            "cbet_freq": 0.65,
            "bluff_freq": 0.16,
            "aggression": 1.1,
            "call_tightness": 1.0,
            "semi_bluff": 0.45
        },
        "Aggressive": {
            "cbet_freq": 0.85,
            "bluff_freq": 0.28,
            "aggression": 1.6,
            "call_tightness": 0.8,
            "semi_bluff": 0.70
        },
    }

    def __init__(self, name: str, chips: int, personality: str = "Balanced"):
        super().__init__(name, chips, is_bot=True)
        self.personality = personality
        self.traits = self.PERSONALITIES.get(personality, self.PERSONALITIES["Balanced"])
        self.was_preflop_raiser = False

    def reset_for_hand(self):
        super().reset_for_hand()
        self.was_preflop_raiser = False

    def evaluate_preflop_tier(self) -> int:
        """Returns Tier from 1 (Monster) to 4 (Trash) based on standard Texas Hold'em starting hand charts."""
        if len(self.cards) < 2:
            return 4

        r1, r2 = sorted([self.cards[0].rank, self.cards[1].rank], reverse=True)
        is_pair = (r1 == r2)
        is_suited = (self.cards[0].suit == self.cards[1].suit)
        diff = r1 - r2

        # Tier 1: Premium Monsters (AA, KK, QQ, JJ, AKs)
        if is_pair and r1 >= 11:
            return 1
        if is_suited and r1 == 14 and r2 == 13:
            return 1

        # Tier 2: Strong Hands (TT, 99, 88, AKo, AQs, AJs, KQs, AQo)
        if is_pair and r1 >= 8:
            return 2
        if r1 == 14 and r2 >= 12:
            return 2
        if is_suited and r1 == 14 and r2 >= 10:
            return 2
        if is_suited and r1 == 13 and r2 >= 11:
            return 2

        # Tier 3: Speculative / Playable (pocket pairs 77-22, suited connectors, suited Aces)
        if is_pair:
            return 3
        if is_suited and r1 == 14:  # Any suited Ace
            return 3
        if is_suited and diff == 1 and r2 >= 5:  # Suited connectors 65s to JTs
            return 3
        if is_suited and r1 >= 11 and r2 >= 9:
            return 3
        if not is_suited and r1 >= 13 and r2 >= 10:  # K-10, Q-10 offsuit
            return 3

        # Tier 4: Trash
        return 4

    def detect_draws(self, community_cards: List[Card]) -> Tuple[bool, bool]:
        """Detects if bot has a flush draw (4 cards of same suit) or open-ended straight draw."""
        all_cards = self.cards + community_cards
        if len(all_cards) < 5:
            return False, False

        # Flush draw check
        suits = [c.suit for c in all_cards]
        has_flush_draw = any(count == 4 for count in Counter(suits).values())

        # Straight draw check
        ranks = sorted(list(set(c.rank for c in all_cards)))
        if 14 in ranks:
            ranks = [1] + ranks  # Ace low support

        has_straight_draw = False
        for i in range(len(ranks) - 3):
            # 4 consecutive ranks = open-ended straight draw
            if ranks[i + 3] - ranks[i] == 3:
                has_straight_draw = True
                break

        return has_flush_draw, has_straight_draw

    def evaluate_effective_strength(self, community_cards: List[Card]) -> float:
        """Calculates hand strength + draw equity bonus from 0.0 to 1.0."""
        if not community_cards:
            tier = self.evaluate_preflop_tier()
            tier_scores = {1: 0.95, 2: 0.80, 3: 0.55, 4: 0.20}
            return tier_scores.get(tier, 0.2)

        score_tuple, desc, _ = evaluate_hand(self.cards, community_cards)
        category = score_tuple[0]

        category_values = {
            HIGH_CARD: 0.20,
            ONE_PAIR: 0.48,
            TWO_PAIR: 0.68,
            THREE_OF_A_KIND: 0.80,
            STRAIGHT: 0.88,
            FLUSH: 0.92,
            FULL_HOUSE: 0.96,
            FOUR_OF_A_KIND: 0.99,
            STRAIGHT_FLUSH: 1.00,
        }
        strength = category_values.get(category, 0.2)

        # Draw equity additions on flop and turn
        if len(community_cards) in [3, 4]:
            flush_draw, straight_draw = self.detect_draws(community_cards)
            if flush_draw:
                strength += 0.18
            if straight_draw:
                strength += 0.14

        # Board texture kicker bonus
        high_board_rank = max(c.rank for c in community_cards)
        my_high = max(c.rank for c in self.cards)
        if my_high >= high_board_rank:
            strength += 0.06  # Top pair / overcard kicker advantage

        return min(1.0, max(0.1, strength))

    def decide_action(
        self,
        to_call: int,
        min_raise: int,
        pot: int,
        community_cards: List[Card]
    ) -> Tuple[str, int]:
        """Strategic decision making engine balancing math, pot odds, position, and personality."""
        # Realistic deliberation pause: longer when facing big decisions
        delay = random.uniform(0.7, 1.4) if to_call == 0 else random.uniform(1.0, 2.0)
        time.sleep(delay)

        strength = self.evaluate_effective_strength(community_cards)
        aggression = self.traits["aggression"]
        is_preflop = len(community_cards) == 0

        # Pre-Flop Strategy
        if is_preflop:
            tier = self.evaluate_preflop_tier()

            # Free to check (e.g. Big Blind option)
            if to_call == 0:
                if tier == 1 or (tier == 2 and random.random() < 0.6 * aggression):
                    raise_amt = min(self.chips, min_raise * 3)
                    self.was_preflop_raiser = True
                    return ("raise", raise_amt)
                return ("check", 0)

            # Facing pre-flop bet
            if tier == 1:
                # Always raise or 3-bet
                self.was_preflop_raiser = True
                raise_amt = min(self.chips, to_call + max(min_raise, int(pot * 0.75)))
                return ("raise", raise_amt)
            elif tier == 2:
                if to_call <= min_raise * 3 or random.random() < 0.7:
                    return ("call", min(to_call, self.chips))
                return ("fold", 0)
            elif tier == 3:
                # Call small raises in multiway / cheap pots, fold to big bets
                if to_call <= min_raise * 1.5 and self.chips > to_call * 5:
                    return ("call", min(to_call, self.chips))
                return ("fold", 0)
            else:
                # Trash: fold immediately
                return ("fold", 0)

        # Post-Flop Strategy
        pot_odds = to_call / (pot + to_call) if (pot + to_call) > 0 else 0.0
        flush_draw, straight_draw = self.detect_draws(community_cards)
        is_drawing = flush_draw or straight_draw
        can_semi_bluff = is_drawing and random.random() < self.traits["semi_bluff"]

        # Option A: Nobody has bet yet (to_call == 0)
        if to_call == 0:
            # 1. Continuation bet if we raised pre-flop
            if self.was_preflop_raiser and len(community_cards) == 3 and random.random() < self.traits["cbet_freq"]:
                cbet_size = min(self.chips, max(min_raise, int(pot * 0.45 * aggression)))
                if cbet_size > 0:
                    return ("raise", cbet_size)

            # 2. Value bet with strong made hand
            if strength >= 0.65:
                # Sized value bet: 50% to 75% of pot
                bet_size = min(self.chips, max(min_raise, int(pot * (0.55 + 0.15 * aggression))))
                if bet_size > 0:
                    return ("raise", bet_size)

            # 3. Semi-bluff with draw
            if can_semi_bluff:
                bluff_size = min(self.chips, max(min_raise, int(pot * 0.5)))
                if bluff_size > 0:
                    return ("raise", bluff_size)

            # 4. Pure bluff on late street if personality allows
            if random.random() < self.traits["bluff_freq"] and len(community_cards) == 5:
                probe_size = min(self.chips, max(min_raise, int(pot * 0.65)))
                return ("raise", probe_size)

            # Otherwise, check
            return ("check", 0)

        # Option B: Facing a bet (to_call > 0)
        # 1. Monster hand (>= 0.85): Value Raise / Re-raise
        if strength >= 0.85:
            if random.random() < 0.7 * aggression and self.chips > to_call:
                raise_size = min(self.chips, to_call + max(min_raise, int(pot * 0.7)))
                return ("raise", raise_size)
            return ("call", min(to_call, self.chips))

        # 2. Strong Hand (>= 0.65) or Strong Semi-Bluff: Call or Raise
        if strength >= 0.65 or (can_semi_bluff and random.random() < 0.35 * aggression):
            if can_semi_bluff and random.random() < 0.25 and self.chips > to_call * 2:
                # Semi-bluff raise
                raise_size = min(self.chips, to_call + min_raise)
                return ("raise", raise_size)
            return ("call", min(to_call, self.chips))

        # 3. Marginal Hand: Compare effective strength vs pot odds
        required_equity = pot_odds * self.traits["call_tightness"]
        if strength >= required_equity and to_call < self.chips * 0.35:
            return ("call", min(to_call, self.chips))

        # 4. Fold
        return ("fold", 0)


class HumanPlayer(Player):
    def __init__(self, name: str, chips: int):
        super().__init__(name, chips, is_bot=False)

    def decide_action(
        self,
        to_call: int,
        min_raise: int,
        pot: int,
        community_cards: List[Card]
    ) -> Tuple[str, int]:
        """Prompts human user for an action in the terminal."""
        while True:
            print(f"\n{COLOR_CYAN}➤ It's your turn, {self.name}!{COLOR_RESET}")
            print(f"  Your Chips: {COLOR_GOLD}${self.chips}{COLOR_RESET} | Current Bet Needed: {COLOR_GOLD}${to_call}{COLOR_RESET} | Pot: {COLOR_GOLD}${pot}{COLOR_RESET}")

            options = []
            if to_call == 0:
                options.append("[C]heck")
                options.append(f"[B]et (min ${min_raise})")
            else:
                call_amount = min(to_call, self.chips)
                options.append(f"[C]all (${call_amount})")
                if self.chips > to_call:
                    options.append(f"[R]aise (min ${min_raise})")
            options.append(f"[A]ll-In (${self.chips})")
            options.append("[F]old")

            print(f"  Available Actions: {' | '.join(options)}")
            choice = input("  Choose action: ").strip().lower()

            if choice in ['f', 'fold']:
                return ("fold", 0)

            if choice in ['c', 'check', 'call']:
                if to_call == 0:
                    return ("check", 0)
                else:
                    return ("call", min(to_call, self.chips))

            if choice in ['a', 'all-in', 'allin', 'all']:
                return ("raise" if self.chips > to_call else "call", self.chips)

            if choice in ['b', 'bet', 'r', 'raise']:
                if to_call > 0 and self.chips <= to_call:
                    print("  Cannot raise: not enough chips to exceed current bet. You can call or all-in.")
                    continue

                min_allowed = min_raise
                max_allowed = self.chips
                print(f"  Enter amount to raise/bet (between ${min_allowed} and ${max_allowed}): ")
                amt_str = input("  Amount: $").strip()
                try:
                    amt = int(amt_str)
                    if amt < min_allowed:
                        print(f"  Amount must be at least ${min_allowed}!")
                        continue
                    if amt > max_allowed:
                        print(f"  You only have ${max_allowed} chips!")
                        continue
                    return ("raise", amt)
                except ValueError:
                    print("  Invalid number. Please enter a valid integer amount.")
                    continue

            print("  Invalid command. Please pick one of the options shown above.")
