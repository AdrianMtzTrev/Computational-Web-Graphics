import * as THREE from 'three';

let socket = null;
let connected = false;
let otherPlayers = {};
let _roomCode = '';
let _playerCount = 0;

function getDefaultServer() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '') {
    return undefined; // same origin (server serves frontend + API + Socket.io)
  }
  return 'https://computational-web-graphics-production.up.railway.app';
}

export function connect(serverUrl) {
  return new Promise((resolve) => {
    import('socket.io-client').then(({ io }) => {
      socket = io(serverUrl || getDefaultServer());

      socket.on('connect', () => {
        connected = true;
        resolve(true);
      });

      socket.on('connect_error', () => {
        connected = false;
        resolve(false);
      });

      socket.on('player-joined', (data) => {
        _playerCount++;
        window.dispatchEvent(new CustomEvent('mp-player-count', { detail: _playerCount }));
        if (!otherPlayers[data.id]) {
          const mat = new THREE.MeshPhongMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.3 });
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.3), mat);
          mesh.position.set(0, 0.75, 0);
          const scene = window.__game?.scene;
          if (scene) scene.add(mesh);
          otherPlayers[data.id] = { mesh, pos: new THREE.Vector3() };
        }
      });

      socket.on('sync-move', (data) => {
        if (otherPlayers[data.id]) {
          otherPlayers[data.id].pos.set(data.pos.x, data.pos.y, data.pos.z);
          otherPlayers[data.id].mesh.position.copy(otherPlayers[data.id].pos);
        }
      });

      socket.on('player-left', (data) => {
        _playerCount = Math.max(0, _playerCount - 1);
        window.dispatchEvent(new CustomEvent('mp-player-count', { detail: _playerCount }));
        const p = otherPlayers[data.id];
        if (p) {
          if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
          delete otherPlayers[data.id];
        }
      });

      socket.on('puzzle-update', (data) => {
        const rooms = {
          engine: window.__game?.engineRoom,
          lab: window.__game?.labRoom,
          bridge: window.__game?.bridgeRoom,
        };
        for (const key in rooms) {
          const room = rooms[key];
          if (room && room._puzzleStates) {
            room._puzzleStates.forEach(p => {
              if (p.id === data.puzzle) p.solved = data.solved;
            });
          }
          if (data.puzzle === 'lab' && room && room.puzzleSolved !== undefined) {
            room.puzzleSolved = data.solved;
          }
        }
      });

      setTimeout(() => {
        if (!connected) resolve(false);
      }, 5000);
    }).catch(() => resolve(false));
  });
}

export function joinRoom(roomId) {
  if (socket && connected) {
    _roomCode = roomId;
    socket.emit('join-room', roomId);
  }
}

export function getRoomCode() {
  return _roomCode;
}

export function getPlayerCount() {
  return _playerCount;
}

export function syncMove(pos, rot, room) {
  if (socket && connected) {
    socket.emit('player-move', { pos, rot, room });
  }
}

export function syncPuzzleSolve(puzzleId, room) {
  if (socket && connected) {
    socket.emit('puzzle-solve', { puzzle: puzzleId, room });
  }
}

export function getOtherPlayers() {
  return otherPlayers;
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
    connected = false;
  }
  Object.values(otherPlayers).forEach(p => {
    if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
  });
  otherPlayers = {};
  _roomCode = '';
  _playerCount = 0;
}

export function isConnected() {
  return connected;
}
