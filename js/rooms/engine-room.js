import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class EngineRoom {
  constructor() {
    this.objects = [];
    this.lights = [];
    this.flickerLights = [];
    this.interactiveObjects = [];
    this.colliders = [];
    this.particles = null;
    this.gateDoor = null;
    this.gateOpen = false;
    this.gateAnimT = 0;
    this._pickupItems = [];
    this._consoleGroups = [];
    this._consoleScreens = [];
    this._puzzleStates = [
      { id: 'power', solved: false, label: 'SISTEMA', messageOff: 'SIN ENERGÍA', messageOn: 'SISTEMA ACTIVO' },
      { id: 'access', solved: false, label: 'ACCESO', messageOff: 'ACCESO DENEGADO', messageOn: 'PUERTA ABIERTA' },
    ];
    this.loader = new GLTFLoader();
    this.loader.setPath('assets/models/modular-space-kit/');
    this.loader.setResourcePath('assets/models/modular-space-kit/Textures/');
  }

  async load(scene) {
    this.scene = scene;

    const roomModels = await Promise.all([
      this._loadModel('room-large.glb'),
      this._loadModel('cables.glb'),
      this._loadModel('gate-door.glb'),
      this._loadModel('corridor.glb'),
    ]);

    const roomLarge = roomModels[0];
    roomLarge.position.set(0, -0.5, 0);
    roomLarge.scale.set(1, 1, 1);
    roomLarge.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(roomLarge);
    this.objects.push(roomLarge);

    const cables = roomModels[1];
    cables.position.set(0, 1.8, 0);
    cables.scale.set(1.2, 1.2, 1.2);
    cables.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(cables);
    this.objects.push(cables);

    this.gateDoor = roomModels[2];
    this.gateDoor.position.set(0, -0.5, -3.5);
    this.gateDoor.rotation.y = Math.PI / 2;
    this.gateDoor.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(this.gateDoor);
    this.objects.push(this.gateDoor);

    const corridor = roomModels[3];
    corridor.position.set(0, -0.5, -5.5);
    corridor.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(corridor);
    this.objects.push(corridor);

    this._buildReactor(scene);
    this._buildConsoles(scene);
    this._buildPipes(scene);
    this._buildPickupItems(scene);
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

    const reactorLight = new THREE.PointLight(0xff4400, 0.8, 8);
    reactorLight.position.set(0, 1.2, 0.5);
    scene.add(reactorLight);
    this.flickerLights.push({ light: reactorLight, baseIntensity: 1.5, speed: 4, amplitude: 0.6 });
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
  }

  _onAccessSolved() {
    this.gateOpen = true;
    this.gateAnimT = 0;
    const hud = window.__game?.hud;
    if (hud) hud.showMessage('🚪 PUERTA ABIERTA — ACCESO AL CORREDOR', 4000);
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

    this.scene.remove(entry.group);
    const objIdx = this.objects.indexOf(entry.group);
    if (objIdx !== -1) this.objects.splice(objIdx, 1);

    this._rebuildInteractiveObjects();
    if (window.__game?.player) {
      window.__game.player.setInteractiveObjects(this.interactiveObjects);
    }
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
    const ambient = new THREE.AmbientLight(0x445566, 2.5);
    scene.add(ambient);
    this.lights.push(ambient);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const r = 3.0;
      const emLight = new THREE.PointLight(0xff0000, 2.5, 15);
      emLight.position.set(Math.cos(angle) * r, 1.6, Math.sin(angle) * r);
      scene.add(emLight);
      this.flickerLights.push({
        light: emLight,
        baseIntensity: 0.4,
        speed: 2.5 + Math.random() * 2,
        amplitude: 0.3,
      });
      this.lights.push(emLight);
    }

    const dimCeiling = new THREE.PointLight(0xffffff, 2.5, 20);
    dimCeiling.position.set(0, 2.2, 0);

    const dirLight = new THREE.DirectionalLight(0xaaccff, 1.5);
    dirLight.position.set(5, 8, 5);
    dirLight.target.position.set(0, 0, 0);
    scene.add(dirLight.target);
    scene.add(dirLight);
    this.lights.push(dirLight, dirLight.target);
    scene.add(dimCeiling);
    this.flickerLights.push({
      light: dimCeiling,
      baseIntensity: 0.15,
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
  }

  _setupColliders() {
    this._colliderBoxes = [
      new THREE.Box3(new THREE.Vector3(-3.2, 0, 3.0), new THREE.Vector3(3.2, 3.0, 3.4)),
      new THREE.Box3(new THREE.Vector3(-3.2, 0, -3.4), new THREE.Vector3(-0.6, 3.0, -3.0)),
      new THREE.Box3(new THREE.Vector3(0.6, 0, -3.4), new THREE.Vector3(3.2, 3.0, -3.0)),
      new THREE.Box3(new THREE.Vector3(-3.4, 0, -3.2), new THREE.Vector3(-3.0, 3.0, 3.2)),
      new THREE.Box3(new THREE.Vector3(3.0, 0, -3.2), new THREE.Vector3(3.4, 3.0, 3.2)),

      new THREE.Box3(new THREE.Vector3(-1.2, 0, -5.5), new THREE.Vector3(-0.6, 3.0, -3.0)),
      new THREE.Box3(new THREE.Vector3(0.6, 0, -5.5), new THREE.Vector3(1.2, 3.0, -3.0)),
      new THREE.Box3(new THREE.Vector3(-1.2, 0, -5.7), new THREE.Vector3(1.2, 3.0, -5.5)),

      new THREE.Box3(new THREE.Vector3(-1.5, 0, -1.0), new THREE.Vector3(1.5, 3.0, 2.0)),

      new THREE.Box3(new THREE.Vector3(2.6, 0, 1.6), new THREE.Vector3(3.4, 0.7, 2.4)),
      new THREE.Box3(new THREE.Vector3(-3.2, 0, -2.4), new THREE.Vector3(-2.4, 0.7, -1.6)),
    ];
  }

  getColliders() {
    return this._colliderBoxes;
  }

  update(delta, time) {
    this.flickerLights.forEach(f => {
      f.light.intensity = f.baseIntensity;
    });

    this._pickupItems.forEach(entry => {
      if (entry.collected) return;
      const t = time + entry.floatOffset;
      entry.group.position.y = entry.data.pos[1] + Math.sin(t * 3) * 0.03;
      entry.group.rotation.y += delta * 1.5;
    });

    if (this.gateOpen && this.gateAnimT < 1) {
      this.gateAnimT = Math.min(1, this.gateAnimT + delta * 0.8);
      const t = this.gateAnimT;
      const eased = t * t * (3 - 2 * t);
      if (this.gateDoor) {
        this.gateDoor.position.y = -0.5 + eased * 3.0;
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
    this.objects = [];
    this.lights = [];
    this.flickerLights = [];
    this.interactiveObjects = [];
    this.particles = null;
    this.gateDoor = null;
    this.gateOpen = false;
    this.gateAnimT = 0;
    this._pickupItems = [];
    this._consoleGroups = [];
    this._consoleScreens = [];
  }
}
