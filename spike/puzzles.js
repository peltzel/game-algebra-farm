// Puzzle data for the seesaw spike. Plain data, no logic.
// A piece is { type: 'weight', value: N } or { type: 'box' } or { type: 'box', fraction: 0.5 } (half a box).
// All boxes in one puzzle share the same hiddenWeight; a half-box weighs half of it.
// goal 'level'   -> win when both pans are non-empty and weigh the same.
// goal 'isolate' -> win when level AND one side is exactly one box and nothing else,
//                   AND the other side holds only known weights (at least one).
//
// Puzzles are grouped into levels: LEVELS = [{ name, subtitle, puzzles: [...] }].
// A level with machines: true shows the Clone / Share machine row (level 4).
//
// locked: ['left'] (or ['right']) bolts that whole side down: nothing can be put on it,
//   taken off it, or moved onto or off it. Machines (level 4) ignore locks.
// A single piece can be bolted down instead: { type: 'weight', value: 5, locked: true } (LW(5)).

var W = function (v) { return { type: 'weight', value: v }; };
var LW = function (v) { return { type: 'weight', value: v, locked: true }; };   // a bolted-down block (no puzzle uses it yet)
var BOX = function () { return { type: 'box' }; };
var HALFBOX = function () { return { type: 'box', fraction: 0.5 }; };

var LEVELS = [
  // ---------- Level 1: make it level (no boxes; the given side is bolted down) ----------
  {
    name: 'Make it level',
    subtitle: 'Both sides must weigh the same',
    puzzles: [
      {
        left: [W(5)], right: [], hiddenWeight: 0, goal: 'level', locked: ['left'],
        hint: 'The left side weighs 5. What could you put on the right so both sides weigh the same?'
      },
      {
        left: [W(3), W(4)], right: [W(2)], hiddenWeight: 0, goal: 'level', locked: ['left'],
        hint: 'Add up each side first. How much more does the right side need?'
      },
      {
        left: [W(10)], right: [W(3)], hiddenWeight: 0, goal: 'level', locked: ['left'],
        hint: 'You can use more than one block. 10 minus 3 is how much?'
      },
      {
        left: [W(2), W(2), W(1)], right: [], hiddenWeight: 0, goal: 'level', locked: ['left'],
        hint: 'There is more than one right answer. A single 5 works, and so do other combinations.'
      },
      {
        left: [W(5), W(5)], right: [W(3), W(3)], hiddenWeight: 0, goal: 'level', locked: ['left'],
        hint: 'Add up each side: 5 + 5 on the left, 3 + 3 on the right. How much more does the right side need?'
      }
    ]
  },

  // ---------- Level 2: one box ----------
  // Each of these starts level. The sanity check in app.js confirms that at load time.
  {
    name: "What's in the box?",
    subtitle: 'Get the box alone to find out',
    puzzles: [
      {
        left: [BOX(), W(3)], right: [W(4), W(3)], hiddenWeight: 4, goal: 'isolate',
        hint: 'Both sides have a 3. If you take a 3 off each side, does it stay level?'
      },
      {
        left: [BOX(), W(2)], right: [W(5), W(2), W(2)], hiddenWeight: 7, goal: 'isolate',
        hint: 'Take the same weight off both sides and it stays level. Try the 2s.'
      },
      {
        left: [W(3), W(2)], right: [BOX(), W(2)], hiddenWeight: 3, goal: 'isolate',
        hint: 'The box is on the right this time. That is fine: get the box alone on its side.'
      },
      {
        left: [W(4), BOX(), W(1)], right: [W(5), W(5)], hiddenWeight: 5, goal: 'isolate',
        hint: 'The 4 and the 1 on the left add up to 5. Is there a 5 on the right you could remove too?'
      },
      {
        left: [BOX(), W(1), W(1), W(1)], right: [W(7), W(1), W(1), W(1)], hiddenWeight: 7, goal: 'isolate',
        hint: 'Three 1s on each side. Take them off in pairs, one from each side at a time.'
      }
    ]
  },

  // ---------- Level 3: boxes on both sides ----------
  {
    name: 'Boxes on both sides',
    subtitle: 'A box on each side? Take one off each side',
    puzzles: [
      {
        left: [BOX(), BOX(), W(2)], right: [BOX(), W(2), W(4)], hiddenWeight: 4, goal: 'isolate',
        hint: 'A box on each side weighs the same. Take one box off each side first, then look again.'
      },
      {
        left: [BOX(), BOX(), W(3)], right: [BOX(), W(5), W(3)], hiddenWeight: 5, goal: 'isolate',
        hint: 'Take a box off each side. Then both sides still have a 3 to take off.'
      },
      {
        left: [BOX(), BOX(), BOX(), W(1)], right: [BOX(), BOX(), W(1), W(6)], hiddenWeight: 6, goal: 'isolate',
        hint: 'Two boxes on the right, three on the left. Take boxes off in pairs, one from each side, until only one is left.'
      }
    ]
  },

  // ---------- Level 4: clone and share (machines that act on both sides at once) ----------
  // Each starts level. The load-time check in app.js runs a short search over
  // remove / clone / share moves and confirms every one of these can be finished.
  {
    name: 'Clone and share',
    subtitle: 'Machines that work on both sides at once',
    machines: true,
    puzzles: [
      {
        left: [BOX(), BOX()], right: [W(8)], hiddenWeight: 4, goal: 'isolate',
        hint: 'Two boxes against 8. Share both sides by 2.'
      },
      {
        left: [BOX(), BOX(), BOX()], right: [W(6), W(6)], hiddenWeight: 4, goal: 'isolate',
        hint: 'Three boxes. Share both sides by 3.'
      },
      {
        left: [BOX(), BOX(), W(3)], right: [W(8), W(3)], hiddenWeight: 4, goal: 'isolate',
        hint: 'Take the 3 off each side first, then share.'
      },
      {
        left: [HALFBOX()], right: [W(3)], hiddenWeight: 6, goal: 'isolate',
        hint: 'Half a box. Clone both sides by 2 to make it whole.'
      },
      {
        left: [BOX(), BOX(), BOX(), W(3)], right: [BOX(), W(3), W(6)], hiddenWeight: 3, goal: 'isolate',
        hint: 'Take a box off each side, then the 3s, then share.'
      }
    ]
  }
];
