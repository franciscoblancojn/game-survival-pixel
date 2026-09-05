import { TILE, CELL_SIZE, COLORS, STORAGE_VERSION, DEFAULT_DIFFICULTY } from '../constants.js';
import { Dungeon } from './world/Dungeon.js';
import { Room } from './world/Room.js';
import type { FloorState } from './world/Dungeon.js';
import { Player } from './entities/Player.js';
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { TurnSystem } from './systems/TurnSystem.js';
import { Market } from './Market.js';
import { HUD } from '../components/HUD.js';
import { MiniMap } from '../components/MiniMap.js';
import { InventoryUI } from '../components/Inventory.js';
import { CraftingUI } from '../components/CraftingUI.js';
import { MarketUI } from '../components/MarketUI.js';
import { MainMenu } from '../components/MainMenu.js';
import { PauseMenu } from '../components/PauseMenu.js';
import { loadSlot, saveSlot, deleteSlot, migrateLegacySave } from './SaveSlots.js';
import type { GameState, GameSaveData, DungeonSaveData, Difficulty, NpcInstance } from '../types.js';

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
  public market: Market;
  public renderer!: Renderer;
  public input!: Input;
  public turnSystem!: TurnSystem;
  public hud!: HUD;
  public miniMap!: MiniMap;
  public inventoryUI!: InventoryUI;
  public craftingUI!: CraftingUI;
  public marketUI!: MarketUI;
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
    this.market = new Market();
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
    this.marketUI = new MarketUI(this);
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
    this.market = new Market();

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

  /** Abre el overlay de comercio con `npc` — disparado al caminar hacia un NPC (TurnSystem), no desde la barra inferior. */
  openTrade(npc: NpcInstance): void {
    this.closeAllOverlays();
    this.state = 'trading';
    this.marketUI.open(npc);
  }

  closeTrade(): void {
    this.state = 'exploring';
    this.marketUI.close();
  }

  toggleMiniMap(): void {
    if (this.miniMap.visible) {
      this.miniMap.toggle();
    } else {
      // Cierra mochila/crafteo si estaban abiertas — con la barra inferior
      // visible por encima de todos los overlays, tocar "Mapa" debe
      // cambiar directo sin dejar el panel anterior abierto detrás.
      this.closeAllOverlays();
      this.miniMap.toggle();
    }
  }

  /** Botón ⏸️ de la barra inferior: abre/cierra el menú de pausa (Continuar / Salir). */
  togglePauseMenu(): void {
    if (this.state === 'paused') {
      this.state = 'exploring';
      this.pauseMenu.close();
    } else if (this.state === 'exploring' || this.state === 'inventory' || this.state === 'crafting' || this.state === 'trading') {
      // Con la barra inferior visible por encima de mochila/crafteo/mercado/
      // mapa, "Menú" debe funcionar sin importar cuál de esos esté abierto —
      // no solo cuando ya se estaba explorando.
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
    } else if (this.state === 'trading') {
      this.closeTrade();
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
    if (this.marketUI.visible) {
      this.marketUI.close();
    }
    if (this.miniMap.visible) {
      this.miniMap.toggle();
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
      // Ataque/defensa cambian al equipar — el HUD (mochila abierta o no)
      // debe reflejarlo ya, no recién en el próximo turno.
      this.hud.render(this.player, this.dungeon.floor);
    }
  }

  useItem(index: number): void {
    const item = this.player.inventory[index];
    if (!item) return;

    const msg = this.player.useItem(item);
    if (msg) {
      this.addMessage(msg);
      this.inventoryUI.render();
      // Una poción/comida cambia hp/hunger — actualizar el HUD de inmediato
      // (antes solo se refrescaba en el siguiente turno de juego).
      this.hud.render(this.player, this.dungeon.floor);
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
  // Cada piso tiene dos escaleras (Dungeon.stairsUpPos/stairsDownPos): una
  // de entrada (sube) y una de salida (baja) — ver skill npc-trading. Al
  // llegar a un piso desde abajo se aparece en su escalera de bajada
  // (stairsDownPos); al llegar desde arriba, en la de subida
  // (stairsUpPos) — así cada viaje deja al jugador parado justo sobre la
  // escalera que lo llevaría de vuelta por donde vino.

  /** Baja un piso (o del mercado al piso 1). Aparece en la escalera de subida del piso nuevo. */
  goDownStairs(): void {
    this.addMessage('Bajas las escaleras...');
    const newFloor = this.dungeon.floor + 1;
    this.deepestFloor = Math.max(this.deepestFloor, newFloor);

    // goToFloor() cachea el piso que se abandona y restaura el de destino
    // tal cual quedó si ya se había visitado — nunca genera dos veces el
    // mismo piso. Ver skill npc-trading.
    this.dungeon.goToFloor(newFloor, this.difficulty);

    const startRoom = this.dungeon.rooms[0];
    const landing = this.dungeon.stairsUpPos ?? { x: startRoom.centerX, y: startRoom.centerY };
    this.player.x = landing.x;
    this.player.y = landing.y;

    this.renderer.dungeon = this.dungeon;
    this.render();
    this.saveGame();
  }

  /**
   * Sube un piso. Desde el piso 1 no hay piso 0 procedural — lleva al
   * mercado (Dungeon.generateMarket(), disparado por goToFloor cuando el
   * destino es 0), un piso fijo con los NPCs para comerciar. Aparece en la
   * escalera de bajada del piso nuevo.
   */
  goUpStairs(): void {
    const newFloor = this.dungeon.floor <= 1 ? 0 : this.dungeon.floor - 1;
    this.addMessage(newFloor === 0 ? 'Subes hacia la superficie...' : 'Subes las escaleras...');

    this.dungeon.goToFloor(newFloor, this.difficulty);

    const firstRoom = this.dungeon.rooms[0];
    const landing = this.dungeon.stairsDownPos ?? { x: firstRoom.centerX, y: firstRoom.centerY };
    this.player.x = landing.x;
    this.player.y = landing.y;

    this.renderer.dungeon = this.dungeon;
    this.render();
    this.saveGame();
  }

  // === PERSISTENCE (ranuras de guardado) ===

  /** FloorState (rooms como instancias reales) → forma serializable (rooms como RoomData). */
  private static floorStateToSaveData(state: FloorState): DungeonSaveData {
    return {
      floor: state.floor,
      grid: state.grid,
      rooms: state.rooms.map(r => r.toData()),
      enemies: state.enemies,
      items: state.items,
      npcs: state.npcs,
    };
  }

  /** Forma serializable → FloorState (rooms reconstruidas como instancias reales de Room). */
  private static saveDataToFloorState(data: DungeonSaveData): FloorState {
    return {
      floor: data.floor,
      grid: data.grid,
      rooms: data.rooms.map(r => Room.fromData(r)),
      enemies: data.enemies,
      items: data.items,
      npcs: data.npcs ?? [],
    };
  }

  saveGame(): void {
    // El guard de 'dead' evita resucitar la ranura que handleDeath() ya
    // borró — sin esto, el autosave (30s) o beforeunload podrían volver a
    // escribirla mientras el jugador sigue mirando la pantalla de muerte.
    if (this.currentSlot === null || this.state === 'dead') return;
    try {
      const floors: Record<number, DungeonSaveData> = {};
      for (const [floor, state] of this.dungeon.floorCache) {
        floors[floor] = Game.floorStateToSaveData(state);
      }

      const data: GameSaveData = {
        version: STORAGE_VERSION,
        savedAt: Date.now(),
        difficulty: this.difficulty,
        player: this.player.toJSON(),
        dungeon: Game.floorStateToSaveData({
          floor: this.dungeon.floor,
          grid: this.dungeon.grid,
          rooms: this.dungeon.rooms,
          enemies: this.dungeon.enemies,
          items: this.dungeon.items,
          npcs: this.dungeon.npcs,
        }),
        stats: {
          turn: this.turn,
          enemiesKilled: this.enemiesKilled,
          deepestFloor: this.deepestFloor,
        },
        market: this.market.toJSON(),
        floors,
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
      this.market.fromJSON(data.market);

      const active = Game.saveDataToFloorState(data.dungeon);
      this.dungeon.floor = active.floor;
      this.dungeon.grid = active.grid;
      this.dungeon.rooms = active.rooms;
      this.dungeon.enemies = active.enemies;
      this.dungeon.items = active.items;
      this.dungeon.npcs = active.npcs;
      this.dungeon.recomputeStairsFromGrid();

      // Pisos ya visitados (ausente en guardados de antes de este sistema
      // de caché — sin esto, no hay pisos cacheados todavía y subir/bajar
      // vuelve a generar cada uno, como antes).
      this.dungeon.floorCache = new Map();
      for (const [key, floorData] of Object.entries(data.floors ?? {})) {
        this.dungeon.floorCache.set(Number(key), Game.saveDataToFloorState(floorData));
      }

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
