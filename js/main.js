import { Game } from './game.js';

let gameInstance = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
  });
  document.getElementById('screen-' + id).classList.add('active');
}

function getGameMode() {
  const active = document.querySelector('.mode-btn.active');
  return active ? active.dataset.mode : 'story';
}

async function startGame() {
  if (gameInstance) {
    gameInstance.dispose();
    gameInstance = null;
    window.__game = null;
    await new Promise(r => setTimeout(r, 150));
  }
  gameInstance = new Game(getGameMode());
  window.__game = gameInstance;

  showScreen('game');
  await gameInstance.start();
}

function pauseGame() {
  if (gameInstance) {
    gameInstance.pause();
  }
  var hud = document.getElementById('game-hud');
  if (hud) hud.style.display = 'none';
  showScreen('pause');
}

function resumeGame() {
  showScreen('game');
  var hud = document.getElementById('game-hud');
  if (hud) hud.style.display = '';
  if (gameInstance) {
    gameInstance.resume();
  }
}

function exitToMenu() {
  if (gameInstance) {
    gameInstance.dispose();
    gameInstance = null;
    window.__game = null;
  }
  showScreen('menu');
}

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;

  const gameActive  = document.getElementById('screen-game').classList.contains('active');
  const pauseActive = document.getElementById('screen-pause').classList.contains('active');

  if (gameActive && gameInstance && !gameInstance.controls.isLocked && !gameInstance.isPaused) {
    pauseGame();
    return;
  }

  if (gameActive && gameInstance && gameInstance.controls.isLocked) {
    pauseGame();
  } else if (pauseActive) {
    resumeGame();
  }
});

window.addEventListener('game-pause', function() {
  if (gameInstance && gameInstance.isRunning) {
    pauseGame();
  }
});

window.addEventListener('game-win', function() {
  var hud = document.getElementById('game-hud');
  if (hud) hud.style.display = 'none';
  showScreen('win');
});

window.addEventListener('game-death', function() {
  var hud = document.getElementById('game-hud');
  if (hud) hud.style.display = 'none';
  showScreen('death');
});

document.getElementById('btn-death-retry').addEventListener('click', startGame);
document.getElementById('btn-death-menu').addEventListener('click', exitToMenu);

document.getElementById('btn-win-restart').addEventListener('click', startGame);
document.getElementById('btn-win-menu').addEventListener('click', exitToMenu);

var sliders = [
  { slider: 'volume-master', display: 'volume-master-val' },
  { slider: 'volume-music',  display: 'volume-music-val'  },
  { slider: 'volume-sfx',    display: 'volume-sfx-val'    }
];

sliders.forEach(function(item) {
  var sliderEl  = document.getElementById(item.slider);
  var displayEl = document.getElementById(item.display);
  sliderEl.addEventListener('input', function() {
    displayEl.textContent = sliderEl.value;
  });
});

var diffBtns = document.querySelectorAll('.diff-btn');
diffBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    diffBtns.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });
});

var modeBtns = document.querySelectorAll('.mode-btn');
modeBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    modeBtns.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });
});

document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-config').addEventListener('click', function() { showScreen('config'); });
document.getElementById('btn-scores').addEventListener('click', function() { showScreen('scores'); });

document.getElementById('btn-config-back').addEventListener('click', function() { showScreen('menu'); });
document.getElementById('btn-scores-back').addEventListener('click', function() { showScreen('menu'); });

document.getElementById('btn-resume').addEventListener('click', resumeGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-exit-to-menu').addEventListener('click', exitToMenu);

var volumeSlider = document.getElementById('volume-slider');
var volumeDisplay = document.getElementById('volume-value');
volumeSlider.addEventListener('input', function() {
  var v = parseFloat(volumeSlider.value);
  volumeDisplay.textContent = Math.round(v) + '%';
  if (window.__game) {
    window.__game.setVolume(v / 100);
  }
});

showScreen('menu');
