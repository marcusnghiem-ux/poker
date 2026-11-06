with open('c:/Users/marcu/OneDrive/Desktop/python/texas hold\'em/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Check that window.pokerGame = new PokerApp(); is intact
assert 'class PokerApp' in code
assert 'window.pokerGame = new PokerApp();' in code
assert 'class SoundManager' in code
assert 'initRoulette' in code
assert 'drawRouletteWheel' in code
assert 'spinRouletteWheel' in code
assert 'recordHandHistory' in code
assert 'advanceToNextStage' in code

print("app.js code structure verified successfully!")
