# Seesaw Algebra: product requirements

Working title. Status: draft for Ben's approval, 2026-10-22; fading decision recorded 2026-10-23.

## 1. What this is and why

A browser game that makes the ideas underneath beginner algebra feel obvious
before any symbols are involved. The player moves real-feeling objects on a
seesaw. The math notation appears underneath as a subtitle that narrates what
they just did. They never type or edit a symbol.

Beginner algebra is not really about letters. It is four changes in how you
read a line of math, and most struggles trace to one of them never clicking:

1. The equals sign means "both sides are the same amount," not "compute now."
2. A letter is a number you cannot see yet, and it plays several roles
   (one hidden number; any number; a dial that shapes a family).
3. An expression like `3 + x` is a finished thing you can hold, not an
   unfinished problem.
4. One amount can wear many forms: `2(x + 3)`, `2x + 6`, `x + x + 6`.

The seesaw is the equals sign. The sealed mystery box is the letter. Every
other mechanic below exists to make shifts 3 and 4 physical too.

A second game for reps and drilling comes later. This one builds the
intuition that reps would otherwise grind against.

## 2. Who plays it, and where

- The player is a middle schooler (roughly 11 to 14) in pre-algebra or
  Algebra 1 who sees a tutor because the usual explanation did not stick.
  They probably do not like math right now. Anything that smells like a
  worksheet with a cartoon on it gets rejected in 30 seconds.
- The tutor is in the room, on the same laptop, talking over the game.
  The tutor is a user too: they need tools to pause, ask for a prediction,
  and build a puzzle from the kid's homework on the fly.
- Sessions are roughly weekly, with maybe 10 to 20 sessions a semester and
  gaps in between. There is no room for a 20-hour campaign.
- Device: laptop, mouse or trackpad. Touch and phone come later if at all.

## 3. Success, non-goals, anti-goals

Success looks like:

- The tutor says the balance idea took half the usual time.
- The kid reads `8 = 3 + x` without flinching and reaches for "do the same
  to both sides" on their own.
- In a kid test, by the third puzzle the kid touches both sides without
  being told.

Non-goals (not this game):

- Functions, graphs, slope, "y changes when x changes." That is shift 2's
  "variable" role and deserves its own game with its own metaphor.
- Exponents and `x²`. The area model (rectangles) is the right picture for
  those, and mixing it with weights muddles both.
- Two different unknowns at once (systems of equations).
- Reps, scoring, leaderboards, timed drills. The reps game is a fast-follow
  product, not a mode of this one.
- Fading the seesaw away and having the kid act on symbols alone. That is
  the reps game's job (see 4.10).

Anti-goals (would make it a failure even if it technically works):

- Any UI text that says "equation," "variable," "solve," "isolate,"
  "coefficient." Use level, heavier, lighter, box, weights.
- Punishing a tip. No lives, no red X, no "wrong." A tip is information.
- Letting position on the beam matter. Every middle schooler knows a heavier
  kid sits closer to the middle; if seat position changes the tilt, we have
  accidentally taught multiplication by distance. Seats are fixed at equal
  distances, or we use two hanging pans.
- Making the mystery box's size reveal its weight.
- Making x look like it is always positive.

## 4. The world and its rules

### 4.1 The seesaw

- Two platforms at fixed, equal distances from the pivot. Only weight counts.
- Level means both sides weigh exactly the same. That is the equals sign.
- Tilt is a deterministic function of the weight difference, clamped, and
  exactly zero when equal. No physics engine; a tween is enough.

### 4.2 Known weights

Blocks with the weight printed on them. Heavier blocks are a bit bigger.
Themed objects (a 1 lb duck, a third-of-a-pound sandwich) are a fast-follow
art pass; flat shapes first.

### 4.3 The mystery box

A sealed box with a hidden weight. The seesaw responds to its true weight; the
player cannot read it off the box. All boxes in one puzzle weigh the same.
It can sit on either side, and on both at once.

During a solving puzzle the box looks identical at every weight: no size cue,
no sign cue, even when its weight is negative. The seesaw is the only
instrument. (Builder's call, 2026-10-22: this resolves a conflict with 4.7,
where the dial makes material and size visible. Those cues appear only when
the dial is in use, which is never mid-puzzle.)

### 4.4 Sign is a material (negatives)

Every object has a weight relative to air: heavier than air pushes down
(positive), lighter than air pulls up (negative), exactly air does nothing
(zero). This is a property of every piece, including the mystery box, not a
special "balloon" object. What it buys:

- `x` can be negative. The box's dial (4.7) runs from heavy, through
  weightless, to lifting, so the kid watches x pass through zero.
- Zero has a picture: a piece that hangs there and does nothing.
- Cancelling is physical: a 3-heavy clipped to a 3-lifter is a neutral
  bundle you can take off either side.
- "Taking away a negative adds": remove two bags of lifters and the side
  goes down.
- "Move it across and flip the sign": taking a 3-block off the left tilts
  exactly like adding a 3-block to the right. Kids discover this by playing.

### 4.5 The cloning machine (multiplication)

Takes a whole platform's contents and makes n identical copies, stacked.
Early on it is a gantry spanning both sides, so it can only act on both at
once ("multiply both sides"). Later it becomes a handheld tool, and the
first time a kid clones one side only and watches it slam down, they have
learned the thing. Incredible Machine vibes are the right register.

### 4.6 Dealing out (division)

The cloner in reverse, modelled on Montessori sharing. Pick n. Each side gets
n empty trays. Everything is dealt out one piece at a time. Keep one tray per
side; the rest vanish. If it was level before, it is level after.

- Clean case: three boxes against 12 lb, split by 3, gives one box against
  4 lb. `3x + 6 = 15` split by 3 gives one box and 2 lb against 5 lb.
- Strained case, on purpose: `3x + 5 = 11` split by 3. The boxes deal out,
  the 5 lb does not, and the board fills with ugly fraction chips. The kid
  sees that and thinks "take the 5 off first." They have discovered that you
  undo the last thing done first. The game allows the ugly path rather than
  blocking it.
- Rules: only known weights get sliced, never the mystery box. When a puzzle
  starts with a half-box (how `x/2` shows up in homework), the cloner is
  what glues halves back into a whole.

### 4.7 The dial (what the letter can be)

A single knob on the mystery box that sets its weight. One knob, not two:
weight is the number, material shows the sign, size shows the amount, but
there is one thing to turn. The dial is literally the number line.

When it exists: after a solving puzzle is won (the check, below) and in free
play and the tutor sandbox. Never during a solving puzzle, or the kid would
spin it until the seesaw levels and skip the whole game. The dial steps in
whole numbers for now.

Spin it on a given board and one of three things happens:

| Spin the dial and... | The seesaw... | The kid has discovered |
|---|---|---|
| it stays level at every setting | never tips | the letter can be any number (an identity, `x + x = 2x`) |
| it levels at exactly one spot | tips except at one setting | the letter is one hidden number (an unknown, `x + 3 = 7`) |
| it never levels | tips at every setting | some puzzles have no answer |

The dial is also how the kid checks an answer: after reading "the box weighs
4," the original puzzle comes back and they set the dial to 4. It stays level.
That is substitution, and it is the habit that makes homework
self-correcting.

### 4.8 The costume swap (what the letter is called)

Swap the box's costume for an elephant, an eraser, a boat, anything. Every
box on the board changes at once, on both sides, and the letter in the
notation changes to match. The seesaw never moves. Lessons: the name is
arbitrary (kids panic when the book switches from x to n); it is not an
elephant, it is a weight in an elephant costume (kills the "letter as
object" confusion); and the x on the left is the same x as on the right.

The dial changes the weight and may tip the seesaw. The costume changes the
name and never can. They must look and feel completely different.

### 4.9 Bags (parentheses)

A bag holds pieces. `2(x + 3)` is two bags each holding a box and a 3 lb
weight. Opening the bags is distributing: `2x + 6`. The classic error of
writing `2x + 3` becomes "you left stuff in a bag." Same-shaped things stack
(two boxes make 2x, never a new kind of thing), so like terms come for free.

### 4.10 The notation subtitle, and fading

- Under the seesaw, ordinary notation narrates the board after every move:
  `x + 3 = 7`, or `x + 3 ≠ 7` when tipped (muted, not alarming).
- Formatting: boxes counted first (`2x`), known weights summed (`+ 7`),
  empty side shows `0`.
- Stage 1 shows no notation at all. Then the subtitle appears and updates
  live. The seesaw is always on screen in this game.
- Fading the picture away so only the symbols remain is what turns a toy
  into transfer to the classroom, and it belongs to the reps game, not this
  one (Ben's decision, 2026-10-23). This game ends with the kid reading
  symbols fluently as a subtitle; the reps game owns the move to acting on
  symbols alone.

### 4.11 Tipping is information

No lives, no failure state. The seesaw tips, the subtitle shows the sides
are not equal, and Undo is always one click away. The tutor in the room does
the rest.

### 4.12 Tutor tools

- Predict: freeze the seesaw before the next move. The tutor asks "what
  happens if we take 3 off the left?", the kid answers, then Show animates it.
  Prediction before action is one of the best-evidenced moves in math
  teaching and is cheap to build.
- Sandbox: build any board from the kid's homework on the fly, including the
  hidden weight. First version is a board editor: the tutor drags pieces onto
  the two sides and types the hidden weight into a field that is masked while
  the kid is watching. Typing `3x + 2 = x + 10` and having the game parse it
  is a later addition, because it needs a parser, a solver, and answers for
  homework with no whole-number solution. (Builder's call, 2026-10-22.)
- Hints: one line per puzzle, shown only on request.

## 5. The win condition

Balanced is where a puzzle starts, not where it ends. Solving levels begin
level with a mystery box somewhere in the mess. The player wins by getting
one box alone on one side, still level, and reading its weight off the other
side. The box opens and shows its weight; the subtitle reads `x = 4`. The kid
never hears "isolate the variable." They just do it.

Stage 1 levels have no box and are won by making the seesaw level.

What the player can do in a solving puzzle (builder's call, 2026-10-22):

- An unlimited palette supplies known weights (1, 2, 3, 5, 10). Adding is
  always allowed, to either side, even when it does not help; a one-sided add
  tips the seesaw and that is the lesson. Before stage 3 the useful moves
  are removals, and puzzles are authored so that the needed removals exist
  as whole pieces (a 7 that must lose 3 is shipped as a 4 and a 3).
- Blocks are never split or merged before stage 4.
- Every authored puzzle passes an automatic check that it starts level and
  is winnable with the moves available at its stage.

## 6. The level ladder

| Stage | New thing | What it teaches |
|---|---|---|
| 1 | known weights only, make it level | equals means balance |
| 2 | mystery box; add and remove to get it alone | solving by undoing |
| 3 | lifters (sign as material) | negatives, cancelling, zero |
| 4 | cloner and dealing out | multiply and divide both sides; undo order |
| 5 | bags | parentheses, distributing, like terms |
| 6 | box on both sides (`3x + 2 = x + 10`) | collecting like terms across the equals sign |

The dial and the costume are toys available from stage 2 onward, not stages
of their own. Puzzles are data, not code, so the tutor sandbox and the level
list share one format. Each puzzle specifies the actual pieces on each side
(a 7 may be a single 7-block or a 4 and a 3), because which pieces exist
decides which removals are possible.

## 7. Misconceptions each stage is aimed at

Each of these is a documented, repeatable error, which makes each one a
level design target.

| Error | What the kid believes | Stage that targets it |
|---|---|---|
| `8 = 3 + x` is "backwards" | equals means "answer goes here" | 1 |
| only did one side | equality is a rule, not a fact about the board | 1, 2 |
| `3a` means 3 and a side by side | letters are digits | 2 |
| `a` is an apple | letters are objects | 2 (costume) |
| x always has one value, or is always positive | unknown and variable are the same; x > 0 | 2 (dial), 3 |
| `-x` is negative | the minus sign is a colour, not an operation | 3 |
| `2(x + 3) = 2x + 3` | the 2 only reaches the first thing | 5 |
| `x + x = x²` | adding and multiplying blur | 5 |
| "cancel" anything that matches | equivalence rules applied as magic | 3, 6 |

## 8. Prior art

- DragonBox Algebra: hides notation at first, teaches balance and the moves
  as game rules, swaps cards for symbols later. The benchmark for the
  fading technique.
- Hands-On Equations: a physical balance with pawns for x and cubes for
  numbers. Strong for the balance idea and solving-as-undoing.
- Algebra tiles: an area model where `2(x + 3)` is a rectangle. Best tool
  for distributing and factoring, and the reason `x²` is out of scope here.
- Research anchors: the "equals sign as operator" finding (Kieran 1981;
  Knuth et al. 2006), the roles of a letter (Küchemann 1978; Usiskin 1988),
  and "acceptance of lack of closure" (Collis).

## 9. Decisions already made

- Plain web, laptop first. No framework, no engine, no build step for the
  spike. The real build may add TypeScript and a bundler.
- Deterministic tilt, no physics engine.
- Flat shapes first; themed art (ducks, sandwiches) is a fast-follow.
- Lives in its own repo (`seesaw-algebra`), not inside the personal site.
- Puzzles are data files.
- Everyday words only in the UI (see anti-goals).
- Numbers: exact fractions under the hood from day one, so slicing never
  produces 0.33333. Authored hidden weights are whole numbers through
  stage 3; fractions appear only through slicing in stage 4 and later, and a
  win may then read `x = 5/3`.
- Progress: saved in the browser (localStorage) under a per-kid name the
  tutor types. No accounts, no backend. All stages are open; the tutor picks.
  Static hosting, same as Ben's site.
- This document covers both the spike and the real build. The spike plan is
  section 10; the real build is planned later from this document plus what
  the spike teaches.

## 10. The spike, and what we watch for

The first build is a throwaway covering stages 1 and 2 plus the subtitle,
undo, costume swap, and if cheap the dial check. Its only job is to answer
"does the seesaw feel intuitive to a real kid." We keep what we learn and
throw away the code.

Watch list for the first kid test, chosen in advance so the test can fail:

1. Do they read level as "the same amount" without being told?
2. By the third puzzle, do they reach for both sides on their own?
3. Do they look at the subtitle at all, and when?

## 11. Left to the builder

- Exact tilt constant and clamp; exact animation timing.
- Drag versus click-to-place, as long as it is reliable with a mouse.
- How pieces are laid out on a platform as it tilts.
- Visual design within the constraints above.
- How the fraction chips look in stage 4.
- The internal data format for puzzles, provided the tutor sandbox can
  produce the same format.

## 12. Open questions

- Name of the game.
- Whether stage 3 (lifters) comes before or after stage 4 (cloner). The
  ladder above says lifters first because they are needed to undo any
  subtraction; the builder may argue the other way after the spike.
- Whether a tutor-authored puzzle should be shareable (a URL) in the first
  real build.

## 13. Roadmap

1. Spike: stages 1 and 2, one afternoon, throwaway. Test with one kid.
2. Real build of stages 1 to 6 with the tutor sandbox, from a plan written
   off this document and the spike's lessons.
3. Art pass: themed objects, sound.
4. Fast-follow product: the reps puzzle game.
5. Later: the functions game (shift 2's "variable" role, graphs, slope).
