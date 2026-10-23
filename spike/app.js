/* Seesaw spike - plain script, no modules, no network. */
(function () {
  'use strict';

  // ---------- constants ----------
  var TILT_K = 5;          // degrees per pound of difference
  var TILT_MAX = 22;
  var PAN_X = { left: 190, right: 710 };   // pan centres in SVG units
  var PAN_TOP = 226;                       // y of the pan's top surface
  var ROW_H = 76;
  var PER_ROW = 5;
  var GAP = 8;
  var BOX_SIZE = 66;
  var PALETTE_VALUES = [1, 2, 3, 5, 10];
  var DRAG_THRESHOLD = 6; // px before a press becomes a drag
  var LETTER = 'x';       // what the box is called in the notation line

  // animal reveal: the heavier the box, the bigger the animal
  var ANIMALS = [
    null,
    { emoji: '🐭', name: 'a mouse' },
    { emoji: '🦆', name: 'a duck' },
    { emoji: '🐈', name: 'a cat' },
    { emoji: '🐕', name: 'a dog' },
    { emoji: '🐐', name: 'a goat' },
    { emoji: '🐖', name: 'a pig' },
    { emoji: '🐑', name: 'a sheep' },
    { emoji: '🐄', name: 'a cow' },
    { emoji: '🐎', name: 'a horse' },
    { emoji: '🐘', name: 'an elephant' }
  ];
  function animalFor(weight) {
    if (weight < 1) return null;
    return ANIMALS[Math.min(weight, 10)];
  }

  // ---------- flat puzzle list built from LEVELS ----------
  // FLAT[i] = { level: levelIndex, pos: positionWithinLevel, puzzle }
  var FLAT = [];
  LEVELS.forEach(function (lv, li) {
    lv.puzzles.forEach(function (pz, pi) {
      FLAT.push({ level: li, pos: pi, puzzle: pz });
    });
  });
  var completed = FLAT.map(function () { return false; });   // in-memory only

  // ---------- state ----------
  var state = {
    index: 0,
    puzzle: null,
    board: { left: [], right: [] },  // arrays of { id, type, value }
    hiddenWeight: 0,
    history: [],
    won: false,
    revealed: false,   // boxes have been opened after a win
    dialMode: false,
    dialValue: 0,
    hintShown: false
  };
  var nextId = 1;

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('board');
  var beamGroup = $('beamGroup');
  var panEls = { left: $('pan-left'), right: $('pan-right') };
  var pieceLayers = {
    left: panEls.left.querySelector('.pieces'),
    right: panEls.right.querySelector('.pieces')
  };
  var notationEl = $('notation');
  var statusEl = $('status');
  var counterEl = $('counter');
  var titleEl = $('title');
  var hintEl = $('hint');
  var dialEl = $('dial');
  var dialRange = $('dialRange');
  var dialValueEl = $('dialValue');
  var dialNextBtn = $('dialNextBtn');
  var undoBtn = $('undoBtn');
  var levelStripEl = $('levelStrip');
  var levelDoneEl = $('levelDone');
  var levelDoneTextEl = $('levelDoneText');
  var levelDoneNextBtn = $('levelDoneNextBtn');

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
    return el;
  }

  // ---------- helpers ----------
  function makePiece(spec) {
    return { id: nextId++, type: spec.type, value: spec.type === 'weight' ? spec.value : 0 };
  }
  function cloneBoard(b) {
    return { left: b.left.slice(), right: b.right.slice() };
  }
  function sideTotal(pieces, hidden) {
    var t = 0;
    for (var i = 0; i < pieces.length; i++) {
      t += pieces[i].type === 'box' ? hidden : pieces[i].value;
    }
    return t;
  }
  function effectiveHidden() {
    return state.dialMode ? state.dialValue : state.hiddenWeight;
  }
  function totals() {
    var h = effectiveHidden();
    return { left: sideTotal(state.board.left, h), right: sideTotal(state.board.right, h) };
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function blockSize(value) {
    return { w: 40 + value * 2, h: 42 + value * 1.6 };
  }
  function pieceSize(p) {
    return p.type === 'box' ? { w: BOX_SIZE, h: BOX_SIZE } : blockSize(p.value);
  }

  function currentLevel() { return LEVELS[FLAT[state.index].level]; }
  function isLastOfLevel() {
    var f = FLAT[state.index];
    return f.pos === LEVELS[f.level].puzzles.length - 1;
  }
  function firstIndexOfLevel(li) {
    for (var i = 0; i < FLAT.length; i++) if (FLAT[i].level === li) return i;
    return 0;
  }
  // should the boxes be drawn open, showing what is inside?
  function boxesOpen() {
    if (!state.won || !state.revealed || state.puzzle.goal !== 'isolate') return false;
    return !state.dialMode || state.dialValue === state.hiddenWeight;
  }

  // ---------- notation ----------
  function formatSide(pieces, letter, substitute) {
    var boxes = 0, sum = 0, parts = [];
    for (var i = 0; i < pieces.length; i++) {
      if (pieces[i].type === 'box') boxes++; else sum += pieces[i].value;
    }
    if (substitute !== null && substitute !== undefined) {
      for (var j = 0; j < boxes; j++) parts.push(String(substitute));
    } else if (boxes === 1) {
      parts.push(letter);
    } else if (boxes > 1) {
      parts.push(boxes + letter);
    }
    if (sum > 0) parts.push(String(sum));
    if (parts.length === 0) return '0';
    return parts.join(' + ');
  }

  function renderNotation() {
    var t = totals();
    var level = t.left === t.right;
    var sub = state.dialMode ? state.dialValue : null;
    var l = formatSide(state.board.left, LETTER, sub);
    var r = formatSide(state.board.right, LETTER, sub);
    if (state.won && state.puzzle.goal === 'isolate' && !state.dialMode) {
      // put the box first so it reads "x = 4" not "4 = x"
      var boxOnLeft = state.board.left.length === 1 && state.board.left[0].type === 'box';
      if (!boxOnLeft) { var tmp = l; l = r; r = tmp; }
    }
    notationEl.innerHTML = '';
    notationEl.appendChild(document.createTextNode(l + ' '));
    var sign = document.createElement('span');
    sign.className = level ? 'eq' : 'neq';
    sign.textContent = level ? '=' : '≠';
    notationEl.appendChild(sign);
    notationEl.appendChild(document.createTextNode(' ' + r));
  }

  // ---------- seesaw rendering ----------
  function currentAngle() {
    var t = totals();
    var diff = t.right - t.left;
    if (diff === 0) return 0;
    return clamp(TILT_K * diff, -TILT_MAX, TILT_MAX);
  }

  function renderBeam() {
    beamGroup.style.transform = 'rotate(' + currentAngle() + 'deg)';
  }

  function drawWeight(p, x, y) {
    var s = blockSize(p.value);
    var g = svgEl('g', { 'class': 'piece weight', 'data-id': p.id });
    g.appendChild(svgEl('rect', { x: x, y: y, width: s.w, height: s.h, rx: 9 }));
    var t = svgEl('text', { x: x + s.w / 2, y: y + s.h / 2 + 1, 'font-size': p.value >= 10 ? 26 : 30 });
    t.textContent = p.value;
    g.appendChild(t);
    return g;
  }

  function drawBox(p, x, y, open) {
    var g = svgEl('g', { 'class': 'piece box' + (open ? ' open' : ''), 'data-id': p.id });
    var bodyTop = y + 12, bodyH = BOX_SIZE - 12;
    var cx = x + BOX_SIZE / 2, cy = bodyTop + bodyH / 2 + 2;
    g.appendChild(svgEl('rect', { 'class': 'body', x: x, y: bodyTop, width: BOX_SIZE, height: bodyH, rx: 8 }));
    var mark = svgEl('text', { 'class': 'mark', x: cx, y: cy, 'font-size': 32 });
    mark.textContent = state.dialMode ? String(state.dialValue) : '?';
    g.appendChild(mark);

    // reveal: an animal sized to the weight climbs out of the box, number stays inside
    var reveal = svgEl('g', { 'class': 'reveal' });
    var w = state.hiddenWeight;
    var animal = animalFor(w);
    if (animal) {
      var size = 30 + Math.min(w, 10) * 4;   // 34 .. 70 SVG px (an elephant is about box-sized)
      var a = svgEl('text', { 'class': 'animal', x: cx, y: y - size / 2 + 6, 'font-size': size });
      a.textContent = animal.emoji;
      reveal.appendChild(a);
    }
    var num = svgEl('text', { 'class': 'num', x: cx, y: cy, 'font-size': 30 });
    num.textContent = w;
    reveal.appendChild(num);
    g.appendChild(reveal);

    // lid (drawn last so it sits on top)
    g.appendChild(svgEl('rect', { 'class': 'lid', x: x - 3, y: y, width: BOX_SIZE + 6, height: 16, rx: 5 }));
    return g;
  }

  function renderSide(side) {
    var layer = pieceLayers[side];
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    var pieces = state.board[side];
    var open = boxesOpen();
    var rows = [];
    for (var i = 0; i < pieces.length; i += PER_ROW) rows.push(pieces.slice(i, i + PER_ROW));
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var totalW = 0;
      for (var k = 0; k < row.length; k++) totalW += pieceSize(row[k]).w;
      totalW += GAP * (row.length - 1);
      var x = PAN_X[side] - totalW / 2;
      var bottom = PAN_TOP - r * ROW_H;
      for (var j = 0; j < row.length; j++) {
        var p = row[j];
        var s = pieceSize(p);
        var y = bottom - s.h;
        var el = p.type === 'box' ? drawBox(p, x, y, open) : drawWeight(p, x, y);
        el.setAttribute('data-side', side);
        layer.appendChild(el);
        x += s.w + GAP;
      }
    }
  }

  function renderLevelStrip() {
    while (levelStripEl.firstChild) levelStripEl.removeChild(levelStripEl.firstChild);
    var cur = FLAT[state.index];
    LEVELS.forEach(function (lv, li) {
      var d = document.createElement('div');
      d.className = 'level' + (li === cur.level ? ' current' : '');
      d.setAttribute('data-level', li);
      d.title = lv.subtitle;
      var name = document.createElement('div');
      name.className = 'level-name';
      name.textContent = lv.name;
      d.appendChild(name);
      var dots = document.createElement('div');
      dots.className = 'dots';
      lv.puzzles.forEach(function (pz, pi) {
        var fi = firstIndexOfLevel(li) + pi;
        var dot = document.createElement('span');
        if (completed[fi]) { dot.className = 'done'; dot.textContent = '●'; }
        else if (fi === state.index) { dot.className = 'here'; dot.textContent = '◉'; }
        else { dot.className = 'todo'; dot.textContent = '○'; }
        dots.appendChild(dot);
      });
      d.appendChild(dots);
      d.addEventListener('click', function () { loadPuzzle(firstIndexOfLevel(li)); });
      levelStripEl.appendChild(d);
    });
  }

  function render() {
    renderSide('left');
    renderSide('right');
    renderBeam();
    renderNotation();
    renderLevelStrip();
    var f = FLAT[state.index];
    var lv = LEVELS[f.level];
    counterEl.textContent = 'Puzzle ' + (f.pos + 1) + ' of ' + lv.puzzles.length;
    titleEl.textContent = lv.subtitle;
    undoBtn.disabled = state.history.length === 0 || state.dialMode;
    hintEl.classList.toggle('hidden', !state.hintShown);
    hintEl.textContent = state.puzzle.hint;
    var showLevelDone = state.won && isLastOfLevel();
    levelDoneEl.classList.toggle('hidden', !showLevelDone);
    if (showLevelDone) {
      var lastLevel = f.level === LEVELS.length - 1;
      levelDoneTextEl.textContent = lastLevel ? 'Level done! You finished every level.' : 'Level done!';
      levelDoneNextBtn.innerHTML = lastLevel ? 'Start over &#9654;' : 'Next &#9654;';
    }
    // the dial has its own Next button; hide it when the level-done line already offers one
    dialNextBtn.classList.toggle('hidden', showLevelDone);
    renderStatus();
  }

  function renderStatus() {
    statusEl.classList.remove('win');
    if (state.dialMode) {
      var t = totals();
      statusEl.textContent = t.left === t.right
        ? 'Level. That is the only weight that works.'
        : (t.left > t.right ? 'Left side is heavier.' : 'Right side is heavier.');
      return;
    }
    if (state.won) {
      statusEl.classList.add('win');
      if (state.puzzle.goal === 'level') {
        statusEl.textContent = 'Level! Both sides weigh the same.';
      } else {
        var animal = animalFor(state.hiddenWeight);
        statusEl.textContent = 'The box weighs ' + state.hiddenWeight + '!' +
          (animal ? ' It was ' + animal.name + '.' : '');
      }
      return;
    }
    statusEl.textContent = '';
  }

  // ---------- puzzle loading ----------
  function loadPuzzle(i) {
    state.index = (i + FLAT.length) % FLAT.length;
    state.puzzle = FLAT[state.index].puzzle;
    state.board = {
      left: state.puzzle.left.map(makePiece),
      right: state.puzzle.right.map(makePiece)
    };
    state.hiddenWeight = state.puzzle.hiddenWeight;
    state.history = [];
    state.won = false;
    state.revealed = false;
    state.dialMode = false;
    state.hintShown = false;
    dialEl.classList.add('hidden');
    clearSelection();
    render();
  }

  // ---------- win check ----------
  function isOnlyOneBox(pieces) { return pieces.length === 1 && pieces[0].type === 'box'; }
  function isOnlyWeights(pieces) {
    if (pieces.length === 0) return false;
    for (var i = 0; i < pieces.length; i++) if (pieces[i].type !== 'weight') return false;
    return true;
  }
  function checkWin() {
    var t = totals();
    if (t.left !== t.right) return false;
    var b = state.board;
    if (state.puzzle.goal === 'level') return b.left.length > 0 && b.right.length > 0;
    return (isOnlyOneBox(b.left) && isOnlyWeights(b.right)) ||
           (isOnlyOneBox(b.right) && isOnlyWeights(b.left));
  }

  function afterMove() {
    render();
    maybeWin();
  }

  function maybeWin() {
    if (state.won || state.dialMode) return;
    if (!checkWin()) return;
    state.won = true;
    completed[state.index] = true;
    render();   // boxes still drawn closed (revealed is false)
    if (state.puzzle.goal === 'isolate') {
      // open the boxes after the beam has settled, so the lid animates and the animal fades in
      setTimeout(function () {
        if (!state.won) return;   // undone in the meantime
        state.revealed = true;
        var boxes = svg.querySelectorAll('.piece.box');
        for (var i = 0; i < boxes.length; i++) boxes[i].classList.add('open');
      }, 450);
      setTimeout(startDial, 2200);
    }
  }

  // ---------- dial check ----------
  function startDial() {
    if (!state.won || state.puzzle.goal !== 'isolate') return;
    state.dialMode = true;
    state.dialValue = state.hiddenWeight;
    // restore the original layout
    state.board = {
      left: state.puzzle.left.map(makePiece),
      right: state.puzzle.right.map(makePiece)
    };
    dialRange.value = state.dialValue;
    dialValueEl.textContent = state.dialValue;
    dialEl.classList.remove('hidden');
    render();
  }
  dialRange.addEventListener('input', function () {
    state.dialValue = parseInt(dialRange.value, 10);
    dialValueEl.textContent = state.dialValue;
    render();
  });
  dialNextBtn.addEventListener('click', function () { loadPuzzle(state.index + 1); });
  levelDoneNextBtn.addEventListener('click', function () { loadPuzzle(state.index + 1); });

  // ---------- board mutations (with history) ----------
  function pushHistory() { state.history.push(cloneBoard(state.board)); }

  function addPiece(side, spec) {
    if (state.dialMode) return;
    pushHistory();
    state.board[side].push(makePiece(spec));
    afterMove();
  }
  function removePieceById(id) {
    if (state.dialMode) return;
    var loc = findPiece(id);
    if (!loc) return;
    pushHistory();
    state.board[loc.side].splice(loc.idx, 1);
    afterMove();
  }
  function movePiece(id, toSide) {
    if (state.dialMode) return;
    var loc = findPiece(id);
    if (!loc || loc.side === toSide) return;
    pushHistory();
    var p = state.board[loc.side].splice(loc.idx, 1)[0];
    state.board[toSide].push(p);
    afterMove();
  }
  function findPiece(id) {
    var sides = ['left', 'right'];
    for (var s = 0; s < 2; s++) {
      var arr = state.board[sides[s]];
      for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return { side: sides[s], idx: i };
    }
    return null;
  }

  function undo() {
    if (state.history.length === 0 || state.dialMode) return;
    state.board = state.history.pop();
    state.won = false;
    state.revealed = false;
    render();
  }

  // ---------- palette ----------
  var paletteEl = $('palette');
  var selectedValue = null;   // click-to-place fallback
  function clearSelection() {
    selectedValue = null;
    var sel = paletteEl.querySelectorAll('.pal-block.selected');
    for (var i = 0; i < sel.length; i++) sel[i].classList.remove('selected');
  }
  PALETTE_VALUES.forEach(function (v) {
    var s = blockSize(v);
    var d = document.createElement('div');
    d.className = 'pal-block';
    d.style.width = (s.w * 1.15) + 'px';
    d.style.height = (s.h * 1.15) + 'px';
    d.textContent = v;
    d.setAttribute('data-value', v);
    paletteEl.appendChild(d);
  });
  var palHint = document.createElement('span');
  palHint.className = 'pal-hint';
  palHint.textContent = 'Drag a weight onto a side. Drag a piece off to remove it. (Or click a weight, then click a side.)';
  paletteEl.appendChild(palHint);

  // ---------- drag and drop (pointer events) ----------
  var drag = null; // { kind: 'palette'|'piece', value, id, side, startX, startY, moved, ghost, el }

  function makeGhost(kind, p) {
    var g = document.createElement('div');
    g.id = 'ghost';
    if (kind === 'box') {
      g.className = 'box';
      g.style.width = (BOX_SIZE * 1.15) + 'px';
      g.style.height = (BOX_SIZE * 1.15) + 'px';
      g.textContent = '?';
    } else {
      var s = blockSize(p);
      g.style.width = (s.w * 1.15) + 'px';
      g.style.height = (s.h * 1.15) + 'px';
      g.textContent = p;
    }
    document.body.appendChild(g);
    return g;
  }
  function moveGhost(g, x, y) { g.style.left = x + 'px'; g.style.top = y + 'px'; }

  function sideAtPoint(x, y) {
    var el = document.elementFromPoint(x, y);
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute('data-side')) return el.getAttribute('data-side');
      el = el.parentNode;
    }
    return null;
  }
  function highlightSide(side) {
    panEls.left.classList.toggle('over', side === 'left');
    panEls.right.classList.toggle('over', side === 'right');
  }

  function closestPieceEl(el) {
    while (el && el !== svg) {
      if (el.classList && el.classList.contains('piece')) return el;
      el = el.parentNode;
    }
    return null;
  }

  function onPointerDown(ev) {
    if (ev.button !== 0 || state.dialMode) return;
    var pal = ev.target.closest ? ev.target.closest('.pal-block') : null;
    if (pal) {
      drag = { kind: 'palette', value: parseInt(pal.getAttribute('data-value'), 10),
        startX: ev.clientX, startY: ev.clientY, moved: false, el: pal, ghost: null };
      ev.preventDefault();
      return;
    }
    var pieceEl = closestPieceEl(ev.target);
    if (pieceEl) {
      var id = parseInt(pieceEl.getAttribute('data-id'), 10);
      var loc = findPiece(id);
      if (!loc) return;
      var p = state.board[loc.side][loc.idx];
      drag = { kind: 'piece', id: id, side: loc.side, type: p.type, value: p.value,
        startX: ev.clientX, startY: ev.clientY, moved: false, el: pieceEl, ghost: null };
      ev.preventDefault();
      return;
    }
    // click-to-place fallback: a palette block is selected and the player clicked empty pan space
    if (selectedValue !== null) {
      var side = sideAtPoint(ev.clientX, ev.clientY);
      if (side) { addPiece(side, { type: 'weight', value: selectedValue }); }
    }
  }

  function onPointerMove(ev) {
    if (!drag) return;
    var dx = ev.clientX - drag.startX, dy = ev.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      drag.ghost = makeGhost(drag.kind === 'piece' && drag.type === 'box' ? 'box' : 'weight', drag.value);
      if (drag.kind === 'piece') drag.el.classList.add('lifting');
      clearSelection();
    }
    moveGhost(drag.ghost, ev.clientX, ev.clientY);
    highlightSide(sideAtPoint(ev.clientX, ev.clientY));
  }

  function onPointerUp(ev) {
    if (!drag) return;
    var d = drag;
    drag = null;
    highlightSide(null);
    if (d.ghost) d.ghost.parentNode.removeChild(d.ghost);
    if (d.el && d.el.classList) d.el.classList.remove('lifting');

    if (!d.moved) {
      // plain click
      if (d.kind === 'palette') {
        if (selectedValue === d.value) { clearSelection(); }
        else { clearSelection(); selectedValue = d.value; d.el.classList.add('selected'); }
      } else if (d.kind === 'piece') {
        // clicking a piece on a pan always removes it, whatever is selected in the palette
        removePieceById(d.id);
      }
      return;
    }

    var side = sideAtPoint(ev.clientX, ev.clientY);
    if (d.kind === 'palette') {
      if (side) addPiece(side, { type: 'weight', value: d.value });
    } else if (d.kind === 'piece') {
      if (!side) removePieceById(d.id);
      else if (side !== d.side) movePiece(d.id, side);
      // dropped back on the same side: nothing happens
    }
  }

  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  // ---------- buttons ----------
  $('prevBtn').addEventListener('click', function () { loadPuzzle(state.index - 1); });
  $('nextBtn').addEventListener('click', function () { loadPuzzle(state.index + 1); });
  $('resetBtn').addEventListener('click', function () { loadPuzzle(state.index); });
  undoBtn.addEventListener('click', undo);
  $('hintBtn').addEventListener('click', function () { state.hintShown = !state.hintShown; render(); });
  document.addEventListener('keydown', function (ev) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === 'z') { ev.preventDefault(); undo(); }
  });

  // ---------- sanity checks on puzzle data ----------
  function solvableByRemoval(pz) {
    // Brute force: try every subset of pieces to keep on each side.
    var L = pz.left, R = pz.right, h = pz.hiddenWeight;
    function keepSubsets(arr) {
      var out = [];
      for (var mask = 0; mask < (1 << arr.length); mask++) {
        var kept = [];
        for (var i = 0; i < arr.length; i++) if (mask & (1 << i)) kept.push(arr[i]);
        out.push(kept);
      }
      return out;
    }
    var ls = keepSubsets(L), rs = keepSubsets(R);
    var tot = function (a) { var t = 0; for (var i = 0; i < a.length; i++) t += a[i].type === 'box' ? h : a[i].value; return t; };
    var oneBox = function (a) { return a.length === 1 && a[0].type === 'box'; };
    var onlyW = function (a) { if (!a.length) return false; for (var i = 0; i < a.length; i++) if (a[i].type !== 'weight') return false; return true; };
    for (var i = 0; i < ls.length; i++) for (var j = 0; j < rs.length; j++) {
      if (tot(ls[i]) !== tot(rs[j])) continue;
      if ((oneBox(ls[i]) && onlyW(rs[j])) || (oneBox(rs[j]) && onlyW(ls[i]))) return true;
    }
    return false;
  }
  function hasBox(arr) { for (var i = 0; i < arr.length; i++) if (arr[i].type === 'box') return true; return false; }
  FLAT.forEach(function (f) {
    var pz = f.puzzle;
    var tag = 'Level ' + (f.level + 1) + ' puzzle ' + (f.pos + 1);
    var l = sideTotal(pz.left.map(function (s) { return { type: s.type, value: s.value || 0 }; }), pz.hiddenWeight);
    var r = sideTotal(pz.right.map(function (s) { return { type: s.type, value: s.value || 0 }; }), pz.hiddenWeight);
    if (pz.goal === 'isolate') {
      console.assert(hasBox(pz.left) || hasBox(pz.right), tag + ' has no box');
      console.assert(l === r, tag + ' does not start level: ' + l + ' vs ' + r);
      console.assert(solvableByRemoval(pz), tag + ' cannot be finished by removing pieces only');
    } else {
      // "make it level" puzzles: no boxes, and must not already be level (nothing to do)
      console.assert(!hasBox(pz.left) && !hasBox(pz.right), tag + ' should not contain a box');
      console.assert(l !== r || pz.left.length === 0 || pz.right.length === 0, tag + ' is already level at the start');
    }
  });

  // ---------- go ----------
  loadPuzzle(0);
})();
