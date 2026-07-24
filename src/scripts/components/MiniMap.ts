import { COLORS } from '../constants.js';
import type { Game } from '../game/Game.js';

export class MiniMap {
  private game: Game;
  public visible: boolean;
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null;

  constructor(game: Game) {
    this.game = game;
    this.visible = false;
    this.canvas = null;
    this.ctx = null;
  }

  toggle(): void {
    this.visible = !this.visible;
    const el = document.getElementById('minimap-overlay');
    if (el) {
      el.style.display = this.visible ? 'flex' : 'none';
    }
    if (this.visible) this.render();
  }

  render(): void {
    if (!this.visible) return;

    let overlay = document.getElementById('minimap-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'minimap-overlay';
      overlay.className = 'minimap-overlay';
      overlay.innerHTML = `
        <div class="minimap-header">
          <h3>🗺️ Mapa</h3>
          <button class="minimap-close" onclick="window.gameInstance?.toggleMiniMap()">✕</button>
        </div>
        <div class="minimap-canvas-wrap"></div>
        <div class="minimap-legend">
          <span><i style="background:#4ecdc4"></i> Tú</span>
          <span><i style="background:#ff6b6b"></i> Enemigo</span>
          <span><i style="background:#ffd93d"></i> Item</span>
          <span><i style="background:#2ecc71"></i> Escalera</span>
        </div>
      `;
      document.getElementById('game-container')?.appendChild(overlay);
      overlay.addEventListener('click', (e: Event) => {
        if (e.target === overlay) this.toggle();
      });
    }

    const { dungeon, player } = this.game;
    const wrap = overlay.querySelector('.minimap-canvas-wrap') as HTMLElement;

    const screenW = window.innerWidth - 32;
    const screenH = window.innerHeight - 140;
    const scaleX = Math.floor(screenW / dungeon.width);
    const scaleY = Math.floor(screenH / dungeon.height);
    const s = Math.max(1, Math.min(scaleX, scaleY));

    const w = dungeon.width * s;
    const h = dungeon.height * s;

    if (!this.canvas || this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = w;
      this.canvas.height = h;
      this.ctx = this.canvas.getContext('2d');
      wrap.innerHTML = '';
      wrap.appendChild(this.canvas);
    }

    const ctx = this.ctx!;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const tile = dungeon.getTile(x, y);
        if (tile === 0) continue;

        let color: string;
        switch (tile) {
          case 2: color = '#4a4a6a'; break;
          case 1: color = '#2d2d44'; break;
          case 3: color = '#8b6914'; break;
          case 4: color = '#2a2a40'; break;
          case 5: color = '#2ecc71'; break;
          case 6: color = '#3498db'; break;
          default: color = '#1a1a2e';
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * s, y * s, s, s);
      }
    }

    for (const enemy of dungeon.enemies) {
      if (enemy.hp > 0) {
        ctx.fillStyle = COLORS.minimapEnemy;
        const r = Math.max(1, Math.floor(s / 2));
        ctx.beginPath();
        ctx.arc(enemy.x * s + s / 2, enemy.y * s + s / 2, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const item of dungeon.items) {
      ctx.fillStyle = COLORS.item;
      const r = Math.max(1, Math.floor(s / 3));
      ctx.fillRect(item.x * s + s / 2 - r, item.y * s + s / 2 - r, r * 2, r * 2);
    }

    ctx.fillStyle = COLORS.minimapPlayer;
    const pr = Math.max(2, Math.floor(s / 2) + 1);
    ctx.beginPath();
    ctx.arc(player.x * s + s / 2, player.y * s + s / 2, pr, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLORS.minimapPlayer;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(player.x * s + s / 2, player.y * s + s / 2, pr + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
