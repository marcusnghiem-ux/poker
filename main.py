import sys
import os

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from card import COLOR_RESET, COLOR_GOLD, COLOR_CYAN, COLOR_DIM
from player import HumanPlayer, AIPlayer
from game import TexasHoldemGame


BANNER = rf"""{COLOR_GOLD}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ♠ ♥ ♦ ♣      TEXAS HOLD'EM NO-LIMIT POKER      ♣ ♦ ♥ ♠     ║
║                                                              ║
║           Compete against intelligent AI players!            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{COLOR_RESET}
"""


def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')


def main():
    print(BANNER)
    print("Welcome to Texas Hold'em!")

    # Prompt user for name
    name_input = input("Enter your name [default: Player]: ").strip()
    player_name = name_input if name_input else "Player"

    # Prompt starting chips
    starting_chips = 1000
    chips_input = input("Enter starting chips [default: $1000]: ").strip()
    if chips_input.isdigit() and int(chips_input) > 0:
        starting_chips = int(chips_input)

    # Prompt number of AI opponents (1 to 5)
    print("\nSelect number of AI opponents (1 to 5) [default: 3]:")
    opp_input = input("Opponents count: ").strip()
    num_opponents = 3
    if opp_input.isdigit() and 1 <= int(opp_input) <= 5:
        num_opponents = int(opp_input)

    ai_roster = [
        ("Viper", "Aggressive"),
        ("Luna", "Conservative"),
        ("Atlas", "Balanced"),
        ("Duke", "Aggressive"),
        ("Sam", "Balanced")
    ]

    players = [HumanPlayer(player_name, starting_chips)]
    for i in range(num_opponents):
        bot_name, bot_personality = ai_roster[i]
        players.append(AIPlayer(f"{bot_name} ({bot_personality[0]})", starting_chips, bot_personality))

    game = TexasHoldemGame(players=players, small_blind=10, big_blind=20)

    print(f"\n{COLOR_CYAN}Table ready with {len(players)} players! Starting blinds: $10 / $20.{COLOR_RESET}\n")
    input("Press Enter to deal the first hand...")

    # Main Game Loop
    while True:
        try:
            game.play_hand()
            game.prune_busted_players()

            # Check win / loss conditions
            human = next((p for p in game.players if not p.is_bot), None)
            if not human or human.chips == 0:
                print(f"\n{COLOR_GOLD}Game Over! Better luck next time.{COLOR_RESET}")
                break

            if len(game.players) == 1 and game.players[0] == human:
                print(f"\n{COLOR_GOLD}🎉 CONGRATULATIONS! You defeated all opponents and won the tournament! 🎉{COLOR_RESET}")
                break

            game.advance_dealer()

            print(f"\n{COLOR_CYAN}Leaderboard:{COLOR_RESET}")
            for p in sorted(game.players, key=lambda x: x.chips, reverse=True):
                user_marker = " (YOU)" if not p.is_bot else ""
                print(f"  • {p.name}{user_marker}: ${p.chips}")

            choice = input("\nDeal next hand? ([Enter] = Yes, 'q' = Quit): ").strip().lower()
            if choice in ['q', 'quit', 'exit']:
                print(f"\nThanks for playing, {player_name}! You cashed out with ${human.chips}.")
                break

        except KeyboardInterrupt:
            print("\n\nGame paused. Exiting gracefully. Thanks for playing!")
            break


if __name__ == "__main__":
    main()
