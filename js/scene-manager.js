export class SceneManager {
  constructor(scene) {
    this.scene = scene;
    this.currentRoomId = null;
    this.rooms = new Map();
  }

  registerRoom(id, room) {
    this.rooms.set(id, room);
  }

  async switchTo(id) {
    if (this.currentRoomId) {
      const current = this.rooms.get(this.currentRoomId);
      if (current && current.unload) current.unload();
    }

    const playerMeshes = [];
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const child = this.scene.children[i];
      if (child.userData?.isPlayer) {
        this.scene.remove(child);
        playerMeshes.push(child);
      }
    }

    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    for (const m of playerMeshes) {
      this.scene.add(m);
    }

    const room = this.rooms.get(id);
    if (room && room.load) {
      await room.load(this.scene);
    }

    this.currentRoomId = id;
  }

  update(delta, time) {
    const room = this.rooms.get(this.currentRoomId);
    if (room && room.update) room.update(delta, time);
  }

  getCurrentRoom() {
    return this.rooms.get(this.currentRoomId);
  }

  dispose() {
    this.rooms.forEach(room => {
      if (room.unload) room.unload();
    });
    this.rooms.clear();
    this.currentRoomId = null;
  }
}
