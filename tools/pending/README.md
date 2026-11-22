# Pending features (ready, not in the game yet)

## settler.patch: buy a new Settler at the War Factory
Apply with `git apply tools/pending/settler.patch` from the repo root (made against commit 733a698, v5.64).

- War Factory sells a Settler: $2,000 (the dearest thing in the game) and 40 s (the slowest; Power Plants speed it up as usual).
- It drives out like any vehicle and deploys anywhere there's room into a second HQ with the full HQ build area.
  No limit on how many. Every extra HQ makes building and training 25% faster for its side (stacks on Power Plants,
  which still stop at double on their own; triple speed at most in all). The HQ's info line shows the bonus. You lose only when every HQ and Settler is gone (already how the game counts it). HQs still can't be sold.
- The computer (Normal and Hard; Easy has no War Factory) buys one only when all of these hold: its home ore is running out,
  the nearest fresh ore on its side is too far for a stepping stone or two (600+ beyond its build area), the field there has
  2,500+ ore, it's not within 700 of your known buildings, it's past 8:00 with 2+ waves sent, its home is guarded
  (guard + a full wave), and it has $2,500 (price + $500). One at a time, at least 5 minutes after the last (bought or lost).
  The Settler drives with an escort of 3, deploys 150-300 from the ore, and the usual expansion then puts a Refinery there.
- Test: `python3 tools/tests/test_settler.py . 8765` (all pass on Huge Hard; test_turrets and test_extractor_factory still pass).

Patch-notes draft (when released):
"New Settlers: the War Factory can build a Settler ($2,000, 40 s), the most expensive thing in the game. Drive it anywhere
there's room and Deploy it into a second Headquarters with its own build area, for a forward base by far-off ore. Every extra
Headquarters makes building and training 25% faster, on top of Power Plants (up to triple speed). You only
lose once every Headquarters and Settler is gone. The computer may buy one late in a game to reach fresh ore."
Remember on release: bump the cache version in sw.js, add the patch-notes entry, update README, the summary doc and the balance sheet.
