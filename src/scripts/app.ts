import { Game } from './game/Game.js';

let game: Game | null = null;

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Game canvas not found');
    return;
  }

  game = new Game(canvas);
  (window as unknown as Record<string, unknown>).gameInstance = game;
  game.init();
}

document.addEventListener('DOMContentLoaded', init);
