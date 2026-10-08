import random
from typing import List

SUIT_SYMBOLS = {
    'Spades': '♠',
    'Hearts': '♥',
    'Diamonds': '♦',
    'Clubs': '♣'
}

SUIT_COLORS = {
    'Spades': '\033[97m',    # White/Bright
    'Hearts': '\033[91m',    # Bright Red
    'Diamonds': '\033[91m',  # Bright Red
    'Clubs': '\033[92m',     # Bright Green
}
COLOR_RESET = '\033[0m'
COLOR_DIM = '\033[90m'
COLOR_GOLD = '\033[93m'
COLOR_CYAN = '\033[96m'

RANK_NAMES = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A'
}

RANK_FULL_NAMES = {
    2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
    8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
}


class Card:
    def __init__(self, rank: int, suit: str):
        if rank < 2 or rank > 14:
            raise ValueError(f"Invalid rank: {rank}")
        if suit not in SUIT_SYMBOLS:
            raise ValueError(f"Invalid suit: {suit}")
        self.rank = rank
        self.suit = suit

    @property
    def symbol(self) -> str:
        return SUIT_SYMBOLS[self.suit]

    @property
    def rank_str(self) -> str:
        return RANK_NAMES[self.rank]

    def __repr__(self) -> str:
        return f"{self.rank_str}{self.symbol}"

    def colored_str(self) -> str:
        color = SUIT_COLORS.get(self.suit, '')
        return f"{color}{self.rank_str}{self.symbol}{COLOR_RESET}"

    def __eq__(self, other) -> bool:
        if not isinstance(other, Card):
            return False
        return self.rank == other.rank and self.suit == other.suit

    def __lt__(self, other) -> bool:
        if not isinstance(other, Card):
            return NotImplemented
        return self.rank < other.rank

    def __hash__(self) -> int:
        return hash((self.rank, self.suit))


class Deck:
    def __init__(self):
        self.cards: List[Card] = []
        self.reset()

    def reset(self):
        self.cards = [Card(rank, suit) for suit in SUIT_SYMBOLS for rank in range(2, 15)]
        self.shuffle()

    def shuffle(self):
        random.shuffle(self.cards)

    def deal(self, n: int = 1) -> List[Card]:
        if len(self.cards) < n:
            raise ValueError("Not enough cards in deck to deal.")
        dealt = [self.cards.pop() for _ in range(n)]
        return dealt

    def __len__(self) -> int:
        return len(self.cards)


import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def render_cards_ascii(cards: List[Card], hidden: bool = False) -> str:
    """Renders a list of cards side-by-side in ASCII art."""
    if not cards:
        return "  [No cards]"

    lines = ["", "", "", "", ""]

    if hidden:
        for _ in cards:
            lines[0] += "┌───────┐ "
            lines[1] += "│░░░░░░░│ "
            lines[2] += "│░░ ? ░░│ "
            lines[3] += "│░░░░░░░│ "
            lines[4] += "└───────┘ "
        return "\n".join(lines)

    for c in cards:
        color = SUIT_COLORS.get(c.suit, '')
        reset = COLOR_RESET
        r = c.rank_str
        s = c.symbol

        # Format rank string padding (2 chars)
        r_top = f"{r:<2}"
        r_bot = f"{r:>2}"

        lines[0] += "┌───────┐ "
        lines[1] += f"│ {color}{r_top}{reset}    │ "
        lines[2] += f"│   {color}{s}{reset}   │ "
        lines[3] += f"│    {color}{r_bot}{reset} │ "
        lines[4] += "└───────┘ "

    return "\n".join(lines)
