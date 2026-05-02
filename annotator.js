'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let mode            = 'professor';
let beatsPerMeasure = 4;
let dots            = [];
let imageLoaded     = false;
let selectedBeat    = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
let elCanvasWrap, elDotLayer, elSheetImg, elEmptyState,
    elHelpText, elSMode, elSBeats, elSDots, elSMeasures,
    elSSelected, elSBeatNum, elLegendProf, elLegendStudent,
    elFileInput;

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // Cache DOM refs
  elCanvasWrap    = document.getElementById('canvas-wrap');
  elDotLayer      = document.getElementById('dot-layer');
  elSheetImg      = document.getElementById('sheet-img');
  elEmptyState    = document.getElementById('empty-state');
  elHelpText      = document.getElementById('help-text');
  elSMode         = document.getElementById('s-mode');
  elSBeats        = document.getElementById('s-beats');
  elSDots         = document.getElementById('s-dots');
  elSMeasures     = document.getElementById('s-measures');
  elSSelected     = document.getElementById('s-selected');
  elSBeatNum      = document.getElementById('s-beat-num');
  elLegendProf    = document.getElementById('legend-prof');
  elLegendStudent = document.getElementById('legend-student');
  elFileInput     = document.getElementById('file-input');

  // Wire up buttons
  document.getElementById('btn-prof').addEventListener('click',    function () { setMode('professor'); });
  document.getElementById('btn-student').addEventListener('click',  function () { setMode('student'); });
  document.getElementById('beats-select').addEventListener('change', updateBeats);
  document.getElementById('upload-btn').addEventListener('click',   function () { elFileInput.click(); });
  document.getElementById('undo-btn').addEventListener('click',     undoLast);
  document.getElementById('clear-btn').addEventListener('click',    clearDots);

  // File input — this is the critical one
  elFileInput.addEventListener('change', loadImage);

  // Canvas click for placing dots
  elCanvasWrap.addEventListener('click', handleCanvasClick);
});

// ── Mode switching ────────────────────────────────────────────────────────────
function setMode(m) {
  mode = m;
  selectedBeat = null;

  document.getElementById('btn-prof').classList.toggle('active',    m === 'professor');
  document.getElementById('btn-student').classList.toggle('active', m === 'student');

  elCanvasWrap.classList.toggle('student', m === 'student');
  elLegendProf.style.display    = m === 'professor' ? '' : 'none';
  elLegendStudent.style.display = m === 'student'   ? '' : 'none';
  elSMode.textContent           = m === 'professor' ? 'Professor' : 'Student';
  elSSelected.style.display     = 'none';

  elHelpText.textContent = !imageLoaded
    ? 'Upload an image to begin'
    : m === 'professor'
      ? 'Click the image to place a beat dot; click a dot to remove it'
      : 'Tap a beat in measure 1 to highlight that beat across all measures';

  renderDots();
}

// ── Time signature ────────────────────────────────────────────────────────────
function updateBeats() {
  beatsPerMeasure = parseInt(document.getElementById('beats-select').value, 10);
  selectedBeat    = null;
  elSBeats.textContent      = beatsPerMeasure;
  elSMeasures.textContent   = calcMeasures();
  elSSelected.style.display = 'none';
  renderDots();
}

function calcMeasures() {
  return dots.length === 0 ? 0 : Math.ceil(dots.length / beatsPerMeasure);
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
        : 'Tap a beat in measure 1 to highlight that beat across all measures';
      renderDots();
    };
    elSheetImg.src = evt.target.result;
  };
  reader.readAsDataURL(file);

  // Reset so the same file can be re-selected
  e.target.value = '';
}

// ── Canvas click (professor: place dot) ───────────────────────────────────────
function handleCanvasClick(e) {
  if (!imageLoaded || mode !== 'professor') return;
  if (e.target.classList.contains('beat-dot')) return;

  var rect = elCanvasWrap.getBoundingClientRect();
  var xPct = (e.clientX - rect.left)  / rect.width;
  var yPct = (e.clientY - rect.top)   / rect.height;

  if (xPct < 0 || xPct > 1 || yPct < 0 || yPct > 1) return;

  dots.push({ x: xPct, y: yPct });
  updateStatus();
  renderDots();
}

// ── Undo / Clear ──────────────────────────────────────────────────────────────
function undoLast() {
  if (dots.length === 0) return;
  dots.pop();
  selectedBeat = null;
  elSSelected.style.display = 'none';
  updateStatus();
  renderDots();
}

function clearDots() {
  dots = [];
  selectedBeat = null;
  elSSelected.style.display = 'none';
  updateStatus();
  renderDots();
}

// ── Status bar ────────────────────────────────────────────────────────────────
function updateStatus() {
  elSDots.textContent     = dots.length;
  elSMeasures.textContent = calcMeasures();
}

// ── Dot click handler (student mode) ─────────────────────────────────────────
function makeDotClickHandler(idx) {
  return function (e) {
    e.stopPropagation();
    if (mode !== 'student') return;

    var measureIdx    = Math.floor(idx / beatsPerMeasure);
    var beatInMeasure = (idx % beatsPerMeasure) + 1;

    if (measureIdx !== 0) return;   // only measure-1 dots are tappable

    if (selectedBeat === beatInMeasure) {
      selectedBeat = null;
      elSSelected.style.display = 'none';
    } else {
      selectedBeat = beatInMeasure;
      elSBeatNum.textContent    = beatInMeasure;
      elSSelected.style.display = '';
    }

    renderDots();
  };
}

// ── Render all dots ───────────────────────────────────────────────────────────
function renderDots() {
  elDotLayer.innerHTML = '';

  dots.forEach(function (d, i) {
    var measureIdx    = Math.floor(i / beatsPerMeasure);
    var beatInMeasure = (i % beatsPerMeasure) + 1;

    var el = document.createElement('div');
    el.className   = 'beat-dot';
    el.textContent = beatInMeasure;
    el.style.left  = (d.x * 100) + '%';
    el.style.top   = (d.y * 100) + '%';
    el.title       = 'Measure ' + (measureIdx + 1) + ', Beat ' + beatInMeasure;

    if (mode === 'professor') {
      el.classList.add('prof');
      // Click-to-remove (closure captures i correctly via forEach)
      el.addEventListener('click', (function (index) {
        return function (ev) {
          ev.stopPropagation();
          dots.splice(index, 1);
          selectedBeat = null;
          updateStatus();
          renderDots();
        };
      })(i));

    } else {
      var isM1 = (measureIdx === 0);

      if (isM1) {
        el.classList.add('student-m1');
        if (selectedBeat === beatInMeasure) el.classList.add('selected');
      } else {
        el.classList.add('student-normal');
        if (selectedBeat !== null && beatInMeasure === selectedBeat) {
          el.classList.add('highlighted');
        }
      }

      el.addEventListener('click', makeDotClickHandler(i));
    }

    elDotLayer.appendChild(el);
  });
}