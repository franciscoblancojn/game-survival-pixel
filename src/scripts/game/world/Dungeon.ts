import { TILE, MAP_WIDTH, MAP_HEIGHT, DEFAULT_DIFFICULTY } from '../../constants.js';
import { Room } from './Room.js';
import { Tile } from './Tile.js';
import { getMaxEnemies, createEnemyInstance } from '../systems/SpawnSystem.js';
import { createItemInstance } from '../systems/ItemSystem.js';
import { createNpcInstances } from '../systems/NpcSystem.js';
import type { TileType, EnemyInstance, ItemInstance, NpcInstance, Difficulty } from '../../types.js';

/**
 * Todo lo que hace falta para volver a pararse en un piso exactamente como
 * quedó — vivo en memoria (rooms son instancias reales de `Room`, no la
 * forma serializable `RoomData`). Ver `Dungeon.floorCache`/`goToFloor` y la
 * skill npc-trading.
 */
export interface FloorState {
  floor: number;
  grid: TileType[][];
  rooms: Room[];
  enemies: EnemyInstance[];
  items: ItemInstance[];
  npcs: NpcInstance[];
}

export class Dungeon {
  public width: number;
  public height: number;
  public grid: TileType[][];
  public rooms: Room[];
  public corridors: { x: number; y: number }[][];
  public enemies: EnemyInstance[];
  public items: ItemInstance[];
  public npcs: NpcInstance[];
  public floor: number;
  /** Posición de la escalera de subida de este piso, o null si no tiene (el mercado). */
  public stairsUpPos: { x: number; y: number } | null;
  /** Posición de la escalera de bajada de este piso. */
  public stairsDownPos: { x: number; y: number } | null;
  /**
   * Pisos ya visitados y abandonados, tal cual quedaron — `goToFloor` los
   * restaura en vez de generar uno nuevo. Nunca incluye el piso activo
   * (`this.floor`), que vive en los campos de arriba. Pública para que
   * `Game.saveGame`/`loadFromSlot` puedan serializarla/reconstruirla. Ver
   * skill npc-trading.
   */
  public floorCache: Map<number, FloorState>;

  constructor() {
    this.width = MAP_WIDTH;
    this.height = MAP_HEIGHT;
    this.grid = [];
    this.rooms = [];
    this.corridors = [];
    this.enemies = [];
    this.items = [];
    this.npcs = [];
    this.floor = 1;
    this.stairsUpPos = null;
    this.stairsDownPos = null;
    this.floorCache = new Map();
    this.initGrid();
  }

  initGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = TILE.VOID;
      }
    }
  }

  getTile(x: number, y: number): TileType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return TILE.VOID;
    }
    return this.grid[y][x];
  }

  setTile(x: number, y: number, type: TileType): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y][x] = type;
    }
  }

  getEnemyAt(x: number, y: number): EnemyInstance | undefined {
    return this.enemies.find(e => e.x === x && e.y === y && e.hp > 0);
  }

  getItemAt(x: number, y: number): ItemInstance | undefined {
    return this.items.find(i => i.x === x && i.y === y);
  }

  getNpcAt(x: number, y: number): NpcInstance | undefined {
    return this.npcs.find(n => n.x === x && n.y === y);
  }

  /**
   * Recalcula `stairsUpPos`/`stairsDownPos` recorriendo el grid en busca de
   * TILE.STAIRS_UP/STAIRS_DOWN — el grid ya persiste en el guardado (a
   * diferencia de estos dos campos, que no se serializan aparte), así que
   * cargar una ranura solo necesita esto para dejarlos consistentes de
   * nuevo. Un piso sin una de las dos escaleras (el mercado no tiene
   * STAIRS_UP) deja ese campo en null.
   */
  recomputeStairsFromGrid(): void {
    this.stairsUpPos = null;
    this.stairsDownPos = null;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === TILE.STAIRS_UP) this.stairsUpPos = { x, y };
        else if (this.grid[y][x] === TILE.STAIRS_DOWN) this.stairsDownPos = { x, y };
      }
    }
  }

  private captureFloorState(): FloorState {
    return {
      floor: this.floor,
      grid: this.grid,
      rooms: this.rooms,
      enemies: this.enemies,
      items: this.items,
      npcs: this.npcs,
    };
  }

  private applyFloorState(state: FloorState): void {
    this.floor = state.floor;
    this.grid = state.grid;
    this.rooms = state.rooms;
    this.enemies = state.enemies;
    this.items = state.items;
    this.npcs = state.npcs;
    this.recomputeStairsFromGrid();
  }

  /**
   * Cambia al piso `floor` — si ya se había visitado y abandonado antes, lo
   * restaura EXACTAMENTE como quedó (enemigos con su vida actual, items ya
   * recogidos del suelo, muros iguales) en vez de generar uno nuevo. Antes
   * subir y volver a bajar (o viceversa) regeneraba el piso cada vez, así
   * que "el mismo piso" en realidad era uno distinto cada visita.
   *
   * El piso que se abandona se guarda en `floorCache` ANTES de decidir qué
   * hacer con el destino — así, aunque el destino sea nuevo (primera
   * visita), el piso de origen queda cacheado para la próxima vez que se
   * vuelva a él.
   */
  goToFloor(floor: number, difficulty: Difficulty = DEFAULT_DIFFICULTY): void {
    this.floorCache.set(this.floor, this.captureFloorState());

    const cached = this.floorCache.get(floor);
    if (cached) {
      this.floorCache.delete(floor);
      this.applyFloorState(cached);
      return;
    }

    if (floor === 0) this.generateMarket();
    else this.generateLevel(floor, difficulty);
  }

  removeEnemy(enemy: EnemyInstance): void {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
  }

  removeItem(item: ItemInstance): void {
    const idx = this.items.indexOf(item);
    if (idx !== -1) this.items.splice(idx, 1);
  }

  /**
   * Coloca hasta `numRooms` salas rectangulares sin solaparse (margin=2) en
   * `this.rooms`. Empieza con salas 5-10 y, si con eso no alcanza el
   * objetivo (mapa ya muy lleno — típico cuando el mínimo de salas del
   * piso, `5 + ceil(piso/3)`, empieza a pedir más de las que entran
   * cómodas a ese tamaño), reintenta con salas cada vez más chicas hasta
   * 4x4 — medido empíricamente, esto lleva la tasa de "no llegó al
   * mínimo" de ~50-90% a ~0.3%. Sigue siendo mejor esfuerzo, no una
   * garantía absoluta: un mapa ya saturado en 4x4 se queda con lo que
   * entró.
   */
  private placeRooms(numRooms: number): void {
    let minRoomSize = 5;
    let maxRoomSize = 10;

    for (let round = 0; round < 8; round++) {
      this.rooms = [];

      for (let i = 0; i < numRooms * 30; i++) {
        if (this.rooms.length >= numRooms) break;

        const w = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1));
        const h = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1));
        const x = 2 + Math.floor(Math.random() * (this.width - w - 4));
        const y = 2 + Math.floor(Math.random() * (this.height - h - 4));

        const newRoom = new Room(x, y, w, h, 'normal');
        const overlapsAny = this.rooms.some(existing => newRoom.overlaps(existing));
        if (!overlapsAny) this.rooms.push(newRoom);
      }

      if (this.rooms.length >= numRooms || maxRoomSize <= 4) return;

      maxRoomSize = Math.max(4, maxRoomSize - 1);
      minRoomSize = Math.min(minRoomSize, maxRoomSize);
    }
  }

  generateLevel(floor: number, difficulty: Difficulty = DEFAULT_DIFFICULTY): void {
    this.floor = floor;
    this.initGrid();
    this.rooms = [];
    this.corridors = [];
    this.enemies = [];
    this.items = [];
    this.npcs = [];
    this.stairsUpPos = null;
    this.stairsDownPos = null;

    // Generate rooms — mínimo 5 + ceil(piso / 3), con variedad extra por
    // encima de ese mínimo.
    const minRooms = 5 + Math.ceil(floor / 3);
    const numRooms = minRooms + Math.floor(Math.random() * 4);
    this.placeRooms(numRooms);

    // Con menos de 3 salas no hay forma de darle 2-3 puertas a cada una
    // (con 2 salas el único par posible ya dejaría a ambas en grado 1) —
    // fallback a la sala aislada de prueba, mismo criterio que con <2.
    if (this.rooms.length < 3) {
      this.generateTestRoom();
      return;
    }

    this.rooms[0].type = 'start';

    for (let i = 1; i < this.rooms.length; i++) {
      const roll = Math.random();
      if (roll < 0.35) {
        this.rooms[i].type = 'normal';
      } else if (roll < 0.55) {
        this.rooms[i].type = 'enemy';
      } else if (roll < 0.70) {
        this.rooms[i].type = 'treasure';
      } else if (roll < 0.85) {
        this.rooms[i].type = 'workshop';
      } else {
        this.rooms[i].type = 'trap';
      }
    }

    // Cada 5 pisos hay una sala de comerciantes — nunca la inicial (ahí ya
    // aparece el jugador). Reemplaza el tipo que le haya tocado en el
    // sorteo de arriba: una sala de comerciantes no tiene enemigos/tesoro
    // propios (placeEnemies/placeItems no reconocen 'merchant', así que
    // simplemente no le agregan nada de eso). Ver skill npc-trading.
    let merchantRoom: Room | null = null;
    if (floor > 0 && floor % 5 === 0) {
      merchantRoom = this.rooms[1 + Math.floor(Math.random() * (this.rooms.length - 1))];
      merchantRoom.type = 'merchant';
    }

    for (const room of this.rooms) {
      room.writeTiles(this.grid);
    }

    // Conecta las salas de forma que TODAS terminen con 2 o 3 puertas
    // (grado 2-3 en el grafo de salas) — nunca menos de 2 ni más de 3. Ver
    // skill map-generation.
    this.connectRoomsWithDoorBudget();

    // Normaliza las puertas y repara salas que se quedaron con menos
    // puertas *registradas* de las que el paso de arriba pretendía
    // (esquinas, dobles selladas) — ver `ensureRoomDoorBudget`. Todo esto
    // ANTES de los muros internos: `addInternalWalls` usa `room.doors`, así
    // que necesita la lista ya depurada y final.
    this.enforceDoorRule();
    this.ensureRoomDoorBudget();

    for (const room of this.rooms) {
      if (room.width >= 7 && room.height >= 7) {
        const wallCount = 1 + Math.floor(Math.random() * 3);
        room.addInternalWalls(this.grid, wallCount);
      }
    }

    // No se agrega una "puerta de relleno" para salas sin `doors`: todas las
    // salas ya quedaron conectadas por pasillos reales en el bucle de arriba
    // (registrados vía registerCorridorDoor en carveCorridor). Añadir una
    // puerta decorativa aquí era la causa de puertas que no llevan a ningún
    // lado y de puertas dobles junto a una puerta real.

    this.placeEnemies(floor, difficulty);
    this.placeItems(floor);
    if (merchantRoom) {
      this.npcs = createNpcInstances(merchantRoom, this.grid);
    }

    // Escalera de entrada (sube al piso anterior, o al mercado desde el
    // piso 1) en el centro de la sala inicial, y de salida (baja al
    // siguiente piso) en el centro de la última sala — mismas posiciones
    // que ya usa el jugador para aparecer al llegar a este piso desde
    // cualquiera de las dos direcciones. Ver skill npc-trading.
    const startRoom = this.rooms[0];
    this.stairsUpPos = { x: startRoom.centerX, y: startRoom.centerY };
    this.grid[startRoom.centerY][startRoom.centerX] = TILE.STAIRS_UP;

    const lastRoom = this.rooms[this.rooms.length - 1];
    this.stairsDownPos = { x: lastRoom.centerX, y: lastRoom.centerY };
    this.grid[lastRoom.centerY][lastRoom.centerX] = TILE.STAIRS_DOWN;
  }

  generateTestRoom(): void {
    this.rooms = [];
    this.enemies = [];
    this.items = [];
    this.npcs = [];
    this.stairsUpPos = null;
    this.stairsDownPos = null;

    const roomW = 12;
    const roomH = 10;
    const roomX = Math.floor((this.width - roomW) / 2);
    const roomY = Math.floor((this.height - roomH) / 2);

    const room = new Room(roomX, roomY, roomW, roomH, 'start');
    room.writeTiles(this.grid);
    room.explored = true;
    this.rooms.push(room);

    const door = room.addDoor('south');
    this.grid[door.y][door.x] = TILE.DOOR;

    room.addInternalWalls(this.grid, 3);

    for (let i = 0; i < 2; i++) {
      const pos = room.getRandomFloorPosition(this.grid);
      if (Math.abs(pos.x - room.centerX) > 1 || Math.abs(pos.y - room.centerY) > 1) {
        // Mismo camino que placeEnemies: elige de ENEMY_DEFINITIONS
        // (src/assets/enemies/) — no hardcodear una lista de tipos acá, se
        // desincroniza (ver skill enemy-definitions).
        this.enemies.push(createEnemyInstance(1, pos.x, pos.y, `enemy_${Date.now()}_${i}`));
      }
    }

    const testItems = ['rusty_sword', 'worn_tunic', 'wood', 'stone', 'health_potion'];
    for (const itemType of testItems) {
      const pos = room.getRandomFloorPosition(this.grid);
      const item = createItemInstance(itemType, pos.x, pos.y, `item_${Date.now()}_${itemType}`);
      if (item) this.items.push(item);
    }

    this.stairsUpPos = { x: room.centerX, y: room.centerY };
    this.grid[room.centerY][room.centerX] = TILE.STAIRS_UP;

    this.stairsDownPos = { x: room.centerX, y: room.centerY + 1 };
    this.grid[room.centerY + 1][room.centerX] = TILE.STAIRS_DOWN;
  }

  /**
   * El mercado — piso 0, siempre igual (no procedural). Se entra subiendo
   * las escaleras del piso 1 (`Game.goUpStairs`) y se sale bajando las de
   * acá, que llevan de vuelta a un piso 1 recién generado. Sin enemigos, sin
   * `stairsUpPos` (es la cima, no hay nada más arriba). Los NPCs son
   * siempre los mismos — TODOS los registrados en NPC_DEFINITIONS
   * (src/assets/npc/), no una selección al azar como los enemigos. Ver
   * skill npc-trading.
   */
  generateMarket(): void {
    this.floor = 0;
    this.initGrid();
    this.rooms = [];
    this.corridors = [];
    this.enemies = [];
    this.items = [];
    this.npcs = [];
    this.stairsUpPos = null;
    this.stairsDownPos = null;

    const roomW = 16;
    const roomH = 10;
    const roomX = Math.floor((this.width - roomW) / 2);
    const roomY = Math.floor((this.height - roomH) / 2);

    const room = new Room(roomX, roomY, roomW, roomH, 'market');
    room.writeTiles(this.grid);
    room.explored = true;
    this.rooms.push(room);

    // Antes de colocar los NPCs: getRandomFloorPosition() exige TILE.FLOOR,
    // así que la escalera ya escrita en el grid queda protegida de que un
    // NPC caiga justo ahí (bloquearía la transición de piso — TurnSystem
    // chequea NPC antes que escalera al pisar una celda).
    this.stairsDownPos = { x: room.centerX, y: room.y + room.height - 2 };
    this.grid[this.stairsDownPos.y][this.stairsDownPos.x] = TILE.STAIRS_DOWN;

    this.npcs = createNpcInstances(room, this.grid);
  }

  private static pairKey(i: number, j: number): string {
    return i < j ? `${i}-${j}` : `${j}-${i}`;
  }

  private roomDistSq(i: number, j: number): number {
    const dx = this.rooms[i].centerX - this.rooms[j].centerX;
    const dy = this.rooms[i].centerY - this.rooms[j].centerY;
    return dx * dx + dy * dy;
  }

  /**
   * Recorrido de vecino más cercano sobre `this.rooms`: arranca en la sala
   * 0 y en cada paso salta a la sala no visitada más cercana a la última.
   * Conectar en ESTE orden (en vez del orden de colocación, que es
   * espacialmente arbitrario) mantiene los pasillos cortos y directos —
   * clave para `ensureRoomDoorBudget`: un pasillo largo entre salas lejanas
   * tiene mucha más chance de bordear/rozar el muro de una sala DISTINTA
   * de las dos que se querían conectar, y `registerCorridorDoor` le
   * atribuye esa puerta a la sala que sea (por `contains()`), no a las dos
   * pensadas — inflando su cuenta de puertas por accidente.
   */
  private nearestNeighborTour(): number[] {
    const n = this.rooms.length;
    const visited = new Array(n).fill(false);
    const tour = [0];
    visited[0] = true;

    for (let step = 1; step < n; step++) {
      const last = tour[tour.length - 1];
      let best = -1;
      let bestDist = Infinity;
      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        const dist = this.roomDistSq(last, j);
        if (dist < bestDist) {
          bestDist = dist;
          best = j;
        }
      }
      tour.push(best);
      visited[best] = true;
    }

    return tour;
  }

  /** `candidates` ordenados por cercanía a `from` — para preferir conexiones cortas al agregar puertas extra/de reparación. */
  private sortByDistanceTo(from: number, candidates: number[]): number[] {
    return [...candidates].sort((a, b) => this.roomDistSq(from, a) - this.roomDistSq(from, b));
  }

  /**
   * Conecta `this.rooms` de forma que TODAS terminen con grado 2 o 3 en el
   * grafo de salas (2 o 3 puertas cada una) — nunca menos de 2 (toda sala
   * queda con más de una salida) ni más de 3.
   *
   * 1. Anillo por cercanía (`nearestNeighborTour`): sala del recorrido k con
   *    la k+1, y la última con la primera. Con N salas (N siempre ≥ 3 acá —
   *    antes de llamar esto ya se descartó el caso N<3 con
   *    `generateTestRoom`) esto deja a CADA sala en grado exactamente 2.
   * 2. Extra: por sala, ~50% de probabilidad de subir a 3 — se conecta con
   *    la más cercana entre las salas candidatas (grado < 3, no conectada
   *    todavía). Si no hay candidata válida, se queda en 2 (una sala nunca
   *    se queda en 1 salida por esto, la garantía es del punto 1).
   *
   * El anillo por sí solo ya garantiza que todas las salas quedan
   * conectadas en un solo componente (es un ciclo que las visita a todas),
   * así que esto no rompe la invariante de conectividad de `map-generation`.
   */
  private connectRoomsWithDoorBudget(): void {
    const n = this.rooms.length;
    const degree = new Array(n).fill(0);
    const connectedPairs = new Set<string>();
    const tour = this.nearestNeighborTour();

    for (let k = 0; k < n; k++) {
      const i = tour[k];
      const j = tour[(k + 1) % n];
      const key = Dungeon.pairKey(i, j);
      if (connectedPairs.has(key)) continue; // n === 2 (no debería pasar, ver guard de arriba): evita carvar el mismo par dos veces
      connectedPairs.add(key);
      this.connectRooms(this.rooms[i], this.rooms[j]);
      degree[i]++;
      degree[j]++;
    }

    for (let i = 0; i < n; i++) {
      if (degree[i] >= 3) continue;
      if (Math.random() < 0.5) continue;

      const candidates: number[] = [];
      for (let j = 0; j < n; j++) {
        if (j === i || degree[j] >= 3 || connectedPairs.has(Dungeon.pairKey(i, j))) continue;
        candidates.push(j);
      }
      if (candidates.length === 0) continue;

      const nearest = this.sortByDistanceTo(i, candidates);
      const j = nearest[0];
      connectedPairs.add(Dungeon.pairKey(i, j));
      this.connectRooms(this.rooms[i], this.rooms[j]);
      degree[i]++;
      degree[j]++;
    }

  }

  /**
   * `connectRoomsWithDoorBudget` decide CUÁNTAS conexiones intenta cada
   * sala, pero no todo intento termina en una puerta registrada: el punto
   * de quiebre de un pasillo en L a veces cae justo en una esquina de la
   * sala (o `enforceDoorRule` termina degradándolo a `CORRIDOR` para no
   * aislar otra sala) — ver la nota de "esquinas" en la skill
   * map-generation. Eso puede dejar a una sala con menos puertas
   * *registradas* de las que el grafo de conexión pretendía.
   *
   * Esta pasada corre DESPUÉS de `enforceDoorRule()` (que es cuando
   * `room.doors` ya refleja la realidad) y repara: mientras una sala tenga
   * menos de 2 puertas, se le agrega una conexión nueva hacia la sala
   * candidata más cercana con la que no se había intentado todavía, y se
   * vuelve a correr `enforceDoorRule()`. Hasta 3 pasadas — es un intento de
   * mejor esfuerzo, no una garantía absoluta: en una sala minúscula
   * rodeada de esquinas podría seguir quedando en 1 puerta.
   */
  private ensureRoomDoorBudget(): void {
    const n = this.rooms.length;
    const attemptsPerPair = new Map<string, number>();
    const MAX_ATTEMPTS_PER_PAIR = 2; // `connectRooms` sortea el orden del recodo en L — un segundo intento al mismo par puede tomar un camino distinto y sí registrar la puerta

    for (let pass = 0; pass < 8; pass++) {
      let changed = false;

      for (let i = 0; i < n; i++) {
        if (this.rooms[i].doors.length >= 2) continue;

        const candidates: number[] = [];
        for (let j = 0; j < n; j++) {
          if (j === i || this.rooms[j].doors.length >= 3) continue;
          // A diferencia de `connectRoomsWithDoorBudget`, acá SÍ se permite
          // reintentar un par ya conectado antes: si esa conexión no llegó
          // a registrar una puerta para `i` (esquina, sellado de
          // `enforceDoorRule`), es la única forma de recuperarla.
          const key = Dungeon.pairKey(i, j);
          if ((attemptsPerPair.get(key) ?? 0) >= MAX_ATTEMPTS_PER_PAIR) continue;
          candidates.push(j);
        }
        if (candidates.length === 0) continue;

        // Prueba las candidatas de más cerca a más lejos hasta que UNA
        // realmente aumente `room.doors.length` — un intento puede fallar
        // en silencio (esquina, ver nota de arriba), y si no volvemos a
        // chequear enseguida (`enforceDoorRule` por intento, no recién al
        // final de la pasada) quedaría sin detectarlo hasta la próxima
        // pasada, o nunca si se acaban las pasadas.
        const before = this.rooms[i].doors.length;
        for (const j of this.sortByDistanceTo(i, candidates)) {
          if (this.rooms[j].doors.length >= 3) continue; // pudo cambiar en un intento anterior de esta misma pasada
          const key = Dungeon.pairKey(i, j);
          attemptsPerPair.set(key, (attemptsPerPair.get(key) ?? 0) + 1);
          this.connectRooms(this.rooms[i], this.rooms[j]);
          this.enforceDoorRule();
          changed = true;
          if (this.rooms[i].doors.length > before) break;
        }
      }

      if (!changed) break;
    }
  }

  connectRooms(roomA: Room, roomB: Room): void {
    const ax = roomA.centerX;
    const ay = roomA.centerY;
    const bx = roomB.centerX;
    const by = roomB.centerY;

    if (Math.random() < 0.5) {
      this.carveCorridor(ax, ay, bx, ay);
      this.carveCorridor(bx, ay, bx, by);
    } else {
      this.carveCorridor(ax, ay, ax, by);
      this.carveCorridor(ax, by, bx, by);
    }
  }

  carveCorridor(x1: number, y1: number, x2: number, y2: number): void {
    const dx = x2 === x1 ? 0 : (x2 > x1 ? 1 : -1);
    const dy = y2 === y1 ? 0 : (y2 > y1 ? 1 : -1);

    let x = x1;
    let y = y1;
    let prevX = x1;
    let prevY = y1;
    const corridor: { x: number; y: number }[] = [];

    while (x !== x2 || y !== y2) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        if (this.grid[y][x] === TILE.VOID) {
          this.grid[y][x] = TILE.CORRIDOR;
          corridor.push({ x, y });
        } else if (this.grid[y][x] === TILE.WALL) {
          // Solo es una PUERTA si este muro es un cruce real hacia el
          // interior de una sala: venimos de FLOOR (salimos de una sala) o
          // el siguiente paso entra directo a FLOOR (entramos a otra). Si
          // no, el pasillo está corriendo en PARALELO a un muro — p. ej.
          // bordea el lateral de una sala que ni siquiera es el origen o
          // destino de esta conexión — y convertir toda esa tira en puertas
          // dejaba salas sin muro en ese lado (la causa real de las
          // "puertas dobles"/múltiples que no llevan a ningún sitio).
          // En ese caso lo abrimos igual para no cortar el camino, pero
          // como pasillo, no como puerta.
          const cameFromFloor = this.getTile(prevX, prevY) === TILE.FLOOR;
          const entersFloor = this.getTile(x + dx, y + dy) === TILE.FLOOR;
          if (cameFromFloor || entersFloor) {
            this.grid[y][x] = TILE.DOOR;
            corridor.push({ x, y });
            this.registerCorridorDoor(x, y);
          } else {
            this.grid[y][x] = TILE.CORRIDOR;
            corridor.push({ x, y });
          }
        }
      }
      prevX = x;
      prevY = y;
      if (x !== x2) x += dx;
      else if (y !== y2) y += dy;
    }

    if (corridor.length > 0) {
      this.corridors.push(corridor);
    }
  }

  /**
   * Registra en `room.doors` una puerta que un pasillo acaba de carvar en el
   * muro de esa sala (antes esto nunca pasaba: `carveCorridor` dibujaba la
   * puerta en el grid pero jamás la anotaba en `Room.doors`, así que
   * `generateLevel` creía que la sala no tenía puerta y le agregaba una
   * decorativa en una posición aleatoria — sin pasillo detrás. Eso producía
   * tanto puertas que no llevan a ningún lado como puertas dobles).
   */
  private registerCorridorDoor(x: number, y: number): void {
    const room = this.rooms.find(r => r.contains(x, y));
    if (!room) return;
    if (room.doors.some(d => d.x === x && d.y === y)) return;

    let side = 'north';
    if (x === room.x) side = 'west';
    else if (x === room.x + room.width - 1) side = 'east';
    else if (y === room.y) side = 'north';
    else if (y === room.y + room.height - 1) side = 'south';

    room.doors.push({ x, y, side, connected: true });
  }

  /**
   * REGLA DE PUERTAS: una puerta es siempre un vano de UNA celda dentro de un
   * muro — muros a izquierda y derecha (paso vertical) o arriba y abajo (paso
   * horizontal), con las dos celdas del eje de paso transitables.
   *
   * `carveCorridor` no puede garantizarlo por sí solo: decide DOOR/CORRIDOR
   * mirando solo el trayecto actual, y una segunda conexión puede perforar el
   * mismo muro en la celda contigua (vano de 2 → puertas "dobles") o rodear de
   * pasillo una celda ya convertida en puerta. Por eso la regla se aplica en
   * esta pasada posterior, cuando el grid ya está completo.
   */
  private isValidDoorPlacement(x: number, y: number): boolean {
    const left = this.getTile(x - 1, y);
    const right = this.getTile(x + 1, y);
    const up = this.getTile(x, y - 1);
    const down = this.getTile(x, y + 1);

    const verticalPass = left === TILE.WALL && right === TILE.WALL &&
      Tile.isWalkable(up) && Tile.isWalkable(down);
    const horizontalPass = up === TILE.WALL && down === TILE.WALL &&
      Tile.isWalkable(left) && Tile.isWalkable(right);

    return verticalPass || horizontalPass;
  }

  private doorTiles(): { x: number; y: number }[] {
    const doors: { x: number; y: number }[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === TILE.DOOR) doors.push({ x, y });
      }
    }
    return doors;
  }

  private unregisterDoor(x: number, y: number): void {
    for (const room of this.rooms) {
      const idx = room.doors.findIndex(d => d.x === x && d.y === y);
      if (idx !== -1) room.doors.splice(idx, 1);
    }
  }

  /** Flood fill: ¿siguen todas las salas conectadas con la sala inicial? */
  private allRoomsConnected(): boolean {
    if (this.rooms.length === 0) return true;
    const start = this.rooms[0];
    const seen = new Set<number>([start.centerY * this.width + start.centerX]);
    const stack: [number, number][] = [[start.centerX, start.centerY]];

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const neighbors: [number, number][] = [
        [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        const key = ny * this.width + nx;
        if (seen.has(key)) continue;
        if (!Tile.isWalkable(this.grid[ny][nx])) continue;
        seen.add(key);
        stack.push([nx, ny]);
      }
    }

    return this.rooms.every(r => seen.has(r.centerY * this.width + r.centerX));
  }

  /**
   * Borra los pasillos que no llevan a ningún lado (callejones sin salida).
   * Una celda con 1 o 0 vecinos transitables nunca está en el camino entre dos
   * celdas distintas, así que quitarla jamás rompe la conectividad. Devuelve
   * true si borró algo.
   */
  private pruneDeadEndCorridors(): boolean {
    let removedAny = false;
    let removed = true;

    while (removed) {
      removed = false;
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[y][x] !== TILE.CORRIDOR) continue;
          const walkable = [
            this.getTile(x + 1, y), this.getTile(x - 1, y),
            this.getTile(x, y + 1), this.getTile(x, y - 1),
          ].filter(t => Tile.isWalkable(t)).length;
          if (walkable <= 1) {
            this.grid[y][x] = TILE.VOID;
            removed = true;
            removedAny = true;
          }
        }
      }
    }

    return removedAny;
  }

  /**
   * Aberturas del anillo de muro de cada sala (DOOR o CORRIDOR), sin repetir.
   * Son las candidatas a puerta: lo que entra o sale de una sala.
   */
  private wallOpenings(): { x: number; y: number }[] {
    const seen = new Set<number>();
    const openings: { x: number; y: number }[] = [];

    for (const room of this.rooms) {
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          const isBorder = y === room.y || y === room.y + room.height - 1 ||
            x === room.x || x === room.x + room.width - 1;
          if (!isBorder) continue;
          const tile = this.grid[y][x];
          if (tile !== TILE.DOOR && tile !== TILE.CORRIDOR) continue;
          const key = y * this.width + x;
          if (seen.has(key)) continue;
          seen.add(key);
          openings.push({ x, y });
        }
      }
    }

    return openings;
  }

  /**
   * Aplica la regla de puertas sobre el grid ya carvado.
   *
   * Toda abertura en el muro de una sala que no sea un vano de UNA celda se
   * intenta SELLAR como muro — así el vano de 2 celdas que dejaban dos pasillos
   * contiguos queda reducido a uno solo, que sí cumple la regla — y solo se
   * sella si el nivel sigue conexo. Si sellarla dejaría una sala inalcanzable
   * se deja abierta, pero como CORRIDOR: nunca se corta el paso (ver
   * `carveCorridor`) y deja de ser puerta, que es lo que la regla exige.
   */
  private enforceDoorRule(): void {
    for (let pass = 0; pass < 4; pass++) {
      let changed = this.pruneDeadEndCorridors();

      for (const { x, y } of this.wallOpenings()) {
        const current = this.grid[y][x];
        if (current !== TILE.DOOR && current !== TILE.CORRIDOR) continue;
        if (this.isValidDoorPlacement(x, y)) continue;

        this.grid[y][x] = TILE.WALL;
        if (this.allRoomsConnected()) {
          this.unregisterDoor(x, y);
          changed = true;
          continue;
        }
        this.grid[y][x] = current;
      }

      if (!changed) break;
    }

    // Lo que no se pudo sellar sin aislar una sala queda abierto como pasillo,
    // nunca como puerta que rompa la regla.
    for (const { x, y } of this.doorTiles()) {
      if (this.isValidDoorPlacement(x, y)) continue;
      this.grid[y][x] = TILE.CORRIDOR;
      this.unregisterDoor(x, y);
    }

    this.promoteWallOpenings();
  }

  /**
   * Al revés que el sellado: un vano en el muro de una sala que quedó como
   * CORRIDOR (porque `carveCorridor` lo abrió sin considerarlo cruce real, o
   * porque esta misma pasada degradó su vecino) pasa a ser PUERTA si cumple la
   * regla. Solo se mira el anillo de muro de cada sala — un pasillo suelto que
   * casualmente tenga muros a los lados no es una puerta, es un pasillo.
   */
  private promoteWallOpenings(): void {
    for (const room of this.rooms) {
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          const isBorder = y === room.y || y === room.y + room.height - 1 ||
            x === room.x || x === room.x + room.width - 1;
          if (!isBorder) continue;
          if (this.grid[y][x] !== TILE.CORRIDOR) continue;
          if (!this.isValidDoorPlacement(x, y)) continue;

          this.grid[y][x] = TILE.DOOR;
          this.registerCorridorDoor(x, y);
        }
      }
    }
  }

  placeEnemies(floor: number, difficulty: Difficulty = DEFAULT_DIFFICULTY): void {
    const maxEnemies = getMaxEnemies(floor, difficulty);

    for (let i = 1; i < this.rooms.length; i++) {
      if (this.enemies.length >= maxEnemies) break;

      const room = this.rooms[i];
      let count = 0;

      if (room.type === 'enemy') {
        count = 3 + Math.floor(Math.random() * 3) + Math.floor(floor * 0.3);
      } else if (room.type === 'normal') {
        count = 1 + Math.floor(Math.random() * 2);
      }

      count = Math.min(count, maxEnemies - this.enemies.length);

      for (let j = 0; j < count; j++) {
        const pos = room.getRandomFloorPosition(this.grid);
        this.enemies.push(createEnemyInstance(floor, pos.x, pos.y, `enemy_${floor}_${i}_${j}`));
      }
    }
  }

  placeItems(floor: number): void {
    const materialTypes = ['wood', 'stone', 'iron_ore', 'leather'];
    const consumableTypes = ['health_potion', 'hunger_potion', 'dried_ration'];

    for (const room of this.rooms) {
      // La sala de comerciantes (cada 5 pisos, ver skill npc-trading) no
      // recibe materiales sueltos: el suelo lo ocupan los NPCs
      // (createNpcInstances), y un item debajo de un NPC quedaría
      // inalcanzable — TurnSystem abre el comercio al pisar esa celda,
      // antes de llegar a recogerlo.
      if (room.type !== 'merchant' && Math.random() < 0.6) {
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const pos = room.getRandomFloorPosition(this.grid);
          const type = materialTypes[Math.floor(Math.random() * materialTypes.length)];
          const item = createItemInstance(type, pos.x, pos.y, `item_${floor}_${room.x}_${room.y}_${i}`);
          if (item) this.items.push(item);
        }
      }

      if (room.type === 'treasure') {
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const pos = room.getRandomFloorPosition(this.grid);
          const allItems = [...materialTypes, ...consumableTypes,
            'rusty_sword', 'stone_axe', 'worn_tunic'];
          const type = allItems[Math.floor(Math.random() * allItems.length)];
          const item = createItemInstance(type, pos.x, pos.y, `item_${floor}_${room.x}_${room.y}_treasure_${i}`);
          if (item) this.items.push(item);
        }
      }

      if (room.type === 'workshop') {
        const pos = room.getRandomFloorPosition(this.grid);
        const type = consumableTypes[Math.floor(Math.random() * consumableTypes.length)];
        const item = createItemInstance(type, pos.x, pos.y, `item_${floor}_${room.x}_${room.y}_workshop`);
        if (item) this.items.push(item);
      }
    }
  }
}
