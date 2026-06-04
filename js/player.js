import * as THREE from 'three';

export class Player {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isRunning = false;
    this.isCrouching = false;

    this.health = 100;
    this.maxHealth = 100;
    this.inventory = [];

    this.playerHeight = 1.7;
    this.crouchHeight = 0.6;
    this.currentEyeHeight = this.playerHeight;
    this.targetEyeHeight = this.playerHeight;
    this.heightVelocity = 0;

    this.speed = 3.0;
    this.runMultiplier = 1.6;
    this.crouchMultiplier = 0.4;

    this.feetY = 0;
    this.velocity = new THREE.Vector3();
    this.gravity = 9.8;
    this.isOnGround = true;

    this._colliderBoxes = [];

    this.raycaster = new THREE.Raycaster();
    this.interactDistance = 3;
    this.interactiveObjects = [];

    this.keys = {};
    this._onKeyDown = (e) => {
      if (this.controls.isLocked) e.preventDefault();
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this._tryInteract();
      if (e.code === 'Space') this._jump();
    };
    this._onKeyUp = (e) => {
      this.keys[e.code] = false;
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  setColliders(boxes) {
    this._colliderBoxes = boxes || [];
  }

  setInteractiveObjects(objects) {
    this.interactiveObjects = objects;
  }

  update(delta) {
    if (!this.controls.isLocked) return;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);

    this.isRunning = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.isCrouching = !!(this.keys['ControlLeft'] || this.keys['ControlRight']);

    if (moveDir.lengthSq() > 0) moveDir.normalize();

    let currentSpeed = this.speed;
    if (this.isRunning && !this.isCrouching) currentSpeed *= this.runMultiplier;
    if (this.isCrouching) currentSpeed *= this.crouchMultiplier;

    this.velocity.x = moveDir.x * currentSpeed;
    this.velocity.z = moveDir.z * currentSpeed;

    this.velocity.y -= this.gravity * delta;

    const newPos = this.camera.position.clone();
    const moveX = this.velocity.x * delta;
    const moveZ = this.velocity.z * delta;

    newPos.x += moveX;
    if (this._collidesAt(newPos)) newPos.x -= moveX;

    newPos.z += moveZ;
    if (this._collidesAt(newPos)) newPos.z -= moveZ;

    this.feetY += this.velocity.y * delta;

    if (this.feetY < 0) {
      this.feetY = 0;
      this.velocity.y = 0;
      this.isOnGround = true;
    } else {
      this.isOnGround = false;
    }

    this.camera.position.x = newPos.x;
    this.camera.position.z = newPos.z;

    this.targetEyeHeight = this.isCrouching ? this.crouchHeight : this.playerHeight;
    this.currentEyeHeight += (this.targetEyeHeight - this.currentEyeHeight) * Math.min(1, 10 * delta);
    this.camera.position.y = this.feetY + this.currentEyeHeight;
  }

  _jump() {
    if (!this.isOnGround || this.isCrouching) return;
    this.velocity.y = 4.5;
    this.isOnGround = false;
  }

  _tryInteract() {
    if (this.interactiveObjects.length === 0) return;
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveObjects, true);
    if (hits.length > 0 && hits[0].distance < this.interactDistance) {
      let obj = hits[0].object;
      while (obj && !obj.userData.interact) obj = obj.parent;
      if (obj && obj.userData.interact) {
        obj.userData.interact(obj);
      }
    }
  }

  getLookingAt() {
    if (this.interactiveObjects.length === 0) return null;
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveObjects, true);
    if (hits.length > 0 && hits[0].distance < this.interactDistance) {
      let obj = hits[0].object;
      while (obj && !obj.userData.interact) obj = obj.parent;
      return obj || null;
    }
    return null;
  }

  _collidesAt(pos) {
    if (this._colliderBoxes.length === 0) return false;
    const halfW = 0.25;
    const box = new THREE.Box3(
      new THREE.Vector3(pos.x - halfW, this.feetY, pos.z - halfW),
      new THREE.Vector3(pos.x + halfW, this.feetY + this.currentEyeHeight, pos.z + halfW)
    );
    for (const cb of this._colliderBoxes) {
      if (box.intersectsBox(cb)) return true;
    }
    return false;
  }

  addItem(item) {
    this.inventory.push(item);
  }

  hasItem(id) {
    return this.inventory.some(i => i.id === id);
  }

  removeItem(id) {
    const idx = this.inventory.findIndex(i => i.id === id);
    if (idx !== -1) this.inventory.splice(idx, 1);
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }
}
