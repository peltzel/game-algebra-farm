// Puzzle data for the seesaw spike. Plain data, no logic.
// A piece is { type: 'weight', value: N } or { type: 'box' }.
// All boxes in one puzzle share the same hiddenWeight.
// goal 'level'   -> win when both pans are non-empty and weigh the same.
// goal 'isolate' -> win when level AND one side is exactly one box and nothing else,
//                   AND the other side holds only known weights (at least one).

var W = function (v) { return { type: 'weight', value: v }; };
var BOX = function () { return { type: 'box' }; };

var PUZZLES = [
  // ---------- Stage 1: make it level (no boxes) ----------
  {
    stage: 1, title: 'Make it level',
    left: [W(5)], right: [], hiddenWeight: 0, goal: 'level',
    hint: 'The left side weighs 5. What could you put on the right so both sides weigh the same?'
  },
  {
    stage: 1, title: 'Make it level',
    left: [W(3), W(4)], right: [W(2)], hiddenWeight: 0, goal: 'level',
    hint: 'Add up each side first. How much more does the right side need?'
  },
  {
    stage: 1, title: 'Make it level',
    left: [W(10)], right: [W(3)], hiddenWeight: 0, goal: 'level',
    hint: 'You can use more than one block. 10 minus 3 is how much?'
  },
  {
    stage: 1, title: 'Make it level',
    left: [W(2), W(2), W(1)], right: [], hiddenWeight: 0, goal: 'level',
    hint: 'There is more than one right answer. A single 5 works, and so do other combinations.'
  },
  {
    stage: 1, title: 'Make it level',
    left: [W(5), W(5)], right: [W(3), W(3)], hiddenWeight: 0, goal: 'level',
    hint: 'You could also take things OFF the left side instead of adding to the right.'
  },

  // ---------- Stage 2: find out what the box weighs ----------
  // Each of these starts level. The sanity check in app.js confirms that at load time.
  {
    stage: 2, title: 'Find out what the box weighs',
    left: [BOX(), W(3)], right: [W(4), W(3)], hiddenWeight: 4, goal: 'isolate',
    hint: 'Both sides have a 3. If you take a 3 off each side, does it stay level?'
  },
  {
    stage: 2, title: 'Find out what the box weighs',
    left: [BOX(), W(2)], right: [W(5), W(2), W(2)], hiddenWeight: 7, goal: 'isolate',
    hint: 'Take the same weight off both sides and it stays level. Try the 2s.'
  },
  {
    stage: 2, title: 'Find out what the box weighs',
    left: [W(4), BOX(), W(1)], right: [W(5), W(5)], hiddenWeight: 5, goal: 'isolate',
    hint: 'The 4 and the 1 on the left add up to 5. Is there a 5 on the right you could remove too?'
  },
  {
    stage: 2, title: 'Find out what the box weighs',
    left: [W(3), W(2)], right: [BOX(), W(2)], hiddenWeight: 3, goal: 'isolate',
    hint: 'The box is on the right this time. That is fine: get the box alone on its side.'
  },
  {
    stage: 2, title: 'Find out what the box weighs',
    left: [BOX(), BOX(), W(2)], right: [BOX(), W(2), W(4)], hiddenWeight: 4, goal: 'isolate',
    hint: 'A box on each side weighs the same. Take one box off each side first, then look again.'
  },
  {
    stage: 2, title: 'Find out what the box weighs',
    left: [BOX(), W(1), W(1), W(1)], right: [W(7), W(1), W(1), W(1)], hiddenWeight: 7, goal: 'isolate',
    hint: 'Three 1s on each side. Take them off in pairs, one from each side at a time.'
  }
];
