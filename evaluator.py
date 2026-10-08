from collections import Counter
from itertools import combinations
from typing import List, Tuple
from card import Card, RANK_NAMES, RANK_FULL_NAMES

# Hand category rankings (0 to 8)
HIGH_CARD = 0
ONE_PAIR = 1
TWO_PAIR = 2
THREE_OF_A_KIND = 3
STRAIGHT = 4
FLUSH = 5
FULL_HOUSE = 6
FOUR_OF_A_KIND = 7
STRAIGHT_FLUSH = 8

CATEGORY_NAMES = {
    HIGH_CARD: "High Card",
    ONE_PAIR: "One Pair",
    TWO_PAIR: "Two Pair",
    THREE_OF_A_KIND: "Three of a Kind",
    STRAIGHT: "Straight",
    FLUSH: "Flush",
    FULL_HOUSE: "Full House",
    FOUR_OF_A_KIND: "Four of a Kind",
    STRAIGHT_FLUSH: "Straight Flush"
}


def _check_straight(ranks: List[int]) -> Tuple[bool, int]:
    """Given 5 sorted distinct ranks (descending), check if straight.
    Returns (is_straight, high_rank)."""
    if len(ranks) != 5:
        return False, 0
    # Normal straight: differences are all 1
    if ranks[0] - ranks[4] == 4 and len(set(ranks)) == 5:
        return True, ranks[0]
    # Wheel straight: A-5-4-3-2 (ranks: [14, 5, 4, 3, 2])
    if set(ranks) == {14, 5, 4, 3, 2}:
        return True, 5
    return False, 0


def evaluate_5_cards(cards: List[Card]) -> Tuple[Tuple, str]:
    """Evaluates exactly 5 cards and returns:
    ((category, tie_breaker_tuple), descriptive_name)"""
    if len(cards) != 5:
        raise ValueError("Must provide exactly 5 cards for evaluation.")

    ranks = sorted([c.rank for c in cards], reverse=True)
    suits = [c.suit for c in cards]

    is_flush = len(set(suits)) == 1
    is_straight, straight_high = _check_straight(ranks)

    counts = Counter(ranks)
    # Sort by frequency descending, then by rank descending
    sorted_counts = sorted(counts.items(), key=lambda x: (x[1], x[0]), reverse=True)
    frequencies = [count for rank, count in sorted_counts]
    ordered_ranks = [rank for rank, count in sorted_counts]

    # 1. Straight Flush / Royal Flush
    if is_flush and is_straight:
        if straight_high == 14:
            desc = "Royal Flush"
        else:
            desc = f"Straight Flush, {RANK_FULL_NAMES[straight_high]} High"
        return ((STRAIGHT_FLUSH, (straight_high,)), desc)

    # 2. Four of a Kind
    if frequencies == [4, 1]:
        quad_rank = ordered_ranks[0]
        kicker = ordered_ranks[1]
        desc = f"Four of a Kind, {RANK_FULL_NAMES[quad_rank]}s"
        return ((FOUR_OF_A_KIND, (quad_rank, kicker)), desc)

    # 3. Full House
    if frequencies == [3, 2]:
        trips_rank = ordered_ranks[0]
        pair_rank = ordered_ranks[1]
        desc = f"Full House, {RANK_FULL_NAMES[trips_rank]}s full of {RANK_FULL_NAMES[pair_rank]}s"
        return ((FULL_HOUSE, (trips_rank, pair_rank)), desc)

    # 4. Flush
    if is_flush:
        desc = f"Flush, {RANK_FULL_NAMES[ranks[0]]} High"
        return ((FLUSH, tuple(ranks)), desc)

    # 5. Straight
    if is_straight:
        desc = f"Straight, {RANK_FULL_NAMES[straight_high]} High"
        return ((STRAIGHT, (straight_high,)), desc)

    # 6. Three of a Kind
    if frequencies == [3, 1, 1]:
        trips_rank = ordered_ranks[0]
        kickers = tuple(ordered_ranks[1:])
        desc = f"Three of a Kind, {RANK_FULL_NAMES[trips_rank]}s"
        return ((THREE_OF_A_KIND, (trips_rank, *kickers)), desc)

    # 7. Two Pair
    if frequencies == [2, 2, 1]:
        high_pair = ordered_ranks[0]
        low_pair = ordered_ranks[1]
        kicker = ordered_ranks[2]
        desc = f"Two Pair, {RANK_FULL_NAMES[high_pair]}s and {RANK_FULL_NAMES[low_pair]}s"
        return ((TWO_PAIR, (high_pair, low_pair, kicker)), desc)

    # 8. One Pair
    if frequencies == [2, 1, 1, 1]:
        pair_rank = ordered_ranks[0]
        kickers = tuple(ordered_ranks[1:])
        desc = f"Pair of {RANK_FULL_NAMES[pair_rank]}s"
        return ((ONE_PAIR, (pair_rank, *kickers)), desc)

    # 9. High Card
    desc = f"High Card, {RANK_FULL_NAMES[ranks[0]]}"
    return ((HIGH_CARD, tuple(ranks)), desc)


def evaluate_hand(hole_cards: List[Card], community_cards: List[Card]) -> Tuple[Tuple, str, List[Card]]:
    """Evaluates the best 5-card hand from hole cards + community cards.
    Returns:
    (score_tuple, description, best_5_cards)"""
    all_cards = hole_cards + community_cards
    if len(all_cards) < 5:
        # If less than 5 cards (e.g. pre-flop or flop with fewer cards), evaluate hole cards or available
        if len(all_cards) == 2:
            c1, c2 = sorted(all_cards, reverse=True)
            if c1.rank == c2.rank:
                return ((ONE_PAIR, (c1.rank,)), f"Pocket Pair of {RANK_FULL_NAMES[c1.rank]}s", all_cards)
            return ((HIGH_CARD, (c1.rank, c2.rank)), f"High Cards {RANK_NAMES[c1.rank]}-{RANK_NAMES[c2.rank]}", all_cards)
        # Just evaluate combinations if >= 5, or return partial
        ranks = sorted([c.rank for c in all_cards], reverse=True)
        return ((HIGH_CARD, tuple(ranks)), f"High Card {RANK_NAMES[ranks[0]]}", all_cards)

    best_score = None
    best_desc = ""
    best_combo = None

    for combo in combinations(all_cards, 5):
        combo_list = list(combo)
        score, desc = evaluate_5_cards(combo_list)
        if best_score is None or score > best_score:
            best_score = score
            best_desc = desc
            best_combo = combo_list

    return best_score, best_desc, best_combo
