import * as THREE from 'three';

const STATE = { PATROL: 0, CHASE: 1, RETURN: 2 };

export class SecurityDrone {
  constructor(waypoints, startIdx, speed) {
    this.waypoints = waypoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    this.targetIdx = startIdx || 0;
    this.speed = speed || 1.5;
    this.state = STATE.PATROL;
    this.detectionRadius = 5;
    this.chaseSpeed = 3.0;
    this.damageCooldown = 0;
    this.returnTarget = null;

    this.group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x445566,
      metalness: 0.6,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), bodyMat);
    body.castShadow = true;
    this.group.add(body);
    this._bodyMat = bodyMat;

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ccff,
      emissive: 0x00ccff,
      emissiveIntensity: 0.3,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 6, 16), ringMat);
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);
    this._ringMat = ringMat;

    const light = new THREE.PointLight(0x00ccff, 0.4, 3);
    light.position.set(0, 0, 0);
    this.group.add(light);
    this._light = light;
    this._baseColor = 0x00ccff;

    this._bodyPos = new THREE.Vector3();
    this._playerPos = new THREE.Vector3();

    this.chaseTimer = 0;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
    this._bodyPos.set(x, y, z);
  }

  update(delta, playerPos) {
    this._playerPos.copy(playerPos);

    switch (this.state) {
      case STATE.PATROL:
        this._patrol(delta);
        if (this._canSeePlayer()) {
          this.state = STATE.CHASE;
          this._setAlert(true);
        }
        break;
      case STATE.CHASE:
        this._chase(delta);
        if (!this._canSeePlayer()) {
          this.chaseTimer += delta;
          if (this.chaseTimer > 2) {
            this.state = STATE.RETURN;
            this.returnTarget = this.waypoints[this.targetIdx].clone();
            this._setAlert(false);
            this.chaseTimer = 0;
          }
        } else {
          this.chaseTimer = 0;
        }
        break;
      case STATE.RETURN:
        this._returnToPatrol(delta);
        break;
    }

    this._bodyPos.lerp(this.group.position, 0.1);

    this.group.children.forEach(c => {
      if (c.isMesh && c.geometry.type === 'TorusGeometry') {
        c.rotation.z += delta * 2;
      }
    });

    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
  }

  _patrol(delta) {
    const target = this.waypoints[this.targetIdx];
    const dir = new THREE.Vector3().copy(target).sub(this.group.position);
    const dist = dir.length();
    if (dist < 0.2) {
      this.targetIdx = (this.targetIdx + 1) % this.waypoints.length;
    } else {
      dir.normalize();
      this.group.position.add(dir.multiplyScalar(this.speed * delta));
    }
  }

  _chase(delta) {
    const dir = new THREE.Vector3().copy(this._playerPos).sub(this.group.position);
    const dist = dir.length();
    if (dist > 0.3) {
      dir.normalize();
      this.group.position.add(dir.multiplyScalar(this.chaseSpeed * delta));
    }
    if (dist < 0.8 && this.damageCooldown <= 0) {
      this.damageCooldown = 0.5;
      const player = window.__game?.player;
      if (player) {
        player.takeDamage(this.damageCooldown > 0 ? 10 : 10);
        window.__game?.hud?.showMessage('⚠ DAÑO POR DRON', 1000);
      }
    }
  }

  _returnToPatrol(delta) {
    if (!this.returnTarget) {
      this.state = STATE.PATROL;
      return;
    }
    const dir = new THREE.Vector3().copy(this.returnTarget).sub(this.group.position);
    const dist = dir.length();
    if (dist < 0.3) {
      this.state = STATE.PATROL;
    } else {
      dir.normalize();
      this.group.position.add(dir.multiplyScalar(this.speed * delta));

      if (this._canSeePlayer()) {
        this.state = STATE.CHASE;
        this._setAlert(true);
      }
    }
  }

  _canSeePlayer() {
    const dist = this.group.position.distanceTo(this._playerPos);
    if (dist > this.detectionRadius) return false;

    const dir = new THREE.Vector3().copy(this._playerPos).sub(this.group.position).normalize();
    const dot = dir.dot(new THREE.Vector3(0, 0, -1));
    return dot > -0.3;
  }

  _setAlert(alert) {
    const color = alert ? 0xff2200 : this._baseColor;
    if (this._ringMat) {
      this._ringMat.color.setHex(color);
      this._ringMat.emissive.setHex(color);
      this._ringMat.emissiveIntensity = alert ? 0.8 : 0.3;
    }
    if (this._light) {
      this._light.color.setHex(color);
      this._light.intensity = alert ? 1.0 : 0.4;
    }
  }
}
