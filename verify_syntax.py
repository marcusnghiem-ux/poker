import os
import sys

def verify_code():
    path = os.path.join(os.path.dirname(__file__), 'app.js')
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    # Structural checks
    required_symbols = [
        'class FeatureManager',
        'class PokerApp',
        'class SoundManager',
        'class SaveManager',
        'class EconomyManager',
        'AvatarSVGs',
        'SlotSymbolSVGs',
        'SHORT_DECK_HAND_RANKS',
        'evaluateShortDeck5Cards',
        'evaluateOmahaBestHand',
        'bindTopNavAndModals',
        'toggleTransitDrawer',
        'setGameVariant',
        'openStatsModal',
        'openSettingsModal',
        'openCashoutModal',
        'confirmCashout',
        'updateDualWalletUI',
        'renderAvatar',
        'initSlots',
        'spinSlotMachine',
        'resolveSlotSpin',
        'initTransfer',
        'openTransferModal',
        'executeTransfer',
        'initEconomy',
        'updateEconomyDashboard',
        'startDailyTimersLoop',
        'initRoulette',
        'spinRouletteWheel',
        'resolveRouletteSpin',
        'seatGuestPlayer',
        'startTurnTimer',
        'clearTurnTimer',
        'window.pokerGame = new PokerApp();'
    ]

    for sym in required_symbols:
        assert sym in code, f"Missing required symbol: {sym}"

    # Bracket/quote nesting check
    stack = []
    in_str = None
    escape = False
    line = 1
    col = 0
    in_line_comment = False
    in_block_comment = False

    for i, char in enumerate(code):
        if char == '\n':
            line += 1
            col = 0
            in_line_comment = False
            continue
        col += 1
        
        if in_line_comment:
            continue
        if in_block_comment:
            if char == '/' and i > 0 and code[i-1] == '*':
                in_block_comment = False
            continue
            
        if in_str:
            if escape:
                escape = False
            elif char == '\\':
                escape = True
            elif char == in_str:
                in_str = None
            continue
        else:
            if char in ("'", '"', '`'):
                in_str = char
                continue
            if char == '/' and i + 1 < len(code) and code[i+1] == '/':
                in_line_comment = True
                continue
            if char == '/' and i + 1 < len(code) and code[i+1] == '*':
                in_block_comment = True
                continue
            if char in '({[':
                stack.append((char, line, col))
            elif char in ')}]':
                if not stack:
                    print(f"ERROR: Unmatched '{char}' at line {line}, col {col}")
                    sys.exit(1)
                last, l_line, l_col = stack.pop()
                matches = {'(': ')', '{': '}', '[': ']'}
                if matches[last] != char:
                    print(f"ERROR: Mismatched '{last}' (line {l_line}, col {l_col}) with '{char}' at line {line}, col {col}")
                    sys.exit(1)

    if stack:
        print(f"ERROR: Unclosed '{stack[-1][0]}' from line {stack[-1][1]}, col {stack[-1][2]}")
        sys.exit(1)

    print("ALL CODE STRUCTURES, SYMBOLS & BRACKETS IN app.js ARE 100% VALID!")

if __name__ == '__main__':
    verify_code()
