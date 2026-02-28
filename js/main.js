/**
 * VOID STATION — main.js
 * Screen navigation, UI event handlers, game lifecycle
 */

'use strict';

// ─────────────────────────────────────────────
//  Screen Management
// ─────────────────────────────────────────────

/**
 * Show a specific screen by id, hiding all others.
 * @param {string} id - The id of the screen div (without 'screen-' prefix)
 */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + id);
  if (target) target.classList.add('active');
}

// ─────────────────────────────────────────────
//  Game Lifecycle
// ─────────────────────────────────────────────

function startGame() {
  showScreen('game');
  // Show pointer-lock overlay on game start
  const lockOverlay = document.getElementById('pointer-lock-overlay');
  if (lockOverlay) lockOverlay.classList.remove('hidden');

  // Initialize Three.js scene if not yet created
  if (typeof GameScene !== 'undefined' && !GameScene.initialized) {
    GameScene.init();
  }
}

function pauseGame() {
  // Pause the animation loop
  if (typeof GameScene !== 'undefined') {
    GameScene.pause();
  }
  // Release pointer lock if active
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  showScreen('pause');
}

function resumeGame() {
  showScreen('game');
  // Resume animation loop
  if (typeof GameScene !== 'undefined') {
    GameScene.resume();
  }
}

function restartGame() {
  showScreen('game');
  if (typeof GameScene !== 'undefined') {
    GameScene.restart();
  }
  // Show pointer lock overlay again
  const lockOverlay = document.getElementById('pointer-lock-overlay');
  if (lockOverlay) lockOverlay.classList.remove('hidden');
}

function exitToMenu() {
  // Stop the game and go back to main menu
  if (typeof GameScene !== 'undefined') {
    GameScene.pause();
  }
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  showScreen('menu');
}

// ─────────────────────────────────────────────
//  Configuration Panel
// ─────────────────────────────────────────────

function initSliders() {
  const sliders = [
    { sliderId: 'volume-master', valueId: 'volume-master-val' },
    { sliderId: 'volume-music',  valueId: 'volume-music-val'  },
    { sliderId: 'volume-sfx',    valueId: 'volume-sfx-val'    },
  ];

  sliders.forEach(({ sliderId, valueId }) => {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(valueId);
    if (!slider || !display) return;

    // Update on input
    slider.addEventListener('input', () => {
      display.textContent = slider.value;
    });
  });
}

function initDifficulty() {
  const buttons = document.querySelectorAll('.diff-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Could store to localStorage: localStorage.setItem('difficulty', btn.dataset.diff);
    });
  });
}

// ─────────────────────────────────────────────
//  ESC Key → Pause / Unpause
// ─────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  const gameActive  = document.getElementById('screen-game').classList.contains('active');
  const pauseActive = document.getElementById('screen-pause').classList.contains('active');

  if (gameActive && !pauseActive) {
    pauseGame();
  } else if (pauseActive) {
    resumeGame();
  }
});

// ─────────────────────────────────────────────
//  Pointer Lock overlay click
// ─────────────────────────────────────────────

document.getElementById('pointer-lock-overlay').addEventListener('click', () => {
  const canvas = document.getElementById('game-canvas');
  canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  const overlay = document.getElementById('pointer-lock-overlay');
  if (document.pointerLockElement === document.getElementById('game-canvas')) {
    overlay.classList.add('hidden');
    // Resume if coming back from pause
    if (typeof GameScene !== 'undefined') {
      GameScene.resume();
    }
  } else {
    // Pointer lock released but we didn't call pauseGame() explicitly
    // (e.g. user pressed ESC natively) — show overlay only if game screen is active
    const gameActive = document.getElementById('screen-game').classList.contains('active');
    if (gameActive) {
      overlay.classList.remove('hidden');
      if (typeof GameScene !== 'undefined') GameScene.pause();
      // Don't switch to pause screen here — user may just want to see the overlay
    }
  }
});

// ─────────────────────────────────────────────
//  Button Event Listeners
// ─────────────────────────────────────────────

// Main menu
document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-config').addEventListener('click', () => showScreen('config'));
document.getElementById('btn-scores').addEventListener('click', () => showScreen('scores'));

// Config
document.getElementById('btn-config-back').addEventListener('click', () => showScreen('menu'));

// Scores
document.getElementById('btn-scores-back').addEventListener('click', () => showScreen('menu'));

// Pause
document.getElementById('btn-resume').addEventListener('click', () => {
  resumeGame();
  // Re-request pointer lock
  const overlay = document.getElementById('pointer-lock-overlay');
  overlay.classList.remove('hidden');
});
document.getElementById('btn-restart').addEventListener('click', restartGame);
document.getElementById('btn-exit-to-menu').addEventListener('click', exitToMenu);

// ─────────────────────────────────────────────
//  Init
// ─────────────────────────────────────────────

(function init() {
  initSliders();
  initDifficulty();
  showScreen('menu');
})();
