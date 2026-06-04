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

    const gateDoor = roomModels[2];
    gateDoor.position.set(0, -0.5, -3.5);
    gateDoor.rotation.y = Math.PI / 2;
    gateDoor.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(gateDoor);
    this.objects.push(gateDoor);

    const corridor = roomModels[3];
    corridor.position.set(0, -0.5, -5.5);
    corridor.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(corridor);
    this.objects.push(corridor);

    this._buildReactor(scene);
    this._buildConsoles(scene);
    this._buildPipes(scene);
    this._setupLights(scene);
    this._setupParticles(scene);
    this._setupWalls(scene);

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
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
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

    const reactorLight = new THREE.PointLight(0xff4400, 1.5, 10);
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
    const screenMat = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.3,
    });

    const positions = [
      { x: 3.0, z: 2.0, rot: -Math.PI / 4 },
      { x: -2.8, z: -2.0, rot: Math.PI / 3 },
    ];

    positions.forEach(pos => {
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = pos.rot;

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), consoleMat);
      body.position.y = 0.25;
      body.castShadow = true;
      group.add(body);

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.25), screenMat);
      screen.position.set(0, 0.55, -0.21);
      group.add(screen);

      const screen2 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.25), screenMat);
      screen2.position.set(0, 0.55, 0.21);
      screen2.rotation.y = Math.PI;
      group.add(screen2);

      scene.add(group);
      this.objects.push(group);
    });
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
    const ambient = new THREE.AmbientLight(0x111122, 0.5);
    scene.add(ambient);
    this.lights.push(ambient);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const r = 3.0;
      const emLight = new THREE.PointLight(0xff0000, 0.4, 6);
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

    const dimCeiling = new THREE.PointLight(0xffff88, 0.15, 8);
    dimCeiling.position.set(0, 2.2, 0);
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

  _setupWalls(scene) {
    this._addCollider(0, 1.4, -3.2, 6.4, 2.8, 0.2);
    this._addCollider(0, 1.4, 3.2, 6.4, 2.8, 0.2);
    this._addCollider(-3.2, 1.4, 0, 0.2, 2.8, 6.4);
    this._addCollider(3.2, 1.4, 0, 0.2, 2.8, 6.4);
  }

  _addCollider(x, y, z, sx, sy, sz) {
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.objects.push(mesh);
  }

  update(delta, time) {
    this.flickerLights.forEach(f => {
      const flicker = Math.sin(time * f.speed + f.light.id) * f.amplitude;
      const noise = (Math.random() - 0.5) * 0.15;
      f.light.intensity = Math.max(0, f.baseIntensity + flicker + noise);
    });

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
  }
}
