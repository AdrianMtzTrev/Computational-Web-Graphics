/**
 * VOID STATION — game.js
 * Three.js scene: spaceship corridor, monster, lighting, PointerLockControls
 *
 * Uses Three.js r128 loaded from CDN (global THREE).
 * PointerLockControls is NOT included in the r128 CDN bundle, so we implement
 * a minimal version inline.
 */

'use strict';

const GameScene = (function () {

  // ── State ──────────────────────────────────
  let renderer, scene, camera;
  let animFrameId   = null;
  let isPaused      = false;
  let initialized   = false;
  let clock;

  // Movement
  const keys = { w: false, a: false, s: false, d: false };
  const MOVE_SPEED   = 5;     // units/sec
  const PLAYER_HEIGHT = 1.7;

  // Pointer-lock mouse look
  let yaw   = 0;  // radians  (left/right)
  let pitch = 0;  // radians  (up/down)
  const PITCH_LIMIT = Math.PI / 2 - 0.05;

  // Monster patrol
  let monster;
  const WAYPOINTS = [
    new THREE.Vector3( 0, 0,  12),
    new THREE.Vector3( 0, 0, -12),
  ];
  let monsterTarget = 0;
  const MONSTER_SPEED = 2.5;

  // Corridor dimensions
  const CORRIDOR_W = 6;
  const CORRIDOR_H = 4;
  const CORRIDOR_L = 60;

  // Emergency lights
  const emergencyLights = [];

  // ── init ───────────────────────────────────
  function init() {
    if (initialized) return;
    initialized = true;

    const canvas = document.getElementById('game-canvas');

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.045);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, PLAYER_HEIGHT, 0);

    // Clock
    clock = new THREE.Clock();

    // Build world
    buildCorridor();
    buildLights();
    buildMonster();
    buildDecorations();

    // Events
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);

    // Start loop
    isPaused = false;
    loop();
  }

  // ── Corridor geometry ──────────────────────
  function buildCorridor() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      roughness: 0.9,
      metalness: 0.3,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f0f18,
      roughness: 0.8,
      metalness: 0.5,
    });
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x111120,
      roughness: 0.95,
      metalness: 0.2,
    });

    // Floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_W, 0.2, CORRIDOR_L),
      floorMat
    );
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_W, 0.2, CORRIDOR_L),
      ceilMat
    );
    ceil.position.y = CORRIDOR_H + 0.1;
    ceil.receiveShadow = true;
    scene.add(ceil);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, CORRIDOR_H, CORRIDOR_L),
      wallMat
    );
    leftWall.position.set(-CORRIDOR_W / 2 - 0.1, CORRIDOR_H / 2, 0);
    leftWall.castShadow = leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, CORRIDOR_H, CORRIDOR_L),
      wallMat
    );
    rightWall.position.set(CORRIDOR_W / 2 + 0.1, CORRIDOR_H / 2, 0);
    rightWall.castShadow = rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Back wall (far end)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_W, CORRIDOR_H, 0.2),
      wallMat
    );
    backWall.position.set(0, CORRIDOR_H / 2, -CORRIDOR_L / 2 - 0.1);
    backWall.castShadow = backWall.receiveShadow = true;
    scene.add(backWall);

    // Front wall (behind player start)
    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_W, CORRIDOR_H, 0.2),
      wallMat
    );
    frontWall.position.set(0, CORRIDOR_H / 2, CORRIDOR_L / 2 + 0.1);
    frontWall.castShadow = frontWall.receiveShadow = true;
    scene.add(frontWall);
  }

  // ── Lighting ───────────────────────────────
  function buildLights() {
    // Very dim ambient (cold blue-black)
    const ambient = new THREE.AmbientLight(0x05050f, 0.8);
    scene.add(ambient);

    // Emergency red lights — placed along the corridor
    const lightPositions = [
      new THREE.Vector3( 2, CORRIDOR_H - 0.3, -20),
      new THREE.Vector3(-2, CORRIDOR_H - 0.3,  -5),
      new THREE.Vector3( 2, CORRIDOR_H - 0.3,  10),
      new THREE.Vector3(-2, CORRIDOR_H - 0.3,  25),
    ];

    lightPositions.forEach(pos => {
      const light = new THREE.PointLight(0xff2200, 3, 12, 2);
      light.position.copy(pos);
      light.castShadow = true;
      light.shadow.mapSize.set(256, 256);
      scene.add(light);

      // Visual bulb mesh
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xff3300,
          emissive: 0xff2200,
          emissiveIntensity: 3,
        })
      );
      bulb.position.copy(pos);
      scene.add(bulb);

      emergencyLights.push({ light, bulb, baseIntensity: 3, phase: Math.random() * Math.PI * 2 });
    });

    // A faint cold blue spot near the player start
    const startLight = new THREE.PointLight(0x0044aa, 1.5, 8, 2);
    startLight.position.set(0, CORRIDOR_H - 0.5, 0);
    scene.add(startLight);
  }

  // ── Monster ────────────────────────────────
  function buildMonster() {
    monster = new THREE.Group();

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x050508,
      roughness: 0.7,
      metalness: 0.1,
    });

    // Body (torso)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.1, 0.5),
      darkMat
    );
    body.position.y = 0.95;
    body.castShadow = true;
    monster.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 8),
      darkMat
    );
    head.position.y = 1.85;
    head.castShadow = true;
    monster.add(head);

    // Legs
    [-0.2, 0.2].forEach(x => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.9, 0.22),
        darkMat
      );
      leg.position.set(x, 0.45, 0);
      leg.castShadow = true;
      monster.add(leg);
    });

    // Arms
    [-0.55, 0.55].forEach(x => {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.85, 0.2),
        darkMat
      );
      arm.position.set(x, 1.1, 0);
      arm.castShadow = true;
      monster.add(arm);
    });

    // Eyes (red glowing point lights + emissive spheres)
    [-0.12, 0.12].forEach(x => {
      const eyeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 5 })
      );
      eyeMesh.position.set(x, 1.88, 0.3);
      monster.add(eyeMesh);

      const eyeLight = new THREE.PointLight(0xff0000, 1.5, 2.5, 2);
      eyeLight.position.set(x, 1.88, 0.3);
      monster.add(eyeLight);
    });

    monster.position.set(0, 0, -18);
    scene.add(monster);
  }

  // ── Corridor decorations ───────────────────
  function buildDecorations() {
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 0.6, metalness: 0.8 });
    const warnMat = new THREE.MeshStandardMaterial({ color: 0x332200, roughness: 0.9 });

    // Pipes along ceiling
    for (let z = -25; z <= 25; z += 10) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, CORRIDOR_W - 0.6, 8),
        pipeMat
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, CORRIDOR_H - 0.25, z);
      scene.add(pipe);
    }

    // Floor warning stripes (simple boxes)
    for (let z = -24; z <= 24; z += 6) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(CORRIDOR_W - 0.4, 0.01, 0.3),
        warnMat
      );
      stripe.position.set(0, 0.01, z);
      scene.add(stripe);
    }

    // Crates / obstacles
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x1c1c28, roughness: 0.8, metalness: 0.4 });
    const cratePositions = [
      {x:  2, z: -8 }, {x: -2.2, z: -15}, {x:  2.1, z:  5},
      {x: -1.8, z: 18}, {x:  1.5, z: -22}, {x: -2,   z: 22},
    ];
    cratePositions.forEach(({ x, z }) => {
      const h = 0.6 + Math.random() * 0.4;
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, h, 0.8),
        crateMat
      );
      crate.position.set(x, h / 2, z);
      crate.castShadow = crate.receiveShadow = true;
      scene.add(crate);
    });
  }

  // ── Animation loop ─────────────────────────
  function loop() {
    if (isPaused) return;
    animFrameId = requestAnimationFrame(loop);

    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    updateMovement(dt);
    updateEmergencyLights(elapsed);
    updateMonster(dt);

    renderer.render(scene, camera);
  }

  // ── Player movement ────────────────────────
  function updateMovement(dt) {
    if (!document.pointerLockElement) return;

    // Apply yaw and pitch to camera
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    // Move relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right   = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));

    if (keys.w) camera.position.addScaledVector(forward,  MOVE_SPEED * dt);
    if (keys.s) camera.position.addScaledVector(forward, -MOVE_SPEED * dt);
    if (keys.a) camera.position.addScaledVector(right,   -MOVE_SPEED * dt);
    if (keys.d) camera.position.addScaledVector(right,    MOVE_SPEED * dt);

    // Keep player inside corridor
    const hw = CORRIDOR_W / 2 - 0.4;
    const hl = CORRIDOR_L / 2 - 0.5;
    camera.position.x = Math.max(-hw, Math.min(hw, camera.position.x));
    camera.position.z = Math.max(-hl, Math.min(hl, camera.position.z));
    camera.position.y = PLAYER_HEIGHT;
  }

  // ── Flickering lights ──────────────────────
  function updateEmergencyLights(t) {
    emergencyLights.forEach(({ light, bulb, baseIntensity, phase }) => {
      // Combine slow pulse + fast flicker
      const flicker = 0.85 + 0.15 * Math.sin(t * 8.3 + phase) + 0.1 * Math.sin(t * 23.7 + phase * 2);
      light.intensity = baseIntensity * flicker;
      bulb.material.emissiveIntensity = 3 * flicker;
    });
  }

  // ── Monster patrol ─────────────────────────
  function updateMonster(dt) {
    if (!monster) return;

    const target = WAYPOINTS[monsterTarget];
    const dir    = new THREE.Vector3().subVectors(target, monster.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.3) {
      monsterTarget = (monsterTarget + 1) % WAYPOINTS.length;
    } else {
      dir.normalize();
      monster.position.addScaledVector(dir, MONSTER_SPEED * dt);
      // Face direction of travel
      monster.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // Subtle bobbing walk animation
    const elapsed = clock.getElapsedTime();
    monster.position.y = 0.05 * Math.sin(elapsed * 4);
  }

  // ── Mouse look ─────────────────────────────
  function onMouseMove(e) {
    if (document.pointerLockElement !== document.getElementById('game-canvas')) return;
    const SENSITIVITY = 0.0015;
    yaw   -= e.movementX * SENSITIVITY;
    pitch -= e.movementY * SENSITIVITY;
    pitch  = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
  }

  // ── Keyboard ───────────────────────────────
  function onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': keys.w = true; break;
      case 'KeyA': keys.a = true; break;
      case 'KeyS': keys.s = true; break;
      case 'KeyD': keys.d = true; break;
    }
  }

  function onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': keys.w = false; break;
      case 'KeyA': keys.a = false; break;
      case 'KeyS': keys.s = false; break;
      case 'KeyD': keys.d = false; break;
    }
  }

  // ── Resize ─────────────────────────────────
  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ── Public API ─────────────────────────────
  function pause() {
    isPaused = true;
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    clock.stop();
  }

  function resume() {
    if (!initialized) return;
    isPaused = false;
    clock.start();
    loop();
  }

  function restart() {
    if (!initialized) {
      init();
      return;
    }
    // Reset player position
    camera.position.set(0, PLAYER_HEIGHT, 0);
    yaw   = 0;
    pitch = 0;
    camera.rotation.set(0, 0, 0);
    // Reset monster
    if (monster) monster.position.set(0, 0, -18);
    monsterTarget = 0;
    Object.keys(keys).forEach(k => keys[k] = false);

    isPaused = false;
    clock.start();
    loop();
  }

  return { init, pause, resume, restart, get initialized() { return initialized; } };

})();
