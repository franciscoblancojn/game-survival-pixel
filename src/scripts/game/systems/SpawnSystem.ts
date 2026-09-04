import {
  ENEMY_TYPES, MAX_ENEMIES_BASE, DIFFICULTY_SETTINGS, ENEMY_RESPAWN_MIN_DISTANCE,
} from '../../constants.js';
import { Tile } from '../world/Tile.js';
import type { EnemyInstance, Difficulty } from '../../types.js';
import type { Dungeon } from '../world/Dungeon.js';
import type { Player } from '../entities/Player.js';

/** Enemigos vivos permitidos en el piso actual: 6 + Math.ceil(piso / divisor). */
export function getMaxEnemies(floor: number, difficulty: Difficulty): number {
  const setting = DIFFICULTY_SETTINGS[difficulty];
  return MAX_ENEMIES_BASE + Math.ceil(floor / setting.divisor);
}

/**
 * Crea una instancia de enemigo con stats escalados por piso — misma fórmula
 * que usaba antes `Dungeon.placeEnemies` inline. Centralizada acá para que
 * la población inicial de un piso y el reaparecido tras matar un enemigo
 * usen exactamente el mismo balance.
 */
export function createEnemyInstance(floor: number, x: number, y: number, id: string): EnemyInstance {
  const enemyTypes = Object.keys(ENEMY_TYPES);
  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  const def = ENEMY_TYPES[type];

  return {
    id,
    type,
    name: def.name,
    x, y,
    hp: Math.floor(def.hp * (1 + floor * 0.15)),
    maxHp: Math.floor(def.hp * (1 + floor * 0.15)),
    attack: Math.floor(def.attack * (1 + floor * 0.1)),
    defense: Math.floor(def.defense * (1 + floor * 0.1)),
    xp: def.xp,
    aggroRange: def.aggroRange,
    color: def.color,
    darkColor: def.darkColor,
    speed: def.speed,
    turnsUntilMove: 0,
  };
}

/**
 * Busca una celda caminable, sin ocupar, lejos del jugador. Si la mazmorra
 * es chica y no hay ninguna celda a ENEMY_RESPAWN_MIN_DISTANCE, relaja la
 * distancia mínima progresivamente en vez de fallar — siempre preferimos
 * "algo lejos" a "no reaparece nada".
 */
function findSpawnPosition(dungeon: Dungeon, player: Player): { x: number; y: number } | null {
  const attemptsPerRound = 200;
  let minDistance = ENEMY_RESPAWN_MIN_DISTANCE;

  while (minDistance >= 2) {
    for (let attempt = 0; attempt < attemptsPerRound; attempt++) {
      const x = Math.floor(Math.random() * dungeon.width);
      const y = Math.floor(Math.random() * dungeon.height);

      if (!Tile.isWalkable(dungeon.getTile(x, y))) continue;

      const distance = Math.abs(x - player.x) + Math.abs(y - player.y);
      if (distance < minDistance) continue;

      if (x === player.x && y === player.y) continue;
      if (dungeon.getEnemyAt(x, y)) continue;

      return { x, y };
    }
    minDistance = Math.floor(minDistance / 2);
  }

  return null;
}

/**
 * Al morir un enemigo, reaparece uno nuevo en otra parte de la mazmorra
 * lejos del jugador — siempre que el piso no haya llegado ya al máximo de
 * enemigos vivos para la dificultad activa (ver getMaxEnemies).
 */
export function trySpawnReplacementEnemy(
  dungeon: Dungeon,
  player: Player,
  floor: number,
  difficulty: Difficulty
): boolean {
  const aliveCount = dungeon.enemies.filter(e => e.hp > 0).length;
  if (aliveCount >= getMaxEnemies(floor, difficulty)) return false;

  const pos = findSpawnPosition(dungeon, player);
  if (!pos) return false;

  const id = `enemy_${floor}_respawn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  dungeon.enemies.push(createEnemyInstance(floor, pos.x, pos.y, id));
  return true;
}
