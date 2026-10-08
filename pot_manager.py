from typing import List, Dict, Set
from player import Player
from card import COLOR_GOLD, COLOR_RESET


class SidePot:
    def __init__(self, amount: int, eligible_players: List[Player]):
        self.amount = amount
        self.eligible_players = eligible_players

    def __repr__(self):
        names = [p.name for p in self.eligible_players]
        return f"Pot(${self.amount}, Eligible: {names})"


class PotManager:
    def __init__(self):
        pass

    @staticmethod
    def calculate_side_pots(players: List[Player]) -> List[SidePot]:
        """Calculates main pot and any side pots based on total_bet from each player."""
        # Find all players who put in chips
        contributors = [p for p in players if p.total_bet > 0]
        if not contributors:
            return []

        # Find all all-in or active players' bet levels
        active_or_allin = [p for p in contributors if not p.folded]
        if not active_or_allin:
            # Everyone folded? Return single pot with whoever is left
            total = sum(p.total_bet for p in contributors)
            return [SidePot(total, [])]

        # Distinct bet levels of active/all-in players, sorted ascending
        bet_levels = sorted(list(set(p.total_bet for p in active_or_allin)))

        pots: List[SidePot] = []
        prev_level = 0

        for level in bet_levels:
            pot_amount = 0
            tier_diff = level - prev_level
            if tier_diff <= 0:
                continue

            eligible: List[Player] = []
            for p in contributors:
                if p.total_bet > prev_level:
                    contributed_in_tier = min(p.total_bet - prev_level, tier_diff)
                    pot_amount += contributed_in_tier
                    if not p.folded and p.total_bet >= level:
                        eligible.append(p)

            if pot_amount > 0 and eligible:
                pots.append(SidePot(pot_amount, eligible))
            elif pot_amount > 0 and not eligible and pots:
                # Dead money into the highest pot
                pots[-1].amount += pot_amount

            prev_level = level

        # If any contributor put in more than the highest active player (e.g. folded overbet)
        excess = sum(max(0, p.total_bet - prev_level) for p in contributors)
        if excess > 0 and pots:
            pots[-1].amount += excess

        return pots
