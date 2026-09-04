import { TILE, MAP_WIDTH, MAP_HEIGHT, ITEM_TYPES, DEFAULT_DIFFICULTY } from '../../constants.js';
import { Room } from './Room.js';
import { getMaxEnemies, createEnemyInstance } from '../systems/SpawnSystem.js';
import type { TileType, EnemyInstance, ItemInstance, Difficulty } from '../../types.js';

export class Dungeon {
  public width: number;
  public height: number;
  public grid: TileType[][];
  public rooms: Room[];
  public corridors: { x: number; y: number }[][];
  public enemies: EnemyInstance[];
  public items: ItemInstance[];
  public floor: number;

  constructor() {
    this.width = MAP_WIDTH;
    this.height = MAP_HEIGHT;
    this.grid = [];
    this.rooms = [];
    this.corridors = [];
    this.enemies = [];
    this.items = [];
    this.floor = 1;
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

  removeEnemy(enemy: EnemyInstance): void {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
  }

  removeItem(item: ItemInstance): void {
    const idx = this.items.indexOf(item);
    if (idx !== -1) this.items.splice(idx, 1);
  }

  generateLevel(floor: number, difficulty: Difficulty = DEFAULT_DIFFICULTY): void {
    this.floor = floor;
    this.initGrid();
    this.rooms = [];
    this.corridors = [];
    this.enemies = [];
    this.items = [];

    // Generate rooms
    const numRooms = 5 + Math.floor(Math.random() * 4) + Math.floor(floor * 0.5);
    const minRoomSize = 5;
    const maxRoomSize = 10;

    for (let i = 0; i < numRooms * 4; i++) {
      if (this.rooms.length >= numRooms) break;

      const w = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
      const h = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
      const x = 2 + Math.floor(Math.random() * (this.width - w - 4));
      const y = 2 + Math.floor(Math.random() * (this.height - h - 4));

      const newRoom = new Room(x, y, w, h, 'normal');

      let overlaps = false;
      for (const existing of this.rooms) {
        if (newRoom.overlaps(existing)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.rooms.push(newRoom);
      }
    }

    if (this.rooms.length < 2) {
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

    for (const room of this.rooms) {
      room.writeTiles(this.grid);
    }

    const connectedPairs = new Set<string>();
    const pairKey = (a: Room, b: Room): string => {
      const ia = this.rooms.indexOf(a);
      const ib = this.rooms.indexOf(b);
      return ia < ib ? `${ia}-${ib}` : `${ib}-${ia}`;
    };

    for (let i = 0; i < this.rooms.length - 1; i++) {
      const roomA = this.rooms[i];
      const roomB = this.rooms[i + 1];
      this.connectRooms(roomA, roomB);
      connectedPairs.add(pairKey(roomA, roomB));
    }

    // Conexiones extra (crean loops) — evitamos volver a conectar un par de
    // salas que ya está unido, para no carvar un segundo pasillo/puerta
    // redundante hacia la misma sala vecina.
    for (let i = 0; i < Math.floor(this.rooms.length / 3); i++) {
      const a = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const b = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      if (a === b) continue;
      const key = pairKey(a, b);
      if (connectedPairs.has(key)) continue;
      connectedPairs.add(key);
      this.connectRooms(a, b);
    }

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

    const lastRoom = this.rooms[this.rooms.length - 1];
    this.grid[lastRoom.centerY][lastRoom.centerX] = TILE.STAIRS_DOWN;
  }

  generateTestRoom(): void {
    this.rooms = [];
    this.enemies = [];
    this.items = [];

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
      const pos = room.getRandomFloorPosition();
      if (Math.abs(pos.x - room.centerX) > 1 || Math.abs(pos.y - room.centerY) > 1) {
        // Mismo camino que placeEnemies: elige entre ENEMY_TYPES (legado) y
        // ENEMY_DEFINITIONS (src/assets/enemies/) — no hardcodear una lista
        // de tipos acá, se desincroniza (ver skill enemy-definitions).
        this.enemies.push(createEnemyInstance(1, pos.x, pos.y, `enemy_${Date.now()}_${i}`));
      }
    }

    const testItems = ['rusty_sword', 'worn_tunic', 'wood', 'stone', 'health_potion'];
    for (const itemType of testItems) {
      const pos = room.getRandomFloorPosition();
      const def = ITEM_TYPES[itemType];
      this.items.push({
        id: `item_${Date.now()}_${itemType}`,
        type: itemType,
        name: def.name,
        x: pos.x,
        y: pos.y,
        quantity: 1,
        stackable: def.stackable || false,
        icon: def.icon,
        color: def.color,
        attack: def.attack,
        defense: def.defense,
        heal: def.heal,
        hunger: def.hunger,
      });
    }

    this.grid[room.centerY + 1][room.centerX] = TILE.STAIRS_DOWN;
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
        const pos = room.getRandomFloorPosition();
        this.enemies.push(createEnemyInstance(floor, pos.x, pos.y, `enemy_${floor}_${i}_${j}`));
      }
    }
  }

  placeItems(floor: number): void {
    const materialTypes = ['wood', 'stone', 'iron_ore', 'leather'];
    const consumableTypes = ['health_potion', 'hunger_potion', 'dried_ration'];

    for (const room of this.rooms) {
      if (Math.random() < 0.6) {
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const pos = room.getRandomFloorPosition();
          const type = materialTypes[Math.floor(Math.random() * materialTypes.length)];
          const def = ITEM_TYPES[type];
          this.items.push({
            id: `item_${floor}_${room.x}_${room.y}_${i}`,
            type,
            name: def.name,
            x: pos.x,
            y: pos.y,
            quantity: 1,
            stackable: def.stackable || false,
            icon: def.icon,
            color: def.color,
            attack: def.attack,
            defense: def.defense,
            heal: def.heal,
            hunger: def.hunger,
          });
        }
      }

      if (room.type === 'treasure') {
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const pos = room.getRandomFloorPosition();
          const allItems = [...materialTypes, ...consumableTypes,
            'rusty_sword', 'stone_axe', 'worn_tunic'];
          const type = allItems[Math.floor(Math.random() * allItems.length)];
          const def = ITEM_TYPES[type];
          this.items.push({
            id: `item_${floor}_${room.x}_${room.y}_treasure_${i}`,
            type,
            name: def.name,
            x: pos.x,
            y: pos.y,
            quantity: 1,
            stackable: def.stackable || false,
            icon: def.icon,
            color: def.color,
            attack: def.attack,
            defense: def.defense,
            heal: def.heal,
            hunger: def.hunger,
          });
        }
      }

      if (room.type === 'workshop') {
        const pos = room.getRandomFloorPosition();
        const type = consumableTypes[Math.floor(Math.random() * consumableTypes.length)];
        const def = ITEM_TYPES[type];
        this.items.push({
          id: `item_${floor}_${room.x}_${room.y}_workshop`,
          type,
          name: def.name,
          x: pos.x,
          y: pos.y,
          quantity: 1,
          stackable: def.stackable || false,
          icon: def.icon,
          color: def.color,
          attack: def.attack,
          defense: def.defense,
          heal: def.heal,
          hunger: def.hunger,
        });
      }
    }
  }
}
