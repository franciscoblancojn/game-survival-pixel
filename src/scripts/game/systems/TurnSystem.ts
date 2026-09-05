import { calculateDamage, damageEnemy, executeEnemyTurn } from './CombatSystem.js';
import { trySpawnReplacementEnemy } from './SpawnSystem.js';
import { TILE, HP_REGEN_INTERVAL_TURNS, HP_REGEN_AMOUNT } from '../../constants.js';
import { ENEMY_DEFINITIONS } from '../../../assets/enemies/index.js';
import { createItemInstance } from './ItemSystem.js';
import type { PlayerAction, EnemyInstance, ItemInstance } from '../../types.js';
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

  playerAttack(enemy: EnemyInstance): void {
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
      this.dropLoot(enemy);
      // Reaparece un enemigo en otra parte de la mazmorra, lejos del
      // jugador, mientras el piso no haya llegado al máximo para la
      // dificultad activa (ver skill enemy-spawning).
      trySpawnReplacementEnemy(dungeon, player, dungeon.floor, this.game.difficulty);
    }

    player.attackAnim = 8;
  }

  /**
   * Botín al morir un enemigo: oro (siempre, puede ser 0) + items en el
   * suelo donde cayó, según su definición en src/assets/enemies/. El guard
   * de `def` inexistente es solo defensivo (p. ej. un `type` corrupto en un
   * guardado viejo) — hoy todo enemigo tiene definición. Ver skill
   * enemy-definitions.
   */
  private dropLoot(enemy: EnemyInstance): void {
    const def = ENEMY_DEFINITIONS[enemy.type];
    if (!def) return;

    const gold = def.rollGold();
    if (gold > 0) {
      this.game.player.gold += gold;
      this.game.addMessage(`Encontraste ${gold} de oro`);
    }

    for (const drop of def.rollLoot()) {
      const droppedItem = createItemInstance(
        drop.itemType,
        enemy.x,
        enemy.y,
        `loot_${enemy.id}_${drop.itemType}_${Date.now()}`,
        drop.quantity
      );
      if (!droppedItem) continue;

      this.game.dungeon.items.push(droppedItem);
      this.game.addMessage(`${enemy.name} soltó ${drop.quantity}x ${droppedItem.name}`);
    }
  }

  playerPickup(item: ItemInstance): void {
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
    } else if (player.hp < player.maxHp) {
      // Regeneración pasiva: solo mientras el jugador está alimentado
      // (hunger > 0). `this.game.turn` todavía no se incrementó para el
      // turno que se está resolviendo — por eso +1 (ver skill player-state).
      const turnJustCompleted = this.game.turn + 1;
      if (turnJustCompleted % HP_REGEN_INTERVAL_TURNS === 0) {
        player.hp = Math.min(player.maxHp, player.hp + HP_REGEN_AMOUNT);
      }
    }

    if (player.hunger <= 20 && player.hunger > 19.85) {
      this.game.addMessage('Tienes mucha hambre...');
    }
  }
}
