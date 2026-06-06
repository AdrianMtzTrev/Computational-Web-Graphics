import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class BridgeRoom {
  constructor() {
    this.objects = [];
    this.lights = [];
    this.flickerLights = [];
    this.interactiveObjects = [];
    this.colliders = [];
    this.particles = null;
    this.particleVelocities = [];
    this._pickupItems = [];
    this._consoleGroup = null;
    this._consoleScreens = [];
    this._puzzleSolved = false;
    this._transitionCallback = null;
    this._transitionTriggered = false;

    this.sciFiLoader = new GLTFLoader();
    this.moltenLoader = new GLTFLoader();
    this.moltenLoader.setPath('assets/models/molten-maps/');
    this.stationLoader = new GLTFLoader();
    this.stationLoader.setPath('assets/kenney_space-station-kit/Models/GLB format/');
    this.audioLoader = new THREE.AudioLoader();
    this._ambientAudio = null;
    this._onPause = null;
    this._onResume = null;
  }

  _loadSciFi(name) {
    return new Promise(resolve => {
      this.sciFiLoader.load('assets/models/sci-fi-series-a/' + name, gltf => resolve(gltf.scene), undefined, () => resolve(null));
    });
  }

  _loadMolten(name) {
    return new Promise(resolve => {
      this.moltenLoader.load(name, gltf => resolve(gltf.scene), undefined, () => resolve(null));
    });
  }

  _loadStationModel(name) {
    return new Promise(resolve => {
      this.stationLoader.load(name, gltf => resolve(gltf.scene), undefined, () => resolve(null));
    });
  }

  async load(scene) {
    this.scene = scene;

    await this._buildMoltenRoom(scene);
    await this._buildSciFiWalls(scene);

    await this._buildWorkstations(scene);
    this._buildHoloTable(scene);
    this._buildConsole(scene);
    this._buildWallDecor(scene);
    this._buildPickupItems(scene);
    this._setupLights(scene);
    this._setupParticles(scene);
    this._setupAudio(scene);
    this._setupColliders();

    this._rebuildInteractiveObjects();
    if (window.__game?.player) {
      window.__game.player.setInteractiveObjects(this.interactiveObjects);
    }

    return this;
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

    const ft = sciFiFloor.status === 'fulfilled' ? sciFiFloor.value : null;
    if (ft) {
      for (let ix = -9; ix <= 9; ix += 2) {
        for (let iz = -9; iz <= 9; iz += 2) {
          cloneAt(ft, ix, iz);
        }
      }
      for (let ix = -9; ix <= 9; ix += 2) {
        for (let iz = -9; iz <= 9; iz += 2) {
          cloneAt(ft, ix, iz, 0, 4);
        }
      }
    }

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
    const [w0] = await Promise.allSettled([
      this._loadSciFi('Pack_SciFi_Series_A_Bundle/Pack_SciFi_A_001+_V2.0/Pack_SciFi_A_001_V2.0/02_EXPORT/OBJ/SM_Wall_V0.glb'),
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

    const w = w0.status === 'fulfilled' ? w0.value : null;

    const xs = [-9, -7, -5, -3, -1, 1, 3, 5, 7, 9];
    const windowPos = new Set([-5, -3, 3, 5]);

    // North wall — skip window positions
    xs.forEach(x => {
      if (windowPos.has(x)) return;
      if (w) { place(w, x, 10, Math.PI / 2, 1); place(w, x, 10, Math.PI / 2, 3); }
    });

    // South wall — skip door gap
    xs.forEach(x => {
      if (x === -1 || x === 1) return;
      if (w) { place(w, x, -10, -Math.PI / 2, 1); place(w, x, -10, -Math.PI / 2, 3); }
    });

    // West wall
    xs.forEach(z => { if (w) { place(w, -10, z, Math.PI, 1); place(w, -10, z, Math.PI, 3); } });

    // East wall
    xs.forEach(z => { if (w) { place(w, 10, z, 0, 1); place(w, 10, z, 0, 3); } });

    const starCanvas = document.createElement('canvas');
    starCanvas.width = 512;
    starCanvas.height = 256;
    const sctx = starCanvas.getContext('2d');
    sctx.fillStyle = '#00040a';
    sctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 300; i++) {
      const sx = Math.random() * 512;
      const sy = Math.random() * 256;
      const sr = Math.random() * 2 + 0.5;
      const bright = 100 + Math.floor(Math.random() * 155);
      sctx.fillStyle = `rgb(${bright},${bright},${bright + 30})`;
      sctx.beginPath();
      sctx.arc(sx, sy, sr, 0, Math.PI * 2);
      sctx.fill();
    }
    const starTex = new THREE.CanvasTexture(starCanvas);
    starTex.needsUpdate = true;

    [-5, -3, 3, 5].forEach(windowX => {
      const geo = new THREE.PlaneGeometry(2.2, 4.4);
      const mat = new THREE.MeshBasicMaterial({
        map: starTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(windowX, 2, 9.6);
      mesh.rotation.y = Math.PI;
      scene.add(mesh);
      this.objects.push(mesh);
    });
  }

  _buildWallDecor(scene) {
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: 0.5, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.6, roughness: 0.3 });
    const conduitMat = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.6, roughness: 0.3 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x3366aa, metalness: 0.4, roughness: 0.3 });
    const ledCyan = new THREE.MeshPhongMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.5 });
    const ledBlue = new THREE.MeshPhongMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.4 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

    const add = (g) => { scene.add(g); this.objects.push(g); };

    const wallPos = (wall, x, y) => {
      const g = new THREE.Group();
      switch (wall) {
        case 'n': g.position.set(x, y, 9.9); g.rotation.y = Math.PI; break;
        case 's': g.position.set(x, y, -9.9); g.rotation.y = 0; break;
        case 'w': g.position.set(-9.9, y, x); g.rotation.y = Math.PI / 2; break;
        case 'e': g.position.set(9.9, y, x); g.rotation.y = -Math.PI / 2; break;
      }
      return g;
    };

    const panel = (wall, x, y) => {
      const g = wallPos(wall, x, y);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.06), panelMat);
      body.position.z = 0.03; g.add(body);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.07), accentMat);
      stripe.position.set(-0.15, 0, 0.03); g.add(stripe);
      stripe.position.set(0.15, 0, 0.03); g.add(stripe.clone());
      const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.01), ledCyan);
      l1.position.set(-0.05, 0.15, 0.06); g.add(l1);
      const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.01), ledBlue);
      l2.position.set(0.05, 0.15, 0.06); g.add(l2);
      add(g);
    };

    const conduit = (wall, x, y) => {
      const g = wallPos(wall, x, y);
      const main = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.06), conduitMat);
      main.position.z = 0.03; g.add(main);
      for (let ox = -0.5; ox <= 0.5; ox += 0.5) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), conduitMat);
        block.position.set(ox, 0, 0.05); g.add(block);
      }
      add(g);
    };

    const statusPanel = (wall, x, y) => {
      const g = wallPos(wall, x, y);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.05), darkMat);
      body.position.z = 0.025; g.add(body);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.08), screenMat);
      scr.position.set(0, 0.02, 0.05); g.add(scr);
      [-1, 0, 1].forEach(i => {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.01), i === 0 ? ledCyan : ledBlue);
        led.position.set(i * 0.06, -0.05, 0.05); g.add(led);
      });
      add(g);
    };

    // North wall — z=10, skip window positions (-5,-3,3,5)
    panel('n', -9, 1.2);
    conduit('n', -7, 2.8);
    statusPanel('n', -1, 1.2);
    conduit('n', 1, 2.8);
    panel('n', 7, 1.2);
    statusPanel('n', 9, 2.8);

    // West wall — x=-10, z = -9,-7,-5,-3,-1,1,3,5,7,9
    panel('w', -9, 1.2);
    conduit('w', -7, 2.8);
    statusPanel('w', -5, 1.2);
    conduit('w', -3, 1.2);
    panel('w', -1, 2.8);
    statusPanel('w', 1, 1.2);
    conduit('w', 3, 2.8);
    panel('w', 5, 1.2);
    statusPanel('w', 7, 2.8);
    conduit('w', 9, 1.2);

    // East wall — x=10, z = -9,-7,-5,-3,-1,1,3,5,7,9
    statusPanel('e', -9, 2.8);
    conduit('e', -7, 1.2);
    panel('e', -5, 1.2);
    statusPanel('e', -3, 2.8);
    conduit('e', -1, 1.2);
    panel('e', 1, 2.8);
    statusPanel('e', 3, 1.2);
    conduit('e', 5, 2.8);
    panel('e', 7, 1.2);
    conduit('e', 9, 1.2);

    // South wall — z=-10, skip door gap (-1,1)
    conduit('s', -9, 1.2);
    statusPanel('s', -7, 2.8);
    panel('s', -5, 1.2);
    conduit('s', -3, 2.8);
    statusPanel('s', 3, 1.2);
    panel('s', 5, 2.8);
    conduit('s', 7, 1.2);
    statusPanel('s', 9, 2.8);
  }

  _buildHoloTable(scene) {
    const group = new THREE.Group();
    group.position.set(0, 0, 0);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.6, roughness: 0.2 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.2, 16), baseMat);
    base.position.y = 0.1;
    base.castShadow = true;
    group.add(base);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), baseMat);
    stem.position.y = 0.5;
    group.add(stem);

    const holoMat = new THREE.MeshPhongMaterial({
      color: 0x00ccff,
      emissive: 0x0066ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      wireframe: false,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), holoMat);
    sphere.position.y = 1.0;
    group.add(sphere);
    this._holoSphere = sphere;

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.55, 32), ringMat);
    ring1.position.y = 1.0;
    ring1.rotation.x = Math.PI / 2;
    group.add(ring1);
    this._holoRing1 = ring1;

    const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.65, 32), ringMat);
    ring2.position.y = 1.0;
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.z = Math.PI / 4;
    group.add(ring2);
    this._holoRing2 = ring2;

    const glow = new THREE.PointLight(0x0066ff, 1.5, 6);
    glow.position.set(0, 1.0, 0);
    scene.add(glow);
    this.lights.push(glow);

    scene.add(group);
    this.objects.push(group);
  }

  async _buildWorkstations(scene) {
    const [computer, chair] = await Promise.allSettled([
      this._loadStationModel('computer-wide.glb'),
      this._loadStationModel('chair-armrest-headrest.glb'),
    ]);

    const setup = (obj) => {
      obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    };

    const place = (model, x, z, ry) => {
      if (!model) return;
      const c = model.clone();
      c.scale.set(2.5, 2.5, 2.5);
      c.position.set(x, 0, z);
      c.rotation.y = ry;
      setup(c);
      scene.add(c);
      this.objects.push(c);
    };

    const pc = computer.status === 'fulfilled' ? computer.value : null;
    const ch = chair.status === 'fulfilled' ? chair.value : null;

    const positions = [
      { x: -5, z: -5, ry: 0 },
      { x: 5, z: -5, ry: Math.PI },
      { x: -5, z: 5, ry: 0 },
      { x: 5, z: 5, ry: Math.PI },
    ];

    positions.forEach(p => {
      const chairX = p.x + 1.2;
      const chairZ = p.z + 0.3;
      const offset = 1.6;
      if (pc) {
        const compZ = p.ry === 0 ? chairZ + offset : chairZ - offset;
        place(pc, chairX, compZ, p.ry === 0 ? Math.PI : 0);
      }
      if (ch) {
        place(ch, chairX, chairZ, p.ry);
      }
    });
  }

  _buildConsole(scene) {
    const group = new THREE.Group();
    group.position.set(0, 0.75, -4);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.5, roughness: 0.3 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.5), bodyMat);
    base.position.y = 0.07;
    base.castShadow = true;
    group.add(base);

    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.05), bodyMat);
    stem.position.set(0, 0.25, 0);
    group.add(stem);

    const screenMat = new THREE.MeshPhongMaterial({
      color: 0x00ccff,
      emissive: 0x00ccff,
      emissiveIntensity: 0.2,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), screenMat);
    screen.position.set(0, 0.5, -0.26);
    group.add(screen);
    this._consoleScreens.push(screen);

    const label = this._makeConsoleLabel('NAVEGACION', 0x00ccff);
    label.position.set(0, 0.42, -0.27);
    group.add(label);
    this._consoleScreens.push(label);

    group.userData.interact = () => this._onConsoleInteract();
    this._consoleGroup = group;

    scene.add(group);
    this.objects.push(group);
  }

  _makeConsoleLabel(text, color) {
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
      new THREE.PlaneGeometry(0.55, 0.12),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
  }

  _onConsoleInteract() {
    const player = window.__game?.player;
    const hud = window.__game?.hud;
    if (!player || !hud) return;

    if (this._puzzleSolved) {
      hud.showMessage('✅ COORDENADAS PROGRAMADAS — PREPARANDO SALTO', 2000);
      return;
    }

    const required = ['nav_alpha', 'nav_beta', 'nav_gamma'];
    window.__game?.sfx?.terminalBeep();
    const missing = required.filter(id => !player.hasItem(id));

    if (missing.length === 0) {
      required.forEach(id => player.removeItem(id));
      this._puzzleSolved = true;
      hud.showMessage('✅ COORDENADAS LISTAS — ESCAPE INICIADO', 4000);
      window.__game?.sfx?.success();
      window.__game?.save();
      this._consoleScreens.forEach(s => {
        if (s.material) s.material.color.setHex(0x00ff88);
        if (s.material && s.material.emissive) s.material.emissive.setHex(0x00ff88);
      });
    } else {
      const names = missing.map(id => {
        if (id === 'nav_alpha') return 'ALFA';
        if (id === 'nav_beta') return 'BETA';
        return 'GAMMA';
      }).join(', ');
      hud.showMessage('❌ FALTAN DATOS: ' + names, 3000);
    }
  }

  _buildPickupItems(scene) {
    const itemDefs = [
      { id: 'nav_alpha', name: 'Datos ALFA', icon: '📡', color: 0x00ccff, pos: [3.5, 0.85, -3.0], hint: '📡 Datos ALFA obtenidos' },
      { id: 'nav_beta', name: 'Datos BETA', icon: '📡', color: 0x4488ff, pos: [-2.5, 0.85, 2.5], hint: '📡 Datos BETA obtenidos' },
      { id: 'nav_gamma', name: 'Datos GAMMA', icon: '📡', color: 0x8844ff, pos: [4.0, 0.85, 3.5], hint: '📡 Datos GAMMA obtenidos' },
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

    player.addItem({ id: entry.data.id, name: entry.data.name, icon: entry.data.icon });
    hud.showMessage(entry.data.hint, 2500);
    window.__game?.sfx?.pickup();

    this.scene.remove(entry.group);
    const idx = this.objects.indexOf(entry.group);
    if (idx !== -1) this.objects.splice(idx, 1);

    this._rebuildInteractiveObjects();
    if (window.__game?.player) {
      window.__game.player.setInteractiveObjects(this.interactiveObjects);
    }
    window.__game?.save();
  }

  _setupLights(scene) {
    const ambient = new THREE.AmbientLight(0x3366cc, 1.5);
    scene.add(ambient);
    this.lights.push(ambient);

    const positions = [[-6, 4.0, -6], [6, 4.0, -6], [-6, 4.0, 6], [6, 4.0, 6]];
    positions.forEach(p => {
      const light = new THREE.PointLight(0x6699ff, 2.0, 20);
      light.position.set(p[0], p[1], p[2]);
      scene.add(light);
      this.lights.push(light);
    });

    // Warm accent near holo table
    const warm = new THREE.PointLight(0xff8844, 1.0, 8);
    warm.position.set(0, 1.5, 0);
    scene.add(warm);
    this.lights.push(warm);
  }

  _setupParticles(scene) {
    const count = 400;
    const positions = new Float32Array(count * 3);
    this.particleVelocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = Math.random() * 3.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      this.particleVelocities.push({
        vx: (Math.random() - 0.5) * 0.03,
        vy: Math.random() * 0.08 + 0.02,
        vz: (Math.random() - 0.5) * 0.03,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x44aaff,
      size: 0.05,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geo, mat);
    this.particles.position.set(0, 0, 0);
    scene.add(this.particles);
    this.objects.push(this.particles);

    // Data stream particles — flow from holo table outward
    const dataCount = 150;
    const dataPos = new Float32Array(dataCount * 3);
    this._dataVelocities = [];
    for (let i = 0; i < dataCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 1.5;
      dataPos[i * 3] = Math.cos(angle) * dist;
      dataPos[i * 3 + 1] = Math.random() * 2.0 + 0.5;
      dataPos[i * 3 + 2] = Math.sin(angle) * dist;
      this._dataVelocities.push({
        vx: Math.cos(angle) * (0.2 + Math.random() * 0.3),
        vy: Math.random() * 0.15 + 0.05,
        vz: Math.sin(angle) * (0.2 + Math.random() * 0.3),
      });
    }
    const dataGeo = new THREE.BufferGeometry();
    dataGeo.setAttribute('position', new THREE.BufferAttribute(dataPos, 3));
    const dataMat = new THREE.PointsMaterial({
      color: 0x00ffcc,
      size: 0.025,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this._dataParticles = new THREE.Points(dataGeo, dataMat);
    this._dataParticles.position.set(0, 0, 0);
    scene.add(this._dataParticles);
    this.objects.push(this._dataParticles);
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
    this.audioLoader.load('assets/sound/bridge_ambient.wav', buffer => {
      this._ambientAudio.setBuffer(buffer);
      this._ambientAudio.setLoop(true);
      this._ambientAudio.setVolume(window.__game?._volume ?? 0.5);
      this._ambientAudio.play();
    }, undefined, err => {
      console.warn('Failed to load bridge ambient audio:', err);
    });

    this._onPause = () => { if (this._ambientAudio) this._ambientAudio.pause(); };
    this._onResume = () => { if (this._ambientAudio) this._ambientAudio.play(); };
    window.addEventListener('game-pause', this._onPause);
    window.addEventListener('game-resume', this._onResume);
  }

  _setupColliders() {
    this.colliders = [
      // West wall
      new THREE.Box3(new THREE.Vector3(-10.2, 0, -10), new THREE.Vector3(-9.8, 4, 10)),
      // East wall
      new THREE.Box3(new THREE.Vector3(9.8, 0, -10), new THREE.Vector3(10.2, 4, 10)),
      // North wall — solid sections + window glass
      new THREE.Box3(new THREE.Vector3(-10, 0, 9.8), new THREE.Vector3(-6, 4, 10.2)),
      new THREE.Box3(new THREE.Vector3(-6, 0, 9.8), new THREE.Vector3(-2, 4, 10.2)),
      new THREE.Box3(new THREE.Vector3(-2, 0, 9.8), new THREE.Vector3(2, 4, 10.2)),
      new THREE.Box3(new THREE.Vector3(2, 0, 9.8), new THREE.Vector3(6, 4, 10.2)),
      new THREE.Box3(new THREE.Vector3(6, 0, 9.8), new THREE.Vector3(10, 4, 10.2)),
      // South wall — gap for door 4m (x=-2 to x=2)
      new THREE.Box3(new THREE.Vector3(-10, 0, -10.2), new THREE.Vector3(-2, 4, -9.8)),
      new THREE.Box3(new THREE.Vector3(2, 0, -10.2), new THREE.Vector3(10, 4, -9.8)),
      // Holo table base
      new THREE.Box3(new THREE.Vector3(-0.8, 0, -0.8), new THREE.Vector3(0.8, 1.2, 0.8)),
      // Workstations
      new THREE.Box3(new THREE.Vector3(-4.2, 0, -5.0), new THREE.Vector3(-3.4, 0.8, -3.8)),
      new THREE.Box3(new THREE.Vector3(5.8, 0, -5.6), new THREE.Vector3(6.6, 0.8, -4.4)),
      new THREE.Box3(new THREE.Vector3(-4.2, 0, 5.0), new THREE.Vector3(-3.4, 0.8, 6.2)),
      new THREE.Box3(new THREE.Vector3(5.8, 0, 4.4), new THREE.Vector3(6.6, 0.8, 5.6)),
      // Navigation console
      new THREE.Box3(new THREE.Vector3(-0.5, 0, -4.6), new THREE.Vector3(0.5, 0.7, -3.4)),
    ];
  }

  getColliders() {
    return this.colliders;
  }

  setTransitionCallback(cb) {
    this._transitionCallback = cb;
  }

  update(delta, time) {
    this._pickupItems.forEach(entry => {
      if (entry.collected) return;
      const t = time + entry.floatOffset;
      entry.group.position.y = entry.data.pos[1] + Math.sin(t * 3) * 0.03;
      entry.group.rotation.y += delta * 1.5;
    });

    if (this._holoSphere) {
      this._holoSphere.material.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.2;
      this._holoSphere.scale.setScalar(1 + Math.sin(time * 1.5) * 0.03);
    }
    if (this._holoRing1) {
      this._holoRing1.rotation.z += delta * 0.8;
    }
    if (this._holoRing2) {
      this._holoRing2.rotation.y += delta * 0.5;
      this._holoRing2.rotation.x = Math.PI / 3 + Math.sin(time * 0.5) * 0.2;
    }

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += this.particleVelocities[i].vx * delta;
        positions[i * 3 + 1] += this.particleVelocities[i].vy * delta;
        positions[i * 3 + 2] += this.particleVelocities[i].vz * delta;

        if (positions[i * 3 + 1] > 3.5) {
          positions[i * 3] = (Math.random() - 0.5) * 16;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    if (this._dataParticles) {
      const dPos = this._dataParticles.geometry.attributes.position.array;
      for (let i = 0; i < 150; i++) {
        dPos[i * 3] += this._dataVelocities[i].vx * delta;
        dPos[i * 3 + 1] += this._dataVelocities[i].vy * delta;
        dPos[i * 3 + 2] += this._dataVelocities[i].vz * delta;
        const dx = dPos[i * 3], dz = dPos[i * 3 + 2];
        if (dPos[i * 3 + 1] > 2.5 || Math.sqrt(dx * dx + dz * dz) > 2.0) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 1.0;
          dPos[i * 3] = Math.cos(angle) * dist;
          dPos[i * 3 + 1] = 0.5;
          dPos[i * 3 + 2] = Math.sin(angle) * dist;
          this._dataVelocities[i].vx = Math.cos(angle) * (0.2 + Math.random() * 0.3);
          this._dataVelocities[i].vy = Math.random() * 0.15 + 0.05;
          this._dataVelocities[i].vz = Math.sin(angle) * (0.2 + Math.random() * 0.3);
        }
      }
      this._dataParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this._transitionCallback && this._puzzleSolved && !this._transitionTriggered && window.__game?.player) {
      const pPos = window.__game.player.camera.position;
      if (pPos.z > 9.0) {
        this._transitionTriggered = true;
        this._transitionCallback();
      }
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
    this._pickupItems = [];
    this._consoleGroup = null;
    this._consoleScreens = [];
    this._puzzleSolved = false;
    this._dataParticles = null;
    this._dataVelocities = [];
    this._holoSphere = null;
    this._holoRing1 = null;
    this._holoRing2 = null;
    if (this._onPause) window.removeEventListener('game-pause', this._onPause);
    if (this._onResume) window.removeEventListener('game-resume', this._onResume);
    if (this._ambientAudio) {
      this._ambientAudio.stop();
      this._ambientAudio = null;
    }
  }

  _rebuildInteractiveObjects() {
    const arr = [];
    if (this._consoleGroup) {
      this._consoleGroup.traverse(c => { if (c.isMesh) arr.push(c); });
    }
    this._pickupItems.forEach(entry => {
      if (!entry.collected) {
        entry.group.traverse(c => { if (c.isMesh) arr.push(c); });
      }
    });
    this.interactiveObjects = arr;
  }
}
