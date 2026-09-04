import { calculateDamage, damageEnemy, executeEnemyTurn } from './CombatSystem.js';
import { trySpawnReplacementEnemy } from './SpawnSystem.js';
import { TILE } from '../../constants.js';
import type { PlayerAction } from '../../types.js';
import type { Game } from '../Game.js';

export class TurnSystem {
  public game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  executePlayerAction(action: PlayerAction): boolean {
    const { player, dungeon } = this.game;
    let actionTaken = false;

    switch (action.type) {
      case 'move': {
        const dx = action.dx!;
        const dy = action.dy!;
        const newX = player.x + dx;
        const newY = player.y + dy;

        const enemy = dungeon.getEnemyAt(newX, newY);
        if (enemy) {
          this.playerAttack(enemy);
          actionTaken = true;
          break;
        }

        if (player.canMoveTo(newX, newY, dungeon)) {
          player.x = newX;
          player.y = newY;
          actionTaken = true;

          const item = dungeon.getItemAt(newX, newY);
          if (item) {
            this.playerPickup(item);
          }

          const tile = dungeon.getTile(newX, newY);
          if (tile === TILE.STAIRS_DOWN) {
            this.game.addMessage('Pisas las escaleras...往下');
          }
        }
        break;
      }

      case 'attack': {
        const enemy = dungeon.getEnemyAt(action.x!, action.y!);
        if (enemy && player.isAdjacentTo(enemy as unknown as import('../entities/Entity.js').Entity)) {
          this.playerAttack(enemy);
          actionTaken = true;
        }
        break;
      }

      case 'pickup': {
        const item = dungeon.getItemAt(player.x, player.y);
        if (item) {
          this.playerPickup(item);
          actionTaken = true;
        }
        break;
      }

      case 'wait': {
        actionTaken = true;
        break;
      }
    }

    if (actionTaken) {
      this.executeEnemyTurns();
      this.executeWorldEffects();
      this.game.turn++;

      // Único punto que decide si el jugador murió este turno, sin importar
      // la causa (combate o hambre) — ver skill player-state.
      if (this.game.player.hp <= 0 && this.game.state !== 'dead') {
        this.game.handleDeath();
      }
    }

    return actionTaken;
  }

  playerAttack(enemy: import('../../types.js').EnemyInstance): void {
    const { player, dungeon } = this.game;
    const damage = calculateDamage(player, enemy);
    const actual = damageEnemy(enemy, damage);

    this.game.addMessage(`Atacas a ${enemy.name} por ${actual} de daño`);

    if (enemy.hp <= 0) {
      this.game.addMessage(`${enemy.name} derrotado! +${enemy.xp} XP`);
      const leveled = player.addXP(enemy.xp);
      if (leveled) {
        this.game.addMessage(`Subiste al nivel ${player.level}!`);
      }
      dungeon.removeEnemy(enemy);
      // Reaparece un enemigo en otra parte de la mazmorra, lejos del
      // jugador, mientras el piso no haya llegado al máximo para la
      // dificultad activa (ver skill enemy-spawning).
      trySpawnReplacementEnemy(dungeon, player, dungeon.floor, this.game.difficulty);
    }

    player.attackAnim = 8;
  }

  playerPickup(item: import('../../types.js').ItemInstance): void {
    const { player, dungeon } = this.game;
    const added = player.addItem(item);
    if (added) {
      dungeon.removeItem(item);
      this.game.addMessage(`Recogiste ${item.name}`);
    } else {
      this.game.addMessage('Inventario lleno!');
    }
  }

  executeEnemyTurns(): void {
    const { player, dungeon } = this.game;

    for (const enemy of [...dungeon.enemies]) {
      if (enemy.hp <= 0) continue;

      enemy.turnsUntilMove--;
      if (enemy.turnsUntilMove > 0) continue;
      enemy.turnsUntilMove = enemy.speed || 1;

      const result = executeEnemyTurn(enemy, player, dungeon);
      if (result && result.type === 'attack') {
        this.game.addMessage(`${enemy.name} te ataca por ${result.damage} de daño`);
        player.hitAnim = 8;
        if (player.hp <= 0) return; // el resto de enemigos no golpea un cadáver
      }
    }
  }

  executeWorldEffects(): void {
    const { player } = this.game;

    player.hunger = Math.max(0, player.hunger - 0.15);

    if (player.hunger <= 0) {
      player.hp = Math.max(0, player.hp - 1);
      if (player.hp <= 0) {
        this.game.addMessage('Moriste de hambre...');
      }
    }

    if (player.hunger <= 20 && player.hunger > 19.85) {
      this.game.addMessage('Tienes mucha hambre...');
    }
  }
}
