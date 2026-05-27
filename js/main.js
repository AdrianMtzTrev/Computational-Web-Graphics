function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
  });
  document.getElementById('screen-' + id).classList.add('active');
}

function startGame() {
  showScreen('game');
}

function pauseGame() {
  showScreen('pause');
}

function resumeGame() {
  showScreen('game');
}

function exitToMenu() {
  showScreen('menu');
}

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;

  var gameActive  = document.getElementById('screen-game').classList.contains('active');
  var pauseActive = document.getElementById('screen-pause').classList.contains('active');

  if (gameActive) {
    pauseGame();
  } else if (pauseActive) {
    resumeGame();
  }
});

// Sliders de volumen
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

// Selector de dificultad
var diffBtns = document.querySelectorAll('.diff-btn');
diffBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    diffBtns.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });
});

// Botones menu principal
document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-config').addEventListener('click', function() { showScreen('config'); });
document.getElementById('btn-scores').addEventListener('click', function() { showScreen('scores'); });

// Botones volver
document.getElementById('btn-config-back').addEventListener('click', function() { showScreen('menu'); });
document.getElementById('btn-scores-back').addEventListener('click', function() { showScreen('menu'); });

// Botones pausa
document.getElementById('btn-resume').addEventListener('click', resumeGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-exit-to-menu').addEventListener('click', exitToMenu);

// Pantalla inicial
showScreen('menu');
