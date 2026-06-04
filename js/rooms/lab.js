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

    this.modularLoader = new GLTFLoader();
    this.modularLoader.setPath('assets/models/modular-space-kit/');
    this.modularLoader.setResourcePath('assets/models/modular-space-kit/Textures/');

    this.stationLoader = new GLTFLoader();
    this.stationLoader.setPath('assets/kenney_space-station-kit/Models/GLB format/');
    this.stationLoader.setResourcePath('assets/kenney_space-station-kit/Models/GLB format/Textures/');

    this.labLoader = new GLTFLoader();
    this.labLoader.setPath('assets/models/lab-kit/GLB/All/');
  }

  async load(scene) {
    this.scene = scene;

    const critical = await Promise.all([
      this._loadModular('room-small.glb'),
      this._loadModular('gate-lasers.glb'),
    ]);

    const roomShell = critical[0];
    roomShell.position.set(0, -0.5, 0);
    roomShell.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(roomShell);
    this.objects.push(roomShell);

    this.gateLasers = critical[1];
    this.gateLasers.position.set(0, -0.5, -2.6);
    this.gateLasers.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(this.gateLasers);
    this.objects.push(this.gateLasers);

    this.gateLasers.traverse(c => {
      if (c.isMesh) {
        const mat = c.material;
        if (mat) {
          const hasEmissive = mat.emissive && mat.emissive.getHex() !== 0x000000;
          const isBright = mat.color && (mat.color.getHex() === 0xff0000 || mat.color.getHex() === 0x00ff00 || mat.color.getHex() === 0x00ffff);
          if (hasEmissive || isBright) {
            this.laserMeshes.push(c);
          }
        }
      }
    });

    this._loadDecorModels(scene);
    this._buildFurniture(scene);
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

  _loadLabModel(name) {
    return new Promise(resolve => {
      this.labLoader.load(name, gltf => resolve(gltf.scene), undefined, () => resolve(null));
    });
  }

  async _loadDecorModels(scene) {
    const deco = await Promise.allSettled([
      this._loadStationModel('table.glb'),
      this._loadStationModel('chair.glb'),
      this._loadStationModel('computer-screen.glb'),
      this._loadStationModel('pipe.glb'),
      this._loadStationModel('wall-banner.glb'),
      this._loadLabModel('counter_counter.glb'),
      this._loadLabModel('counter_counter_sink.glb'),
      this._loadLabModel('machine_microscope.glb'),
      this._loadLabModel('machine_centrifuge.glb'),
      this._loadLabModel('machine_electronic_scale.glb'),
      this._loadLabModel('bottle_glassware_erlenmeyer_flask_medium.glb'),
      this._loadLabModel('bottle_glassware_beaker_small.glb'),
      this._loadLabModel('bottle_test_tube_rack.glb'),
      this._loadLabModel('ppe_safety_glasses.glb'),
      this._loadLabModel('syringe_syringe.glb'),
    ]);

    const results = deco.map(r => r.status === 'fulfilled' ? r.value : null);

    const table = results[0];
    if (table) {
      table.position.set(0, 0, 1.0);
      scene.add(table);
      this.objects.push(table);
    } else {
      this._buildFallbackTable(scene);
    }

    const chair = results[1];
    if (chair) {
      chair.position.set(-0.8, 0, 1.2);
      chair.rotation.y = 0.3;
      scene.add(chair);
      this.objects.push(chair);
    }

    const computer = results[2];
    if (computer) {
      computer.position.set(0, 0.8, 0.8);
      computer.rotation.y = 0.5;
      scene.add(computer);
      this.objects.push(computer);
    }

    const pipe = results[3];
    if (pipe) {
      const p1 = pipe.clone();
      p1.position.set(-1.5, 2.0, -1.0);
      p1.scale.set(1.5, 1.5, 1.5);
      p1.rotation.z = Math.PI / 2;
      scene.add(p1);
      this.objects.push(p1);

      const p2 = pipe.clone();
      p2.position.set(1.5, 2.0, 1.0);
      p2.scale.set(1.5, 1.5, 1.5);
      p2.rotation.z = Math.PI / 2;
      scene.add(p2);
      this.objects.push(p2);
    }

    const banner = results[4];
    if (banner) {
      banner.position.set(0, 1.2, 2.5);
      scene.add(banner);
      this.objects.push(banner);
    }

    const counterLeft = results[5];
    if (counterLeft) {
      counterLeft.position.set(-1.9, 0, 1.2);
      counterLeft.scale.set(0.8, 0.8, 0.8);
      scene.add(counterLeft);
      this.objects.push(counterLeft);
    }

    const counterRight = results[6];
    if (counterRight) {
      counterRight.position.set(1.9, 0, -1.2);
      counterRight.scale.set(0.8, 0.8, 0.8);
      counterRight.rotation.y = Math.PI;
      scene.add(counterRight);
      this.objects.push(counterRight);
    }

    const microscope = results[7];
    if (microscope) {
      microscope.position.set(1.5, 0.8, -0.8);
      microscope.scale.set(0.4, 0.4, 0.4);
      scene.add(microscope);
      this.objects.push(microscope);
    }

    const centrifuge = results[8];
    if (centrifuge) {
      centrifuge.position.set(2.2, 0.8, -1.5);
      centrifuge.scale.set(0.4, 0.4, 0.4);
      scene.add(centrifuge);
      this.objects.push(centrifuge);
    }

    const scale = results[9];
    if (scale) {
      scale.position.set(1.5, 0.8, -0.1);
      scale.scale.set(0.4, 0.4, 0.4);
      scene.add(scale);
      this.objects.push(scale);
    }

    const flask = results[10];
    if (flask) {
      flask.position.set(-1.5, 0.8, 1.8);
      flask.scale.set(0.5, 0.5, 0.5);
      scene.add(flask);
      this.objects.push(flask);
    }

    const beaker = results[11];
    if (beaker) {
      beaker.position.set(-1.8, 0.8, 1.5);
      beaker.scale.set(0.5, 0.5, 0.5);
      scene.add(beaker);
      this.objects.push(beaker);
    }

    const rack = results[12];
    if (rack) {
      rack.position.set(-2.2, 0.8, 1.0);
      rack.scale.set(0.5, 0.5, 0.5);
      scene.add(rack);
      this.objects.push(rack);
    }

    const glasses = results[13];
    if (glasses) {
      glasses.position.set(1.8, 0.8, -0.5);
      glasses.scale.set(0.5, 0.5, 0.5);
      scene.add(glasses);
      this.objects.push(glasses);
    }

    const syringe = results[14];
    if (syringe) {
      syringe.position.set(-1.2, 0.8, 2.0);
      syringe.scale.set(0.4, 0.4, 0.4);
      scene.add(syringe);
      this.objects.push(syringe);
    }
  }

  _buildFallbackTable(scene) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.4, roughness: 0.6 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.0), mat);
    top.position.set(0, 0.75, 1.0);
    top.castShadow = true;
    top.receiveShadow = true;
    scene.add(top);
    this.objects.push(top);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.6, roughness: 0.4 });
    const positions = [[-0.7, 0, 0.65], [0.7, 0, 0.65], [-0.7, 0, 1.35], [0.7, 0, 1.35]];
    positions.forEach(p => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), legMat);
      leg.position.set(p[0], 0.35, p[2]);
      scene.add(leg);
      this.objects.push(leg);
    });
  }

  _buildFallbackCounter(scene, x, z) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x444466, metalness: 0.3, roughness: 0.7 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 2.4), mat);
    counter.position.set(x, 0.5, z);
    counter.castShadow = true;
    counter.receiveShadow = true;
    scene.add(counter);
    this.objects.push(counter);
  }

  _buildFurniture(scene) {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8, metalness: 0.1 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 5.0), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.48, 0);
    floor.receiveShadow = true;
    scene.add(floor);
    this.objects.push(floor);
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
    const ambient = new THREE.AmbientLight(0x111133, 0.4);
    scene.add(ambient);
    this.lights.push(ambient);

    const positions = [[-2.0, 1.8, -2.0], [2.0, 1.8, -2.0], [-2.0, 1.8, 2.0], [2.0, 1.8, 2.0]];
    positions.forEach(p => {
      const light = new THREE.PointLight(0x4488ff, 0.3, 12);
      light.position.set(p[0], p[1], p[2]);
      scene.add(light);
      this.flickerLights.push({ light, baseIntensity: 0.3, speed: 2 + Math.random() * 2, amplitude: 0.2 });
      this.lights.push(light);
    });

    const ceiling = new THREE.PointLight(0x88ccff, 0.12, 15);
    ceiling.position.set(0, 2.2, 0);
    scene.add(ceiling);
    this.flickerLights.push({ light: ceiling, baseIntensity: 0.12, speed: 1.5, amplitude: 0.1 });
    this.lights.push(ceiling);
  }

  _setupParticles(scene) {
    const count = 200;
    const positions = new Float32Array(count * 3);
    this.particleVelocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = Math.random() * 2.0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
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
      opacity: 0.15,
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
      new THREE.Box3(new THREE.Vector3(-2.6, 0, -2.6), new THREE.Vector3(-2.3, 3.0, 2.6)),
      new THREE.Box3(new THREE.Vector3(2.3, 0, -2.6), new THREE.Vector3(2.6, 3.0, 2.6)),
      new THREE.Box3(new THREE.Vector3(-2.6, 0, 2.3), new THREE.Vector3(2.6, 3.0, 2.6)),
      new THREE.Box3(new THREE.Vector3(-2.6, 0, -2.6), new THREE.Vector3(-0.8, 3.0, -2.3)),
      new THREE.Box3(new THREE.Vector3(0.8, 0, -2.6), new THREE.Vector3(2.6, 3.0, -2.3)),

      new THREE.Box3(new THREE.Vector3(-2.4, 0, 0.0), new THREE.Vector3(-1.3, 1.0, 2.4)),
      new THREE.Box3(new THREE.Vector3(1.3, 0, -2.4), new THREE.Vector3(2.4, 1.0, 0.0)),
      new THREE.Box3(new THREE.Vector3(-0.8, 0, 0.0), new THREE.Vector3(0.8, 0.8, 1.4)),
      new THREE.Box3(new THREE.Vector3(-2.4, 0, -2.4), new THREE.Vector3(-1.5, 1.8, -1.2)),
    ];
  }

  getColliders() {
    return this.colliders;
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

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += this.particleVelocities[i].vx * delta;
        positions[i * 3 + 1] += this.particleVelocities[i].vy * delta;
        positions[i * 3 + 2] += this.particleVelocities[i].vz * delta;

        if (positions[i * 3 + 1] > 2.0) {
          positions[i * 3] = (Math.random() - 0.5) * 4;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
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
  }
}
