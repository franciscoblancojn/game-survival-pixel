import { TILE, CELL_SIZE, COLORS, STORAGE_KEY, STORAGE_VERSION } from '../constants.js';
import { Dungeon } from './world/Dungeon.js';
import { Player } from './entities/Player.js';
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { TurnSystem } from './systems/TurnSystem.js';
import { HUD } from '../components/HUD.js';
import { MiniMap } from '../components/MiniMap.js';
import { InventoryUI } from '../components/Inventory.js';
import { CraftingUI } from '../components/CraftingUI.js';
import type { GameState, GameSaveData } from '../types.js';

export class Game {
  public canvas: HTMLCanvasElement;
  public state: GameState;
  public turn: number;
  public enemiesKilled: number;
  public deepestFloor: number;

  public dungeon: Dungeon;
  public player: Player;
  public renderer!: Renderer;
  public input!: Input;
  public turnSystem!: TurnSystem;
  public hud!: HUD;
  public miniMap!: MiniMap;
  public inventoryUI!: InventoryUI;
  public craftingUI!: CraftingUI;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = 'exploring';
    this.turn = 0;
    this.enemiesKilled = 0;
    this.deepestFloor = 1;

    this.dungeon = new Dungeon();
    this.player = null!;
  }

  init(): void {
    const loaded = this.loadGame();
    if (!loaded) {
      this.dungeon.generateLevel(1);
      const startRoom = this.dungeon.rooms[0];
      this.player = new Player(startRoom.centerX, startRoom.centerY);
    }

    this.renderer = new Renderer(this.canvas, this.dungeon, this.player);
    this.input = new Input(this);
    this.turnSystem = new TurnSystem(this);
    this.hud = new HUD();
    this.miniMap = new MiniMap(this);
    this.inventoryUI = new InventoryUI(this);
    this.craftingUI = new CraftingUI(this);

    this.render();

    setInterval(() => this.saveGame(), 30000);
    window.addEventListener('beforeunload', () => this.saveGame());
  }

  render(): void {
    this.renderer.render();
    this.hud.render(this.player, this.dungeon.floor);
    if (this.miniMap.visible) {
      this.miniMap.render();
    }
  }

  addMessage(text: string): void {
    this.hud.addMessage(text);
  }

  // === OVERLAYS ===

  toggleInventory(): void {
    this.closeAllOverlays();
    if (this.state === 'inventory') {
      this.state = 'exploring';
      this.inventoryUI.visible = false;
      document.getElementById('inventory-overlay')!.style.display = 'none';
    } else {
      this.state = 'inventory';
      this.inventoryUI.toggle();
    }
  }

  toggleCrafting(): void {
    this.closeAllOverlays();
    if (this.state === 'crafting') {
      this.state = 'exploring';
      this.craftingUI.visible = false;
      document.getElementById('crafting-overlay')!.style.display = 'none';
    } else {
      this.state = 'crafting';
      this.craftingUI.toggle();
    }
  }

  toggleMiniMap(): void {
    this.miniMap.toggle();
  }

  closeOverlay(): void {
    if (this.state === 'inventory') {
      this.toggleInventory();
    } else if (this.state === 'crafting') {
      this.toggleCrafting();
    } else if (this.miniMap.visible) {
      this.miniMap.toggle();
    }
  }

  closeAllOverlays(): void {
    if (this.inventoryUI.visible) {
      this.inventoryUI.visible = false;
      document.getElementById('inventory-overlay')!.style.display = 'none';
    }
    if (this.craftingUI.visible) {
      this.craftingUI.visible = false;
      document.getElementById('crafting-overlay')!.style.display = 'none';
    }
  }

  // === INVENTORY ACTIONS ===

  equipItem(index: number): void {
    const item = this.player.inventory[index];
    if (!item) return;

    if (item.attack || item.defense) {
      this.player.equipItem(item);
      this.addMessage(`Equipaste ${item.name}`);
      this.inventoryUI.render();
    }
  }

  useItem(index: number): void {
    const item = this.player.inventory[index];
    if (!item) return;

    const msg = this.player.useItem(item);
    if (msg) {
      this.addMessage(msg);
      this.inventoryUI.render();
    }
  }

  // === CRAFTING ===

  selectStation(stationId: string): void {
    this.craftingUI.selectStation(stationId);
  }

  craftItem(stationId: string, recipeKey: string): void {
    this.craftingUI.craftItem(stationId, recipeKey);
  }

  // === DEATH ===

  handleDeath(): void {
    this.state = 'dead';
    const el = document.getElementById('death-overlay');
    if (el) {
      el.style.display = 'flex';
      el.innerHTML = `
        <div class="death-panel">
          <h2>💀 Has muerto</h2>
          <div class="death-stats">
            <p>Nivel alcanzado: ${this.player.level}</p>
            <p>Piso más profundo: ${this.deepestFloor}</p>
            <p>Turnos jugados: ${this.turn}</p>
          </div>
          <button class="death-restart" onclick="window.gameInstance?.restart()">Jugar de nuevo</button>
        </div>
      `;
    }
    this.saveGame();
  }

  restart(): void {
    localStorage.removeItem(STORAGE_KEY);
    const el = document.getElementById('death-overlay');
    if (el) el.style.display = 'none';

    this.state = 'exploring';
    this.turn = 0;
    this.enemiesKilled = 0;
    this.deepestFloor = 1;
    this.dungeon = new Dungeon();
    this.dungeon.generateLevel(1);

    const startRoom = this.dungeon.rooms[0];
    this.player = new Player(startRoom.centerX, startRoom.centerY);

    this.renderer.dungeon = this.dungeon;
    this.renderer.player = this.player;
    this.turnSystem.game = this;

    this.render();
  }

  // === STAIRS ===

  goDownStairs(): void {
    this.addMessage('Bajas al siguiente piso...');
    const newFloor = this.dungeon.floor + 1;
    this.deepestFloor = Math.max(this.deepestFloor, newFloor);

    this.dungeon.generateLevel(newFloor);

    const startRoom = this.dungeon.rooms[0];
    this.player.x = startRoom.centerX;
    this.player.y = startRoom.centerY;

    this.renderer.dungeon = this.dungeon;
    this.render();
    this.saveGame();
  }

  // === PERSISTENCE ===

  saveGame(): void {
    try {
      const data: GameSaveData = {
        version: STORAGE_VERSION,
        player: this.player.toJSON(),
        dungeon: {
          floor: this.dungeon.floor,
          grid: this.dungeon.grid,
          rooms: this.dungeon.rooms.map(r => ({
            x: r.x, y: r.y, width: r.width, height: r.height,
            type: r.type, doors: r.doors, explored: r.explored,
          })),
          enemies: this.dungeon.enemies,
          items: this.dungeon.items,
        },
        stats: {
          turn: this.turn,
          enemiesKilled: this.enemiesKilled,
          deepestFloor: this.deepestFloor,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }

  loadGame(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw) as GameSaveData;
      if (data.version !== STORAGE_VERSION) return false;

      this.player = Player.fromJSON(data.player);
      this.dungeon.grid = data.dungeon.grid;
      this.dungeon.floor = data.dungeon.floor;
      this.dungeon.enemies = data.dungeon.enemies;
      this.dungeon.items = data.dungeon.items;
      this.dungeon.rooms = data.dungeon.rooms.map(r => {
        const room = { ...r, enemies: [] as unknown[], items: [] as unknown[], workStations: [] as unknown[] } as import('./world/Room.js').Room & { contains: (x: number, y: number) => boolean; getRandomFloorPosition: () => { x: number; y: number }; centerX: number; centerY: number };
        room.contains = (x: number, y: number) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;
        room.getRandomFloorPosition = () => ({
          x: r.x + 1 + Math.floor(Math.random() * (r.width - 2)),
          y: r.y + 1 + Math.floor(Math.random() * (r.height - 2)),
        });
        room.centerX = Math.floor(r.x + r.width / 2);
        room.centerY = Math.floor(r.y + r.height / 2);
        return room as unknown as import('./world/Room.js').Room;
      });

      this.turn = data.stats.turn;
      this.enemiesKilled = data.stats.enemiesKilled;
      this.deepestFloor = data.stats.deepestFloor;

      return true;
    } catch (e) {
      console.warn('Failed to load game:', e);
      return false;
    }
  }
}
