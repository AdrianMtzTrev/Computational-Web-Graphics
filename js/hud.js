export class HUD {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'game-hud';
    document.body.appendChild(this.container);

    this.container.innerHTML = `
      <div id="hud-crosshair">+</div>
      <div id="hud-health-bar">
        <div id="hud-health-fill"></div>
        <span id="hud-health-text">100</span>
      </div>
      <div id="hud-interact" style="display:none">
        Presiona <kbd>E</kbd> para interactuar
      </div>
      <div id="hud-inventory"></div>
      <div id="hud-message"></div>
    `;

    this.crosshair = document.getElementById('hud-crosshair');
    this.healthFill = document.getElementById('hud-health-fill');
    this.healthText = document.getElementById('hud-health-text');
    this.interactEl = document.getElementById('hud-interact');
    this.inventoryEl = document.getElementById('hud-inventory');
    this.messageEl = document.getElementById('hud-message');

    const style = document.createElement('style');
    style.textContent = `
      #game-hud {
        position: fixed; top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none; z-index: 500;
        font-family: 'Orbitron', 'Courier New', monospace;
      }
      #hud-crosshair {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        color: rgba(0, 212, 255, 0.7);
        font-size: 22px;
        text-shadow: 0 0 6px rgba(0, 212, 255, 0.4);
      }
      #hud-health-bar {
        position: absolute; bottom: 36px; left: 36px;
        width: 220px; height: 20px;
        background: rgba(0,0,0,0.6);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 3px;
        overflow: hidden;
      }
      #hud-health-fill {
        width: 100%; height: 100%;
        background: linear-gradient(90deg, #c0392b, #e74c3c);
        transition: width 0.3s ease;
      }
      #hud-health-text {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        color: #fff; font-size: 11px;
        letter-spacing: 0.1em;
      }
      #hud-interact {
        position: absolute; bottom: 80px; left: 50%;
        transform: translateX(-50%);
        color: #fff;
        background: rgba(0,0,0,0.6);
        border: 1px solid rgba(0, 212, 255, 0.4);
        border-radius: 4px;
        padding: 8px 18px;
        font-size: 13px;
        text-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
      }
      #hud-interact kbd {
        background: rgba(0, 212, 255, 0.15);
        border: 1px solid rgba(0, 212, 255, 0.4);
        border-radius: 3px;
        padding: 1px 6px;
        font-size: 11px;
        color: #00d4ff;
      }
      #hud-inventory {
        position: absolute; bottom: 70px; left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
      }
      #hud-inventory .hud-slot {
        width: 44px; height: 44px;
        background: rgba(0,0,0,0.55);
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 9px;
        text-align: center;
        letter-spacing: 0.05em;
      }
      #hud-message {
        position: absolute; top: 15%; left: 50%;
        transform: translateX(-50%);
        color: #00d4ff;
        font-size: 20px;
        text-align: center;
        text-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
        opacity: 0;
        transition: opacity 0.4s ease;
        letter-spacing: 0.1em;
      }
      #hud-message.visible { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  update(player) {
    const pct = (player.health / player.maxHealth) * 100;
    this.healthFill.style.width = pct + '%';
    this.healthText.textContent = Math.round(player.health);

    const lookingAt = player.getLookingAt();
    this.interactEl.style.display = lookingAt ? 'block' : 'none';

    this.inventoryEl.innerHTML = '';
    player.inventory.forEach(item => {
      const slot = document.createElement('div');
      slot.className = 'hud-slot';
      slot.textContent = item.icon || item.id.substring(0, 3);
      slot.title = item.name || item.id;
      this.inventoryEl.appendChild(slot);
    });
  }

  showMessage(text, duration) {
    this.messageEl.textContent = text;
    this.messageEl.classList.add('visible');
    clearTimeout(this._msgTimeout);
    this._msgTimeout = setTimeout(() => {
      this.messageEl.classList.remove('visible');
    }, duration || 3000);
  }

  dispose() {
    this.container.remove();
  }
}
