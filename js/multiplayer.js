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

function createPlayerMesh() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhongMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.15 });
  const darkMat = new THREE.MeshPhongMaterial({ color: 0x1a2a3a });
  const visorMat = new THREE.MeshPhongMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 });

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8), bodyMat);
  torso.position.y = 0.95;
  group.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), darkMat);
  head.position.y = 1.35;
  group.add(head);

  // Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.04), visorMat);
  visor.position.set(0, 1.33, 0.14);
  group.add(visor);

  // Left arm
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), bodyMat);
  armL.position.set(-0.28, 0.95, 0);
  armL.rotation.z = 0.15;
  group.add(armL);

  // Right arm
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), bodyMat);
  armR.position.set(0.28, 0.95, 0);
  armR.rotation.z = -0.15;
  group.add(armR);

  // Legs
  const legMat = new THREE.MeshPhongMaterial({ color: 0x0f1f2f });
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 6), legMat);
  legL.position.set(-0.1, 0.45, 0);
  group.add(legL);

  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 6), legMat);
  legR.position.set(0.1, 0.45, 0);
  group.add(legR);

  // Glow ring at feet
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.3 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 16), ringMat);
  ring.position.y = 0.02;
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  group.userData.isPlayer = true;
  return group;
}

export function connect(serverUrl) {
  return new Promise((resolve) => {
    const url = serverUrl || getDefaultServer();
    console.log('[MP] connect() called, serverUrl:', serverUrl, 'resolved:', url);
    console.log('[MP] window.location:', window.location.href, 'hostname:', window.location.hostname);

    if (typeof io === 'undefined') {
      console.log('[MP] socket.io not loaded (window.io undefined)');
      resolve(false);
      return;
    }
    console.log('[MP] socket.io-client loaded successfully');
    console.log('[MP] creating io with:', url);
    socket = io(url);

    socket.on('connect', () => {
      console.log('[MP] CONNECTED! socket.id:', socket.id);
      connected = true;
      resolve(true);
    });

    socket.on('connect_error', (err) => {
      console.log('[MP] CONNECT_ERROR:', err.message, err.type);
      connected = false;
      resolve(false);
    });

    socket.on('player-joined', (data) => {
      _playerCount++;
      window.dispatchEvent(new CustomEvent('mp-player-count', { detail: _playerCount }));
      if (!otherPlayers[data.id]) {
        const mesh = createPlayerMesh();
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
      if (!connected) {
        console.log('[MP] TIMEOUT - not connected after 5s');
        resolve(false);
      }
    }, 5000);
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
