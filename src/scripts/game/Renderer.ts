import { TILE, COLORS, CELL_SIZE } from '../constants.js';
import type { TileType, EnemyInstance, ItemInstance, Particle } from '../types.js';
import type { Player } from './entities/Player.js';
import type { Dungeon } from './world/Dungeon.js';

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public dungeon: Dungeon;
  public player: Player;
  public cameraX: number;
  public cameraY: number;
  public visibleCols: number;
  public visibleRows: number;
  public animFrame: number;
  public particles: Particle[];
  public screenWidth: number;
  public screenHeight: number;

  constructor(canvas: HTMLCanvasElement, dungeon: Dungeon, player: Player) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dungeon = dungeon;
    this.player = player;
    this.cameraX = 0;
    this.cameraY = 0;
    this.visibleCols = 0;
    this.visibleRows = 0;
    this.animFrame = 0;
    this.particles = [];
    this.screenWidth = 0;
    this.screenHeight = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.visibleCols = Math.ceil(this.screenWidth / CELL_SIZE) + 2;
    this.visibleRows = Math.ceil(this.screenHeight / CELL_SIZE) + 2;
    this.updateCamera();
  }

  updateCamera(): void {
    this.cameraX = this.player.x - Math.floor(this.visibleCols / 2);
    this.cameraY = this.player.y - Math.floor(this.visibleRows / 2);
  }

  addParticle(x: number, y: number, color: string, text: string): void {
    this.particles.push({
      x: x * CELL_SIZE + CELL_SIZE / 2,
      y: y * CELL_SIZE,
      color,
      text,
      life: 40,
      maxLife: 40,
      vy: -1.5,
    });
  }

  render(): void {
    const { ctx, screenWidth: w, screenHeight: h } = this;
    this.animFrame++;
    this.updateCamera();

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);

    for (let sy = 0; sy < this.visibleRows; sy++) {
      for (let sx = 0; sx < this.visibleCols; sx++) {
        const mapX = sx + this.cameraX;
        const mapY = sy + this.cameraY;
        const tile = this.dungeon.getTile(mapX, mapY);
        this.drawTile(ctx, sx, sy, tile, mapX, mapY);
      }
    }

    for (const item of this.dungeon.items) {
      const sx = item.x - this.cameraX;
      const sy = item.y - this.cameraY;
      if (sx >= -1 && sx <= this.visibleCols && sy >= -1 && sy <= this.visibleRows) {
        this.drawItem(ctx, sx, sy, item);
      }
    }

    for (const enemy of this.dungeon.enemies) {
      if (enemy.hp <= 0) continue;
      const sx = enemy.x - this.cameraX;
      const sy = enemy.y - this.cameraY;
      if (sx >= -1 && sx <= this.visibleCols && sy >= -1 && sy <= this.visibleRows) {
        this.drawEnemy(ctx, sx, sy, enemy);
      }
    }

    this.drawPlayer(ctx);
    this.updateParticles(ctx);
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number,
    tile: TileType,
    mapX: number, mapY: number
  ): void {
    const x = sx * CELL_SIZE;
    const y = sy * CELL_SIZE;

    switch (tile) {
      case TILE.VOID:
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        break;

      case TILE.FLOOR:
        ctx.fillStyle = (mapX + mapY) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        break;

      case TILE.WALL:
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE * 0.35);
        ctx.fillStyle = COLORS.wallDark;
        ctx.fillRect(x, y + CELL_SIZE - 3, CELL_SIZE, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, 2, CELL_SIZE);
        break;

      case TILE.DOOR: {
        ctx.fillStyle = COLORS.floorAlt;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = COLORS.doorFrame;
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.fillStyle = COLORS.door;
        ctx.fillRect(x + 6, y + 6, CELL_SIZE - 12, CELL_SIZE - 12);
        ctx.fillStyle = '#c0a030';
        ctx.fillRect(x + CELL_SIZE / 2 - 2, y + CELL_SIZE / 2 - 2, 4, 4);
        break;
      }

      case TILE.CORRIDOR:
        ctx.fillStyle = (mapX + mapY) % 2 === 0 ? COLORS.corridor : '#232340';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        break;

      case TILE.STAIRS_DOWN: {
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        const steps = 4;
        for (let i = 0; i < steps; i++) {
          const shade = Math.floor(80 + i * 30);
          ctx.fillStyle = `rgb(${shade}, ${shade + 20}, ${shade})`;
          ctx.fillRect(x + 4, y + 4 + i * 6, CELL_SIZE - 8, 5);
        }
        ctx.fillStyle = COLORS.stairsDown;
        ctx.beginPath();
        ctx.moveTo(x + CELL_SIZE / 2, y + CELL_SIZE - 4);
        ctx.lineTo(x + CELL_SIZE / 2 - 6, y + CELL_SIZE - 12);
        ctx.lineTo(x + CELL_SIZE / 2 + 6, y + CELL_SIZE - 12);
        ctx.fill();
        break;
      }

      case TILE.STAIRS_UP: {
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = COLORS.stairsUp;
        ctx.beginPath();
        ctx.moveTo(x + CELL_SIZE / 2, y + 4);
        ctx.lineTo(x + CELL_SIZE / 2 - 6, y + 12);
        ctx.lineTo(x + CELL_SIZE / 2 + 6, y + 12);
        ctx.fill();
        break;
      }
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const sx = this.player.x - this.cameraX;
    const sy = this.player.y - this.cameraY;
    const x = sx * CELL_SIZE;
    const y = sy * CELL_SIZE;
    const pad = 4;
    const size = CELL_SIZE - pad * 2;

    if (this.player.hitAnim > 0) {
      ctx.fillStyle = '#ff0000';
      ctx.globalAlpha = 0.5 + (this.player.hitAnim / 8) * 0.5;
      ctx.fillRect(x + pad - 2, y + pad - 2, size + 4, size + 4);
      ctx.globalAlpha = 1;
      this.player.hitAnim--;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + pad + 2, y + pad + size - 2, size - 4, 4);

    ctx.fillStyle = COLORS.player;
    ctx.fillRect(x + pad, y + pad, size, size);

    ctx.fillStyle = COLORS.playerDark;
    ctx.fillRect(x + pad + 2, y + pad + size * 0.4, size - 4, size * 0.5);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + pad + 6, y + pad + 6, 5, 5);
    ctx.fillRect(x + pad + size - 11, y + pad + 6, 5, 5);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + pad + 8, y + pad + 8, 2, 2);
    ctx.fillRect(x + pad + size - 9, y + pad + 8, 2, 2);

    if (this.player.attackAnim > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = this.player.attackAnim / 8;
      ctx.fillRect(x + pad - 3, y + pad - 3, size + 6, size + 6);
      ctx.globalAlpha = 1;
      this.player.attackAnim--;
    }
  }

  private drawEnemy(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number,
    enemy: EnemyInstance
  ): void {
    const x = sx * CELL_SIZE;
    const y = sy * CELL_SIZE;
    const pad = 5;
    const size = CELL_SIZE - pad * 2;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + pad + 2, y + pad + size - 2, size - 4, 3);

    ctx.fillStyle = enemy.color;
    ctx.fillRect(x + pad, y + pad, size, size);

    ctx.fillStyle = enemy.darkColor;
    ctx.fillRect(x + pad, y + pad + size * 0.5, size, size * 0.4);

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + pad + 5, y + pad + 6, 4, 4);
    ctx.fillRect(x + pad + size - 9, y + pad + 6, 4, 4);

    if (enemy.hp < enemy.maxHp) {
      const barW = size;
      const barH = 3;
      const barY = y + pad - 5;
      const hpPct = enemy.hp / enemy.maxHp;

      ctx.fillStyle = '#333';
      ctx.fillRect(x + pad, barY, barW, barH);
      ctx.fillStyle = hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ffa500' : '#ff0000';
      ctx.fillRect(x + pad, barY, barW * hpPct, barH);
    }
  }

  private drawItem(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number,
    item: ItemInstance
  ): void {
    const x = sx * CELL_SIZE;
    const y = sy * CELL_SIZE;
    const bob = Math.sin(this.animFrame * 0.05 + x + y) * 2;

    ctx.fillStyle = 'rgba(255, 217, 61, 0.15)';
    ctx.fillRect(x + 6, y + 6 + bob, CELL_SIZE - 12, CELL_SIZE - 12);

    ctx.fillStyle = item.color || COLORS.item;
    ctx.fillRect(x + 10, y + 10 + bob, CELL_SIZE - 20, CELL_SIZE - 20);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + 10, y + 10 + bob, CELL_SIZE - 20, 3);
  }

  private updateParticles(ctx: CanvasRenderingContext2D): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.vy;
      p.life--;

      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
}
