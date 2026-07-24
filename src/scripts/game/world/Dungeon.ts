import { TILE, MAP_WIDTH, MAP_HEIGHT, ENEMY_TYPES, ITEM_TYPES } from '../../constants.js';
import { Room } from './Room.js';
import type { TileType, EnemyInstance, ItemInstance } from '../../types.js';

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

  generateLevel(floor: number): void {
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

    for (let i = 0; i < this.rooms.length - 1; i++) {
      const roomA = this.rooms[i];
      const roomB = this.rooms[i + 1];
      this.connectRooms(roomA, roomB);
    }

    for (let i = 0; i < Math.floor(this.rooms.length / 3); i++) {
      const a = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const b = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      if (a !== b) this.connectRooms(a, b);
    }

    for (const room of this.rooms) {
      if (room.width >= 7 && room.height >= 7) {
        const wallCount = 1 + Math.floor(Math.random() * 3);
        room.addInternalWalls(this.grid, wallCount);
      }
    }

    for (const room of this.rooms) {
      if (room.doors.length === 0) {
        const side = ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)];
        const door = room.addDoor(side);
        this.grid[door.y][door.x] = TILE.DOOR;
        room.explored = true;
      }
    }

    this.placeEnemies(floor);
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
        const type = ['rat', 'slime'][Math.floor(Math.random() * 2)];
        const def = ENEMY_TYPES[type];
        this.enemies.push({
          id: `enemy_${Date.now()}_${i}`,
          type,
          name: def.name,
          x: pos.x,
          y: pos.y,
          hp: def.hp,
          maxHp: def.hp,
          attack: def.attack,
          defense: def.defense,
          xp: def.xp,
          aggroRange: def.aggroRange,
          color: def.color,
          darkColor: def.darkColor,
          speed: def.speed,
          turnsUntilMove: 0,
        });
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
    const corridor: { x: number; y: number }[] = [];

    while (x !== x2 || y !== y2) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        if (this.grid[y][x] === TILE.VOID) {
          this.grid[y][x] = TILE.CORRIDOR;
          corridor.push({ x, y });
        } else if (this.grid[y][x] === TILE.WALL) {
          this.grid[y][x] = TILE.DOOR;
          corridor.push({ x, y });
        }
      }
      if (x !== x2) x += dx;
      else if (y !== y2) y += dy;
    }

    if (corridor.length > 0) {
      this.corridors.push(corridor);
    }
  }

  placeEnemies(floor: number): void {
    const enemyTypes = Object.keys(ENEMY_TYPES);

    for (let i = 1; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      let count = 0;

      if (room.type === 'enemy') {
        count = 3 + Math.floor(Math.random() * 3) + Math.floor(floor * 0.3);
      } else if (room.type === 'normal') {
        count = 1 + Math.floor(Math.random() * 2);
      }

      for (let j = 0; j < count; j++) {
        const pos = room.getRandomFloorPosition();
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const def = ENEMY_TYPES[type];

        this.enemies.push({
          id: `enemy_${floor}_${i}_${j}`,
          type,
          name: def.name,
          x: pos.x,
          y: pos.y,
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
        });
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
