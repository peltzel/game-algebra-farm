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
    hintShown: false,
    variant: null,     // colour variant of this puzzle's animal (from the farm), or null if not yet won
    newAnimal: false   // this win added an animal to the farm
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
  var playEl = $('play');
  var machinesEl = $('machines');
  var machineMsgEl = $('machineMsg');
  var machineBtns = machinesEl.querySelectorAll('button.machine');

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
    return el;
  }

  // ---------- farm: colour variants and rarity ----------
  // Rolled once per earned animal. 'adj' goes into the label: "a dog" -> "a golden dog".
  var VARIANTS = [
    { id: 'common',    chance: 0.60, adj: '',        shout: '' },
    { id: 'uncommon',  chance: 0.25, adj: 'golden',  shout: '' },
    { id: 'rare',      chance: 0.12, adj: 'blue',    shout: 'Rare!' },
    { id: 'legendary', chance: 0.03, adj: 'rainbow', shout: 'LEGENDARY!' }
  ];
  function variantById(id) {
    for (var i = 0; i < VARIANTS.length; i++) if (VARIANTS[i].id === id) return VARIANTS[i];
    return VARIANTS[0];
  }
  function rollVariant() {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < VARIANTS.length; i++) {
      acc += VARIANTS[i].chance;
      if (r < acc) return VARIANTS[i];
    }
    return VARIANTS[0];
  }
  // "a dog" + golden -> "a golden dog"; "an elephant" + blue -> "a blue elephant"
  function animalLabel(animal, variant) {
    if (!variant || !variant.adj) return animal.name;
    var sp = animal.name.indexOf(' ');
    var noun = sp >= 0 ? animal.name.slice(sp + 1) : animal.name;
    return 'a ' + variant.adj + ' ' + noun;
  }
  // CSS class that tints an emoji for this variant ('' for common)
  function tintClass(variant) {
    return variant && variant.id !== 'common' ? 'tint-' + variant.id : '';
  }

  // ---------- farm: storage ----------
  // farm.animals = [{ key: 'level-pos', weight, variant }]; one entry per puzzle ever won
  var FARM_KEY = 'seesaw-farm-v1';
  var FARM_MAX_SHOWN = 30;
  var GRASS_SHARE = 0.5;   // the bottom half of the ground is grass (matches .farm-ground in style.css)
  var farm = loadFarm();
  function loadFarm() {
    try {
      var raw = window.localStorage.getItem(FARM_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.animals)) return parsed;
      }
    } catch (e) { /* storage unavailable or corrupt: start with an empty farm */ }
    return { animals: [] };
  }
  function saveFarm() {
    try { window.localStorage.setItem(FARM_KEY, JSON.stringify(farm)); } catch (e) { /* ignore */ }
  }
  function puzzleKey(index) {
    var f = FLAT[index];
    return f.level + '-' + f.pos;
  }
  function farmAnimalFor(index) {
    var key = puzzleKey(index);
    for (var i = 0; i < farm.animals.length; i++) if (farm.animals[i].key === key) return farm.animals[i];
    return null;
  }
  // called once on the first win of a box puzzle; returns the new entry
  function earnAnimal(index, weight) {
    var entry = { key: puzzleKey(index), weight: weight, variant: rollVariant().id };
    farm.animals.push(entry);
    saveFarm();
    renderFarm();
    return entry;
  }
  function resetFarm() {
    farm = { animals: [] };
    saveFarm();
    renderFarm();
  }

  // ---------- farm: rendering and wandering ----------
  var farmGround = $('farmGround');
  var farmCountEl = $('farmCount');
  var reducedMotion = false;
  try {
    reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { reducedMotion = false; }
  var critters = [];      // live wanderers: { el, w, x, target, pauseUntil, speed, facingRight }
  var wanderTimer = null;

  function groundWidth() { return farmGround.clientWidth || 200; }

  function renderFarm() {
    while (farmGround.firstChild) farmGround.removeChild(farmGround.firstChild);
    critters = [];
    var n = farm.animals.length;
    farmCountEl.textContent = n + (n === 1 ? ' animal' : ' animals');
    var shown = farm.animals.slice(0, FARM_MAX_SHOWN);
    for (var i = 0; i < shown.length; i++) {
      var a = shown[i];
      var animal = animalFor(a.weight);
      if (!animal) continue;
      var variant = variantById(a.variant);
      var size = 20 + Math.min(a.weight, 10) * 1.6;      // 22 .. 36 px: bigger animals are bigger
      var el = document.createElement('div');
      el.className = 'farm-animal ' + variant.id;
      el.title = animalLabel(animal, variant);
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.style.width = Math.round(size * 1.5) + 'px';
      badge.style.height = Math.round(size * 1.5) + 'px';
      var em = document.createElement('span');
      em.className = 'emoji ' + tintClass(variant);
      em.style.fontSize = Math.round(size) + 'px';
      em.textContent = animal.emoji;
      badge.appendChild(em);
      if (variant.id === 'rare' || variant.id === 'legendary') {
        var star = document.createElement('span');
        star.className = 'star';
        star.textContent = '★';
        badge.appendChild(star);
      }
      el.appendChild(badge);
      // spread them across the grass strip so they do not all stand on one line
      var w = Math.round(size * 1.5) + 4;
      var gw = groundWidth();
      var c = {
        el: el, w: w,
        x: Math.random() * Math.max(1, gw - w),
        target: 0, pauseUntil: 0,
        speed: 10 + Math.random() * 10,       // px per second: a slow amble
        facingRight: Math.random() < 0.5
      };
      c.target = c.x;
      // spread them across the grass band (the bottom half of the ground); the ones
      // nearer the bottom edge draw on top, as if closer to the viewer
      var grassH = (farmGround.clientHeight || 200) * GRASS_SHARE;
      var bottom = 6 + Math.random() * Math.max(0, grassH - w - 10);
      el.style.bottom = Math.round(bottom) + 'px';
      el.style.zIndex = String(500 - Math.round(bottom));
      placeCritter(c);
      farmGround.appendChild(el);
      critters.push(c);
    }
    startWandering();
  }

  function placeCritter(c) {
    c.el.style.left = Math.round(c.x) + 'px';
    c.el.classList.toggle('face-right', c.facingRight);
  }

  function pickTarget(c, now) {
    var gw = groundWidth();
    c.target = Math.random() * Math.max(1, gw - c.w);
    // pause for 1 to 3 seconds before heading off, now and then
    if (Math.random() < 0.6) c.pauseUntil = now + 1000 + Math.random() * 2000;
  }

  function wanderStep() {
    var now = Date.now();
    var dt = 0.06;   // seconds per tick
    for (var i = 0; i < critters.length; i++) {
      var c = critters[i];
      if (now < c.pauseUntil) continue;
      var dx = c.target - c.x;
      if (Math.abs(dx) < 1) { pickTarget(c, now); continue; }
      var step = Math.min(Math.abs(dx), c.speed * dt);
      c.x += dx > 0 ? step : -step;
      c.facingRight = dx > 0;
      placeCritter(c);
    }
  }

  function startWandering() {
    if (wanderTimer !== null) { clearInterval(wanderTimer); wanderTimer = null; }
    if (reducedMotion || critters.length === 0) return;
    wanderTimer = setInterval(wanderStep, 60);
  }

  $('farmResetBtn').addEventListener('click', function () {
    if (farm.animals.length === 0) return;
    if (window.confirm('Reset your farm? Every animal will leave, and you can win them back by playing again.')) {
      resetFarm();
      state.variant = null;
      state.newAnimal = false;
      render();
    }
  });

  // ---------- SOLVER-BEGIN ----------
  // Pure board rules, no DOM. The node check script slices this block out of the
  // file by the SOLVER-BEGIN / SOLVER-END markers and runs it standalone, so keep
  // everything between the markers free of references to the page or to state.
  var SHARE_BLOCKS = [10, 5, 3, 2, 1];   // blocks a shared-out total is re-chunked into (largest first)

  function pieceFrac(p) { return p.type === 'box' ? (p.fraction || 1) : 0; }
  function pieceWeight(p, hidden) { return p.type === 'box' ? hidden * pieceFrac(p) : p.value; }
  function sideTotal(pieces, hidden) {
    var t = 0;
    for (var i = 0; i < pieces.length; i++) t += pieceWeight(pieces[i], hidden);
    return t;
  }
  function sideBoxes(pieces) {   // 1 per whole box, 0.5 per half-box
    var n = 0;
    for (var i = 0; i < pieces.length; i++) n += pieceFrac(pieces[i]);
    return n;
  }
  function sideKnown(pieces) {   // total of the numbered blocks only
    var t = 0;
    for (var i = 0; i < pieces.length; i++) if (pieces[i].type === 'weight') t += pieces[i].value;
    return t;
  }
  // greedy re-chunking of a known total into blocks: 8 -> [5, 3], 4 -> [3, 1]
  function chunkWeight(total) {
    var out = [], left = total;
    for (var i = 0; i < SHARE_BLOCKS.length && left > 0; i++) {
      while (left >= SHARE_BLOCKS[i]) { out.push(SHARE_BLOCKS[i]); left -= SHARE_BLOCKS[i]; }
    }
    return out;
  }
  // Pieces made here carry no id; the game hands out ids (and a fade-in) afterwards.
  function newBox(frac) { return frac === 1 ? { type: 'box', fraction: 1 } : { type: 'box', fraction: frac }; }
  function newWeight(v) { return { type: 'weight', value: v }; }
  function copyPiece(p) {
    return p.type === 'box' ? newBox(pieceFrac(p)) : newWeight(p.value);
  }
  // Merge rule: two half-boxes on one side become one whole box. Runs after every change.
  function mergeHalves(pieces) {
    var out = [], pendingHalf = -1;
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (p.type === 'box' && pieceFrac(p) === 0.5) {
        if (pendingHalf < 0) { pendingHalf = out.length; out.push(p); }
        else { out[pendingHalf] = newBox(1); pendingHalf = -1; }
      } else {
        out.push(p);
      }
    }
    return out;
  }
  function mergeBoard(b) { return { left: mergeHalves(b.left), right: mergeHalves(b.right) }; }
  // Clone: every piece on the side appears n times (the originals stay, copies are new)
  function cloneSide(pieces, n) {
    var out = pieces.slice();
    for (var k = 1; k < n; k++) for (var i = 0; i < pieces.length; i++) out.push(copyPiece(pieces[i]));
    return out;
  }
  // Share: deal the side into n equal trays and keep one. Only when it comes out even.
  function canShareSide(pieces, n) {
    var boxes = sideBoxes(pieces), known = sideKnown(pieces);
    return (boxes / n) % 1 === 0 && known % n === 0;
  }
  function shareSide(pieces, n) {
    var keepBoxes = sideBoxes(pieces) / n, out = [];
    for (var i = 0; i < pieces.length && keepBoxes > 0; i++) {
      if (pieces[i].type === 'box' && pieceFrac(pieces[i]) === 1) { out.push(pieces[i]); keepBoxes--; }
    }
    var chunks = chunkWeight(sideKnown(pieces) / n);
    for (var j = 0; j < chunks.length; j++) out.push(newWeight(chunks[j]));
    return out;
  }
  function canShareBoard(b, n) { return canShareSide(b.left, n) && canShareSide(b.right, n); }
  function shareBoard(b, n) { return { left: shareSide(b.left, n), right: shareSide(b.right, n) }; }
  function cloneBoardTimes(b, n) { return { left: cloneSide(b.left, n), right: cloneSide(b.right, n) }; }

  // win shape: exactly one whole box alone on one side, only numbered blocks (at least one) on the other
  function isOnlyOneBox(pieces) { return pieces.length === 1 && pieces[0].type === 'box' && pieceFrac(pieces[0]) === 1; }
  function isOnlyWeights(pieces) {
    if (pieces.length === 0) return false;
    for (var i = 0; i < pieces.length; i++) if (pieces[i].type !== 'weight') return false;
    return true;
  }
  function isIsolated(b, hidden) {
    if (sideTotal(b.left, hidden) !== sideTotal(b.right, hidden)) return false;
    return (isOnlyOneBox(b.left) && isOnlyWeights(b.right)) || (isOnlyOneBox(b.right) && isOnlyWeights(b.left));
  }

  // Breadth-first search over: remove any one piece, clone x2, clone x3, share by 2, share by 3
  // (merge rule applied after each). Returns { depth, moves } of a shortest win, or depth -1.
  function solveByMachines(pz, maxDepth) {
    var h = pz.hiddenWeight;
    function sideKey(pieces) {
      var ws = [];
      for (var i = 0; i < pieces.length; i++) if (pieces[i].type === 'weight') ws.push(pieces[i].value);
      ws.sort(function (a, b) { return a - b; });
      return sideBoxes(pieces) + 'b|' + ws.join(',');
    }
    function key(b) { return sideKey(b.left) + ' / ' + sideKey(b.right); }
    function pieceName(p) { return p.type === 'box' ? (pieceFrac(p) === 1 ? 'box' : 'half-box') : String(p.value); }
    var start = mergeBoard({ left: pz.left.map(copyPiece), right: pz.right.map(copyPiece) });
    if (isIsolated(start, h)) return { depth: 0, moves: [] };
    var seen = {}; seen[key(start)] = true;
    var queue = [{ board: start, moves: [] }];
    while (queue.length) {
      var cur = queue.shift();
      if (cur.moves.length >= maxDepth) continue;
      var next = [];
      var sides = ['left', 'right'];
      for (var s = 0; s < 2; s++) {
        var arr = cur.board[sides[s]], tried = {};
        for (var i = 0; i < arr.length; i++) {
          var nm = pieceName(arr[i]);
          if (tried[nm]) continue;
          tried[nm] = true;
          var nb = { left: cur.board.left.slice(), right: cur.board.right.slice() };
          nb[sides[s]].splice(i, 1);
          next.push({ board: nb, move: 'remove ' + nm + ' from ' + sides[s] });
        }
      }
      next.push({ board: cloneBoardTimes(cur.board, 2), move: 'clone x2' });
      next.push({ board: cloneBoardTimes(cur.board, 3), move: 'clone x3' });
      if (canShareBoard(cur.board, 2)) next.push({ board: shareBoard(cur.board, 2), move: 'share by 2' });
      if (canShareBoard(cur.board, 3)) next.push({ board: shareBoard(cur.board, 3), move: 'share by 3' });
      for (var k = 0; k < next.length; k++) {
        var nb2 = mergeBoard(next[k].board);
        var moves = cur.moves.concat([next[k].move]);
        if (isIsolated(nb2, h)) return { depth: moves.length, moves: moves };
        var kk = key(nb2);
        if (seen[kk]) continue;
        // cap the search: cloning without bound would blow up the state space
        if (nb2.left.length + nb2.right.length > 40) continue;
        seen[kk] = true;
        queue.push({ board: nb2, moves: moves });
      }
    }
    return { depth: -1, moves: [] };
  }
  // ---------- SOLVER-END ----------

  // ---------- helpers ----------
  function makePiece(spec) {
    var p = { id: nextId++, type: spec.type, value: spec.type === 'weight' ? spec.value : 0 };
    if (spec.type === 'box') p.fraction = spec.fraction || 1;
    return p;
  }
  function cloneBoard(b) {
    return { left: b.left.slice(), right: b.right.slice() };
  }
  // pieces that came out of a machine have no id yet: give them one and let them fade in
  var freshIds = {};
  function assignIds(b) {
    var sides = ['left', 'right'];
    for (var s = 0; s < 2; s++) {
      var arr = b[sides[s]];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === undefined) {
          arr[i] = makePiece(arr[i]);
          freshIds[arr[i].id] = true;
        }
      }
    }
    return b;
  }
  // the merge rule, applied to the live board after every change
  function normalizeBoard() {
    state.board = assignIds(mergeBoard(state.board));
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
    return p.type === 'box' ? { w: BOX_SIZE * pieceFrac(p), h: BOX_SIZE } : blockSize(p.value);
  }
  function fmtNum(v) { return String(Math.round(v * 100) / 100); }

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
    var boxes = 0, halves = 0, sum = 0, parts = [];
    for (var i = 0; i < pieces.length; i++) {
      if (pieces[i].type === 'box') {
        if (pieceFrac(pieces[i]) === 1) boxes++; else halves++;
      } else sum += pieces[i].value;
    }
    if (substitute !== null && substitute !== undefined) {
      for (var j = 0; j < boxes; j++) parts.push(String(substitute));
      for (var hh = 0; hh < halves; hh++) parts.push(fmtNum(substitute / 2));
    } else {
      if (boxes === 1) parts.push(letter);
      else if (boxes > 1) parts.push(boxes + letter);
      for (var k = 0; k < halves; k++) parts.push(letter + '/2');   // after merging there is at most one
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
    var frac = pieceFrac(p), half = frac !== 1;
    var bw = BOX_SIZE * frac;
    var g = svgEl('g', { 'class': 'piece box' + (half ? ' half' : '') + (open ? ' open' : ''), 'data-id': p.id });
    var bodyTop = y + 12, bodyH = BOX_SIZE - 12;
    var cx = x + bw / 2, cy = bodyTop + bodyH / 2 + 2;
    g.appendChild(svgEl('rect', { 'class': 'body', x: x, y: bodyTop, width: bw, height: bodyH, rx: 8 }));
    if (half) {
      // the cut edge: a dashed line where the other half used to be
      g.appendChild(svgEl('line', { 'class': 'cut', x1: x + bw, y1: bodyTop + 2, x2: x + bw, y2: bodyTop + bodyH - 2 }));
    }
    var mark = svgEl('text', { 'class': 'mark', x: cx, y: cy, 'font-size': half ? 22 : 32 });
    mark.textContent = state.dialMode ? fmtNum(state.dialValue * frac) : '?';
    g.appendChild(mark);

    // reveal: an animal sized to the weight climbs out of the box, number stays inside
    // (a half-box only shows its number: half an animal would be odd)
    var reveal = svgEl('g', { 'class': 'reveal' });
    var w = state.hiddenWeight * frac;
    var animal = half ? null : animalFor(w);
    if (animal) {
      var size = 30 + Math.min(w, 10) * 4;   // 34 .. 70 SVG px (an elephant is about box-sized)
      // same tint as the animal that walks onto the farm
      var a = svgEl('text', { 'class': 'animal ' + tintClass(state.variant), x: cx, y: y - size / 2 + 6, 'font-size': size });
      a.textContent = animal.emoji;
      reveal.appendChild(a);
    }
    var num = svgEl('text', { 'class': 'num', x: cx, y: cy, 'font-size': half ? 22 : 30 });
    num.textContent = fmtNum(w);
    reveal.appendChild(num);
    g.appendChild(reveal);

    // lid (drawn last so it sits on top)
    g.appendChild(svgEl('rect', { 'class': 'lid', x: x - 3, y: y, width: bw + 6, height: 16, rx: 5 }));
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
        if (freshIds[p.id]) el.classList.add('fresh');   // just came out of a machine: fade in
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
    freshIds = {};   // the fade-in happens once, on the first draw after a machine
    renderBeam();
    renderNotation();
    renderLevelStrip();
    var f = FLAT[state.index];
    var lv = LEVELS[f.level];
    counterEl.textContent = 'Puzzle ' + (f.pos + 1) + ' of ' + lv.puzzles.length;
    titleEl.textContent = lv.subtitle;
    undoBtn.disabled = state.history.length === 0 || state.dialMode;
    // machine row: only on levels that have machines; greyed while a win or the dial is showing
    var showMachines = !!lv.machines;
    machinesEl.classList.toggle('hidden', !showMachines);
    playEl.classList.toggle('with-machines', showMachines);
    for (var mi = 0; mi < machineBtns.length; mi++) machineBtns[mi].disabled = state.won || state.dialMode;
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
        var label = animal ? animalLabel(animal, state.variant) : '';
        statusEl.textContent = 'The box weighs ' + state.hiddenWeight + '!' +
          (animal ? ' It was ' + label + '.' : '');
        if (animal && state.newAnimal && state.variant) {
          // second line: tell the kid an animal joined the farm (and how rare it is)
          var note = document.createElement('div');
          note.className = 'farm-note ' + state.variant.id;
          var joins = label.charAt(0).toUpperCase() + label.slice(1) + ' joins your farm.';
          note.textContent = state.variant.shout ? state.variant.shout + ' ' + joins : joins;
          statusEl.appendChild(note);
        }
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
    var earned = farmAnimalFor(state.index);
    state.variant = earned ? variantById(earned.variant) : null;
    state.newAnimal = false;
    dialEl.classList.add('hidden');
    clearSelection();
    clearMachineMsg();
    normalizeBoard();
    render();
  }

  // ---------- win check ----------
  function checkWin() {
    var t = totals();
    if (t.left !== t.right) return false;
    var b = state.board;
    if (state.puzzle.goal === 'level') return b.left.length > 0 && b.right.length > 0;
    return isIsolated(b, effectiveHidden());
  }

  function afterMove() {
    normalizeBoard();
    render();
    maybeWin();
  }

  function maybeWin() {
    if (state.won || state.dialMode) return;
    if (!checkWin()) return;
    state.won = true;
    completed[state.index] = true;
    if (state.puzzle.goal === 'isolate' && !farmAnimalFor(state.index) && animalFor(state.hiddenWeight)) {
      // first time this puzzle has been won in this browser: the animal joins the farm
      var entry = earnAnimal(state.index, state.hiddenWeight);
      state.variant = variantById(entry.variant);
      state.newAnimal = true;
    }
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
    normalizeBoard();
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
    clearMachineMsg();
    render();
  }

  // ---------- machines (level 4): clone and share, always both sides at once ----------
  var MACHINE_MSG_MS = 3200;
  var machineMsgTimer = null;
  var shareTimer = null;
  function clearMachineMsg() {
    if (machineMsgTimer !== null) { clearTimeout(machineMsgTimer); machineMsgTimer = null; }
    machineMsgEl.textContent = '';
  }
  function showMachineMsg(text) {
    clearMachineMsg();
    machineMsgEl.textContent = text;
    machineMsgTimer = setTimeout(clearMachineMsg, MACHINE_MSG_MS);
  }
  function machinesActive() {
    return !!currentLevel().machines && !state.won && !state.dialMode;
  }
  function machineClone(n) {
    if (!machinesActive()) return;
    clearMachineMsg();
    pushHistory();
    state.board = cloneBoardTimes(state.board, n);
    afterMove();   // merges half-boxes, hands out ids (the copies fade in), checks for a win
  }
  function machineShare(n) {
    if (!machinesActive()) return;
    if (!canShareBoard(state.board, n)) {
      showMachineMsg("That won't share evenly. Try taking something off first.");
      return;
    }
    clearMachineMsg();
    pushHistory();
    var next = shareBoard(state.board, n);
    // pieces that are not kept fade out first; the board redraws once they are gone
    var kept = {};
    for (var i = 0; i < next.left.length; i++) if (next.left[i].id !== undefined) kept[next.left[i].id] = true;
    for (var j = 0; j < next.right.length; j++) if (next.right[j].id !== undefined) kept[next.right[j].id] = true;
    var els = svg.querySelectorAll('.piece');
    for (var k = 0; k < els.length; k++) {
      if (!kept[parseInt(els[k].getAttribute('data-id'), 10)]) els[k].classList.add('vanish');
    }
    state.board = next;
    normalizeBoard();
    if (shareTimer !== null) clearTimeout(shareTimer);
    shareTimer = setTimeout(function () {
      shareTimer = null;
      render();
      maybeWin();
    }, 270);
  }
  for (var mb = 0; mb < machineBtns.length; mb++) {
    machineBtns[mb].addEventListener('click', function (ev) {
      var btn = ev.currentTarget;
      var n = parseInt(btn.getAttribute('data-n'), 10);
      if (btn.getAttribute('data-machine') === 'clone') machineClone(n); else machineShare(n);
    });
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

  function makeGhost(kind, p, frac) {
    var g = document.createElement('div');
    g.id = 'ghost';
    if (kind === 'box') {
      g.className = 'box';
      g.style.width = (BOX_SIZE * (frac || 1) * 1.15) + 'px';
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
      drag = { kind: 'piece', id: id, side: loc.side, type: p.type, value: p.value, frac: pieceFrac(p),
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
      drag.ghost = makeGhost(drag.kind === 'piece' && drag.type === 'box' ? 'box' : 'weight', drag.value, drag.frac);
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
  var SOLVER_MAX_DEPTH = 6;
  FLAT.forEach(function (f) {
    var pz = f.puzzle;
    var tag = 'Level ' + (f.level + 1) + ' puzzle ' + (f.pos + 1);
    var l = sideTotal(pz.left.map(copyPiece), pz.hiddenWeight);
    var r = sideTotal(pz.right.map(copyPiece), pz.hiddenWeight);
    if (pz.goal === 'isolate') {
      console.assert(hasBox(pz.left) || hasBox(pz.right), tag + ' has no box');
      console.assert(l === r, tag + ' does not start level: ' + l + ' vs ' + r);
      if (LEVELS[f.level].machines) {
        // machine levels: a short search over remove / clone / share moves must reach a win
        console.assert(solveByMachines(pz, SOLVER_MAX_DEPTH).depth >= 0,
          tag + ' cannot be finished with remove, clone and share within ' + SOLVER_MAX_DEPTH + ' moves');
      } else {
        console.assert(solvableByRemoval(pz), tag + ' cannot be finished by removing pieces only');
      }
    } else {
      // "make it level" puzzles: no boxes, and must not already be level (nothing to do)
      console.assert(!hasBox(pz.left) && !hasBox(pz.right), tag + ' should not contain a box');
      console.assert(l !== r || pz.left.length === 0 || pz.right.length === 0, tag + ' is already level at the start');
    }
  });

  // ---------- go ----------
  renderFarm();
  loadPuzzle(0);
  // the ground's width is only known once laid out; re-place the animals after a resize
  window.addEventListener('resize', function () {
    var gw = groundWidth();
    for (var i = 0; i < critters.length; i++) {
      var c = critters[i];
      c.x = Math.min(c.x, Math.max(0, gw - c.w));
      c.target = Math.min(c.target, Math.max(0, gw - c.w));
      placeCritter(c);
    }
  });
})();
