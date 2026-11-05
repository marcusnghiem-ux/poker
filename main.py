import sys
import os
import json
from typing import List, Tuple, Optional, Dict

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from card import COLOR_RESET, COLOR_GOLD, COLOR_CYAN, COLOR_DIM
from player import HumanPlayer, AIPlayer
from game import TexasHoldemGame

GAME_DIR = os.path.dirname(os.path.abspath(__file__))

AI_ROSTER = [
    ("Viper", "Aggressive"),
    ("Luna", "Conservative"),
    ("Atlas", "Balanced"),
    ("Duke", "Aggressive"),
    ("Sam", "Balanced")
]


def get_slot_path(slot_num: int, save_dir: Optional[str] = None) -> str:
    directory = save_dir if save_dir else GAME_DIR
    return os.path.join(directory, f"save_slot_{slot_num}.json")


def load_game_state(slot_num: int, save_dir: Optional[str] = None) -> Optional[dict]:
    path = get_slot_path(slot_num, save_dir)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def save_game_state(slot_num: int, state: dict, save_dir: Optional[str] = None) -> bool:
    path = get_slot_path(slot_num, save_dir)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving game: {e}")
        return False


def delete_slot(slot_num: int, save_dir: Optional[str] = None) -> bool:
    path = get_slot_path(slot_num, save_dir)
    if os.path.exists(path):
        try:
            os.remove(path)
            return True
        except Exception:
            return False
    return False


def get_slot_summary(slot_num: int, save_dir: Optional[str] = None) -> str:
    data = load_game_state(slot_num, save_dir)
    if not data or not isinstance(data, dict):
        return "Empty - Start New Game"
    chips = data.get("chips", 0)
    round_num = data.get("hand_number", 0)
    diff = data.get("difficulty", "Medium").capitalize()
    wins = data.get("wins", 0)
    return f"${chips:,} | Round {round_num} | {diff} | {wins} Wins"


def show_rules():
    print(f"\n{COLOR_GOLD}╔══════════════════════════════════════════════════════════════╗")
    print("║               ♠ ♥ ♦ ♣  RULES & INFO  ♣ ♦ ♥ ♠                 ║")
    print(f"╚══════════════════════════════════════════════════════════════╝{COLOR_RESET}")

    print(f"\n{COLOR_CYAN}★ OBJECTIVE & GAME FLOW:{COLOR_RESET}")
    print("  Make the best 5-card poker hand using any combination of your 2 private")
    print("  hole cards and the 5 community cards on the table.")
    print("  Win chips by having the highest hand at Showdown or forcing all rivals to fold.")

    print(f"\n{COLOR_CYAN}★ BETTING ROUNDS:{COLOR_RESET}")
    print("  1. Pre-Flop: Dealer posts blinds (Small Blind / Big Blind). Each player gets 2 hole cards.")
    print("  2. The Flop:  3 community cards dealt face up. 2nd betting round.")
    print("  3. The Turn:  4th community card dealt face up. 3rd betting round.")
    print("  4. The River: 5th community card dealt face up. Final betting round.")
    print("  5. Showdown:  Remaining players reveal hands. Best 5-card hand takes the pot.")

    print(f"\n{COLOR_CYAN}★ ACTIONS:{COLOR_RESET}")
    print("  • Fold:    Surrender hand and forfeit chips contributed.")
    print("  • Check:   Pass action to next player when there is no bet to call.")
    print("  • Call:    Match the current highest bet.")
    print("  • Raise:   Increase the bet, forcing opponents to match or fold.")
    print("  • All-In:  Bet all remaining chips. Eligible for main and side pots.")

    print(f"\n{COLOR_CYAN}★ HAND RANKINGS (Highest to Lowest):{COLOR_RESET}")
    print("  1. Royal Flush:     A-K-Q-J-10 of the same suit")
    print("  2. Straight Flush:  5 consecutive cards of the same suit")
    print("  3. Four of a Kind:  4 cards of equal rank")
    print("  4. Full House:      3 of a kind plus a pair")
    print("  5. Flush:           5 cards of the same suit")
    print("  6. Straight:        5 consecutive ranks of any suits")
    print("  7. Three of a Kind: 3 cards of equal rank")
    print("  8. Two Pair:        2 separate pairs")
    print("  9. One Pair:        2 cards of equal rank")
    print("  10. High Card:      Highest single card plays")

    print(f"\n{COLOR_CYAN}★ SPECIAL MECHANICS:{COLOR_RESET}")
    print("  • Dynamic Blinds: Blinds increase automatically every 5 hands:")
    print("      Hands 1-5: $10/$20  | Hands 6-10: $20/$40   | Hands 11-15: $40/$80")
    print("      Hands 16-20: $80/$160 | Hands 21+: $160/$320")
    print("  • Aggressive AI: AI bots adapt based on difficulty (Easy, Medium, Hard).")
    print("      Hard mode features fierce betting, constant re-raises, and fearless bluffs.")
    print("  • Adrenaline Mechanic: When dealt a Tier 1 or Tier 2 starting hand, a rival AI")
    print("      is dealt a competitive hand and receives a temporary +0.5 aggression boost.")
    print("  • 3 Save Slots: Progress is auto-saved after every hand.")

    input(f"\n{COLOR_GOLD}Press Enter to return to the Main Menu...{COLOR_RESET}")


def setup_new_game(slot_num: int) -> Tuple[TexasHoldemGame, HumanPlayer, str, int, int]:
    print(f"\n{COLOR_GOLD}=== Starting New Game in Slot {slot_num} ==={COLOR_RESET}")
    # 1. Player name
    name_input = input("Enter your name [default: Player]: ").strip()
    player_name = name_input if name_input else "Player"

    # 2. Starting chips (default 1000)
    starting_chips = 1000
    chips_input = input("Enter starting chips [default: $1000]: ").strip()
    if chips_input.isdigit() and int(chips_input) > 0:
        starting_chips = int(chips_input)

    # 3. Number of bots (1-5)
    num_bots = 3
    print("Select number of AI opponents (1 to 5) [default: 3]:")
    bots_input = input("Opponents count: ").strip()
    if bots_input.isdigit() and 1 <= int(bots_input) <= 5:
        num_bots = int(bots_input)

    # 4. Difficulty: Easy / Medium / Hard
    print("\nSelect Difficulty:")
    print("  [1] Easy   (bots fold more, play passively)")
    print("  [2] Medium (balanced competition)")
    print("  [3] Hard   (aggressive, frequent raises & bluffs)")
    diff_input = input("Choose difficulty [1/2/3, default: 2 (Medium)]: ").strip().lower()
    difficulty = "Medium"
    if diff_input in ['1', 'easy', 'e']:
        difficulty = "Easy"
    elif diff_input in ['3', 'hard', 'h']:
        difficulty = "Hard"

    # Create players
    human = HumanPlayer(player_name, starting_chips)
    players = [human]
    bot_chips = {}
    for i in range(num_bots):
        b_name, b_pers = AI_ROSTER[i]
        full_name = f"{b_name} ({b_pers[0]})"
        players.append(AIPlayer(full_name, starting_chips, personality=b_pers, difficulty=difficulty))
        bot_chips[full_name] = starting_chips

    game = TexasHoldemGame(players=players, small_blind=10, big_blind=20)
    wins = 0
    losses = 0

    # Auto-save initial game state
    init_state = {
        "player_name": player_name,
        "chips": starting_chips,
        "hand_number": 0,
        "difficulty": difficulty,
        "wins": 0,
        "losses": 0,
        "bot_chips": bot_chips,
        "small_blind": 10,
        "big_blind": 20
    }
    save_game_state(slot_num, init_state)
    return game, human, difficulty, wins, losses


def load_game(slot_num: int) -> Tuple[TexasHoldemGame, HumanPlayer, str, int, int]:
    state = load_game_state(slot_num)
    if not state:
        raise ValueError(f"Failed to load save file for slot {slot_num}.")

    player_name = state.get("player_name", "Player")
    chips = state.get("chips", 1000)
    difficulty = state.get("difficulty", "Medium")
    hand_number = state.get("hand_number", 0)
    wins = state.get("wins", 0)
    losses = state.get("losses", 0)
    small_blind = state.get("small_blind", 10)
    big_blind = state.get("big_blind", 20)
    bot_chips = state.get("bot_chips", {})

    human = HumanPlayer(player_name, chips)
    players = [human]

    for b_name, b_chip in bot_chips.items():
        if b_chip <= 0:
            continue
        if "(A)" in b_name or "Aggressive" in b_name:
            pers = "Aggressive"
        elif "(C)" in b_name or "Conservative" in b_name:
            pers = "Conservative"
        else:
            pers = "Balanced"
        players.append(AIPlayer(b_name, b_chip, personality=pers, difficulty=difficulty))

    game = TexasHoldemGame(players=players, small_blind=small_blind, big_blind=big_blind)
    game.hand_number = hand_number
    return game, human, difficulty, wins, losses


def play_game(slot_num: int, game: TexasHoldemGame, human: HumanPlayer, difficulty: str, wins: int, losses: int):
    print(f"\n{COLOR_CYAN}Table ready with {len(game.players)} players! Starting blinds: ${game.small_blind} / ${game.big_blind} (Difficulty: {difficulty}){COLOR_RESET}\n")
    input("Press Enter to deal the next hand...")

    while True:
        try:
            game.play_hand()
            game.prune_busted_players()

            # Track hand win/loss
            if getattr(game, "last_hand_human_won", False):
                wins += 1
            else:
                losses += 1

            # Auto-save after each hand
            bot_chips = {p.name: p.chips for p in game.players if p.is_bot}
            save_data = {
                "player_name": human.name,
                "chips": human.chips,
                "hand_number": game.hand_number,
                "difficulty": difficulty,
                "wins": wins,
                "losses": losses,
                "bot_chips": bot_chips,
                "small_blind": game.small_blind,
                "big_blind": game.big_blind
            }
            save_game_state(slot_num, save_data)
            print(f"{COLOR_DIM}💾 Hand saved to Slot {slot_num}. (Wins: {wins} | Losses: {losses}){COLOR_RESET}")

            # Check win / loss conditions
            if human not in game.players or human.chips == 0:
                print(f"\n{COLOR_GOLD}Game Over! Better luck next time.{COLOR_RESET}")
                input("Press Enter to return to Main Menu...")
                break

            if len(game.players) == 1 and game.players[0] == human:
                print(f"\n{COLOR_GOLD}🎉 CONGRATULATIONS! You defeated all opponents and won the tournament! 🎉{COLOR_RESET}")
                input("Press Enter to return to Main Menu...")
                break

            game.advance_dealer()

            print(f"\n{COLOR_CYAN}Leaderboard:{COLOR_RESET}")
            for p in sorted(game.players, key=lambda x: x.chips, reverse=True):
                user_marker = " (YOU)" if not p.is_bot else ""
                print(f"  • {p.name}{user_marker}: ${p.chips}")

            choice = input("\nDeal next hand? ([Enter] = Yes, 'q' = Quit to Menu): ").strip().lower()
            if choice in ['q', 'quit', 'exit']:
                print(f"\nProgress saved! You cashed out with ${human.chips}.")
                input("Press Enter to return to Main Menu...")
                break

        except (KeyboardInterrupt, EOFError):
            print("\n\nGame paused. Returning to Main Menu.")
            break


def main():
    while True:
        try:
            print(f"\n{COLOR_GOLD}╔═══════════════════════════════════════════════════════╗")
            print("║     ♠ ♥ ♦ ♣  TEXAS HOLD'EM NO-LIMIT POKER  ♣ ♦ ♥ ♠  ║")
            print(f"╚═══════════════════════════════════════════════════════╝{COLOR_RESET}\n")

            print(f"  [1] Save Slot 1: {get_slot_summary(1)}")
            print(f"  [2] Save Slot 2: {get_slot_summary(2)}")
            print(f"  [3] Save Slot 3: {get_slot_summary(3)}")
            print("")
            print("  [R] Rules & Info")
            print("  [Q] Quit")

            choice = input("\nSelect an option: ").strip().lower()

            if choice in ['q', 'quit', 'exit']:
                print(f"\n{COLOR_GOLD}Thanks for playing Texas Hold'em! Goodbye.{COLOR_RESET}\n")
                break

            if choice in ['r', 'rules', 'info']:
                show_rules()
                continue

            if choice in ['1', '2', '3']:
                slot_num = int(choice)
                slot_data = load_game_state(slot_num)

                if slot_data is None:
                    # Slot is empty, start new game
                    game, human, diff, wins, losses = setup_new_game(slot_num)
                    play_game(slot_num, game, human, diff, wins, losses)
                else:
                    # Slot has an existing game
                    print(f"\n{COLOR_CYAN}--- Save Slot {slot_num} ---{COLOR_RESET}")
                    p_name = slot_data.get("player_name", "Player")
                    p_chips = slot_data.get("chips", 0)
                    p_hand = slot_data.get("hand_number", 0)
                    p_diff = slot_data.get("difficulty", "Medium").capitalize()
                    p_wins = slot_data.get("wins", 0)
                    p_losses = slot_data.get("losses", 0)
                    print(f"  Player: {p_name} | Stack: ${p_chips:,} | Hand: #{p_hand} | Diff: {p_diff} | W/L: {p_wins}/{p_losses}")
                    print("\n  [C] Continue Saved Game")
                    print("  [N] Start New Game (Overwrite Slot)")
                    print("  [D] Delete Save Slot")
                    print("  [B] Back to Main Menu")

                    slot_action = input("\nChoose action: ").strip().lower()
                    if slot_action in ['c', 'continue', '']:
                        game, human, diff, wins, losses = load_game(slot_num)
                        play_game(slot_num, game, human, diff, wins, losses)
                    elif slot_action in ['n', 'new']:
                        confirm = input("Are you sure you want to overwrite this save? [y/N]: ").strip().lower()
                        if confirm in ['y', 'yes']:
                            game, human, diff, wins, losses = setup_new_game(slot_num)
                            play_game(slot_num, game, human, diff, wins, losses)
                    elif slot_action in ['d', 'delete']:
                        confirm = input("Are you sure you want to delete this save? [y/N]: ").strip().lower()
                        if confirm in ['y', 'yes']:
                            delete_slot(slot_num)
                            print(f"Slot {slot_num} deleted.")
            else:
                print("Invalid option. Please enter 1, 2, 3, R, or Q.")
        except (KeyboardInterrupt, EOFError):
            print(f"\n{COLOR_GOLD}Thanks for playing Texas Hold'em! Goodbye.{COLOR_RESET}\n")
            break


if __name__ == "__main__":
    main()
