import { TILE } from '../../constants.js';
import type { TileType } from '../../types.js';

export class Tile {
  static isWalkable(type: TileType): boolean {
    return type === TILE.FLOOR || type === TILE.DOOR || type === TILE.CORRIDOR ||
           type === TILE.STAIRS_DOWN || type === TILE.STAIRS_UP;
  }

  static isWall(type: TileType): boolean {
    return type === TILE.WALL;
  }

  static isDoor(type: TileType): boolean {
    return type === TILE.DOOR;
  }

  static isVoid(type: TileType): boolean {
    return type === TILE.VOID;
  }

  static getName(type: TileType): string {
    const names: Record<number, string> = {
      [TILE.VOID]: 'Vacío',
      [TILE.FLOOR]: 'Suelo',
      [TILE.WALL]: 'Muro',
      [TILE.DOOR]: 'Puerta',
      [TILE.CORRIDOR]: 'Pasillo',
      [TILE.STAIRS_DOWN]: 'Escalera ↓',
      [TILE.STAIRS_UP]: 'Escalera ↑',
    };
    return names[type] || 'Desconocido';
  }
}
