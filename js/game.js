import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Player } from './player.js';
import { HUD } from './hud.js';
import { SfxPlayer } from './sfx.js';
import { SceneManager } from './scene-manager.js';
import { EngineRoom } from './rooms/engine-room.js';
import { LabRoom } from './rooms/lab.js';
import { BridgeRoom } from './rooms/bridge.js';

export class Game {
  constructor(mode = 'story', difficulty = 'easy') {
    this.mode = mode;
    this.difficulty = difficulty;
    this.clock = new THREE.Clock();
    this.isRunning = false;
    this.isPaused = false;
    this._deathTriggered = false;
    this._volume = 0.5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x050510, 8, 20);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
    this.camera.position.set(2.0, 1.7, 5);
    this.camera.lookAt(0, 1, 0);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.25, 0.15, 0.1
    );
    this.composer.addPass(bloomPass);

    const vignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        offset: { value: 0.85 },
        darkness: { value: 0.35 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float offset;
        uniform float darkness;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture(tDiffuse, vUv);
          vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
          gl_FragColor = vec4(mix(texel.rgb, vec3(0.0), dot(uv, uv) * darkness), texel.a);
        }
      `,
    };
    const vignettePass = new ShaderPass(vignetteShader);
    this.composer.addPass(vignettePass);

    const container = document.getElementById('game-canvas-container');
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.isRunning = false;
    }, false);

    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.isRunning = true;
    }, false);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);

    this.player = new Player(this.camera, this.controls);
    if (this.mode === 'nodamage') {
      this.player.maxHealth = 1;
      this.player.health = 1;
    } else if (this.difficulty === 'hard') {
      this.player.maxHealth = 75;
      this.player.health = 75;
    } else {
      this.player.maxHealth = 150;
      this.player.health = 150;
    }
    this.hud = new HUD();
    this.sfx = new SfxPlayer();
    this.player.setSfx(this.sfx);
    this.sceneManager = new SceneManager(this.scene);

    this.engineRoom = new EngineRoom();
    this.sceneManager.registerRoom('engine', this.engineRoom);

    this.labRoom = new LabRoom();
    this.sceneManager.registerRoom('lab', this.labRoom);

    this.bridgeRoom = new BridgeRoom();
    this.sceneManager.registerRoom('bridge', this.bridgeRoom);

    this.engineRoom.setTransitionCallback(() => this._transitionToLab());
    this.labRoom.setTransitionCallback(() => this._transitionToBridge());
    this.bridgeRoom.setTransitionCallback(() => this._onEscape());
    this._isTransitioning = false;

    this._onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);

    this._onKeyDown = (e) => {
      if (e.code === 'Escape' && this.controls.isLocked) {
        e.preventDefault();
        this.controls.unlock();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    this._onCaptureKeyDown = (e) => {
      if (this.controls && this.controls.isLocked) {
        if (e.ctrlKey && (e.code === 'KeyW' || e.code === 'KeyN' || e.code === 'KeyT')) {
          e.preventDefault();
        }
      }
    };
    document.addEventListener('keydown', this._onCaptureKeyDown, { capture: true });

    this._resumeCleanup = null;

    this._onUnlock = () => {
      if (this.isRunning && !this.isPaused) {
        window.dispatchEvent(new CustomEvent('game-pause'));
      }
    };
    this.controls.addEventListener('unlock', this._onUnlock);
  }

  async start(saveData) {
    this.isRunning = true;
    this.isPaused = false;

    document.getElementById('loading-screen').classList.add('active');

    const targetRoom = saveData?.currentRoom || 'engine';
    await this.sceneManager.switchTo(targetRoom);
    this.scene.add(this.player.flashlight);
    this.scene.add(this.player.flashlightTarget);

    if (saveData) {
      if (saveData.inventory) {
        saveData.inventory.forEach(item => this.player.addItem(item));
      }
      const p = saveData.puzzles || {};
      if (p.engine) {
        if (this.engineRoom._puzzleStates) {
          this.engineRoom._puzzleStates[0].solved = p.engine.power || false;
          this.engineRoom._puzzleStates[1].solved = p.engine.access || false;
        }
        if (p.engine.access && this.engineRoom.sciFiDoor) {
          this.engineRoom.sciFiDoorOpen = true;
          this.engineRoom.sciFiDoorAnimT = 1;
          this.engineRoom.sciFiDoor.position.y = 3.0;
        }
        if (p.engine.power) {
          const mat = this.engineRoom._findReactorCore();
          if (mat) { mat.emissiveIntensity = 1.0; mat.opacity = 0.9; mat.color.setHex(0xff6600); }
        }
      }
      if (p.lab?.solved) {
        this.labRoom.puzzleSolved = true;
        this.labRoom.gateOpen = true;
        this.labRoom.gateAnimT = 1;
        this.labRoom.laserMeshes.forEach(m => { m.visible = false; });
      }
      if (p.bridge?.solved) {
        this.bridgeRoom._puzzleSolved = true;
      }
    }

    const room = this.sceneManager.getCurrentRoom();
    if (room && room.getColliders) {
      this.player.setColliders(room.getColliders());
    }

    document.getElementById('loading-screen').classList.remove('active');

    this.controls.lock();

    this.clock.start();
    this._animate();
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.controls.unlock();
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;

    if (this._resumeCleanup) this._resumeCleanup();

    this.isPaused = false;
    this.clock.start();
    window.dispatchEvent(new CustomEvent('game-resume'));
    this.controls.lock();

    const onLock = () => {
      document.removeEventListener('pointerlockerror', onLockError);
      this.controls.removeEventListener('lock', onLock);
      this._resumeCleanup = null;
    };
    const onLockError = () => {
      this.controls.removeEventListener('lock', onLock);
      this._resumeCleanup = null;
      if (!this.isPaused) {
        window.dispatchEvent(new CustomEvent('game-pause'));
      }
    };
    this.controls.addEventListener('lock', onLock);
    document.addEventListener('pointerlockerror', onLockError, { once: true });

    this._resumeCleanup = () => {
      this.controls.removeEventListener('lock', onLock);
      document.removeEventListener('pointerlockerror', onLockError);
      this._resumeCleanup = null;
    };
  }

  setVolume(v) {
    this._volume = v;
    const room = this.sceneManager.getCurrentRoom();
    if (room && room._ambientAudio) {
      room._ambientAudio.setVolume(v);
    }
  }

  save() {
    const room = this.sceneManager.getCurrentRoom();
    const player = this.player;
    const data = {
      mode: this.mode,
      difficulty: this.difficulty,
      currentRoom: this.sceneManager.currentRoomId,
      inventory: player.inventory.map(i => ({ id: i.id, name: i.name, icon: i.icon })),
      puzzles: {
        engine: {
          power: this.engineRoom._puzzleStates?.[0]?.solved || false,
          access: this.engineRoom._puzzleStates?.[1]?.solved || false,
        },
        lab: { solved: this.labRoom.puzzleSolved || false },
        bridge: { solved: this.bridgeRoom._puzzleSolved || false },
      },
    };
    try { localStorage.setItem('voidstation_save', JSON.stringify(data)); } catch (e) {}
  }

  loadSave() {
    try {
      const raw = localStorage.getItem('voidstation_save');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  clearSave() {
    try { localStorage.removeItem('voidstation_save'); } catch (e) {}
  }

  restart() {
    this.dispose();
    const saved = new Game();
    window.__game = saved;
    saved.start();
  }

  async _transitionToLab() {
    if (this._isTransitioning) return;
    this._isTransitioning = true;
    this.isPaused = true;

    this.save();
    document.getElementById('loading-screen').classList.add('active');

    await this.sceneManager.switchTo('lab');
    this.scene.add(this.player.flashlight);
    this.scene.add(this.player.flashlightTarget);

    const room = this.sceneManager.getCurrentRoom();
    if (room) {
      if (room.getColliders) this.player.setColliders(room.getColliders());
    }

    this.camera.position.set(0, 2, 0);
    this.player.feetY = 0;

    document.getElementById('loading-screen').classList.remove('active');
    this.isPaused = false;
    this._isTransitioning = false;
  }

  async _transitionToBridge() {
    if (this._isTransitioning) return;
    this._isTransitioning = true;
    this.isPaused = true;

    this.save();
    document.getElementById('loading-screen').classList.add('active');

    await this.sceneManager.switchTo('bridge');
    this.scene.add(this.player.flashlight);
    this.scene.add(this.player.flashlightTarget);

    const room = this.sceneManager.getCurrentRoom();
    if (room) {
      if (room.getColliders) this.player.setColliders(room.getColliders());
    }

    this.camera.position.set(0, 2, 7);
    this.player.feetY = 0;

    document.getElementById('loading-screen').classList.remove('active');
    this.isPaused = false;
    this._isTransitioning = false;
  }

  _onEscape() {
    if (this._isTransitioning) return;
    this._isTransitioning = true;
    this.isPaused = true;
    window.dispatchEvent(new CustomEvent('game-win'));
  }

  stop() {
    this.isRunning = false;
    this.controls.unlock();
    this.controls.removeEventListener('unlock', this._onUnlock);
    document.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('resize', this._onResize);
    this._resumeCleanup = null;
    this.sceneManager.dispose();
    this.engineRoom.unload(this.scene);
    if (this.player) {
      if (this.player.flashlight && this.player.flashlight.parent) {
        this.player.flashlight.parent.remove(this.player.flashlight);
      }
      if (this.player.flashlightTarget && this.player.flashlightTarget.parent) {
        this.player.flashlightTarget.parent.remove(this.player.flashlightTarget);
      }
    }
  }

  dispose() {
    this.stop();
    this.hud.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    const container = document.getElementById('game-canvas-container');
    while (container.firstChild) container.removeChild(container.firstChild);
  }

  _animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this._animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (!this.isPaused && this.controls.isLocked) {
      this.player.update(delta);
      this.sceneManager.update(delta, this.clock.elapsedTime);
      this.hud.update(this.player);
      this.composer.render();

      if (this.player.feetY < -10) this.player.health = 0;
      if (this.player.health <= 0 && !this._deathTriggered) {
        this._deathTriggered = true;
        this.isPaused = true;
        this.controls.unlock();
        window.dispatchEvent(new CustomEvent('game-death'));
      }
    }
  }
}
