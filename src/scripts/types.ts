// ============================================================
// Shared types for the Mazmorra game
// ============================================================

// --- Tile types ---
export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// --- Item ---
export interface ItemDef {
  name: string;
  type: 'weapon' | 'armor' | 'tool' | 'consumable' | 'material';
  attack?: number;
  defense?: number;
  heal?: number;
  hunger?: number;
  speed?: number;
  tool?: string;
  stackable?: boolean;
  icon: string;
  color: string;
}

export interface ItemInstance {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  quantity: number;
  stackable: boolean;
  icon: string;
  color: string;
  attack?: number;
  defense?: number;
  heal?: number;
  hunger?: number;
  speed?: number;
  tool?: string;
}

// --- Dificultad ---
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultySetting {
  label: string;
  /** Divisor de la fórmula de enemigos máximos: 6 + Math.ceil(piso / divisor). */
  divisor: number;
}

// --- Enemy ---
// (la definición estática de cada tipo de enemigo vive como clase en
// src/assets/enemies/, no como interfaz plana acá — ver EnemyBaseStats ahí)

export interface EnemyInstance {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xp: number;
  aggroRange: number;
  color: string;
  darkColor: string;
  speed: number;
  turnsUntilMove: number;
  isAlive?: boolean;
}

// --- Loot y oro (botín de enemigos, ver src/assets/enemies/) ---
export interface LootDrop {
  /** Clave en ITEM_TYPES (constants.ts) */
  itemType: string;
  /** Probabilidad de que caiga, 0-1 */
  chance: number;
  /** Cantidad mínima y máxima si cae (inclusive) */
  min: number;
  max: number;
}

export interface GoldRange {
  min: number;
  max: number;
}

export interface RolledLoot {
  itemType: string;
  quantity: number;
}

// --- Room ---
export interface RoomData {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  doors: DoorData[];
  explored: boolean;
}

export interface DoorData {
  x: number;
  y: number;
  side: string;
  connected: boolean;
}

// --- Equipment ---
export interface Equipment {
  weapon: ItemInstance | null;
  armor: ItemInstance | null;
}

// --- Player save data ---
export interface PlayerSaveData {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  attack: number;
  defense: number;
  level: number;
  xp: number;
  xpToLevel: number;
  gold: number;
  inventory: ItemInstance[];
  equipment: Equipment;
}

// --- Game save data ---
export interface GameSaveData {
  version: number;
  savedAt: number;
  difficulty: Difficulty;
  player: PlayerSaveData;
  dungeon: {
    floor: number;
    grid: TileType[][];
    rooms: RoomData[];
    enemies: EnemyInstance[];
    items: ItemInstance[];
  };
  stats: {
    turn: number;
    enemiesKilled: number;
    deepestFloor: number;
  };
}

// --- Save slots (menu de Nueva partida / Continuar) ---
export interface SlotSummary {
  id: number;
  empty: boolean;
  floor?: number;
  playerLevel?: number;
  turn?: number;
  savedAt?: number;
  difficulty?: Difficulty;
}

// --- Crafting ---
export interface Recipe {
  materials: Record<string, number>;
  result: string;
  name: string;
  quantity?: number;
}

export type RecipeStation = 'workbench' | 'furnace' | 'anvil' | 'alchemy';

// --- Player action ---
export interface PlayerAction {
  type: 'move' | 'attack' | 'pickup' | 'wait';
  dx?: number;
  dy?: number;
  x?: number;
  y?: number;
}

// --- Enemy turn result ---
export interface EnemyTurnResult {
  type: 'attack' | 'move';
  damage?: number;
  target: 'player' | 'enemy';
}

// --- Game state ---
export type GameState = 'menu' | 'exploring' | 'inventory' | 'crafting' | 'dead' | 'paused';

// --- Particle ---
export interface Particle {
  x: number;
  y: number;
  color: string;
  text: string;
  life: number;
  maxLife: number;
  vy: number;
}

// --- Message log entry ---
export interface LogMessage {
  text: string;
  time: number;
}

// --- Crafting station ---
export interface CraftingStation {
  id: RecipeStation;
  name: string;
  icon: string;
}

// --- Hub variable keys ---
export type HubVarKey =
  | 'level' | 'hp' | 'maxHp'
  | 'hunger' | 'maxHunger'
  | 'attack' | 'defense'
  | 'xp' | 'xpToLevel';
