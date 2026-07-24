# Mazmorra - Juego de Supervivencia

## Comandos

```bash
bun install           # Instalar dependencias
bun run dev           # Servidor de desarrollo (localhost:4321)
bun run build         # Build estático → dist/
bun run build:apk     # Build + APK → dist/mazmorra.apk
bun run preview       # Preview del build
```

> **IMPORTANTE**: Usar siempre `bun` como package manager. `npm install` está bloqueado intencionalmente.
> **Node.js**: Requiere >= 22.12.0. Usar `nvm use 22.23.1` si es necesario.

## Estructura

```
src/
├── pages/index.astro              # Pantalla de juego (canvas fullscreen)
├── scripts/
│   ├── app.js                     # Entry point → inicializa Game
│   ├── constants.js               # Constantes: TILE, COLORS, ENEMY_TYPES, ITEM_TYPES
│   ├── game/
│   │   ├── Game.js                # Motor principal (estado, turnos, overlays, save/load)
│   │   ├── Renderer.js            # Canvas rendering (tiles, entities, particles)
│   │   ├── Input.js               # Click, touch, swipe, teclado (WASD/flechas)
│   │   ├── entities/
│   │   │   ├── Entity.js          # Clase base (HP, ataque, defensa, muerte)
│   │   │   └── Player.js          # Jugador (stats, inventario, equipo, level up)
│   │   ├── world/
│   │   │   ├── Tile.js            # Helpers para tipos de tile
│   │   │   ├── Room.js            # Definición de sala (puertas, muros internos)
│   │   │   └── Dungeon.js         # Generación de niveles (salas, pasillos, enemigos, items)
│   │   ├── systems/
│   │   │   ├── TurnSystem.js      # Turnos: jugador → enemigos → mundo (hambre)
│   │   │   └── CombatSystem.js    # Daño, persecución, movimiento de enemigos
│   │   └── data/
│   │       └── recipes.js         # Recetas de crafteo por estación
│   └── components/
│       ├── HUD.js                 # Barras HP/hambre/XP, stats, log de mensajes
│       ├── MiniMap.js             # Minimapa canvas con vista de la mazmorra
│       ├── Inventory.js           # Overlay de inventario + equipamiento
│       ├── CraftingUI.js          # Overlay de crafteo por estaciones
│       ├── Toast.js               # Notificaciones
│       └── ConfirmDialog.js       # Diálogos de confirmación
└── styles/main.css                # Estilos del juego (pixel art dark theme)
```

## Arquitectura del Juego

- **Renderizado**: Canvas 2D, tiles de 32px, sprites programáticos (fillRect)
- **Movimiento**: Turnos discretos (como Pixel Dungeon) — clic/tap en celda adyacente
- **Input**: Click/tap, swipe, WASD/flechas, long-press para esperar
- **Persistencia**: localStorage (auto-guardado cada 30s + al cerrar)
- **Build**: Astro SSG → post-build inlinea JS → un solo HTML autocontenido
- **Android**: WebView wrapper con JS interface

## Sistemas del Juego

### Tiles (Tipos de casilla)
| ID | Tipo | Caminable | Descripción |
|----|------|-----------|-------------|
| 0 | VOID | No | Fuera del mapa |
| 1 | FLOOR | Sí | Suelo (patrón ajedrez) |
| 2 | WALL | No | Muro (bloquea movimiento) |
| 3 | DOOR | Sí | Puerta entre salas |
| 4 | CORRIDOR | Sí | Pasillo |
| 5 | STAIRS_DOWN | Sí | Escalera bajar piso |
| 6 | STAIRS_UP | Sí | Escalera subir piso |

### Generación de Niveles
- Salas rectangulares aleatorias (5-10 de ancho/alto)
- Conectadas por pasillos en L
- Tipos de sala: start, normal, enemy, treasure, workshop, trap
- Enemigos y items escalan con el piso

### Combate
```
Daño = max(1, ATK_atacante - DEF_defensor + varianza(-1,0,+1))
```

### Crafteo (4 estaciones)
- 🪵 Banco de trabajo: armas y herramientas básicas
- 🔥 Horno: fundir, cocinar, armadura de malla
- 🔨 Yunque: armas/armadura de hierro
- 🧪 Mesón: pociones

### Controles
| Acción | Teclado | Touch |
|--------|---------|-------|
| Mover | WASD / Flechas | Tap en celda adyacente / Swipe |
| Esperar | Espacio | Long press (500ms) |
| Recoger | G | Botón "Recoger" |
| Inventario | I | Botón "Mochila" |
| Crafteo | C | Botón "Crafteo" |
| Mapa | M | Botón "Mapa" |
| Cerrar overlay | Escape | Tap fuera / botón ✕ |

## Reglas de Desarrollo

1. **Sin dependencias externas** — Todo vanilla JS + Canvas API
2. **CSS inline en build** — No archivos CSS separados
3. **Componentes en src/scripts/** — No en src/components/
4. **Constantes en constants.js** — Evitar magic strings
5. **Mobile-first** — Touch como input primario
6. **Un solo HTML** — Build final autocontenido
7. **Sprites programáticos** — Todo con ctx.fillRect(), sin imágenes externas
8. **Turnos discretos** — Mundo solo avanza cuando el jugador actúa
