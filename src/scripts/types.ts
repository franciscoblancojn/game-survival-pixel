// ============================================================
// Shared types for the Mazmorra game
// ============================================================

// --- Tile types ---
export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// --- Item ---
// (la definición estática de cada tipo de item vive como clase en
// src/assets/items/, no como interfaz plana acá — ver ItemBaseStats ahí.
// ItemDef/ITEM_TYPES se retiraron al completar la migración, mismo criterio
// que con los enemigos.)

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
  /** Clave en ITEM_DEFINITIONS (src/assets/items/) */
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

// --- NPC ---
// (la definición estática de cada tipo de NPC vive como clase en
// src/assets/npc/, no como interfaz plana acá — ver NpcBaseStats ahí)

export interface NpcInstance {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

// --- Mercado (comercio con NPCs, ver src/scripts/game/Market.ts) ---
export interface MarketSaveData {
  /** precios[npcType][itemType] = "valor actual" de esa relación de tradeo. */
  precios: Record<string, Record<string, number>>;
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
    /** Ausente en guardados viejos (piso sin mercado todavía) — Dungeon.recomputeStairsFromGrid() no depende de esto. */
    npcs?: NpcInstance[];
  };
  stats: {
    turn: number;
    enemiesKilled: number;
    deepestFloor: number;
  };
  /** Precios de los NPCs del mercado — ausente en guardados viejos, se inicializa fresco. */
  market?: MarketSaveData;
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
// No hay 'pickup' manual: recoger es automático al pisar la celda del item
// (ver TurnSystem.executePlayerAction, caso 'move') — se quitó el botón/
// tecla de recoger porque quedaba redundante con eso.
export interface PlayerAction {
  type: 'move' | 'attack' | 'wait';
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
export type GameState = 'menu' | 'exploring' | 'inventory' | 'crafting' | 'trading' | 'dead' | 'paused';

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
