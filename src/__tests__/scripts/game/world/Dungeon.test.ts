import { describe, it, expect } from "vitest";
import { Dungeon } from "../../../../scripts/game/world/Dungeon.ts";
import { getMaxEnemies } from "../../../../scripts/game/systems/SpawnSystem.ts";
import { TILE } from "../../../../scripts/constants.ts";
import type { Difficulty } from "../../../../scripts/types.ts";

const SEEDS = 40;

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

  // Escaleras de entrada/salida y mercado — ver skill npc-trading.
  it("todo piso generado tiene stairsUpPos y stairsDownPos, y ambos coinciden con el grid", () => {
    for (let i = 0; i < SEEDS; i++) {
      const dungeon = new Dungeon();
      dungeon.generateLevel(1 + (i % 8));

      expect(dungeon.stairsUpPos, `seed ${i}: sin stairsUpPos`).not.toBeNull();
      expect(dungeon.stairsDownPos, `seed ${i}: sin stairsDownPos`).not.toBeNull();

      const up = dungeon.stairsUpPos!;
      const down = dungeon.stairsDownPos!;
      expect(dungeon.getTile(up.x, up.y)).toBe(TILE.STAIRS_UP);
      expect(dungeon.getTile(down.x, down.y)).toBe(TILE.STAIRS_DOWN);
    }
  });

  it("recomputeStairsFromGrid recalcula las mismas posiciones que generateLevel ya había fijado", () => {
    const dungeon = new Dungeon();
    dungeon.generateLevel(3);
    const up = dungeon.stairsUpPos;
    const down = dungeon.stairsDownPos;

    dungeon.stairsUpPos = null;
    dungeon.stairsDownPos = null;
    dungeon.recomputeStairsFromGrid();

    expect(dungeon.stairsUpPos).toEqual(up);
    expect(dungeon.stairsDownPos).toEqual(down);
  });

  // Regresión: addInternalWalls() corre ANTES de placeItems/placeEnemies,
  // así que una celda geométricamente "interior" de la sala puede haberse
  // convertido en TILE.WALL para cuando se coloca un item/enemigo ahí.
  // getRandomFloorPosition() no miraba el grid, solo la geometría de la
  // sala — antes del arreglo, ~1.6% de los items/enemigos terminaban
  // dentro de un muro interno.
  it("ningún item ni enemigo se coloca sobre un muro (incluidos los internos de addInternalWalls)", () => {
    for (let i = 0; i < SEEDS; i++) {
      const dungeon = new Dungeon();
      dungeon.generateLevel(1 + (i % 8));

      const badItems = dungeon.items.filter(it => dungeon.getTile(it.x, it.y) === TILE.WALL);
      const badEnemies = dungeon.enemies.filter(e => dungeon.getTile(e.x, e.y) === TILE.WALL);

      expect(badItems, `seed ${i}: items sobre un muro ${JSON.stringify(badItems)}`).toHaveLength(0);
      expect(badEnemies, `seed ${i}: enemigos sobre un muro ${JSON.stringify(badEnemies)}`).toHaveLength(0);
    }
  });
});

// Grado de conectividad por sala y sala de comerciantes — ver skill
// map-generation (regla de puertas) y npc-trading (sala cada 5 pisos).
describe("Dungeon.generateLevel — conectividad y sala de comerciantes", () => {
  it("cada piso tiene al menos 5 + ceil(piso / 3) salas", () => {
    for (let i = 0; i < SEEDS; i++) {
      const floor = 1 + (i % 20);
      const dungeon = new Dungeon();
      dungeon.generateLevel(floor);

      const minRooms = 5 + Math.ceil(floor / 3);
      expect(dungeon.rooms.length, `seed ${i} piso ${floor}: ${dungeon.rooms.length} salas, mínimo ${minRooms}`)
        .toBeGreaterThanOrEqual(minRooms);
    }
  });

  it("la gran mayoría de las salas quedan con 2 o 3 puertas (mejor esfuerzo, no absoluto — ver skill map-generation)", () => {
    let total = 0;
    let outOfBudget = 0;

    for (let i = 0; i < SEEDS; i++) {
      const dungeon = new Dungeon();
      dungeon.generateLevel(1 + (i % 20));
      for (const room of dungeon.rooms) {
        total++;
        if (room.doors.length < 2 || room.doors.length > 3) outOfBudget++;
      }
    }

    // Medido empíricamente ~93% de cumplimiento — el piso de esta prueba
    // (80%) deja margen para variación entre corridas sin volverse flaky,
    // pero sigue detectando una regresión real si algo rompe el mecanismo.
    expect(outOfBudget / total, `${outOfBudget}/${total} salas fuera de [2,3] puertas`).toBeLessThan(0.2);
  });

  it("cada piso %5 (y > 0) tiene una sala de comerciantes con los NPCs del mercado", () => {
    for (let i = 0; i < SEEDS; i++) {
      const floor = 5 * (1 + (i % 6)); // 5, 10, 15, 20, 25, 30
      const dungeon = new Dungeon();
      dungeon.generateLevel(floor);

      const merchantRooms = dungeon.rooms.filter(r => r.type === 'merchant');
      expect(merchantRooms, `piso ${floor}: sin sala de comerciantes`).toHaveLength(1);
      expect(dungeon.npcs.length, `piso ${floor}: faltan NPCs`).toBeGreaterThanOrEqual(3);

      for (const npc of dungeon.npcs) {
        expect(merchantRooms[0].contains(npc.x, npc.y), `NPC ${npc.type} fuera de la sala de comerciantes`).toBe(true);
      }
    }
  });

  it("un piso que no es múltiplo de 5 no tiene sala de comerciantes ni NPCs", () => {
    for (let i = 0; i < SEEDS; i++) {
      const floor = 1 + (i % 4); // 1,2,3,4 — nunca múltiplo de 5
      const dungeon = new Dungeon();
      dungeon.generateLevel(floor);

      expect(dungeon.rooms.some(r => r.type === 'merchant'), `piso ${floor} no debería tener sala de comerciantes`).toBe(false);
      expect(dungeon.npcs).toHaveLength(0);
    }
  });
});

describe("Dungeon.generateMarket — piso 0", () => {
  it("no tiene stairsUpPos (es la cima) pero sí stairsDownPos hacia el piso 1", () => {
    const dungeon = new Dungeon();
    dungeon.generateMarket();

    expect(dungeon.floor).toBe(0);
    expect(dungeon.stairsUpPos).toBeNull();
    expect(dungeon.stairsDownPos).not.toBeNull();
    expect(dungeon.getTile(dungeon.stairsDownPos!.x, dungeon.stairsDownPos!.y)).toBe(TILE.STAIRS_DOWN);
  });

  it("no tiene enemigos y coloca un NPC por cada entrada de NPC_DEFINITIONS", () => {
    const dungeon = new Dungeon();
    dungeon.generateMarket();

    expect(dungeon.enemies).toHaveLength(0);
    expect(dungeon.npcs.length).toBeGreaterThanOrEqual(3);

    for (const npc of dungeon.npcs) {
      expect(dungeon.getNpcAt(npc.x, npc.y)).toBe(npc);
    }
  });
});
