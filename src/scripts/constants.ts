import type { TileType, EnemyDef, ItemDef } from './types.js';

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
export const ENEMY_TYPES: Record<string, EnemyDef> = {
  rat: {
    name: 'Rata',
    hp: 15,
    attack: 3,
    defense: 0,
    xp: 5,
    aggroRange: 4,
    color: '#a0826d',
    darkColor: '#7a624d',
    speed: 1,
  },
  skeleton: {
    name: 'Esqueleto',
    hp: 30,
    attack: 6,
    defense: 2,
    xp: 12,
    aggroRange: 6,
    color: '#d4cfc4',
    darkColor: '#a4a094',
    speed: 1,
  },
  slime: {
    name: 'Slime',
    hp: 45,
    attack: 4,
    defense: 1,
    xp: 8,
    aggroRange: 3,
    color: '#2ecc71',
    darkColor: '#27ae60',
    speed: 2,
  },
};

// === ITEM TYPES ===
export const ITEM_TYPES: Record<string, ItemDef> = {
  // Weapons
  rusty_sword: { name: 'Espada oxidada', type: 'weapon', attack: 3, icon: '⚔️', color: '#aaa' },
  stone_axe: { name: 'Hacha de piedra', type: 'weapon', attack: 5, icon: '🪓', color: '#888' },
  sharp_dagger: { name: 'Daga afilada', type: 'weapon', attack: 4, speed: 1, icon: '🗡️', color: '#ccc' },
  // Armor
  worn_tunic: { name: 'Túnica gastada', type: 'armor', defense: 2, icon: '👕', color: '#8b7355' },
  chainmail: { name: 'Cota de malla', type: 'armor', defense: 5, icon: '🦺', color: '#888' },
  iron_plate: { name: 'Pechera de hierro', type: 'armor', defense: 8, icon: '🛡️', color: '#666' },
  // Tools
  pickaxe: { name: 'Pico', type: 'tool', tool: 'mining', icon: '⛏️', color: '#888' },
  shovel: { name: 'Pala', type: 'tool', tool: 'digging', icon: '🔧', color: '#8b7355' },
  torch: { name: 'Antorcha', type: 'tool', tool: 'light', icon: '🔥', color: '#ffa500' },
  // Consumables
  health_potion: { name: 'Poción de vida', type: 'consumable', heal: 30, icon: '🧪', color: '#ff6b6b' },
  hunger_potion: { name: 'Poción de hambre', type: 'consumable', hunger: 40, icon: '🍷', color: '#ffd93d' },
  dried_ration: { name: 'Ración seca', type: 'consumable', hunger: 20, icon: '🍖', color: '#d2691e' },
  // Materials
  wood: { name: 'Madera', type: 'material', stackable: true, icon: '🪵', color: '#8b4513' },
  stone: { name: 'Piedra', type: 'material', stackable: true, icon: '🪨', color: '#888' },
  iron_ore: { name: 'Hierro', type: 'material', stackable: true, icon: '⬛', color: '#666' },
  leather: { name: 'Cuero', type: 'material', stackable: true, icon: '🟫', color: '#8b4513' },
};
