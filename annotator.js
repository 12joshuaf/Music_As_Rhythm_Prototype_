'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let mode        = 'professor';
let dots        = [];          // { x: pct, y: pct }
let imageLoaded = false;

// Student state
let hoveredIdx  = null;        // index of dot whose x-column is under the cursor
let lockedIdxs  = [];          // 0, 1, or 2 locked dot indices

// ── DOM refs ──────────────────────────────────────────────────────────────────
let elCanvasWrap, elDotLayer, elSheetImg, elEmptyState,
    elHelpText, elSMode, elSDots, elSSelected, elSSelInfo,
    elLegendProf, elLegendStudent, elFileInput;

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  elCanvasWrap    = document.getElementById('canvas-wrap');
  elDotLayer      = document.getElementById('dot-layer');
  elSheetImg      = document.getElementById('sheet-img');
  elEmptyState    = document.getElementById('empty-state');
  elHelpText      = document.getElementById('help-text');
  elSMode         = document.getElementById('s-mode');
  elSDots         = document.getElementById('s-dots');
  elSSelected     = document.getElementById('s-selected');
  elSSelInfo      = document.getElementById('s-sel-info');
  elLegendProf    = document.getElementById('legend-prof');
  elLegendStudent = document.getElementById('legend-student');
  elFileInput     = document.getElementById('file-input');

  document.getElementById('btn-prof').addEventListener('click',   function () { setMode('professor'); });
  document.getElementById('btn-student').addEventListener('click', function () { setMode('student'); });
  document.getElementById('upload-btn').addEventListener('click',  function () { elFileInput.click(); });
  document.getElementById('undo-btn').addEventListener('click',    undoLast);
  document.getElementById('clear-btn').addEventListener('click',   clearDots);
  elFileInput.addEventListener('change', loadImage);

  elCanvasWrap.addEventListener('click',     handleCanvasClick);
  elCanvasWrap.addEventListener('mousemove', handleMouseMove);
  elCanvasWrap.addEventListener('mouseleave', handleMouseLeave);
});

// ── Mode switching ────────────────────────────────────────────────────────────
function setMode(m) {
  mode       = m;
  hoveredIdx = null;
  lockedIdxs = [];
  elSSelected.style.display = 'none';

  document.getElementById('btn-prof').classList.toggle('active',    m === 'professor');
  document.getElementById('btn-student').classList.toggle('active', m === 'student');
  elCanvasWrap.classList.toggle('student', m === 'student');
  elLegendProf.style.display    = m === 'professor' ? '' : 'none';
  elLegendStudent.style.display = m === 'student'   ? '' : 'none';
  elSMode.textContent = m === 'professor' ? 'Professor' : 'Student';

  elHelpText.textContent = !imageLoaded
    ? 'Upload an image to begin'
    : m === 'professor'
      ? 'Click the image to place a beat dot; click a dot to remove it'
      : 'Hover to reveal beats; click to select two — the interval will be extrapolated in both directions';

  renderAll();
}

// ── Image loading ─────────────────────────────────────────────────────────────
function loadImage(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (evt) {
    elSheetImg.onload = function () {
      elEmptyState.style.display = 'none';
      elSheetImg.style.display   = 'block';
      imageLoaded = true;
      elHelpText.textContent = mode === 'professor'
        ? 'Click the image to place a beat dot; click a dot to remove it'
        : 'Hover to reveal beats; click to select two — the interval will be extrapolated in both directions';
      renderAll();
    };
    elSheetImg.src = evt.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// ── Mouse events ──────────────────────────────────────────────────────────────
function handleMouseMove(e) {
  if (!imageLoaded) return;

  if (mode === 'student') {
    var rect  = elCanvasWrap.getBoundingClientRect();
    var xPct  = (e.clientX - rect.left) / rect.width;
    hoveredIdx = nearestDotIndex(xPct);
    renderAll();
    return;
  }
}

function handleMouseLeave() {
  if (mode === 'student') {
    hoveredIdx = null;
    renderAll();
  }
}

// ── Canvas click ──────────────────────────────────────────────────────────────
function handleCanvasClick(e) {
  if (!imageLoaded) return;

  var rect = elCanvasWrap.getBoundingClientRect();
  var xPct = (e.clientX - rect.left) / rect.width;
  var yPct = (e.clientY - rect.top)  / rect.height;
  if (xPct < 0 || xPct > 1 || yPct < 0 || yPct > 1) return;

  if (mode === 'professor') {
    if (e.target.classList.contains('beat-dot')) return;
    dots.push({ x: xPct, y: yPct });
    updateStatus();
    renderAll();
    return;
  }

  if (mode === 'student') {
    var idx = nearestDotIndex(xPct);
    if (idx === null) return;

    if (lockedIdxs.length >= 2) {
      // 3rd click — reset
      lockedIdxs = [idx];
    } else if (lockedIdxs.length === 1 && lockedIdxs[0] === idx) {
      // clicking the same dot again — deselect
      lockedIdxs = [];
    } else {
      lockedIdxs.push(idx);
    }

    updateStudentStatus();
    renderAll();
  }
}

// ── Nearest dot by x-coordinate ───────────────────────────────────────────────
// Returns the index of the dot whose x is closest to xPct,
// within a threshold of 3% of canvas width.
function nearestDotIndex(xPct) {
  if (dots.length === 0) return null;
  var best     = null;
  var bestDist = Infinity;
  var THRESHOLD = 0.03;
  dots.forEach(function (d, i) {
    var dist = Math.abs(d.x - xPct);
    if (dist < bestDist) { bestDist = dist; best = i; }
  });
  return bestDist <= THRESHOLD ? best : null;
}

// ── Undo / Clear ──────────────────────────────────────────────────────────────
function undoLast() {
  if (dots.length === 0) return;
  dots.pop();
  lockedIdxs = lockedIdxs.filter(function (i) { return i < dots.length; });
  hoveredIdx = null;
  updateStatus();
  updateStudentStatus();
  renderAll();
}

function clearDots() {
  dots = [];
  lockedIdxs = [];
  hoveredIdx = null;
  updateStatus();
  updateStudentStatus();
  renderAll();
}

// ── Status ────────────────────────────────────────────────────────────────────
function updateStatus() {
  elSDots.textContent = dots.length;
}

function updateStudentStatus() {
  if (lockedIdxs.length === 0) {
    elSSelected.style.display = 'none';
    return;
  }
  elSSelected.style.display = '';
  if (lockedIdxs.length === 1) {
    elSSelInfo.textContent = 'beat #' + (lockedIdxs[0] + 1);
  } else {
    var a = Math.min(lockedIdxs[0], lockedIdxs[1]);
    var b = Math.max(lockedIdxs[0], lockedIdxs[1]);
    elSSelInfo.textContent = 'beats #' + (a+1) + ' & #' + (b+1) + ' — interval: ' + (b - a);
  }
}

// ── Compute extrapolated indices ──────────────────────────────────────────────
function getExtrapolatedIndices() {
  if (lockedIdxs.length < 2) return [];
  var a        = lockedIdxs[0];
  var b        = lockedIdxs[1];
  var interval = Math.abs(b - a);
  if (interval === 0) return [];

  var results = [];
  // Walk forward and backward from the lower of the two
  var base = Math.min(a, b);

  // Backward from base
  var i = base - interval;
  while (i >= 0) { results.push(i); i -= interval; }

  // Forward from base (skipping the two selections themselves — they're drawn separately)
  i = base;
  while (i < dots.length) { results.push(i); i += interval; }

  // Deduplicate and exclude the two locked ones
  var locked = new Set(lockedIdxs);
  var unique  = new Set(results);
  var out     = [];
  unique.forEach(function (v) {
    if (!locked.has(v) && v >= 0 && v < dots.length) out.push(v);
  });
  return out;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderAll() {
  elDotLayer.innerHTML = '';

  if (mode === 'professor') {
    renderProfessorDots();
  } else {
    renderStudentLines();
  }
}

function renderProfessorDots() {
  dots.forEach(function (d, i) {
    var el = document.createElement('div');
    el.className   = 'beat-dot';
    el.textContent = i + 1;
    el.style.left  = (d.x * 100) + '%';
    el.style.top   = (d.y * 100) + '%';
    el.title       = 'Beat ' + (i + 1) + ' — click to remove';
    el.addEventListener('click', (function (index) {
      return function (ev) {
        ev.stopPropagation();
        dots.splice(index, 1);
        lockedIdxs = lockedIdxs
          .filter(function (k) { return k !== index; })
          .map(function (k) { return k > index ? k - 1 : k; });
        hoveredIdx = null;
        updateStatus();
        updateStudentStatus();
        renderAll();
      };
    })(i));
    elDotLayer.appendChild(el);
  });
}

function renderStudentLines() {
  if (dots.length === 0) return;

  var extraIdxs = getExtrapolatedIndices();
  var extraSet  = new Set(extraIdxs);
  var lockedSet = new Set(lockedIdxs);

  // Draw auto-extrapolated lines first (behind everything)
  extraIdxs.forEach(function (idx) {
    appendVLine(dots[idx].x, 'auto');
  });

  // Draw the two locked lines
  if (lockedIdxs.length >= 1) appendVLine(dots[lockedIdxs[0]].x, 'sel-first');
  if (lockedIdxs.length >= 2) appendVLine(dots[lockedIdxs[1]].x, 'sel-second');

  // Draw hover line last (topmost), only if not already locked
  if (hoveredIdx !== null && !lockedSet.has(hoveredIdx) && !extraSet.has(hoveredIdx)) {
    appendVLine(dots[hoveredIdx].x, 'hover');
  }
}

function appendVLine(xPct, cls) {
  var el = document.createElement('div');
  el.className  = 'vline ' + cls;
  el.style.left = (xPct * 100) + '%';
  elDotLayer.appendChild(el);
}
