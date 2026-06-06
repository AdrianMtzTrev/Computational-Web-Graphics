import { Game } from './game.js';
import { connect, joinRoom, disconnect as mpDisconnect, isConnected, getRoomCode, getPlayerCount } from './multiplayer.js';

let gameInstance = null;
let _mpRoomCode = '';

function getApiUrl() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '') {
    return ''; // same origin
  }
  return 'https://computational-web-graphics-production.up.railway.app';
}

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

function getDifficulty() {
  const active = document.querySelector('.diff-btn.active');
  return active ? active.dataset.diff : 'easy';
}

async function startGame() {
  if (gameInstance) {
    gameInstance.dispose();
    gameInstance = null;
    window.__game = null;
    await new Promise(r => setTimeout(r, 150));
  }
  try { localStorage.removeItem('voidstation_save'); } catch (e) {}
  gameInstance = new Game(getGameMode(), getDifficulty());
  window.__game = gameInstance;

  showScreen('game');
  await gameInstance.start();
}

async function continueGame() {
  if (gameInstance) {
    gameInstance.dispose();
    gameInstance = null;
    window.__game = null;
    await new Promise(r => setTimeout(r, 150));
  }
  var saveData = null;
  try {
    var raw = localStorage.getItem('voidstation_save');
    if (raw) saveData = JSON.parse(raw);
  } catch (e) {}
  if (!saveData) return;

  var mode = saveData.mode || 'story';
  var diff = saveData.difficulty || 'easy';
  gameInstance = new Game(mode, diff);
  window.__game = gameInstance;

  showScreen('game');
  await gameInstance.start(saveData);
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
  mpDisconnect();
  _mpRoomCode = '';
// Show continue button if save exists
try {
  if (localStorage.getItem('voidstation_save')) {
    document.getElementById('btn-continue').style.display = '';
  }
} catch (e) {}

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
  if (window.__game) {
    window.__game.clearSave();
    // Submit score to API
    var scoreData = {
      username: 'PLAYER_' + Math.floor(Math.random() * 9000 + 1000),
      score: 1000,
      mode: window.__game.mode || 'story',
      difficulty: window.__game.difficulty || 'easy',
      time_secs: Math.floor(window.__game.clock.elapsedTime || 0),
      room: 'bridge',
    };
    fetch(getApiUrl() + '/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreData),
    }).catch(function() { /* offline — ignore */ });
  }
  showScreen('win');
});

window.addEventListener('game-death', function() {
  var hud = document.getElementById('game-hud');
  if (hud) hud.style.display = 'none';
  try { localStorage.removeItem('voidstation_save'); } catch (e) {}
  showScreen('death');
});

document.getElementById('btn-death-retry').addEventListener('click', startGame);
document.getElementById('btn-death-menu').addEventListener('click', exitToMenu);

document.getElementById('btn-win-restart').addEventListener('click', startGame);
document.getElementById('btn-win-menu').addEventListener('click', exitToMenu);
document.getElementById('btn-win-share').addEventListener('click', function() {
  var url = 'https://www.facebook.com/sharer/sharer.php?quote=' + encodeURIComponent('ESCAPÉ DE VOID STATION! 🚀 Completé la misión. Juega en voidstation.space') + '&u=' + encodeURIComponent(window.location.href);
  window.open(url, 'facebook-share', 'width=600,height=500');
});

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

async function startMultiplayerGame() {
  if (gameInstance) {
    gameInstance.dispose();
    gameInstance = null;
    window.__game = null;
    await new Promise(r => setTimeout(r, 150));
  }
  try { localStorage.removeItem('voidstation_save'); } catch (e) {}
  gameInstance = new Game(getGameMode(), getDifficulty());
  gameInstance._isMultiplayer = true;
  window.__game = gameInstance;

  showScreen('game');
  await gameInstance.start();
}

document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-continue').addEventListener('click', continueGame);
document.getElementById('btn-config').addEventListener('click', function() { showScreen('config'); });
document.getElementById('btn-scores').addEventListener('click', function() {
  showScreen('scores');
  fetch(getApiUrl() + '/api/scores')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var tbody = document.getElementById('scores-body');
      if (!tbody || !data.length) return;
      tbody.innerHTML = '';
      data.forEach(function(row, i) {
        var tr = document.createElement('tr');
        if (i === 0) tr.className = 'score-gold';
        tr.innerHTML = '<td>' + String(i + 1).padStart(2, '0') + '</td>' +
          '<td>' + (row.username || 'ANON') + '</td>' +
          '<td>' + (row.score || 0).toLocaleString() + '</td>' +
          '<td>' + (row.time_secs ? Math.floor(row.time_secs / 60) + ':' + String(row.time_secs % 60).padStart(2, '0') : '--:--') + '</td>';
        tbody.appendChild(tr);
      });
    }).catch(function() {});
});

document.getElementById('btn-config-back').addEventListener('click', function() { showScreen('menu'); });
document.getElementById('btn-scores-back').addEventListener('click', function() { showScreen('menu'); });

// Social share buttons
document.getElementById('btn-share-fb').addEventListener('click', function() {
  var url = 'https://www.facebook.com/sharer/sharer.php?quote=' + encodeURIComponent('ESCAPÉ DE VOID STATION! 🚀 Juega en computational-web-graphics-production.up.railway.app') + '&u=' + encodeURIComponent(window.location.href);
  window.open(url, 'facebook-share', 'width=600,height=500');
});
document.getElementById('btn-share-ig').addEventListener('click', function() {
  var text = 'VOID STATION 🚀 - Escapa de la estación. Juega en computational-web-graphics-production.up.railway.app';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      alert('📋 Texto copiado — pégalo en Instagram!');
    }).catch(function() {});
  } else {
    prompt('Copia este texto y compártelo:', text);
  }
});

// Multiplayer navigation
document.getElementById('btn-multiplayer').addEventListener('click', function() {
  showScreen('multiplayer');
  _updateMpStatus();
});

document.getElementById('btn-mp-back').addEventListener('click', function() {
  mpDisconnect();
  _mpRoomCode = '';
  showScreen('menu');
});

document.getElementById('mp-btn-create').addEventListener('click', async function() {
  const statusEl = document.getElementById('mp-status');
  const playRow = document.getElementById('mp-play-row');
  statusEl.textContent = 'CONECTANDO...';
  statusEl.className = 'mp-status';

  const ok = await connect();
  if (!ok) {
    statusEl.textContent = 'ERROR DE CONEXIÓN';
    statusEl.className = 'mp-status';
    return;
  }

  statusEl.textContent = 'CONECTADO';
  statusEl.className = 'mp-status connected';

  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  _mpRoomCode = code;
  joinRoom(code);

  document.getElementById('mp-room-code-display').textContent = code;
  document.getElementById('mp-players-display').textContent = 'Jugadores: 1';
  playRow.style.display = 'flex';
});

document.getElementById('mp-btn-join').addEventListener('click', async function() {
  const code = document.getElementById('mp-room-code').value.trim().toUpperCase();
  if (!code) return;

  const statusEl = document.getElementById('mp-status');
  const playRow = document.getElementById('mp-play-row');
  statusEl.textContent = 'CONECTANDO...';
  statusEl.className = 'mp-status';

  const ok = await connect();
  if (!ok) {
    statusEl.textContent = 'ERROR DE CONEXIÓN';
    statusEl.className = 'mp-status';
    return;
  }

  statusEl.textContent = 'CONECTADO';
  statusEl.className = 'mp-status connected';

  _mpRoomCode = code;
  joinRoom(code);

  document.getElementById('mp-room-code-display').textContent = code;
  document.getElementById('mp-players-display').textContent = 'Jugadores: ' + getPlayerCount();
  playRow.style.display = 'flex';
});

document.getElementById('mp-btn-start').addEventListener('click', startMultiplayerGame);

window.addEventListener('mp-player-count', function(e) {
  document.getElementById('mp-players-display').textContent = 'Jugadores: ' + e.detail;
});

function _updateMpStatus() {
  const playRow = document.getElementById('mp-play-row');
  const statusEl = document.getElementById('mp-status');
  if (isConnected()) {
    statusEl.textContent = 'CONECTADO';
    statusEl.className = 'mp-status connected';
    document.getElementById('mp-room-code-display').textContent = getRoomCode();
    document.getElementById('mp-players-display').textContent = 'Jugadores: ' + getPlayerCount();
    playRow.style.display = 'flex';
  } else {
    statusEl.textContent = 'DESCONECTADO';
    statusEl.className = 'mp-status';
    playRow.style.display = 'none';
  }
}

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

try {
  if (localStorage.getItem('voidstation_save')) {
    document.getElementById('btn-continue').style.display = '';
  }
} catch (e) {}

showScreen('menu');
