import { describe, it, expect } from "vitest";
import { Dungeon } from "../../../../scripts/game/world/Dungeon.ts";
import { getMaxEnemies } from "../../../../scripts/game/systems/SpawnSystem.ts";
import { TILE } from "../../../../scripts/constants.ts";
import type { Difficulty } from "../../../../scripts/types.ts";

const WALKABLE = new Set<number>([
  TILE.FLOOR, TILE.DOOR, TILE.CORRIDOR, TILE.STAIRS_DOWN, TILE.STAIRS_UP,
]);

function findDoorTiles(d: Dungeon): { x: number; y: number }[] {
  const doors: { x: number; y: number }[] = [];
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      if (d.getTile(x, y) === TILE.DOOR) doors.push({ x, y });
    }
  }
  return doors;
}

function reachableFromStart(d: Dungeon): Set<string> {
  const start = d.rooms[0];
  const visited = new Set<string>([`${start.centerX},${start.centerY}`]);
  const stack: [number, number][] = [[start.centerX, start.centerY]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]] as const) {
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (WALKABLE.has(d.getTile(nx, ny))) {
        visited.add(key);
        stack.push([nx, ny]);
      }
    }
  }
  return visited;
}

function longestStraightDoorRun(doors: { x: number; y: number }[]): number {
  const byX = new Map<number, number[]>();
  const byY = new Map<number, number[]>();
  for (const { x, y } of doors) {
    (byX.get(x) ?? byX.set(x, []).get(x)!).push(y);
    (byY.get(y) ?? byY.set(y, []).get(y)!).push(x);
  }
  let longest = 1;
  for (const list of [...byX.values(), ...byY.values()]) {
    const sorted = [...list].sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
    }
  }
  return longest;
}

// Regresión: la generación de niveles dejaba puertas decorativas sin pasillo
// detrás (llevaban a TILE.VOID) y, por separado, un pasillo que corría en
// paralelo al muro de una sala ajena convertía toda esa tira en puertas
// (hasta 8 seguidas), dejando esa sala sin muro en ese lado. Ver
// docs/ARQUITECTURA.md y CLAUDE.md para el detalle.
describe("Dungeon.generateLevel — generación de niveles", () => {
  const SEEDS = 40;

  it("nunca genera una puerta sin pasillo/sala al otro lado (puerta a la nada)", () => {
    for (let i = 0; i < SEEDS; i++) {
      const dungeon = new Dungeon();
      dungeon.generateLevel(1 + (i % 8));

      const nowhereDoors = findDoorTiles(dungeon).filter(({ x, y }) => {
        const neighbors = [
          dungeon.getTile(x + 1, y), dungeon.getTile(x - 1, y),
          dungeon.getTile(x, y + 1), dungeon.getTile(x, y - 1),
        ];
        return neighbors.filter(t => WALKABLE.has(t)).length < 2;
      });

      expect(nowhereDoors, `seed ${i}: puertas sin salida ${JSON.stringify(nowhereDoors)}`).toHaveLength(0);
    }
  });

  it("toda puerta es un vano de una celda: 2 muros a los lados o arriba y abajo", () => {
    for (let i = 0; i < SEEDS; i++) {
      const dungeon = new Dungeon();
      dungeon.generateLevel(1 + (i % 8));

      const invalid = findDoorTiles(dungeon).filter(({ x, y }) => {
        const left = dungeon.getTile(x - 1, y);
        const right = dungeon.getTile(x + 1, y);
        const up = dungeon.getTile(x, y - 1);
        const down = dungeon.getTile(x, y + 1);

        const verticalPass = left === TILE.WALL && right === TILE.WALL &&
          WALKABLE.has(up) && WALKABLE.has(down);
        const horizontalPass = up === TILE.WALL && down === TILE.WALL &&
          WALKABLE.has(left) && WALKABLE.has(right);

        return !verticalPass && !horizontalPass;
      });

      expect(invalid, `seed ${i}: puertas sin 2 muros enfrentados ${JSON.stringify(invalid)}`).toHaveLength(0);
    }
  });

  it("mantiene sincronizado room.doors con las puertas reales del grid", () => {
    for (let i = 0; i < SEEDS; i++) {
      const dungeon = new Dungeon();
      dungeon.generateLevel(1 + (i % 8));

      const desynced = dungeon.rooms.flatMap(room =>
        room.doors.filter(d => dungeon.getTile(d.x, d.y) !== TILE.DOOR)
      );

      expect(desynced, `seed ${i}: room.doors apunta a celdas que no son puerta`).toHaveLength(0);
    }
  });

  it("todas las salas son alcanzables desde la sala inicial", () => {
    for (let i = 0; i < SEEDS; i++) {
      const dungeon = new Dungeon();
      dungeon.generateLevel(1 + (i % 8));

      const reachable = reachableFromStart(dungeon);
      const unreachable = dungeon.rooms.filter(r => !reachable.has(`${r.centerX},${r.centerY}`));

      expect(unreachable, `seed ${i}: salas inalcanzables`).toHaveLength(0);
    }
  });

  it("no genera tiras largas de puertas seguidas (muro convertido casi entero en puertas)", () => {
    for (let i = 0; i < SEEDS; i++) {
      const dungeon = new Dungeon();
      dungeon.generateLevel(1 + (i % 8));

      const longest = longestStraightDoorRun(findDoorTiles(dungeon));
      expect(longest, `seed ${i}: tira de ${longest} puertas seguidas`).toBeLessThanOrEqual(4);
    }
  });

  it("nunca puebla un piso por encima del máximo de enemigos para su dificultad", () => {
    const difficulties: Difficulty[] = ["easy", "normal", "hard"];
    for (let i = 0; i < SEEDS; i++) {
      const floor = 1 + (i % 8);
      const difficulty = difficulties[i % difficulties.length];
      const dungeon = new Dungeon();
      dungeon.generateLevel(floor, difficulty);

      const max = getMaxEnemies(floor, difficulty);
      expect(
        dungeon.enemies.length,
        `seed ${i}: piso ${floor}/${difficulty} — ${dungeon.enemies.length} enemigos, máximo ${max}`
      ).toBeLessThanOrEqual(max);
    }
  });
});
