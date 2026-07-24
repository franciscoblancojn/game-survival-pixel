import { CELL_SIZE } from '../constants.js';
import type { Game } from './Game.js';

export class Input {
  private game: Game;
  private canvas: HTMLCanvasElement;
  private pointerId: number | null;
  private startX: number;
  private startY: number;
  private startTime: number;
  private didDrag: boolean;
  private handled: boolean;

  private readonly DRAG_THRESHOLD = 20;
  private readonly TAP_MAX_TIME = 400;

  constructor(game: Game) {
    this.game = game;
    this.canvas = game.renderer.canvas;
    this.pointerId = null;
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.didDrag = false;
    this.handled = false;

    this.setupPointer();
    this.setupKeyboard();
  }

  private setupPointer(): void {
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.game.state !== 'exploring') return;
      if (this.pointerId !== null) return;

      this.pointerId = e.pointerId;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startTime = Date.now();
      this.didDrag = false;
      this.handled = false;
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      if (this.didDrag) return;

      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      if (Math.abs(dx) > this.DRAG_THRESHOLD || Math.abs(dy) > this.DRAG_THRESHOLD) {
        this.didDrag = true;
      }
    });

    this.canvas.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;

      if (this.game.state !== 'exploring') return;
      if (this.handled) return;
      this.handled = true;

      const elapsed = Date.now() - this.startTime;

      if (this.didDrag) {
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        let dirX = 0, dirY = 0;

        if (Math.abs(dx) > Math.abs(dy)) {
          dirX = dx > 0 ? 1 : -1;
        } else {
          dirY = dy > 0 ? 1 : -1;
        }

        if (dirX !== 0 || dirY !== 0) {
          this.game.turnSystem.executePlayerAction({ type: 'move', dx: dirX, dy: dirY });
          this.game.render();
        }
        return;
      }

      if (elapsed < this.TAP_MAX_TIME) {
        this.handleTap(e.clientX, e.clientY);
      }
    });

    this.canvas.addEventListener('pointercancel', (e: PointerEvent) => {
      if (e.pointerId === this.pointerId) {
        this.pointerId = null;
        this.handled = true;
      }
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      if (this.handled) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }
      if (this.game.state !== 'exploring') return;
      this.handled = true;
      this.handleTap(e.clientX, e.clientY);
    });
  }

  private handleTap(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const tileX = Math.floor(clickX / CELL_SIZE) + this.game.renderer.cameraX;
    const tileY = Math.floor(clickY / CELL_SIZE) + this.game.renderer.cameraY;

    this.handleTileClick(tileX, tileY);
  }

  private handleTileClick(tileX: number, tileY: number): void {
    const { player, turnSystem } = this.game;
    const dx = tileX - player.x;
    const dy = tileY - player.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dist = adx + ady;

    if (dist === 0) return;

    let moveDx = 0;
    let moveDy = 0;

    if (adx >= ady) {
      moveDx = dx !== 0 ? Math.sign(dx) : 0;
    } else {
      moveDy = dy !== 0 ? Math.sign(dy) : 0;
    }

    turnSystem.executePlayerAction({ type: 'move', dx: moveDx, dy: moveDy });
    this.game.render();
  }

  private setupKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.game.state !== 'exploring') {
        if (e.key === 'Escape') {
          this.game.closeOverlay();
        }
        return;
      }

      let dx = 0, dy = 0;

      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': dy = -1; break;
        case 'ArrowDown':  case 's': case 'S': dy =  1; break;
        case 'ArrowLeft':  case 'a': case 'A': dx = -1; break;
        case 'ArrowRight': case 'd': case 'D': dx =  1; break;
        case ' ':
          this.game.turnSystem.executePlayerAction({ type: 'wait' });
          this.game.render();
          return;
        case 'g': case 'G':
          this.game.turnSystem.executePlayerAction({ type: 'pickup' });
          this.game.render();
          return;
        case 'i': case 'I': this.game.toggleInventory(); return;
        case 'c': case 'C': this.game.toggleCrafting();  return;
        case 'm': case 'M': this.game.toggleMiniMap();   return;
        default: return;
      }

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        this.game.turnSystem.executePlayerAction({ type: 'move', dx, dy });
        this.game.render();
      }
    });
  }
}
