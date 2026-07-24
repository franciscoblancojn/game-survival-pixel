import { TILE } from '../../constants.js';
import type { DoorData, TileType } from '../../types.js';

export class Room {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public type: string;
  public doors: DoorData[];
  public enemies: unknown[];
  public items: unknown[];
  public explored: boolean;
  public workStations: unknown[];

  constructor(x: number, y: number, width: number, height: number, type = 'normal') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.doors = [];
    this.enemies = [];
    this.items = [];
    this.explored = false;
    this.workStations = [];
  }

  get centerX(): number {
    return Math.floor(this.x + this.width / 2);
  }

  get centerY(): number {
    return Math.floor(this.y + this.height / 2);
  }

  contains(x: number, y: number): boolean {
    return x >= this.x && x < this.x + this.width &&
           y >= this.y && y < this.y + this.height;
  }

  overlaps(other: Room, margin = 2): boolean {
    return this.x - margin < other.x + other.width &&
           this.x + this.width + margin > other.x &&
           this.y - margin < other.y + other.height &&
           this.y + this.height + margin > other.y;
  }

  writeTiles(grid: TileType[][]): void {
    for (let y = this.y; y < this.y + this.height; y++) {
      for (let x = this.x; x < this.x + this.width; x++) {
        if (y === this.y || y === this.y + this.height - 1 ||
            x === this.x || x === this.x + this.width - 1) {
          grid[y][x] = TILE.WALL;
        } else {
          grid[y][x] = TILE.FLOOR;
        }
      }
    }
  }

  addInternalWalls(grid: TileType[][], count: number): void {
    let added = 0;
    let attempts = 0;
    while (added < count && attempts < 50) {
      attempts++;
      const wx = this.x + 2 + Math.floor(Math.random() * (this.width - 4));
      const wy = this.y + 2 + Math.floor(Math.random() * (this.height - 4));

      if (grid[wy][wx] === TILE.FLOOR) {
        if (wx === this.centerX && wy === this.centerY) continue;
        const isDoorPos = this.doors.some(d => Math.abs(d.x - wx) <= 1 && Math.abs(d.y - wy) <= 1);
        if (isDoorPos) continue;

        grid[wy][wx] = TILE.WALL;
        added++;
      }
    }
  }

  addDoor(side: string): { x: number; y: number } {
    let dx: number;
    let dy: number;
    switch (side) {
      case 'north':
        dx = this.x + 2 + Math.floor(Math.random() * (this.width - 4));
        dy = this.y;
        break;
      case 'south':
        dx = this.x + 2 + Math.floor(Math.random() * (this.width - 4));
        dy = this.y + this.height - 1;
        break;
      case 'west':
        dx = this.x;
        dy = this.y + 2 + Math.floor(Math.random() * (this.height - 4));
        break;
      case 'east':
        dx = this.x + this.width - 1;
        dy = this.y + 2 + Math.floor(Math.random() * (this.height - 4));
        break;
      default:
        dx = this.x;
        dy = this.y;
    }
    this.doors.push({ x: dx, y: dy, side, connected: false });
    return { x: dx, y: dy };
  }

  getRandomFloorPosition(): { x: number; y: number } {
    let attempts = 0;
    while (attempts < 50) {
      const x = this.x + 1 + Math.floor(Math.random() * (this.width - 2));
      const y = this.y + 1 + Math.floor(Math.random() * (this.height - 2));
      if (x !== this.centerX || y !== this.centerY) {
        return { x, y };
      }
      attempts++;
    }
    return { x: this.centerX + 1, y: this.centerY + 1 };
  }
}
