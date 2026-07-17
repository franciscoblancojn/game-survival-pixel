# INSTRUCCIONES: Juego de Supervivencia - Masmorra

## Resumen del Proyecto

Crear un **juego de supervivencia estilo mazmorra** con perspectiva **vista superior (top-down)** usando una **cuadrícula tipo tablero de ajedrez**. El estilo visual es **pixel art** similar a **Pixel Dungeon**. El juego se ejecuta como una **SPA (Single Page Application)** dentro de un **Android WebView**, usando la plantilla actual de Astro como base.

**Stack tecnológico:**
- Astro (SSG) + Vanilla JavaScript (sin frameworks)
- CSS inline (un solo archivo HTML autocontenido)
- Android WebView (wrapper)
- Persistencia: localStorage

---

## Concepto del Juego

### Género
- **Roguelike de supervivencia** con cuadrícula
- Vista cenital (top-down)
- Movimiento por casillas (clic/tap)
- Generación procedural de salas (futuro)

### Objetivo Principal
**Sobrevivir** en una mazmorra generando recursos, fabricando herramientas, armas y armaduras, y gestionando una economía básica de materiales. Explorar salas conectadas por pasillos y puertas.

### Loop Principal del Juego
```
Explorar → Recolectar → Craftear → Equipar → Combatir → Explorar más profundo
```

---

## Arquitectura del Juego

### Estructura de Archivos (modificar/crear)

```
src/
├── pages/
│   └── index.astro              # Pantalla principal del juego
├── scripts/
│   ├── app.js                   # Entry point del juego
│   ├── constants.js             # Constantes del juego
│   ├── storage.js               # Persistencia (guardar/cargar partida)
│   ├── helpers.js               # Utilidades generales
│   ├── game/
│   │   ├── Game.js              # Motor principal del juego (bucle, estado)
│   │   ├── Renderer.js          # Renderizado del canvas/grid
│   │   ├── Input.js             # Manejo de input (clic, teclado, touch)
│   │   ├── Camera.js            # Cámara que sigue al jugador
│   │   ├── entities/
│   │   │   ├── Entity.js        # Clase base para entidades
│   │   │   ├── Player.js        # Jugador (stats, inventario, posición)
│   │   │   ├── Enemy.js         # Enemigos (IA básica, stats)
│   │   │   └── Item.js          # Items en el suelo
│   │   ├── world/
│   │   │   ├── Tile.js          # Tipos de casillas (suelo, muro, puerta, etc.)
│   │   │   ├── Room.js          # Definición de una sala
│   │   │   ├── Corridor.js      # Pasillos entre salas
│   │   │   └── Dungeon.js       # Mapa completo (sala+pasillos generados)
│   │   ├── systems/
│   │   │   ├── TurnSystem.js    # Sistema de turnos (Jugador → Enemigos)
│   │   │   ├── CombatSystem.js  # Cálculo de daño, defensa, muerte
│   │   │   ├── CraftingSystem.js # Lógica de crafteo
│   │   │   └── InventorySystem.js # Gestión de inventario
│   │   └── data/
│   │       ├── recipes.js       # Recetas de crafteo
│   │       ├── enemies.js       # Definiciones de enemigos
│   │       ├── items.js         # Definiciones de items
│   │       └── tiles.js         # Definiciones de tiles
│   └── components/
│       ├── HUD.js               # Barra de vida, hambre, nivel
│       ├── Inventory.js         # UI del inventario
│       ├── CraftingUI.js        # Panel de crafteo
│       ├── MiniMap.js           # Minimapa de la mazmorra
│       ├── Toast.js             # Notificaciones (reutilizar existente)
│       └── ConfirmDialog.js     # Diálogos (reutilizar existente)
└── styles/
    └── main.css                 # Estilos del juego
```

---

## Fase 1: Sala Base y Movimiento (MVP)

### Objetivo de esta fase
Crear **una sala rectangular** con muros en los bordes, un jugador que se mueve por casillas vacías haciendo clic, y que los muros bloqueen el movimiento.

### 1.1 Configuración de la Pantalla

**Archivo: `src/pages/index.astro`**

Reemplazar el contenido actual (home/about/settings) por una sola pantalla de juego:
Mantener el menu inferior para que sea un menu para abrir inventario o interactura con bancos de trabajo, hornos, etc.
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Mazmorra">
  <div id="game-container">
    <canvas id="game-canvas"></canvas>
    <div id="hud">
      <!-- HP, Hambre, Nivel - se populate con JS -->
    </div>
    <div id="game-controls">
      <!-- Botones de acción (futuro) -->
    </div>
  </div>
  <script type="module" src="../scripts/app.js"></script>
</BaseLayout>
```

### 1.2 Constantes del Juego

**Archivo: `src/scripts/constants.js`**

```javascript
// === TILE TYPES ===
export const TILE = {
  VOID: 0,      // Fuera del mapa (no visible)
  FLOOR: 1,     // Suelo caminable
  WALL: 2,      // Muro sólido (bloquea movimiento)
  DOOR: 3,      // Puerta (conecta salas/pasillos)
  CORRIDOR: 4,  // Pasillo (caminable)
  STAIRS_DOWN: 5, // Escalera bajar nivel
  STAIRS_UP: 6,   // Escalera subir nivel
};

// === GRID ===
export const CELL_SIZE = 32;          // Tamaño de cada celda en píxeles
export const GRID_COLS = 30;          // Columnas del mapa (ajustar según sala)
export const GRID_ROWS = 20;          // Filas del mapa

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
  x: 0,
  y: 0,
};

// === COLORS (pixel art palette) ===
export const COLORS = {
  background: '#1a1a2e',
  floor: '#2d2d44',
  floorAlt: '#252540',
  wall: '#4a4a6a',
  wallTop: '#5a5a7a',
  door: '#8b6914',
  player: '#4ecdc4',
  enemy: '#ff6b6b',
  item: '#ffd93d',
  corridor: '#2d2d44',
  hud: '#0f0f1a',
  hudText: '#e0e0e0',
  hpBar: '#ff6b6b',
  hungerBar: '#ffd93d',
};
```

### 1.3 Tile Rendering

**Archivo: `src/scripts/game/world/Tile.js`**

Cada tile debe renderizarse con un estilo pixel art simple usando el canvas:

- **Suelo**: Cuadrado de color con variación sutil (ajedrez alternando 2 tonos)
- **Muro**: Cuadrado oscuro con borde superior más claro (dar sensación de profundidad/altura)
- **Puerta**: Color marrón/dorado, distinguishible del suelo
- **Pasillo**: Mismo color que suelo pero sin variación de ajedrez

### 1.4 Sala de Prueba

**Archivo: `src/scripts/game/world/Dungeon.js`**

Crear una función `generateTestRoom()` que genere una sala rectangular:

```
Ejemplo de sala 10x8:

WWWWWWWWWW
W........W
W........W
W........W
W........W
W........W
W........W
WWWWWWWWWW

W = WALL (muro)
. = FLOOR (suelo libre)
```

**Reglas de generación:**
- Borde exterior = muros (TILE.WALL)
- Interior = suelo (TILE.FLOOR)
- Colocar 2-3 muros internos aleatorios como obstáculos
- Agregar al menos 1 puerta (TILE.DOOR) en un borde (para futuro pasillo)
- Puertas se renderizan pero no conectan a nada aún

### 1.5 Motor del Juego

**Archivo: `src/scripts/game/Game.js`**

```javascript
// Estructura básica del game loop
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'exploring'; // exploring | inventory | crafting | dead
    this.dungeon = null;
    this.player = null;
    this.turn = 0;
  }

  init() {
    // Generar sala de prueba
    this.dungeon = new Dungeon();
    this.dungeon.generateTestRoom();

    // Crear jugador en posición libre
    this.player = new Player(1, 1);

    // Configurar input
    this.input = new Input(this);

    // Iniciar bucle
    this.render();
  }

  handlePlayerAction(targetX, targetY) {
    // 1. Verificar si la celda es caminable
    // 2. Si hay enemigo → atacar
    // 3. Si hay item → recoger
    // 4. Si es suelo/puerta → mover
    // 5. Ejecutar turnos de enemigos
    // 6. Actualizar hambre
    // 7. Renderizar
  }

  render() {
    // Limpiar canvas
    // Dibujar tiles (suelo, muros, puertas)
    // Dibujar items en suelo
    // Dibujar enemigos
    // Dibujar jugador
    // Dibujar HUD
  }
}
```

### 1.6 Sistema de Input

**Archivo: `src/scripts/game/Input.js`**

El jugador se mueve haciendo **clic/tap en una casilla adyacente**:

1. Detectar posición del clic en el canvas
2. Convertir coordenadas del pixel a coordenada de grid (tileX, tileY)
3. Calcular distancia Manhattan desde jugador: `|tx - px| + |ty - py|`
4. Si distancia = 1 → acción válida (mover/atacar/interactuar)
5. Si distancia > 1 → ignorar (solo movimiento adyacente)

**También soportar:**
- Teclas WASD o flechas (movimiento direccional)
- Touch drag suave (swipe en móvil)

### 1.7 Renderizado del Canvas

**Archivo: `src/scripts/game/Renderer.js`**

```javascript
class Renderer {
  constructor(canvas, dungeon, player) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dungeon = dungeon;
    this.player = player;

    // Ajustar tamaño del canvas al viewport
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Calcular cuántas celdas caben en pantalla
    this.visibleCols = Math.ceil(this.canvas.width / CELL_SIZE);
    this.visibleRows = Math.ceil(this.canvas.height / CELL_SIZE);
    // Offset para centrar la vista en el jugador
    this.cameraX = this.player.x - Math.floor(this.visibleCols / 2);
    this.cameraY = this.player.y - Math.floor(this.visibleRows / 2);
  }

  render() {
    const { ctx, canvas } = this;

    // Fondo negro
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar tiles visibles
    for (let y = 0; y < this.visibleRows; y++) {
      for (let x = 0; x < this.visibleCols; x++) {
        const mapX = x + this.cameraX;
        const mapY = y + this.cameraY;
        const tile = this.dungeon.getTile(mapX, mapY);
        this.drawTile(ctx, x, y, tile);
      }
    }

    // Dibujar jugador
    this.drawPlayer(ctx);
  }

  drawTile(ctx, screenX, screenY, tile) {
    const x = screenX * CELL_SIZE;
    const y = screenY * CELL_SIZE;

    switch (tile) {
      case TILE.FLOOR:
        // Patrón ajedrez
        ctx.fillStyle = (screenX + screenY) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        break;

      case TILE.WALL:
        // Muro con sombra superior
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE * 0.3);
        break;

      case TILE.DOOR:
        ctx.fillStyle = COLORS.door;
        ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
        break;
    }
  }

  drawPlayer(ctx) {
    const x = (this.player.x - this.cameraX) * CELL_SIZE;
    const y = (this.player.y - this.cameraY) * CELL_SIZE;
    ctx.fillStyle = COLORS.player;
    // Dibujar sprite simple (cuadrado con ojos)
    ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
    // Ojos
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 10, y + 10, 4, 4);
    ctx.fillRect(x + 18, y + 10, 4, 4);
  }
}
```

### 1.8 Player y Entity

**Archivo: `src/scripts/game/entities/Player.js`**

```javascript
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.hp = PLAYER_DEFAULTS.hp;
    this.maxHp = PLAYER_DEFAULTS.maxHp;
    this.hunger = PLAYER_DEFAULTS.hunger;
    this.maxHunger = PLAYER_DEFAULTS.maxHunger;
    this.attack = PLAYER_DEFAULTS.attack;
    this.defense = PLAYER_DEFAULTS.defense;
    this.level = PLAYER_DEFAULTS.level;
    this.xp = PLAYER_DEFAULTS.xp;
    this.inventory = []; // Array de items equipados/en mochila
  }

  canMoveTo(x, y, dungeon) {
    const tile = dungeon.getTile(x, y);
    return tile === TILE.FLOOR || tile === TILE.DOOR || tile === TILE.CORRIDOR;
  }

  move(dx, dy, dungeon) {
    const newX = this.x + dx;
    const newY = this.y + dy;
    if (this.canMoveTo(newX, newY, dungeon)) {
      this.x = newX;
      this.y = newY;
      return true;
    }
    return false;
  }
}
```

---

## Fase 2: Sistema de Turnos y Enemigos

### 2.1 Sistema de Turnos

El juego usa **turnos discretos** (como Pixel Dungeon):

1. **Turno del jugador**: Se mueve, ataca, o realiza una acción
2. **Turno de enemigos**: Cada enemigo ejecuta su IA
3. **Turno del mundo**: Hambre aumenta, efectos de veneno, etc.

```javascript
class TurnSystem {
  executeTurn(game, action) {
    // 1. Acción del jugador
    action.execute(game.player, game.dungeon);

    // 2. Turno de cada enemigo
    for (const enemy of game.dungeon.enemies) {
      enemy.executeTurn(game.player, game.dungeon);
    }

    // 3. Efectos del mundo
    game.player.hunger -= 0.1; // Se cansa lentamente
    game.turn++;

    // 4. Verificar condiciones de derrota
    if (game.player.hp <= 0) {
      game.state = 'dead';
    }
    if (game.player.hunger <= 0) {
      game.player.hp -= 1; // Muere de hambre
    }
  }
}
```

### 2.2 Enemigos

**Archivo: `src/scripts/game/entities/Enemy.js`**

Enemigos básicos con IA simple:

- **Rata**: Se mueve aleatoriamente, bajo HP/ataque
- **Esqueleto**: Perseguir al jugador si está cerca (Radio 5), medio HP/ataque
- **Slime**: Se mueve lentamente, alto HP, bajo ataque

**IA básica:**
```javascript
class Enemy {
  executeTurn(player, dungeon) {
    const dist = Math.abs(this.x - player.x) + Math.abs(this.y - player.y);

    if (dist <= this.aggroRange) {
      // Perseguir jugador (movimiento más cercano en Manhattan)
      this.moveToward(player.x, player.y, dungeon);
    } else {
      // Movimiento aleatorio
      this.moveRandom(dungeon);
    }

    // Si está adyacente al jugador, atacar
    if (dist === 1) {
      this.attack(player);
    }
  }
}
```

### 2.3 Combate

**Archivo: `src/scripts/game/systems/CombatSystem.js`**

```javascript
function calculateDamage(attacker, defender) {
  const baseDamage = attacker.attack;
  const defense = defender.defense;
  const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
  const damage = Math.max(1, baseDamage - defense + variance);
  return damage;
}
```

---

## Fase 3: Inventario y Crafteo

### 3.1 Sistema de Items

**Tipos de items:**

| Categoría | Item | Efecto |
|-----------|------|--------|
| **Armas** | Espada oxidada | ATK +3 |
| | Hacha de piedra | ATK +5 |
| | Daga afilada | ATK +4, Velocidad +1 |
| **Armaduras** | Túnica gastada | DEF +2 |
| | Cota de malla | DEF +5 |
| | Pechera de hierro | DEF +8 |
| **Herramientas** | Pico | Minar muros (obtener piedra) |
| | Pala | Excavar suelo (obtener tierra) |
| | Antorcha | Iluminar salas oscuras |
| **Consumibles** | Poción de vida | Recupera 30 HP |
| | Poción de hambre | Recupera 40 Hambre |
| | Ración seca | Recupera 20 Hambre |
| **Materiales** | Madera | Material de crafteo |
| | Piedra | Material de crafteo |
| | Hierro | Material de crafteo (raro) |
| | Cuero | Material de crafteo |

### 3.2 Bancos de Trabajo

| Estación | Función | Craftea |
|----------|---------|---------|
| **Banco de trabajo** | Fabricar herramientas y armas básicas | Espada, hacha, pico, antorcha |
| **Horno** | Fundir metales, cocinar | Cota de malla, hierro fundido, comida cocida |
| **Yunque** | Forjar armaduras y armas avanzadas | Pechera de hierro, espada refinada |
| **Mesón** | Alquimia | Pociones, venenos, antídotos |

### 3.3 Recetas de Crafteo

**Archivo: `src/scripts/game/data/recipes.js`**

```javascript
export const RECIPES = {
  // === BANCO DE TRABAJO ===
  workbench: {
    'espada oxidada': { materials: { madera: 3, piedra: 1 }, station: 'workbench' },
    'hacha de piedra': { materials: { madera: 2, piedra: 3 }, station: 'workbench' },
    'antorcha x3': { materials: { madera: 1 }, station: 'workbench' },
    'pico': { materials: { madera: 2, piedra: 2 }, station: 'workbench' },
    'bancos de trabajo': { materials: { madera: 5 }, station: 'workbench' },
  },

  // === HORNO ===
  furnace: {
    'hierro fundido': { materials: { hierro: 2 }, station: 'furnace' },
    'cota de malla': { materials: { hierro: 4, cuero: 2 }, station: 'furnace' },
    'ración cocida': { materials: { ración_seca: 1 }, station: 'furnace' },
    'horno': { materials: { piedra: 8 }, station: 'workbench' },
  },

  // === YUNQUE ===
  anvil: {
    'pechera de hierro': { materials: { hierro: 6 }, station: 'anvil' },
    'espada refinada': { materials: { hierro: 3, madera: 1 }, station: 'anvil' },
  },

  // === MESÓN ===
  alchemy: {
    'poción de vida': { materials: { hierbas: 2, frasco: 1 }, station: 'alchemy' },
    'poción de hambre': { materials: { hierbas: 1, miel: 1, frasco: 1 }, station: 'alchemy' },
  },
};
```

### 3.4 UI de Inventario

El inventario se muestra como una **overlay** con grid de items:

```
┌─────────────────────────────┐
│ INVENTARIO          [Cerrar] │
│                              │
│  ┌──┬──┬──┬──┬──┬──┬──┬──┐  │
│  │⚔ │🛡 │🪓 │  │  │  │  │  │  │  ← Equipment
│  ├──┼──┼──┼──┼──┼──┼──┼──┤  │
│  │  │  │  │  │  │  │  │  │  │  ← Inventario
│  ├──┼──┼──┼──┼──┼──┼──┼──┤  │
│  │  │  │  │  │  │  │  │  │  │
│  ├──┼──┼──┼──┼──┼──┼──┼──┤  │
│  │  │  │  │  │  │  │  │  │  │
│  └──┴──┴──┴──┴──┴──┴──┴──┘  │
│                              │
│  Seleccionado: Espada oxidada│
│  ATK +3  [Equipar] [Usar]   │
└─────────────────────────────┘
```

---

## Fase 4: Salas, Puertas y Pasillos

### 4.1 Generación de Salas

**Sistema de habitaciones conectadas:**

```
┌──────────┐     ┌──────────┐
│  SALA 1  │◄───►│  SALA 2  │
│ (_inicio)│     │ (tesoro) │
└────┬─────┘     └────┬─────┘
     │                │
     ▼                ▼
  ┌──────┐      ┌──────────┐
  │PASILLO│      │  SALA 3  │
  └──┬───┘      │ (enemigo)│
     │          └──────────┘
     ▼
┌──────────┐
│  SALA 4  │
│ (horno)  │
└──────────┘
```

### 4.2 Tipos de Salas

| Tipo | Contenido | Probabilidad |
|------|-----------|--------------|
| **Inicio** | Jugador empieza aquí, vacía | 1 (solo 1) |
| **Normal** | 1-2 enemigos, 0-2 items | 40% |
| **Tesoro** | Items valiosos, 0 enemigos | 15% |
| **Enemigos** | 3-5 enemigos | 20% |
| **Trampa** | Trampas en el suelo | 10% |
| **Tienda** | NPC vendedor (futuro) | 5% |
| **Horno/Banco** | Estaciones de crafteo | 10% |

### 4.3 Conexiones entre Salas

```javascript
class Room {
  constructor(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.doors = []; // { x, y, connectsTo: Room }
    this.enemies = [];
    this.items = [];
  }

  // Las puertas se colocan en los bordes de la sala
  // Conectan con pasillos que llevan a otras salas
  addDoor(side) {
    // side: 'north', 'south', 'east', 'west'
    // Colocar TILE.DOOR en el borde correspondiente
  }
}
```

---

## Fase 5: Interfaz de Usuario

### 5.1 HUD (Heads-Up Display)

Siempre visible en la parte superior:

```
┌─────────────────────────────────────┐
│ ❤ ████████░░ 72/100   🍖 ██████░░░ 60/100  │
│ Lv.1  ⚔ 5  🛡 2         Piso: 1             │
└─────────────────────────────────────┘
```

**Elementos:**
- **Barra de HP**: Roja, muestra vida actual/máxima
- **Barra de Hambre**: Amarilla, cuando llega a 0 pierde HP
- **Stats**: Nivel, ataque, defensa
- **Piso**: Número de nivel de la mazmorra

### 5.2 Minimapa

Pequeño mapa en la esquina superior derecha:

```
┌───────┐
│ ██░██ │  ██ = Sala explorada
│ ░░░░░ │  ░░ = Pasillo explorado
│ ░░░██ │  No mostrar salas no exploradas
│   ░░  │
└───────┘
```

### 5.3 Botones de Acción (móvil)

Parte inferior de la pantalla:

```
┌───────┬───────┬───────┬───────┐
│  🎒   │  ⚒️   │  🗺️   │  ⏸️   │
│Mochila│Crafteo│ Mapa  │ Pausa │
└───────┴───────┴───────┴───────┘
```

---

## Fase 6: Estilo Visual

### 6.1 Paleta de Colores

Usar una paleta **restringida** estilo pixel art:

```
Fondo:       #1a1a2e  (azul muy oscuro)
Suelo 1:     #2d2d44  (gris azulado)
Suelo 2:     #252540  (variación del suelo)
Muro:        #4a4a6a  (gris púrpura)
Muro top:    #5a5a7a  (borde superior claro)
Puerta:      #8b6914  (dorado/bronce)
Jugador:     #4ecdc4  (turquesa)
Enemigo:     #ff6b6b  (rojo coral)
Item:        #ffd93d  (amarillo dorado)
HP bar:      #ff6b6b  (rojo)
Hambre bar:  #ffd93d  (amarillo)
UI fondo:    #0f0f1a  (negro azulado)
UI texto:    #e0e0e0  (gris claro)
Acento:      #6c63ff  (púrpura, del template)
```

### 6.2 Sprites Pixel Art (Canvas)

Todos los sprites se dibujan **programáticamente** con `ctx.fillRect()`:

**Jugador (8x8 en celda de 32px):**
```
  ████
  ████
████████
████████
████████
  █  █
  ████
  █  █
```

**Muro (vista lateral):**
```
▓▓▓▓▓▓▓▓  ← Top face (color claro)
▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓  ← Front face (color oscuro)
▓▓▓▓▓▓▓▓
```

**Enemigo Rata:**
```
  █
 ███
██████
█ ██ █
██████
 █  █
```

### 6.3 Animaciones

- **Movimiento del jugador**: Interpolación suave (lerp) entre celdas (150ms)
- **Ataque**: Flash rojo en el enemigo golpeado (100ms)
- **Recoger item**: Item se encoge y sube hacia el jugador
- **Puerta**: Abrir con animación (se abre hacia un lado)
- **Muerte**: Enemigo parpadea y desaparece

---

## Fase 7: Persistencia

### 7.1 Guardar Partida

```javascript
// Auto-guardar cada 30 segundos y al cerrar la app
const saveData = {
  version: STORAGE_VERSION,
  player: {
    x: player.x,
    y: player.y,
    hp: player.hp,
    maxHp: player.maxHp,
    hunger: player.hunger,
    attack: player.attack,
    defense: player.defense,
    level: player.level,
    xp: player.xp,
    inventory: player.inventory,
  },
  dungeon: {
    floor: dungeon.floor,
    rooms: dungeon.rooms,
    tiles: dungeon.tiles,
    enemies: dungeon.enemies,
    items: dungeon.items,
  },
  stats: {
    turnsPlayed: game.turn,
    enemiesKilled: game.enemiesKilled,
    deepestFloor: game.deepestFloor,
  },
};
localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
```

---

## Implementación Paso a Paso (Fase 1)

### Paso 1: Limpiar index.astro
Eliminar las 3 pantallas actuales (home/about/settings) y el bottom nav.
Crear un `<div id="game-container">` con un `<canvas>`.

### Paso 2: Crear constants.js del juego
Reemplazar las constantes del template por las del juego.

### Paso 3: Crear Tile.js y Room.js
Definir tipos de tiles y generación de sala de prueba.

### Paso 4: Crear Dungeon.js
Generar una sala rectangular con muros y al menos 1 puerta.

### Paso 5: Crear Entity.js y Player.js
Clase base + jugador con posición y stats básicos.

### Paso 6: Crear Renderer.js
Renderizar el grid con canvas, patrón ajedrez para suelo, muros con profundidad.

### Paso 7: Crear Input.js
Detectar clic en celdas adyacentes, convertir pixel a grid coords.

### Paso 8: Crear Game.js
Orquestar todo: init, game loop, handlePlayerAction, render.

### Paso 9: Crear app.js (entry point)
Inicializar el canvas, crear instancia de Game, arrancar.

### Paso 10: Crear HUD.js
Barra de HP y hambre, stats del jugador.

### Paso 11: Ajustar main.css
Estilos para #game-container, canvas fullscreen, HUD overlay.

### Paso 12: Probar en `bun run dev`
Verificar que la sala se renderiza, el jugador se mueve, los muros bloquean.

---

## Restricciones Técnicas

1. **Sin dependencias externas** - Todo vanilla JS + Canvas API
2. **Un solo HTML** - El build final (post-build) debe ser un archivo autocontenido
3. **CSS inline** - No archivos CSS separados en el build
4. **Mobile-first** - Touch como input primario, teclado secundario
60FPS en WebView de Android - Optimizar renderizado (solo dibujar tiles visibles)
6. **localStorage** - Persistencia simple, sin backend
7. **Canvas rendering** - No DOM manipulation para el grid (rendimiento)
8. **Sin frameworks** - Vanilla JS, clases ES6+ con módulos

---

## Comandos de Build

```bash
bun run dev           # Servidor de desarrollo (localhost:4321)
bun run build         # Build estático → dist/
bun run build:apk     # Build + APK → dist/mazmorra.apk
bun run preview       # Preview del build
```

---

## Orden de Prioridad

1. ✅ Sala visible con grid y patrón ajedrez
2. ✅ Muros bloquean movimiento
3. ✅ Jugador se mueve con clic en casilla adyacente
4. ✅ HUD con HP y hambre
5. ⬜ Enemigos básicos con IA
6. ⬜ Sistema de turnos
7. ⬜ Items en el suelo
8. ⬜ Inventario
9. ⬜ Crafteo
10. ⬜ Múltiples salas con pasillos
11. ⬜ Múltiples pisos (escaleras)
12. ⬜ Minimapa
13. ⬜ Guardar/cargar partida
14. ⬜ Sprites pixel art detallados
15. ⬜ Animaciones de movimiento
16. ⬜ Sonidos (Web Audio API)
