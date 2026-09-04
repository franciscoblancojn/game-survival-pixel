import { TILE, CELL_SIZE, COLORS, STORAGE_VERSION, DEFAULT_DIFFICULTY } from '../constants.js';
import { Dungeon } from './world/Dungeon.js';
import { Player } from './entities/Player.js';
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { TurnSystem } from './systems/TurnSystem.js';
import { HUD } from '../components/HUD.js';
import { MiniMap } from '../components/MiniMap.js';
import { InventoryUI } from '../components/Inventory.js';
import { CraftingUI } from '../components/CraftingUI.js';
import { MainMenu } from '../components/MainMenu.js';
import { PauseMenu } from '../components/PauseMenu.js';
import { loadSlot, saveSlot, deleteSlot, migrateLegacySave } from './SaveSlots.js';
import type { GameState, GameSaveData, Difficulty } from '../types.js';

export class Game {
  public canvas: HTMLCanvasElement;
  public state: GameState;
  public turn: number;
  public enemiesKilled: number;
  public deepestFloor: number;
  public currentSlot: number | null;
  public difficulty: Difficulty;

  public dungeon: Dungeon;
  public player: Player;
  public renderer!: Renderer;
  public input!: Input;
  public turnSystem!: TurnSystem;
  public hud!: HUD;
  public miniMap!: MiniMap;
  public inventoryUI!: InventoryUI;
  public craftingUI!: CraftingUI;
  public mainMenu!: MainMenu;
  public pauseMenu!: PauseMenu;

  private engineReady: boolean;
  private autosaveInterval: ReturnType<typeof setInterval> | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = 'menu';
    this.turn = 0;
    this.enemiesKilled = 0;
    this.deepestFloor = 1;
    this.currentSlot = null;
    this.difficulty = DEFAULT_DIFFICULTY;
    this.engineReady = false;
    this.autosaveInterval = null;

    this.dungeon = new Dungeon();
    this.player = null!;
  }

  /**
   * Arranca la app en el menú principal (Nueva partida / Continuar) en vez
   * de cargar directo una partida — antes solo existía UNA key de guardado
   * en localStorage, así que el mapa era siempre el mismo entre visitas
   * (nunca había forma de empezar de cero salvo muriendo). Ahora cada
   * partida vive en su propia ranura (1 a SAVE_SLOT_COUNT) y el motor del
   * juego (renderer/input/etc.) recién se crea cuando el jugador elige
   * "Nueva partida" o "Continuar".
   */
  init(): void {
    migrateLegacySave();
    this.mainMenu = new MainMenu(this);
    this.showMainMenu();

    window.addEventListener('beforeunload', () => {
      if (this.currentSlot !== null) this.saveGame();
    });
  }

  showMainMenu(): void {
    this.state = 'menu';
    this.mainMenu.open();
  }

  /** Crea renderer/input/HUD/etc. una sola vez, la primera vez que hace falta un canvas jugable. */
  private ensureEngine(): void {
    if (this.engineReady) return;
    this.engineReady = true;

    this.renderer = new Renderer(this.canvas, this.dungeon, this.player);
    this.input = new Input(this);
    this.turnSystem = new TurnSystem(this);
    this.hud = new HUD();
    this.miniMap = new MiniMap(this);
    this.inventoryUI = new InventoryUI(this);
    this.craftingUI = new CraftingUI(this);
    this.pauseMenu = new PauseMenu(this);
  }

  private startAutosave(): void {
    if (this.autosaveInterval !== null) clearInterval(this.autosaveInterval);
    this.autosaveInterval = setInterval(() => this.saveGame(), 30000);
  }

  private stopAutosave(): void {
    if (this.autosaveInterval !== null) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
    }
  }

  /** Genera una mazmorra nueva y empieza a jugar, guardando en `slot`. */
  startNewGame(slot: number, difficulty: Difficulty = DEFAULT_DIFFICULTY): void {
    this.currentSlot = slot;
    this.difficulty = difficulty;
    this.turn = 0;
    this.enemiesKilled = 0;
    this.deepestFloor = 1;

    this.dungeon = new Dungeon();
    this.dungeon.generateLevel(1, this.difficulty);
    const startRoom = this.dungeon.rooms[0];
    this.player = new Player(startRoom.centerX, startRoom.centerY);

    this.ensureEngine();
    this.renderer.dungeon = this.dungeon;
    this.renderer.player = this.player;

    this.state = 'exploring';
    this.mainMenu.close();
    this.render();
    this.saveGame();
    this.startAutosave();
  }

  /** Carga la partida guardada en `slot`. Devuelve false si la ranura está vacía/corrupta. */
  continueGame(slot: number): boolean {
    if (!this.loadFromSlot(slot)) return false;
    this.currentSlot = slot;

    this.ensureEngine();
    this.renderer.dungeon = this.dungeon;
    this.renderer.player = this.player;
    this.mainMenu.close();

    if (this.player.hp <= 0) {
      // Guardado de antes de validar la muerte correctamente (o corrupto):
      // no se puede "continuar" un personaje ya muerto.
      this.handleDeath();
      return true;
    }

    this.state = 'exploring';
    this.render();
    this.startAutosave();
    return true;
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

  /** Botón ⏸️ de la barra inferior: abre/cierra el menú de pausa (Continuar / Salir). */
  togglePauseMenu(): void {
    if (this.state === 'paused') {
      this.state = 'exploring';
      this.pauseMenu.close();
    } else if (this.state === 'exploring') {
      this.closeAllOverlays();
      this.state = 'paused';
      this.pauseMenu.open();
    }
  }

  /** Guarda la partida activa y vuelve al menú principal (Nueva partida/Continuar). */
  exitToMenu(): void {
    this.saveGame();
    this.pauseMenu.close();
    this.showMainMenu();
  }

  closeOverlay(): void {
    if (this.state === 'inventory') {
      this.toggleInventory();
    } else if (this.state === 'crafting') {
      this.toggleCrafting();
    } else if (this.state === 'paused') {
      this.togglePauseMenu();
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

  // === DEATH (permadeath: al morir, la ranura se borra — no se puede "continuar") ===

  handleDeath(): void {
    if (this.state === 'dead') return; // no repetir si ya se procesó (p. ej. combate + hambre el mismo turno)
    this.state = 'dead';
    this.stopAutosave();

    // La partida terminó: se borra la ranura para que no aparezca como
    // "Continuar" en el menú principal (ver skill player-state / save-system).
    if (this.currentSlot !== null) {
      deleteSlot(this.currentSlot);
    }

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
          <button class="death-restart" onclick="window.gameInstance?.backToMenuAfterDeath()">Volver al menú</button>
        </div>
      `;
    }
  }

  backToMenuAfterDeath(): void {
    const el = document.getElementById('death-overlay');
    if (el) el.style.display = 'none';
    this.currentSlot = null;
    this.showMainMenu();
  }

  // === STAIRS ===

  goDownStairs(): void {
    this.addMessage('Bajas al siguiente piso...');
    const newFloor = this.dungeon.floor + 1;
    this.deepestFloor = Math.max(this.deepestFloor, newFloor);

    this.dungeon.generateLevel(newFloor, this.difficulty);

    const startRoom = this.dungeon.rooms[0];
    this.player.x = startRoom.centerX;
    this.player.y = startRoom.centerY;

    this.renderer.dungeon = this.dungeon;
    this.render();
    this.saveGame();
  }

  // === PERSISTENCE (ranuras de guardado) ===

  saveGame(): void {
    // El guard de 'dead' evita resucitar la ranura que handleDeath() ya
    // borró — sin esto, el autosave (30s) o beforeunload podrían volver a
    // escribirla mientras el jugador sigue mirando la pantalla de muerte.
    if (this.currentSlot === null || this.state === 'dead') return;
    try {
      const data: GameSaveData = {
        version: STORAGE_VERSION,
        savedAt: Date.now(),
        difficulty: this.difficulty,
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
      saveSlot(this.currentSlot, data);
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }

  private loadFromSlot(slot: number): boolean {
    try {
      const data = loadSlot(slot);
      if (!data) return false;

      this.difficulty = data.difficulty ?? DEFAULT_DIFFICULTY;
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
