import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class LabRoom {
  constructor() {
    this.objects = [];
    this.lights = [];
    this.flickerLights = [];
    this.interactiveObjects = [];
    this.colliders = [];
    this.particles = null;
    this.particleVelocities = [];
    this.gateLasers = null;
    this.laserMeshes = [];
    this.gateOpen = false;
    this.gateAnimT = 0;
    this.pickupItems = [];
    this.terminalGroup = null;
    this.terminalScreens = [];
    this.puzzleSolved = false;

    this.requiredItems = [
      { id: 'chemical_sample', name: 'Muestra Química', icon: '🧪' },
      { id: 'data_chip', name: 'Chip de Datos', icon: '💿' },
      { id: 'access_code', name: 'Código de Acceso', icon: '🔐' },
    ];

    this._transitionCallback = null;
    this._transitionTriggered = false;

    this.modularLoader = new GLTFLoader();
    this.modularLoader.setPath('assets/models/modular-space-kit/');
    this.modularLoader.setResourcePath('assets/models/modular-space-kit/Textures/');

    this.stationLoader = new GLTFLoader();
    this.stationLoader.setPath('assets/kenney_space-station-kit/Models/GLB format/');
    this.stationLoader.setResourcePath('assets/kenney_space-station-kit/Models/GLB format/Textures/');

    this.moltenLoader = new GLTFLoader();
    this.moltenLoader.setPath('assets/models/molten-maps/');

    this.sciFiLoader = new GLTFLoader();
  }

  async load(scene) {
    this.scene = scene;

    await this._buildMoltenRoom(scene);
    await this._buildSciFiWalls(scene);

    const gate = await this._loadModular('gate-lasers.glb');
    this.gateLasers = gate;
    this.gateLasers.position.set(0, 0, -10.2);
    this.gateLasers.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(this.gateLasers);
    this.objects.push(this.gateLasers);

    this.gateLasers.traverse(c => {
      if (c.isMesh && c.name === 'lasers') {
        c.material = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          emissive: 0xff0000,
          emissiveIntensity: 3.0,
          transparent: true,
          opacity: 0.8,
        });
        this.laserMeshes.push(c);
      }
    });

    this._buildTerminal(scene);
    this._buildPickupItems(scene);
    this._setupLights(scene);
    this._setupParticles(scene);
    this._setupColliders();

    this._rebuildInteractiveObjects();
    if (window.__game?.player) {
      window.__game.player.setInteractiveObjects(this.interactiveObjects);
    }

    return this;
  }

  _loadModular(name) {
    return new Promise((resolve, reject) => {
      this.modularLoader.load(name, gltf => resolve(gltf.scene), undefined, reject);
    });
  }

  _loadStationModel(name) {
    return new Promise(resolve => {
      this.stationLoader.load(name, gltf => resolve(gltf.scene), undefined, () => resolve(null));
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

    // Floor tiles (10×10 grid of 2×2 tiles → 20×20 room)
    const ft = sciFiFloor.status === 'fulfilled' ? sciFiFloor.value : null;
    if (ft) {
      for (let ix = -9; ix <= 9; ix += 2) {
        for (let iz = -9; iz <= 9; iz += 2) {
          cloneAt(ft, ix, iz);
        }
      }
    }

    // Ceiling tiles (10×10 grid of 2×2 sci-fi floor tiles at y=4)
    if (ft) {
      for (let ix = -9; ix <= 9; ix += 2) {
        for (let iz = -9; iz <= 9; iz += 2) {
          cloneAt(ft, ix, iz, 0, 4);
        }
      }
    }

    // Ceiling lights at corners + center
    const cl = ceilingLight.status === 'fulfilled' ? ceilingLight.value : null;
    if (cl) {
      cloneAt(cl, -6, -6, 0, 3.85);
      cloneAt(cl, 6, -6, 0, 3.85);
      cloneAt(cl, -6, 6, 0, 3.85);
      cloneAt(cl, 6, 6, 0, 3.85);
      cloneAt(cl, 0, 0, 0, 3.85);
    }
  }

  async _buildSciFiWalls(scene) {
    const [wallV5, wallV4] = await Promise.allSettled([
      this._loadSciFi('Pack_SciFi_Series_A_Bundle/Pack_SciFi_A_001+_V2.0/Pack_SciFi_A_001_V2.0/02_EXPORT/OBJ/SM_Wall_V5.glb'),
      this._loadSciFi('Pack_SciFi_Series_A_Bundle/Pack_SciFi_A_001+_V2.0/Pack_SciFi_A_001_V2.0/02_EXPORT/OBJ/SM_Wall_V4.glb'),
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

    const w5 = wallV5.status === 'fulfilled' ? wallV5.value : null;
    const w4 = wallV4.status === 'fulfilled' ? wallV4.value : null;
    if (!w5) return;

    const xs = [-9, -7, -5, -3, -1, 1, 3, 5, 7, 9];

    // Build pool of valid V4 positions (no corners, no door gap)
    const pool = [];
    xs.forEach(x => {
      if (x === -9 || x === 9) return;
      ['n', 's', 'w', 'e'].forEach(wall => {
        if (wall === 's' && (x === -1 || x === 1)) return;
        pool.push(wall + '_' + x + '_y1');
        pool.push(wall + '_' + x + '_y3');
      });
    });

    // Pick 2 positions on different walls
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const v4Set = new Set();
    for (const key of shuffled) {
      if (v4Set.size >= 2) break;
      const wall = key.split('_')[0];
      let sameWall = false;
      for (const existing of v4Set) {
        if (existing.split('_')[0] === wall) { sameWall = true; break; }
      }
      if (!sameWall) v4Set.add(key);
    }

    const pick = (wall, x, y) => {
      const m = v4Set.has(wall + '_' + x + '_y' + y) && w4 ? w4 : w5;
      return m;
    };

    // North wall (z=10)
    xs.forEach(x => { place(pick('n', x, 1), x, 10, Math.PI / 2, 1); place(pick('n', x, 3), x, 10, Math.PI / 2, 3); });

    // South wall (z=-10), skip center 2 panels for door gap
    xs.forEach(x => {
      if (x === -1 || x === 1) return;
      place(pick('s', x, 1), x, -10, -Math.PI / 2, 1);
      place(pick('s', x, 3), x, -10, -Math.PI / 2, 3);
    });

    // West wall (x=-10)
    xs.forEach(z => { place(pick('w', z, 1), -10, z, Math.PI, 1); place(pick('w', z, 3), -10, z, Math.PI, 3); });

    // East wall (x=10)
    xs.forEach(z => { place(pick('e', z, 1), 10, z, 0, 1); place(pick('e', z, 3), 10, z, 0, 3); });
  }

  _buildTerminal(scene) {
    const group = new THREE.Group();
    group.position.set(0, 0.75, 0.65);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.5, roughness: 0.3 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.4), baseMat);
    base.position.y = 0.07;
    base.castShadow = true;
    group.add(base);

    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.05), baseMat);
    stem.position.set(0, 0.25, 0);
    group.add(stem);

    const screenMat = new THREE.MeshPhongMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.2,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), screenMat);
    screen.position.set(0, 0.5, -0.21);
    group.add(screen);
    this.terminalScreens.push(screen);

    const label = this._makeTerminalLabel('INSERTE 3 MUESTRAS', 0x00ffaa);
    label.position.set(0, 0.42, -0.22);
    group.add(label);
    this.terminalScreens.push(label);

    group.userData.interact = () => this._onTerminalInteract();
    this.terminalGroup = group;

    scene.add(group);
    this.objects.push(group);
  }

  _makeTerminalLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(0.45, 0.12),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
  }

  _onTerminalInteract() {
    const player = window.__game?.player;
    const hud = window.__game?.hud;
    if (!player || !hud) return;

    if (this.puzzleSolved) {
      hud.showMessage('✅ BARRERA DESACTIVADA — SALIDA LIBERADA', 2000);
      return;
    }

    const missing = this.requiredItems.filter(item => !player.hasItem(item.id));

    if (missing.length === 0) {
      this.requiredItems.forEach(item => player.removeItem(item.id));
      this.puzzleSolved = true;
      this.gateOpen = true;
      this.gateAnimT = 0;
      hud.showMessage('✅ MUESTRAS COMPLETAS — DESACTIVANDO BARRERA', 4000);
    } else {
      const names = missing.map(m => m.name).join(', ');
      hud.showMessage(`❌ FALTAN: ${names}`, 3000);
    }
  }

  _buildPickupItems(scene) {
    const itemDefs = [
      { id: 'chemical_sample', name: 'Muestra Química', icon: '🧪', color: 0x44ff44, pos: [1.8, 0.85, -1.0], hint: '🧪 Muestra Química obtenida' },
      { id: 'data_chip', name: 'Chip de Datos', icon: '💿', color: 0x4488ff, pos: [0.2, 0.85, 0.9], hint: '💿 Chip de Datos obtenido' },
      { id: 'access_code', name: 'Código de Acceso', icon: '🔐', color: 0xaa44ff, pos: [-1.8, 0.85, 0.5], hint: '🔐 Código de Acceso obtenido' },
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

    itemDefs.forEach(def => {
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
      this.pickupItems.push(entry);

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

    player.addItem({ id: entry.data.id, name: entry.data.name, icon: entry.data.icon });
    hud.showMessage(entry.data.hint, 2500);

    this.scene.remove(entry.group);
    const idx = this.objects.indexOf(entry.group);
    if (idx !== -1) this.objects.splice(idx, 1);

    this._rebuildInteractiveObjects();
    if (window.__game?.player) {
      window.__game.player.setInteractiveObjects(this.interactiveObjects);
    }
  }

  _rebuildInteractiveObjects() {
    const arr = [];
    if (this.terminalGroup) {
      this.terminalGroup.traverse(c => { if (c.isMesh) arr.push(c); });
    }
    this.pickupItems.forEach(entry => {
      if (!entry.collected) {
        entry.group.traverse(c => { if (c.isMesh) arr.push(c); });
      }
    });
    this.interactiveObjects = arr;
  }

  _setupLights(scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    this.lights.push(ambient);

    const positions = [[-6, 4.0, -6], [6, 4.0, -6], [-6, 4.0, 6], [6, 4.0, 6], [0, 4.0, 0]];
    positions.forEach(p => {
      const light = new THREE.PointLight(0xffffff, 1.5, 14);
      light.position.set(p[0], p[1], p[2]);
      scene.add(light);
      this.lights.push(light);
    });
  }

  _setupParticles(scene) {
    const count = 500;
    const positions = new Float32Array(count * 3);
    this.particleVelocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = Math.random() * 3.0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      this.particleVelocities.push({
        vx: (Math.random() - 0.5) * 0.05,
        vy: Math.random() * 0.15 + 0.05,
        vz: (Math.random() - 0.5) * 0.05,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.04,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geo, mat);
    this.particles.position.set(0, 0, 0);
    scene.add(this.particles);
    this.objects.push(this.particles);
  }

  _setupColliders() {
    this.colliders = [
      new THREE.Box3(new THREE.Vector3(-10.2, 0, -10), new THREE.Vector3(-9.8, 4, 10)),
      new THREE.Box3(new THREE.Vector3(9.8, 0, -10), new THREE.Vector3(10.2, 4, 10)),
      new THREE.Box3(new THREE.Vector3(-10, 0, 9.8), new THREE.Vector3(10, 4, 10.2)),
      // South wall — gap for door 4m (x=-2 to x=2)
      new THREE.Box3(new THREE.Vector3(-10, 0, -10.2), new THREE.Vector3(-2, 4, -9.8)),
      new THREE.Box3(new THREE.Vector3(2, 0, -10.2), new THREE.Vector3(10, 4, -9.8)),
    ];
  }

  getColliders() {
    return this.colliders;
  }

  setTransitionCallback(cb) {
    this._transitionCallback = cb;
  }

  update(delta, time) {
    this.flickerLights.forEach(f => {
      const flicker = Math.sin(time * f.speed) * f.amplitude;
      f.light.intensity = Math.max(0.02, f.baseIntensity + flicker);
    });

    this.pickupItems.forEach(entry => {
      if (entry.collected) return;
      const t = time + entry.floatOffset;
      entry.group.position.y = entry.data.pos[1] + Math.sin(t * 3) * 0.03;
      entry.group.rotation.y += delta * 1.5;
    });

    if (this.gateOpen && this.gateAnimT < 1) {
      this.gateAnimT = Math.min(1, this.gateAnimT + delta * 0.8);
      const t = this.gateAnimT;
      const eased = t * t * (3 - 2 * t);
      this.laserMeshes.forEach(mesh => {
        if (mesh.material) {
          mesh.material.opacity = 1 - eased;
          mesh.material.transparent = true;
        }
      });
      if (this.gateAnimT >= 1) {
        this.laserMeshes.forEach(mesh => { mesh.visible = false; });
      }
    }

    if (this._transitionCallback && this.gateOpen && !this._transitionTriggered && window.__game?.player) {
      const pPos = window.__game.player.camera.position;
      if (pPos.z < -10.5) {
        this._transitionTriggered = true;
        this._transitionCallback();
      }
    }

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += this.particleVelocities[i].vx * delta;
        positions[i * 3 + 1] += this.particleVelocities[i].vy * delta;
        positions[i * 3 + 2] += this.particleVelocities[i].vz * delta;

        if (positions[i * 3 + 1] > 3.0) {
          positions[i * 3] = (Math.random() - 0.5) * 16;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
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
    this.colliders = [];
    this.particles = null;
    this.particleVelocities = [];
    this.gateLasers = null;
    this.laserMeshes = [];
    this.gateOpen = false;
    this.gateAnimT = 0;
    this.pickupItems = [];
    this.terminalGroup = null;
    this.terminalScreens = [];
    this.puzzleSolved = false;
    this._transitionCallback = null;
    this._transitionTriggered = false;
  }
}
