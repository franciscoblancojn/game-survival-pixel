import type { TileType, Difficulty, DifficultySetting } from './types.js';

// === TILE TYPES ===
export const TILE: Record<string, TileType> = {
  VOID: 0,
  FLOOR: 1,
  WALL: 2,
  DOOR: 3,
  CORRIDOR: 4,
  STAIRS_DOWN: 5,
  STAIRS_UP: 6,
};

// === GRID ===
export const CELL_SIZE = 32;
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 30;

// === GAME ===
export const GAME_NAME = 'Mazmorra';
export const GAME_VERSION = '0.1.0';
export const STORAGE_KEY = 'mazmorra_save';
export const STORAGE_VERSION = 1;
export const SAVE_SLOT_COUNT = 5;

// === PLAYER DEFAULTS ===
export const PLAYER_DEFAULTS = {
  hp: 100,
  maxHp: 100,
  hunger: 100,
  maxHunger: 100,
  attack: 5,
  defense: 2,
  level: 1,
  xp: 0,
  xpToLevel: 20,
} as const;

// === INVENTORY ===
export const INVENTORY_SIZE = 24;

// === REGENERACIÓN DE VIDA ===
// Mientras el jugador esté alimentado (hunger > 0), regenera HP_REGEN_AMOUNT
// de hp cada HP_REGEN_INTERVAL_TURNS turnos (sin superar maxHp).
export const HP_REGEN_INTERVAL_TURNS = 10;
export const HP_REGEN_AMOUNT = 1;

// === DIFICULTAD ===
// Enemigos máximos vivos por piso = MAX_ENEMIES_BASE + Math.ceil(piso / divisor).
// A menor divisor, más rápido escala la cantidad de enemigos por piso.
export const MAX_ENEMIES_BASE = 6;
export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySetting> = {
  easy: { label: 'Fácil', divisor: 5 },
  normal: { label: 'Normal', divisor: 3 },
  hard: { label: 'Difícil', divisor: 1 },
};

// === ESPAWNEO DE ENEMIGOS ===
// Distancia Manhattan mínima deseada entre el jugador y un enemigo que reaparece.
export const ENEMY_RESPAWN_MIN_DISTANCE = 12;

// === COLORS (pixel art palette) ===
export const COLORS = {
  background: '#0a0a14',
  floor: '#2d2d44',
  floorAlt: '#252540',
  wall: '#4a4a6a',
  wallTop: '#6a6a8a',
  wallDark: '#3a3a5a',
  door: '#8b6914',
  doorFrame: '#a07a20',
  corridor: '#2a2a40',
  stairsDown: '#2ecc71',
  stairsUp: '#3498db',
  player: '#4ecdc4',
  playerDark: '#3ab5ad',
  enemy: '#ff6b6b',
  enemyDark: '#cc5555',
  item: '#ffd93d',
  itemDark: '#ccad30',
  trap: '#e74c3c',
  hud: 'rgba(15, 15, 26, 0.85)',
  hudText: '#e0e0e0',
  hpBar: '#ff6b6b',
  hpBarBg: '#4a2020',
  hungerBar: '#ffd93d',
  hungerBarBg: '#4a4020',
  xpBar: '#6c63ff',
  xpBarBg: '#2a2060',
  minimap: 'rgba(15, 15, 26, 0.7)',
  minimapRoom: '#3a3a5a',
  minimapCorridor: '#2a2a40',
  minimapPlayer: '#4ecdc4',
  minimapEnemy: '#ff6b6b',
  overlay: 'rgba(10, 10, 20, 0.9)',
} as const;

// === ENEMY TYPES ===
// Todos los enemigos (rat, skeleton, slime) ahora viven como clases en
// src/assets/enemies/ (ENEMY_DEFINITIONS) — con vision/loot/oro. Este
// registro plano se retiró al terminar la migración; ver skill
// enemy-definitions antes de agregar un enemigo nuevo.

// === ITEM TYPES ===
// Todos los items ahora viven como clases en src/assets/items/
// (ITEM_DEFINITIONS) — con buff/efectoUso/valor/crafteo. Este registro
// plano se retiró al terminar la migración; ver skill item-definitions
// antes de agregar un item nuevo.
