import type { Game } from '../game/Game.js';

/**
 * Menú de pausa durante la partida (botón ⏸️ de la barra inferior).
 * Por ahora solo Continuar/Salir; futuras opciones (ajustes, guardar y
 * salir sin confirmar, etc.) se agregan aquí.
 */
export class PauseMenu {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
    document.getElementById('pausemenu-continue')?.addEventListener('click', () => {
      this.game.togglePauseMenu();
    });
    document.getElementById('pausemenu-exit')?.addEventListener('click', () => {
      this.game.exitToMenu();
    });
  }

  open(): void {
    const el = document.getElementById('pausemenu-overlay');
    if (el) el.style.display = 'flex';
  }

  close(): void {
    const el = document.getElementById('pausemenu-overlay');
    if (el) el.style.display = 'none';
  }
}
