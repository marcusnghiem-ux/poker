import time
import sys
from typing import List, Optional
from card import Deck, Card, render_cards_ascii, COLOR_RESET, COLOR_GOLD, COLOR_CYAN, COLOR_DIM
from player import Player, HumanPlayer, AIPlayer
from pot_manager import PotManager, SidePot
from evaluator import evaluate_hand

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


class TexasHoldemGame:
    def __init__(self, players: List[Player], small_blind: int = 10, big_blind: int = 20):
        self.players = players
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.dealer_idx = 0
        self.deck = Deck()
        self.community_cards: List[Card] = []
        self.hand_number = 0

    def print_banner(self, text: str):
        border = "═" * 56
        print(f"\n{COLOR_GOLD}╔{border}╗")
        print(f"║{text.center(56)}║")
        print(f"╚{border}╝{COLOR_RESET}")

    def display_table(self, active_bet: int = 0):
        print("\n" + "─" * 60)
        # Calculate current total pot in the hand
        total_pot = sum(p.total_bet for p in self.players)
        print(f"{COLOR_GOLD}💰 TOTAL POT: ${total_pot}    |    HAND #{self.hand_number}{COLOR_RESET}")
        print("─" * 60)

        # Community Cards
        print(f"\n{COLOR_CYAN}🂠 COMMUNITY CARDS:{COLOR_RESET}")
        if self.community_cards:
            print(render_cards_ascii(self.community_cards))
        else:
            print("  [Waiting for Flop...]")

        # Player list and chip counts
        print(f"\n{COLOR_CYAN}👥 TABLE PLAYERS:{COLOR_RESET}")
        for i, p in enumerate(self.players):
            pos_markers = []
            if i == self.dealer_idx:
                pos_markers.append("DEALER")
            if i == (self.dealer_idx + 1) % len(self.players):
                pos_markers.append("SB")
            if i == (self.dealer_idx + 2) % len(self.players):
                pos_markers.append("BB")

            marker_str = f"[{'/'.join(pos_markers)}]" if pos_markers else ""
            status = ""
            if p.folded:
                status = f"{COLOR_DIM}(Folded){COLOR_RESET}"
            elif p.all_in:
                status = f"{COLOR_GOLD}(ALL-IN){COLOR_RESET}"

            bet_info = f"Current Bet: ${p.current_bet}" if p.current_bet > 0 else "No bet"
            user_flag = " (YOU)" if not p.is_bot else ""
            print(f"  {p.name}{user_flag:<6} {marker_str:<12} | Chips: ${p.chips:<5} | {bet_info:<18} {status}")

        # If human player is in hand, show their private cards and evaluation
        human = next((p for p in self.players if not p.is_bot), None)
        if human and not human.folded and human.cards:
            print(f"\n{COLOR_CYAN}🂡 YOUR HAND ({human.name}):{COLOR_RESET}")
            print(human.render_hand())
            if self.community_cards:
                _, desc, _ = evaluate_hand(human.cards, self.community_cards)
                print(f"  {COLOR_GOLD}Current Best Hand: {desc}{COLOR_RESET}")
        print("─" * 60)

    def count_active_players(self) -> int:
        """Returns number of players who have not folded."""
        return sum(1 for p in self.players if not p.folded)

    def count_acting_players(self) -> int:
        """Returns number of players who can still place bets (not folded, not all-in)."""
        return sum(1 for p in self.players if not p.folded and not p.all_in)

    def run_betting_round(self, round_name: str, start_idx: int) -> bool:
        """Executes a round of betting. Returns True if hand continues, False if only 1 player remains."""
        self.print_banner(f"ROUND: {round_name.upper()}")

        # Reset current bets for all players for this round
        for p in self.players:
            p.reset_for_betting_round()

        current_high_bet = 0
        min_raise = self.big_blind

        # If pre-flop, post blinds
        if round_name.lower() == "pre-flop":
            sb_idx = (self.dealer_idx + 1) % len(self.players)
            bb_idx = (self.dealer_idx + 2) % len(self.players)

            sb_player = self.players[sb_idx]
            bb_player = self.players[bb_idx]

            sb_actual = sb_player.post_bet(self.small_blind)
            bb_actual = bb_player.post_bet(self.big_blind)

            print(f"  💸 {sb_player.name} posts Small Blind: ${sb_actual}")
            print(f"  💸 {bb_player.name} posts Big Blind: ${bb_actual}")

            current_high_bet = max(sb_actual, bb_actual)
            start_idx = (bb_idx + 1) % len(self.players)

        num_players = len(self.players)
        curr_idx = start_idx
        # Keep track of who has had a chance to act in this round
        has_acted = {p: False for p in self.players}

        while True:
            # Check if only one player remains unfolded
            if self.count_active_players() <= 1:
                return False

            # Check if betting round is complete:
            # All players who have not folded and are not all-in have acted AND have matched the current_high_bet
            acting_players = [p for p in self.players if not p.folded and not p.all_in]
            if len(acting_players) == 0:
                # Everyone left is all-in or folded
                break

            all_matched = all(p.current_bet == current_high_bet for p in acting_players)
            all_acted = all(has_acted[p] for p in acting_players)

            if all_matched and all_acted:
                break

            player = self.players[curr_idx]

            if not player.folded and not player.all_in:
                to_call = current_high_bet - player.current_bet
                effective_min_raise = max(min_raise, self.big_blind)

                if player.is_bot:
                    pot_val = sum(p.total_bet for p in self.players)
                    action, amt = player.decide_action(to_call, effective_min_raise, pot_val, self.community_cards)
                else:
                    self.display_table(active_bet=current_high_bet)
                    pot_val = sum(p.total_bet for p in self.players)
                    action, amt = player.decide_action(to_call, effective_min_raise, pot_val, self.community_cards)

                has_acted[player] = True

                # Process action
                if action == "fold":
                    player.folded = True
                    print(f"  ❌ {player.name} FOLDS.")
                elif action == "check":
                    print(f"  ✋ {player.name} CHECKS.")
                elif action == "call":
                    actual = player.post_bet(amt)
                    if player.all_in:
                        print(f"  🔥 {player.name} CALLS ${actual} and is ALL-IN!")
                    else:
                        print(f"  ✔  {player.name} CALLS ${actual}.")
                elif action == "raise":
                    actual = player.post_bet(amt)
                    if player.current_bet > current_high_bet:
                        raise_diff = player.current_bet - current_high_bet
                        min_raise = raise_diff
                        current_high_bet = player.current_bet
                        # Reset has_acted for other active players since bet was raised
                        for other in self.players:
                            if other != player and not other.folded and not other.all_in:
                                has_acted[other] = False
                    if player.all_in:
                        print(f"  🚀 {player.name} RAISES to ${player.current_bet} and is ALL-IN!")
                    else:
                        print(f"  🚀 {player.name} RAISES to ${player.current_bet}.")

                time.sleep(0.4)

            # Move to next player
            curr_idx = (curr_idx + 1) % num_players

        return True

    def play_hand(self):
        """Plays one complete hand of Texas Hold'em."""
        self.hand_number += 1
        self.print_banner(f"STARTING HAND #{self.hand_number}")

        # Reset players and deck
        self.deck.reset()
        self.community_cards = []
        for p in self.players:
            p.reset_for_hand()

        # Deal 2 hole cards to each player
        for _ in range(2):
            for p in self.players:
                p.cards.extend(self.deck.deal(1))

        # 1. Pre-Flop
        active = self.run_betting_round("Pre-Flop", (self.dealer_idx + 1) % len(self.players))
        if not active:
            self.resolve_early_win()
            return

        # 2. The Flop (burn 1, deal 3)
        self.deck.deal(1)  # Burn card
        self.community_cards.extend(self.deck.deal(3))
        self.display_table()

        if self.count_acting_players() > 1:
            active = self.run_betting_round("The Flop", (self.dealer_idx + 1) % len(self.players))
            if not active:
                self.resolve_early_win()
                return

        # 3. The Turn (burn 1, deal 1)
        self.deck.deal(1)  # Burn card
        self.community_cards.extend(self.deck.deal(1))
        self.display_table()

        if self.count_acting_players() > 1:
            active = self.run_betting_round("The Turn", (self.dealer_idx + 1) % len(self.players))
            if not active:
                self.resolve_early_win()
                return

        # 4. The River (burn 1, deal 1)
        self.deck.deal(1)  # Burn card
        self.community_cards.extend(self.deck.deal(1))
        self.display_table()

        if self.count_acting_players() > 1:
            active = self.run_betting_round("The River", (self.dealer_idx + 1) % len(self.players))
            if not active:
                self.resolve_early_win()
                return

        # 5. Showdown
        self.resolve_showdown()

    def resolve_early_win(self):
        """Called when everyone but one player folds."""
        winner = next(p for p in self.players if not p.folded)
        total_pot = sum(p.total_bet for p in self.players)
        winner.chips += total_pot
        self.print_banner(f"🏆 {winner.name} WINS THE HAND!")
        print(f"  All opponents folded. {winner.name} collects the pot of ${total_pot}!")
        print(f"  {winner.name}'s new stack: ${winner.chips}\n")

    def resolve_showdown(self):
        """Evaluates hands and awards main and side pots."""
        self.print_banner("SHOWDOWN")
        self.display_table()

        print(f"\n{COLOR_CYAN}🂠 FINAL COMMUNITY CARDS:{COLOR_RESET}")
        print(render_cards_ascii(self.community_cards))

        remaining_players = [p for p in self.players if not p.folded]

        # Reveal cards and evaluate for each remaining player
        evaluations = {}
        for p in remaining_players:
            score, desc, best_cards = evaluate_hand(p.cards, self.community_cards)
            evaluations[p] = (score, desc, best_cards)
            print(f"\n{COLOR_GOLD}➤ {p.name}'s Hand:{COLOR_RESET}")
            print(p.render_hand())
            print(f"  Result: {COLOR_CYAN}{desc}{COLOR_RESET}")

        # Calculate side pots
        pots = PotManager.calculate_side_pots(self.players)
        print(f"\n{COLOR_GOLD}=== POT DISTRIBUTION ==={COLOR_RESET}")

        for pot_idx, pot in enumerate(pots, 1):
            pot_name = "Main Pot" if pot_idx == 1 else f"Side Pot #{pot_idx - 1}"
            eligible_remain = [p for p in pot.eligible_players if not p.folded]

            if not eligible_remain:
                continue

            # Find highest score among eligible players
            best_score = None
            winners = []
            for p in eligible_remain:
                score, desc, _ = evaluations[p]
                if best_score is None or score > best_score:
                    best_score = score
                    winners = [p]
                elif score == best_score:
                    winners.append(p)

            # Split pot among winners
            share = pot.amount // len(winners)
            remainder = pot.amount % len(winners)

            winning_names = ", ".join(w.name for w in winners)
            win_desc = evaluations[winners[0]][1]
            print(f"  {COLOR_GOLD}🏆 {pot_name} (${pot.amount}){COLOR_RESET} awarded to: {winning_names} ({win_desc})")

            for i, w in enumerate(winners):
                award = share + (1 if i < remainder else 0)
                w.chips += award
                print(f"     ➜ {w.name} receives ${award} (Total Stack: ${w.chips})")

        print("\n" + "═" * 60)

    def advance_dealer(self):
        """Rotates dealer button to the next player with chips."""
        self.dealer_idx = (self.dealer_idx + 1) % len(self.players)

    def prune_busted_players(self):
        """Removes AI players with 0 chips. Offers Human player rebuy if busted."""
        human = next((p for p in self.players if not p.is_bot), None)
        if human and human.chips == 0:
            print(f"\n{COLOR_GOLD}💀 You ran out of chips!{COLOR_RESET}")
            ans = input("Would you like to rebuy with $1000 chips? [y/n]: ").strip().lower()
            if ans in ['y', 'yes']:
                human.chips = 1000
                human.all_in = False
                print("  Rebuy successful! You're back in the game with $1000.")
            else:
                print("  Thanks for playing!")

        # Filter out busted bots
        survivors = []
        for p in self.players:
            if p.chips > 0:
                survivors.append(p)
            else:
                print(f"  👋 {p.name} was eliminated from the table!")
        self.players = survivors
