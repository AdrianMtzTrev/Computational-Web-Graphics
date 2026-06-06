import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SecurityDrone } from '../enemies.js';

export class EngineRoom {
  constructor() {
    this.objects = [];
    this.lights = [];
    this.flickerLights = [];
    this.interactiveObjects = [];
    this.colliders = [];
    this.particles = null;
    this.sciFiDoor = null;
    this.sciFiDoorOpen = false;
    this.sciFiDoorAnimT = 0;
    this._transitionCallback = null;
    this._transitionTriggered = false;
    this._pickupItems = [];
    this._consoleGroups = [];
    this._consoleScreens = [];
    this._puzzleStates = [
      { id: 'power', solved: false, label: 'SISTEMA', messageOff: 'SIN ENERGÍA', messageOn: 'SISTEMA ACTIVO' },
      { id: 'access', solved: false, label: 'ACCESO', messageOff: 'ACCESO DENEGADO', messageOn: 'PUERTA ABIERTA' },
    ];
    this.loader = new GLTFLoader();
    this.loader.setPath('assets/models/modular-space-kit/');
    this.loader.setResourcePath('assets/models/modular-space-kit/');

    this.moltenLoader = new GLTFLoader();
    this.moltenLoader.setPath('assets/models/molten-maps/');
    this.sciFiLoader = new GLTFLoader();
    this.audioLoader = new THREE.AudioLoader();
    this._ambientAudio = null;
    this._drones = [];
  }

  async load(scene) {
    this.scene = scene;

    await this._buildMoltenRoom(scene);
    await this._buildSciFiWalls(scene);
    await this._buildSciFiCorridor(scene);

    const [cablesModel] = await Promise.allSettled([
      this._loadModel('cables.glb'),
    ]);

    if (cablesModel.status === 'fulfilled' && cablesModel.value) {
      const cables = cablesModel.value;
      cables.position.set(0, 1.8, 0);
      cables.scale.set(1.2, 1.2, 1.2);
      cables.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      scene.add(cables);
      this.objects.push(cables);
    }

    this._buildReactor(scene);
    this._buildConsoles(scene);
    this._buildPipes(scene);
    this._buildWallDecor(scene);
    this._buildPickupItems(scene);
    this._setupAudio(scene);
    this._setupDrones(scene);
    this._setupLights(scene);
    this._setupParticles(scene);
    this._setupColliders();

    this._rebuildInteractiveObjects();
    if (window.__game && window.__game.player) {
      window.__game.player.setInteractiveObjects(this.interactiveObjects);
    }

    return this;
  }

  _loadModel(name) {
    return new Promise((resolve, reject) => {
      this.loader.load(name, gltf => resolve(gltf.scene), undefined, reject);
    });
  }

  _loadMolten(name) {
    return new Promise(resolve => {
      this.moltenLoader.load(name, gltf => resolve(gltf.scene), undefined, () => resolve(null));
    });
  }

  _loadSciFi(name) {
    return new Promise(resolve => {
      this.sciFiLoader.load('assets/models/sci-fi-series-a/' + name, gltf => resolve(gltf.scene), undefined, () => resolve(null));
    });
  }

  setTransitionCallback(cb) {
    this._transitionCallback = cb;
  }

  async _buildMoltenRoom(scene) {
    const [sciFiFloor, ceilingLight] = await Promise.allSettled([
      this._loadSciFi('Pack_SciFi_Series_A_Bundle/Pack_SciFi_A_005_V1.0/02_EXPORT/OBJ/SM_Floor_V1.glb'),
      this._loadMolten('Ceiling_Light.glb'),
    ]);

    const setup = (obj) => {
      obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    };

    const cloneAt = (model, x, z, ry = 0, y = 0) => {
      if (!model) return null;
      const c = model.clone();
      c.position.set(x, y, z);
      c.rotation.y = ry;
      setup(c);
      scene.add(c);
      this.objects.push(c);
      return c;
    };

    // Floor tiles (8×8 grid of 2×2 tiles → 16×16 room)
    const ft = sciFiFloor.status === 'fulfilled' ? sciFiFloor.value : null;
    if (ft) {
      for (let ix = -7; ix <= 7; ix += 2) {
        for (let iz = -7; iz <= 7; iz += 2) {
          cloneAt(ft, ix, iz);
        }
      }
    }

    // Ceiling tiles (8×8 grid of 2×2 sci-fi floor tiles at y=4)
    if (ft) {
      for (let ix = -7; ix <= 7; ix += 2) {
        for (let iz = -7; iz <= 7; iz += 2) {
          cloneAt(ft, ix, iz, 0, 4);
        }
      }
    }

    // Ceiling lights at inner corners
    const cl = ceilingLight.status === 'fulfilled' ? ceilingLight.value : null;
    if (cl) {
      cloneAt(cl, -4, -4, 0, 3.85);
      cloneAt(cl, 4, -4, 0, 3.85);
      cloneAt(cl, -4, 4, 0, 3.85);
      cloneAt(cl, 4, 4, 0, 3.85);
    }
  }

  async _buildSciFiWalls(scene) {
    const [wallV3, doorFrame, doorV1] = await Promise.allSettled([
      this._loadSciFi('Pack_SciFi_Series_A_Bundle/Pack_SciFi_A_001+_V2.0/Pack_SciFi_A_001_V2.0/02_EXPORT/OBJ/SM_Wall_V3.glb'),
      this._loadSciFi('Pack_SciFi_Series_A_Bundle/Pack_SciFi_A_002_V1.0/02_EXPORT/OBJ/SM_DoorFrame_Single.glb'),
      this._loadSciFi('Pack_SciFi_Series_A_Bundle/Pack_SciFi_A_002_V1.0/02_EXPORT/OBJ/SM_Door_Single_V1.glb'),
    ]);

    const setup = (obj) => {
      obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    };

    const place = (model, x, z, ry, y = 1) => {
      if (!model) return;
      const c = model.clone();
      c.position.set(x, y, z);
      c.rotation.y = ry;
      setup(c);
      scene.add(c);
      this.objects.push(c);
    };

    const w = wallV3.status === 'fulfilled' ? wallV3.value : null;
    if (!w) return;

    const xs = [-7, -5, -3, -1, 1, 3, 5, 7];

    // North wall (z=8)
    xs.forEach(x => { place(w, x, 8, Math.PI / 2, 1); place(w, x, 8, Math.PI / 2, 3); });

    // South wall (z=-8), skip center 2 panels for door
    xs.forEach(x => { if (x === -1 || x === 1) return; place(w, x, -8, -Math.PI / 2, 1); place(w, x, -8, -Math.PI / 2, 3); });

    // West wall (x=-8)
    xs.forEach(z => { place(w, -8, z, Math.PI, 1); place(w, -8, z, Math.PI, 3); });

    // East wall (x=8)
    xs.forEach(z => { place(w, 8, z, 0, 1); place(w, 8, z, 0, 3); });

    // Door frame + door on south wall, scaled to fill 4m gap
    const scale = 4.0 / 2.058;
    const df = doorFrame.status === 'fulfilled' ? doorFrame.value : null;
    if (df) {
      const g = df.clone();
      g.position.set(0, 0, -8);
      g.rotation.y = -Math.PI / 2;
      g.scale.set(scale, scale, scale);
      setup(g);
      scene.add(g);
      this.objects.push(g);
    }

    const dv = doorV1.status === 'fulfilled' ? doorV1.value : null;
    if (dv) {
      const g = dv.clone();
      g.position.set(0, 0, -8);
      g.rotation.y = -Math.PI / 2;
      g.scale.set(scale, scale, scale);
      setup(g);
      scene.add(g);
      this.objects.push(g);
      this.sciFiDoor = g;
    }
  }

  _buildWallDecor(scene) {
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, metalness: 0.4, roughness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.5, roughness: 0.4 });
    const conduitMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.6, roughness: 0.3 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0x662222, metalness: 0.3, roughness: 0.5 });
    const hazardMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, emissive: 0xccaa00, emissiveIntensity: 0.05 });
    const ledGreen = new THREE.MeshPhongMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 0.5 });
    const ledRed = new THREE.MeshPhongMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.3 });
    const ledAmber = new THREE.MeshPhongMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.4 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });

    const add = (g) => { scene.add(g); this.objects.push(g); };

    const wallPos = (wall, x, y) => {
      const g = new THREE.Group();
      switch (wall) {
        case 'n': g.position.set(x, y, 7.9); g.rotation.y = Math.PI; break;
        case 's': g.position.set(x, y, -7.9); g.rotation.y = 0; break;
        case 'w': g.position.set(-7.9, y, x); g.rotation.y = Math.PI / 2; break;
        case 'e': g.position.set(7.9, y, x); g.rotation.y = -Math.PI / 2; break;
      }
      return g;
    };

    const powerBox = (wall, x, y) => {
      const g = wallPos(wall, x, y);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08), panelMat);
      body.position.z = 0.04; g.add(body);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.09), darkMat);
      stripe.position.set(-0.2, 0, 0.04); g.add(stripe);
      stripe.position.set(0.2, 0, 0.04); g.add(stripe.clone());
      const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), ledGreen);
      l1.position.set(-0.1, 0.2, 0.08); g.add(l1);
      const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), ledRed);
      l2.position.set(0.1, 0.2, 0.08); g.add(l2);
      const l3 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), ledAmber);
      l3.position.set(0, -0.15, 0.08); g.add(l3);
      add(g);
    };

    const conduit = (wall, x, y) => {
      const g = wallPos(wall, x, y);
      const main = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.08), conduitMat);
      main.position.z = 0.04; g.add(main);
      for (let ox = -0.5; ox <= 0.5; ox += 0.5) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), conduitMat);
        block.position.set(ox, 0, 0.07); g.add(block);
      }
      add(g);
    };

    const statusPanel = (wall, x, y) => {
      const g = wallPos(wall, x, y);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.06), darkMat);
      body.position.z = 0.03; g.add(body);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), screenMat);
      scr.position.set(0, 0.03, 0.06); g.add(scr);
      for (let i = -1; i <= 1; i++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.01), i === 0 ? ledGreen : (i < 0 ? ledAmber : ledRed));
        led.position.set(i * 0.08, -0.06, 0.06); g.add(led);
      }
      add(g);
    };

    const emergencyPanel = (wall, x, y) => {
      const g = wallPos(wall, x, y);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.06), redMat);
      body.position.z = 0.03; g.add(body);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.01), hazardMat);
      stripe.position.set(0, 0.14, 0.06); g.add(stripe);
      stripe.position.set(0, -0.14, 0.06); g.add(stripe.clone());
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), ledRed);
      btn.position.set(0, 0, 0.08); btn.scale.set(1, 0.5, 1); g.add(btn);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 }));
      ring.position.set(0, 0, 0.08); ring.scale.set(1, 0.5, 1); g.add(ring);
      add(g);
    };

    const junctionBox = (wall, x, y) => {
      const g = wallPos(wall, x, y);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), darkMat);
      body.position.z = 0.05; g.add(body);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.12), conduitMat);
      cap.position.set(0, 0.12, 0.05); g.add(cap);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), ledAmber);
      l.position.set(0, 0, 0.1); g.add(l);
      add(g);
    };

    // North wall — z=8, x = -7,-5,-3,-1,1,3,5,7
    powerBox('n', -7, 1.2);
    conduit('n', -5, 1.2);
    emergencyPanel('n', -3, 2.8);
    statusPanel('n', -1, 1.2);
    junctionBox('n', 1, 1.2);
    powerBox('n', 3, 2.8);
    statusPanel('n', 5, 1.2);
    conduit('n', 7, 2.8);

    // West wall — x=-8, z = -7,-5,-3,-1,1,3,5,7
    conduit('w', -7, 1.2);
    powerBox('w', -5, 2.8);
    statusPanel('w', -3, 1.2);
    emergencyPanel('w', -1, 1.2);
    junctionBox('w', 1, 2.8);
    powerBox('w', 3, 1.2);
    conduit('w', 5, 1.2);
    statusPanel('w', 7, 2.8);

    // East wall — x=8, z = -7,-5,-3,-1,1,3,5,7
    statusPanel('e', -7, 2.8);
    powerBox('e', -5, 1.2);
    conduit('e', -3, 1.2);
    junctionBox('e', -1, 2.8);
    powerBox('e', 1, 1.2);
    conduit('e', 3, 2.8);
    statusPanel('e', 5, 1.2);
    emergencyPanel('e', 7, 1.2);

    // South wall — z=-8, x = -7,-5,-3,3,5,7 (door gap at -1,1)
    powerBox('s', -7, 1.2);
    conduit('s', -5, 2.8);
    statusPanel('s', -3, 1.2);
    emergencyPanel('s', 3, 1.2);
    powerBox('s', 5, 2.8);
    statusPanel('s', 7, 1.2);
  }

  async _buildSciFiCorridor(scene) {
    const [wallV2, floorLarge] = await Promise.allSettled([
      this._loadSciFi('Pack_SciFi_Series_A_Bundle/Pack_SciFi_A_001+_V2.0/Pack_SciFi_A_001_V2.0/02_EXPORT/OBJ/SM_Wall_V2.glb'),
      this._loadSciFi('Pack_SciFi_Series_A_Bundle/Pack_SciFi_A_005_V1.0/02_EXPORT/OBJ/SM_Floor_V1_Large.glb'),
    ]);

    const setup = (obj) => {
      obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    };

    const place = (model, x, z, ry, y = 1) => {
      if (!model) return;
      const c = model.clone();
      c.position.set(x, y, z);
      c.rotation.y = ry;
      setup(c);
      scene.add(c);
      this.objects.push(c);
    };

    const w = wallV2.status === 'fulfilled' ? wallV2.value : null;
    const fl = floorLarge.status === 'fulfilled' ? floorLarge.value : null;

    const zs = [-9, -11];

    // Left corridor wall (x=-2), face points +X
    if (w) zs.forEach(z => { place(w, -2, z, 0, 1); place(w, -2, z, 0, 3); });

    // Right corridor wall (x=2), face points -X
    if (w) zs.forEach(z => { place(w, 2, z, Math.PI, 1); place(w, 2, z, Math.PI, 3); });

    // Corridor floor (2×2m tiles at y=0)
    if (fl) {
      place(fl, -1, -9, 0, 0);
      place(fl, 1, -9, 0, 0);
      place(fl, -1, -11, 0, 0);
      place(fl, 1, -11, 0, 0);
    }
  }

  _buildReactor(scene) {
    const group = new THREE.Group();
    group.position.set(0, 0, 0.5);

    const coreGeo = new THREE.CylinderGeometry(0.6, 0.9, 2.2, 20);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.4,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.6;
    core.castShadow = true;
    group.add(core);

    const glowGeo = new THREE.CylinderGeometry(0.7, 1.0, 2.4, 20);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.08,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.6;
    group.add(glow);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.2,
    });

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2 - i * 0.15, 0.06, 8, 32), ringMat);
      ring.position.y = 0.2 + i * 0.5;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.08, 8, 40), ringMat);
    outerRing.position.y = 0.6;
    outerRing.rotation.x = Math.PI / 2 + 0.1;
    group.add(outerRing);

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.7,
      roughness: 0.4,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.15, 32), baseMat);
    base.position.y = -0.08;
    base.receiveShadow = true;
    group.add(base);

    scene.add(group);
    this.objects.push(group);

    const reactorLight = new THREE.PointLight(0xff4400, 2.5, 12);
    reactorLight.position.set(0, 1.2, 0.5);
    scene.add(reactorLight);
    this.flickerLights.push({ light: reactorLight, baseIntensity: 2.5, speed: 4, amplitude: 0.6 });
    this.lights.push(reactorLight);
  }

  _buildConsoles(scene) {
    const consoleMat = new THREE.MeshStandardMaterial({
      color: 0x333344,
      metalness: 0.6,
      roughness: 0.3,
    });

    const positions = [
      { x: 3.0, z: 2.0, rot: -Math.PI / 4, puzzleIdx: 0 },
      { x: -2.8, z: -2.0, rot: Math.PI / 3, puzzleIdx: 1 },
    ];

    positions.forEach((pos, idx) => {
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = pos.rot;

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), consoleMat);
      body.position.y = 0.25;
      body.castShadow = true;
      group.add(body);

      const screenMat = new THREE.MeshPhongMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.3,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.25), screenMat);
      screen.position.set(0, 0.55, -0.21);
      group.add(screen);
      this._consoleScreens.push(screen);

      const screen2 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.25), screenMat.clone());
      screen2.position.set(0, 0.55, 0.21);
      screen2.rotation.y = Math.PI;
      group.add(screen2);
      this._consoleScreens.push(screen2);

      const puzzle = this._puzzleStates[pos.puzzleIdx];
      const textMat = this._makeLabelMat(puzzle.messageOff, 0xff4444);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.08), textMat);
      label.position.set(0, 0.42, -0.22);
      group.add(label);

      group.userData.interact = () => this._onConsoleInteract(idx, pos.puzzleIdx, group);
      this._consoleGroups.push(group);

      scene.add(group);
      this.objects.push(group);
    });
  }

  _makeLabelMat(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 16);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
  }

  _onConsoleInteract(consoleIdx, puzzleIdx, group) {
    const puzzle = this._puzzleStates[puzzleIdx];
    const player = window.__game?.player;
    const hud = window.__game?.hud;
    if (!player || !hud) return;

    if (puzzle.solved) {
      hud.showMessage(puzzle.messageOn, 2000);
      return;
    }

    const required = puzzle.id === 'power' ? 'battery' : 'keycard';
    const itemName = puzzle.id === 'power' ? 'Batería' : 'Tarjeta de Acceso';

    if (player.hasItem(required)) {
      player.removeItem(required);
      puzzle.solved = true;
      hud.showMessage(`✅ ${puzzle.label}: ${puzzle.messageOn}`, 3000);
      window.__game?.sfx?.terminalBeep();

      if (puzzle.id === 'power') {
        this._onPowerSolved();
      } else if (puzzle.id === 'access') {
        this._onAccessSolved();
      }
    } else {
      hud.showMessage(`❌ ${puzzle.label}: NECESITAS ${itemName.toUpperCase()}`, 2500);
    }
  }

  _onPowerSolved() {
    const coreMat = this._findReactorCore();
    if (coreMat) {
      coreMat.emissiveIntensity = 1.0;
      coreMat.opacity = 0.9;
      coreMat.color.setHex(0xff6600);
    }
    const hud = window.__game?.hud;
    if (hud) hud.showMessage('⚡ REACTOR ACTIVADO — SISTEMAS CRÍTICOS ONLINE', 4000);
    window.__game?.sfx?.powerUp();
    window.__game?.save();
  }

  _onAccessSolved() {
    this.sciFiDoorOpen = true;
    this.sciFiDoorAnimT = 0;
    const hud = window.__game?.hud;
    if (hud) hud.showMessage('🚪 PUERTA ABIERTA — ACCESO AL CORREDOR', 4000);
    window.__game?.sfx?.doorOpen();
    window.__game?.save();
  }

  _findReactorCore() {
    for (const obj of this.objects) {
      let found = null;
      obj.traverse(c => {
        if (c.isMesh && c.material && c.material.emissive && c.material.emissive.getHex() === 0xff2200) {
          found = c.material;
        }
      });
      if (found) return found;
    }
    return null;
  }

  _buildPickupItems(scene) {
    const itemDefs = [
      { id: 'keycard', name: 'Tarjeta de Acceso', icon: '🔑', color: 0x4488ff, pos: [-2.8, 0.25, -0.8], hint: '🔑 Tarjeta de Acceso obtenida' },
      { id: 'battery', name: 'Batería', icon: '⚡', color: 0xffaa00, pos: [1.8, 0.25, 1.2], hint: '⚡ Batería obtenida' },
      { id: 'repair_kit', name: 'Kit de Reparación', icon: '🩹', color: 0x44ff44, pos: [-2.5, 0.25, 2.3], hint: '🩹 Kit de Reparación obtenido (+25 HP)' },
    ];

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gctx = glowCanvas.getContext('2d');
    const gradient = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    gctx.fillStyle = gradient;
    gctx.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(glowCanvas);

    itemDefs.forEach((def) => {
      const group = new THREE.Group();
      group.position.set(def.pos[0], def.pos[1], def.pos[2]);

      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.07, 0.03),
        new THREE.MeshPhongMaterial({
          color: def.color,
          emissive: def.color,
          emissiveIntensity: 0.8,
        })
      );
      box.castShadow = true;
      group.add(box);

      const spriteMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: def.color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.7,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.5, 0.5, 1);
      sprite.position.y = 0.05;
      group.add(sprite);

      const entry = {
        group,
        data: def,
        floatOffset: Math.random() * Math.PI * 2,
        collected: false,
      };
      this._pickupItems.push(entry);

      group.userData.interact = () => this._onPickup(entry);
      group.userData.isPickup = true;

      scene.add(group);
      this.objects.push(group);
    });
  }

  _onPickup(entry) {
    if (entry.collected) return;
    entry.collected = true;

    const player = window.__game?.player;
    const hud = window.__game?.hud;
    if (!player || !hud) return;

    const def = entry.data;
    player.addItem({ id: def.id, name: def.name, icon: def.icon });

    if (def.id === 'repair_kit') {
      player.heal(25);
    }

    hud.showMessage(def.hint, 2500);
    window.__game?.sfx?.pickup();

    this.scene.remove(entry.group);
    const objIdx = this.objects.indexOf(entry.group);
    if (objIdx !== -1) this.objects.splice(objIdx, 1);

    this._rebuildInteractiveObjects();
    if (window.__game?.player) {
      window.__game.player.setInteractiveObjects(this.interactiveObjects);
    }
    window.__game?.save();
  }

  _rebuildInteractiveObjects() {
    const arr = [];
    this._consoleGroups.forEach(g => {
      g.traverse(c => { if (c.isMesh) arr.push(c); });
    });
    this._pickupItems.forEach(entry => {
      if (!entry.collected) {
        entry.group.traverse(c => { if (c.isMesh) arr.push(c); });
      }
    });
    this.interactiveObjects = arr;
  }

  _buildPipes(scene) {
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x555566,
      metalness: 0.5,
      roughness: 0.5,
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 2.6;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), pipeMat);
      pipe.position.set(Math.cos(angle) * r, 0.8, Math.sin(angle) * r);
      pipe.castShadow = true;
      scene.add(pipe);
      this.objects.push(pipe);

      const connector = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), pipeMat);
      connector.position.set(Math.cos(angle) * r, 0.05, Math.sin(angle) * r);
      scene.add(connector);
      this.objects.push(connector);
    }
  }

  _setupLights(scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambient);
    this.lights.push(ambient);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const r = 3.0;
      const emLight = new THREE.PointLight(0xff4400, 1.5, 18);
      emLight.position.set(Math.cos(angle) * r, 1.6, Math.sin(angle) * r);
      scene.add(emLight);
      this.flickerLights.push({
        light: emLight,
        baseIntensity: 1.5,
        speed: 2.5 + Math.random() * 2,
        amplitude: 0.3,
      });
      this.lights.push(emLight);
    }

    const dimCeiling = new THREE.PointLight(0xffffff, 0.6, 25);
    dimCeiling.position.set(0, 2.2, 0);
    scene.add(dimCeiling);
    this.flickerLights.push({
      light: dimCeiling,
      baseIntensity: 0.6,
      speed: 1.5,
      amplitude: 0.12,
    });
    this.lights.push(dimCeiling);
  }

  _setupParticles(scene) {
    const count = 300;
    const positions = new Float32Array(count * 3);
    this._particleVelocities = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5 + 0.3;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 1.8;
      positions[i * 3 + 2] = Math.sin(angle) * radius + 0.5;
      this._particleVelocities.push({
        vx: (Math.random() - 0.5) * 0.15,
        vy: Math.random() * 0.25 + 0.08,
        vz: (Math.random() - 0.5) * 0.15,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xaa8866,
      size: 0.06,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geo, mat);
    this.particles.position.set(0, 0, 0.5);
    scene.add(this.particles);
    this.objects.push(this.particles);

    // Spark particles — shower from ceiling
    const sparkCount = 80;
    const sparkPos = new Float32Array(sparkCount * 3);
    this._sparkVelocities = [];
    this._sparkLifetimes = new Float32Array(sparkCount);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3.0 + 0.5;
      sparkPos[i * 3] = Math.cos(angle) * radius;
      sparkPos[i * 3 + 1] = 2.5 + Math.random() * 1.2;
      sparkPos[i * 3 + 2] = Math.sin(angle) * radius;
      this._sparkVelocities.push({
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(Math.random() * 1.2 + 0.6),
        vz: (Math.random() - 0.5) * 0.5,
      });
      this._sparkLifetimes[i] = Math.random() * 0.5 + 0.3;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xff8800,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this._sparkParticles = new THREE.Points(sparkGeo, sparkMat);
    this._sparkParticles.position.set(0, 0, 0.5);
    scene.add(this._sparkParticles);
    this.objects.push(this._sparkParticles);
  }

  _resetSpark(i) {
    const pos = this._sparkParticles.geometry.attributes.position.array;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 3.0 + 0.5;
    pos[i * 3] = Math.cos(angle) * radius;
    pos[i * 3 + 1] = 2.5 + Math.random() * 1.2;
    pos[i * 3 + 2] = Math.sin(angle) * radius;
    const fallSpeed = Math.random() * 1.2 + 0.6;
    const drift = (Math.random() - 0.5) * 0.5;
    this._sparkVelocities[i] = { vx: drift, vy: -fallSpeed, vz: drift };
    this._sparkLifetimes[i] = Math.random() * 0.5 + 0.3;
  }

  _setupDrones(scene) {
    const wp = [[-2, 1.5, 4], [2, 1.5, 4], [2, 1.5, -3], [-2, 1.5, -3]];
    const diff = window.__game?.difficulty || 'easy';
    const drone = new SecurityDrone(wp, 0, diff);
    drone.setPosition(-2, 1.5, 4);
    scene.add(drone.group);
    this.objects.push(drone.group);
    this._drones.push(drone);
  }

  _setupAudio(scene) {
    const camera = window.__game?.camera;
    if (!camera) return;

    let listener = camera.userData._audioListener;
    if (!listener) {
      listener = new THREE.AudioListener();
      camera.add(listener);
      camera.userData._audioListener = listener;
    }

    this._ambientAudio = new THREE.Audio(listener);
    this.audioLoader.load('assets/sound/engine_ambient.wav', buffer => {
      this._ambientAudio.setBuffer(buffer);
      this._ambientAudio.setLoop(true);
      this._ambientAudio.setVolume(window.__game?._volume ?? 0.25);
      this._ambientAudio.play();
    }, undefined, err => {
      console.warn('Failed to load engine ambient audio:', err);
    });

    this._onPause = () => { if (this._ambientAudio) this._ambientAudio.pause(); };
    this._onResume = () => { if (this._ambientAudio) this._ambientAudio.play(); };
    window.addEventListener('game-pause', this._onPause);
    window.addEventListener('game-resume', this._onResume);
  }

  _setupColliders() {
    this._colliderBoxes = [
      // Main room walls (16×16, walls at ±8)
      new THREE.Box3(new THREE.Vector3(-8.0, 0, 7.8), new THREE.Vector3(8.0, 3.0, 8.0)),
      new THREE.Box3(new THREE.Vector3(-8.0, 0, -8.0), new THREE.Vector3(-2.0, 3.0, -7.8)),
      new THREE.Box3(new THREE.Vector3(2.0, 0, -8.0), new THREE.Vector3(8.0, 3.0, -7.8)),
      new THREE.Box3(new THREE.Vector3(-8.0, 0, -8.0), new THREE.Vector3(-7.8, 3.0, 8.0)),
      new THREE.Box3(new THREE.Vector3(7.8, 0, -8.0), new THREE.Vector3(8.0, 3.0, 8.0)),

      // Corridor walls (door at z=-8, corridor extends to z=-11)
      new THREE.Box3(new THREE.Vector3(-2.0, 0, -11.0), new THREE.Vector3(-1.8, 3.0, -8.0)),
      new THREE.Box3(new THREE.Vector3(1.8, 0, -11.0), new THREE.Vector3(2.0, 3.0, -8.0)),
      new THREE.Box3(new THREE.Vector3(-2.0, 0, -11.7), new THREE.Vector3(2.0, 3.0, -11.5)),

      // Reactor area
      new THREE.Box3(new THREE.Vector3(-1.5, 0, -1.0), new THREE.Vector3(1.5, 3.0, 2.0)),

      // Consoles
      new THREE.Box3(new THREE.Vector3(2.6, 0, 1.6), new THREE.Vector3(3.4, 0.7, 2.4)),
      new THREE.Box3(new THREE.Vector3(-3.2, 0, -2.4), new THREE.Vector3(-2.4, 0.7, -1.6)),
    ];
  }

  getColliders() {
    return this._colliderBoxes;
  }

  update(delta, time) {
    this.flickerLights.forEach(f => {
      const flicker = Math.sin(time * f.speed) * f.amplitude;
      f.light.intensity = Math.max(0.05, f.baseIntensity + flicker);
    });

    this._pickupItems.forEach(entry => {
      if (entry.collected) return;
      const t = time + entry.floatOffset;
      entry.group.position.y = entry.data.pos[1] + Math.sin(t * 3) * 0.03;
      entry.group.rotation.y += delta * 1.5;
    });

    if (this.sciFiDoorOpen && this.sciFiDoorAnimT < 1) {
      this.sciFiDoorAnimT = Math.min(1, this.sciFiDoorAnimT + delta * 0.8);
      const t = this.sciFiDoorAnimT;
      const eased = t * t * (3 - 2 * t);
      if (this.sciFiDoor) {
        this.sciFiDoor.position.y = eased * 3.0;
      }
    }

    if (this._transitionCallback && this.sciFiDoorOpen && !this._transitionTriggered && window.__game?.player) {
      const pPos = window.__game.player.camera.position;
      if (pPos.z < -11.0) {
        this._transitionTriggered = true;
        this._transitionCallback();
      }
    }

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += this._particleVelocities[i].vx * delta;
        positions[i * 3 + 1] += this._particleVelocities[i].vy * delta;
        positions[i * 3 + 2] += this._particleVelocities[i].vz * delta;

        if (positions[i * 3 + 1] > 1.8) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 1.5 + 0.3;
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = Math.sin(angle) * radius + 0.5;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    this._drones.forEach(d => {
      if (window.__game?.player) {
        d.update(delta, window.__game.player.camera.position);
      }
    });

    // Animate sparks
    if (this._sparkParticles) {
      const sparkPos = this._sparkParticles.geometry.attributes.position.array;
      for (let i = 0; i < 80; i++) {
        this._sparkLifetimes[i] -= delta;
        if (this._sparkLifetimes[i] <= 0) {
          this._resetSpark(i);
        }
        sparkPos[i * 3] += this._sparkVelocities[i].vx * delta;
        sparkPos[i * 3 + 1] += this._sparkVelocities[i].vy * delta;
        sparkPos[i * 3 + 2] += this._sparkVelocities[i].vz * delta;
        if (sparkPos[i * 3 + 1] < 0) {
          this._resetSpark(i);
        }
      }
      this._sparkParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  unload() {
    this.objects.forEach(obj => {
      if (obj.parent) obj.parent.remove(obj);
      obj.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.lights.forEach(light => {
      if (light.parent) light.parent.remove(light);
    });
    if (this._onPause) window.removeEventListener('game-pause', this._onPause);
    if (this._onResume) window.removeEventListener('game-resume', this._onResume);
    if (this._ambientAudio) {
      this._ambientAudio.stop();
      this._ambientAudio = null;
    }
    this.objects = [];
    this.lights = [];
    this.flickerLights = [];
    this.interactiveObjects = [];
    this.colliders = [];
    this.sciFiDoor = null;
    this.sciFiDoorOpen = false;
    this.sciFiDoorAnimT = 0;
    this._transitionCallback = null;
    this._transitionTriggered = false;
    this._pickupItems = [];
    this._consoleGroups = [];
    this._consoleScreens = [];
    this._sparkParticles = null;
    this._sparkVelocities = [];
    this._sparkLifetimes = null;
    this._drones = [];
  }
}
