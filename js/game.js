import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Player } from './player.js';
import { HUD } from './hud.js';
import { SceneManager } from './scene-manager.js';
import { EngineRoom } from './rooms/engine-room.js';

export class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.isRunning = false;
    this.isPaused = false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;

    const container = document.getElementById('game-canvas-container');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x050510, 6, 16);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
    this.camera.position.set(2.0, 1.7, 5);
    this.camera.lookAt(0, 1, 0);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);

    this.player = new Player(this.camera, this.controls);
    this.hud = new HUD();
    this.sceneManager = new SceneManager(this.scene);

    this.engineRoom = new EngineRoom();
    this.sceneManager.registerRoom('engine', this.engineRoom);

    this._onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
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



    this.controls.addEventListener('unlock', () => {
      if (this.isRunning && !this.isPaused) {
        window.dispatchEvent(new CustomEvent('game-pause'));
      }
    });
  }

  async start() {
    this.isRunning = true;
    this.isPaused = false;

    document.getElementById('loading-screen').classList.add('active');

    await this.sceneManager.switchTo('engine');

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
    this.isPaused = false;
    this.clock.start();
    this.controls.lock();
  }

  restart() {
    this.dispose();
    const saved = new Game();
    window.__game = saved;
    saved.start();
  }

  stop() {
    this.isRunning = false;
    this.controls.unlock();
    this.controls.removeEventListener('unlock');
    document.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('resize', this._onResize);
    this.sceneManager.dispose();
    this.engineRoom.unload(this.scene);
  }

  dispose() {
    this.stop();
    this.hud.dispose();
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
    }

    this.renderer.render(this.scene, this.camera);
  }
}
