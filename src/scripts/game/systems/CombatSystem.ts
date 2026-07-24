import type { EnemyInstance, EnemyTurnResult } from '../types.js';
import type { Player } from '../entities/Player.js';
import type { Dungeon } from '../world/Dungeon.js';

export function calculateDamage(
  attacker: { getEffectiveAttack?: () => number; attack: number },
  defender: { getEffectiveDefense?: () => number; defense: number }
): number {
  const baseDamage = attacker.getEffectiveAttack ? attacker.getEffectiveAttack() : attacker.attack;
  const defense = defender.getEffectiveDefense ? defender.getEffectiveDefense() : (defender.defense || 0);
  const variance = Math.floor(Math.random() * 3) - 1;
  const damage = Math.max(1, baseDamage - defense + variance);
  return damage;
}

export function executeEnemyTurn(
  enemy: EnemyInstance,
  player: Player,
  dungeon: Dungeon
): EnemyTurnResult | null {
  const dist = enemy.manhattanDistanceTo(player);

  if (dist <= 1) {
    const damage = calculateDamage(enemy, player);
    const actual = player.takeDamage(damage);
    return { type: 'attack', damage: actual, target: 'player' };
  }

  if (dist <= enemy.aggroRange) {
    const moved = moveToward(enemy, player.x, player.y, dungeon);
    if (moved) return { type: 'move', target: 'enemy' };
  } else {
    const moved = moveRandom(enemy, dungeon);
    if (moved) return { type: 'move', target: 'enemy' };
  }

  return null;
}

function moveToward(
  enemy: EnemyInstance,
  targetX: number,
  targetY: number,
  dungeon: Dungeon
): boolean {
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;

  const moves: { x: number; y: number }[] = [];
  if (Math.abs(dx) > Math.abs(dy)) {
    moves.push({ x: Math.sign(dx), y: 0 });
    if (dy !== 0) moves.push({ x: 0, y: Math.sign(dy) });
  } else {
    moves.push({ x: 0, y: Math.sign(dy) });
    if (dx !== 0) moves.push({ x: Math.sign(dx), y: 0 });
  }

  for (const move of moves) {
    const nx = enemy.x + move.x;
    const ny = enemy.y + move.y;
    const tile = dungeon.getTile(nx, ny);

    if (tile !== 0 && tile !== 2) {
      const blocking = dungeon.enemies.find(e => e !== enemy && e.x === nx && e.y === ny && e.hp > 0);
      if (!blocking) {
        enemy.x = nx;
        enemy.y = ny;
        return true;
      }
    }
  }
  return false;
}

function moveRandom(enemy: EnemyInstance, dungeon: Dungeon): boolean {
  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  for (let i = directions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [directions[i], directions[j]] = [directions[j], directions[i]];
  }

  for (const dir of directions) {
    if (Math.random() > 0.5) continue;

    const nx = enemy.x + dir.x;
    const ny = enemy.y + dir.y;
    const tile = dungeon.getTile(nx, ny);

    if (tile !== 0 && tile !== 2) {
      const blocking = dungeon.enemies.find(e => e !== enemy && e.x === nx && e.y === ny && e.hp > 0);
      if (!blocking) {
        enemy.x = nx;
        enemy.y = ny;
        return true;
      }
    }
  }
  return false;
}
