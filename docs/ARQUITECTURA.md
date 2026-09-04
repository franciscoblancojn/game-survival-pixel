# Arquitectura

Este documento complementa el `README.md` (comandos/estructura) y `INSTRUCCIONES.md` (diseño del juego por fases). Aquí se explica *cómo* encajan las piezas técnicas: página única, sistema de componentes, estado global y el pipeline de build a Android.

## 1. Una sola página

`src/pages/index.astro` es la única ruta de la app. No hay enrutamiento del lado del cliente ni múltiples `.astro` en `src/pages/`. Lo que en una SPA tradicional serían "pantallas" aquí son **overlays**: divs que se muestran/ocultan con clases CSS sobre el mismo `#game-container`, montados todos de una vez en el layout:

```astro
<BaseLayout title="Mazmorra">
  <div id="game-container">
    <canvas id="game-canvas"></canvas>
    <Hub/>
    <Inventory/>
    <Crafting/>
    <Minimap/>
    <Death/>
    <ConfirmDialog/>
    <BottomBar/>
  </div>
  <Toast/>
  <script type="module">import '../scripts/app.ts';</script>
</BaseLayout>
```

`BaseLayout.astro` importa `main.css` (único CSS del proyecto) y `src/state/index.astro` (estado global, ver §3).

## 2. Sistema de componentes

Cada feature de UI sigue el mismo patrón de dos archivos:

| Archivo | Responsabilidad |
|---|---|
| `src/components/<Nombre>/index.astro` | Markup + estilos scoped del overlay/widget. Puede tener un `<script>` inline pequeño para enlazar al DOM (ver `Hub/index.astro`, que dispara `window.STATE?.hub.onRender()`). |
| `src/scripts/components/<Nombre>.ts` | Clase TS que gobierna el comportamiento: mostrar/ocultar, eventos de click, lectura/escritura de estado. |

El **motor de juego** (`src/scripts/game/`) es completamente independiente de Astro — son clases TS puras (`Game`, `Renderer`, `Input`, entidades, sistemas, mundo) que manipulan un `<canvas>` con la API 2D. `Game.ts` es el punto de integración: se instancia desde `app.ts` y se expone como `window.gameInstance` para que los botones de `BottomBar` (definidos inline en `index.astro`) puedan invocarlo.

### Añadir un componente nuevo

1. `src/components/<Nombre>/index.astro`.
2. `src/scripts/components/<Nombre>.ts`.
3. Registrar el `.astro` en `src/pages/index.astro`.
4. Si necesita datos vivos del juego, leerlos de `window.STATE` (estado) o de `window.gameInstance` (motor) — no dupliques estado en el componente.
5. Estilos en `src/styles/main.css` (namespacing por prefijo de clase, p. ej. `hud-*`, `inv-*`).

## 3. Estado global — `StateBase<T>`

`src/state/Base.ts` define una clase genérica que junta datos + binding a DOM:

```typescript
class StateBase<T> {
  onGet(key)          // lee del estado en memoria
  onSet(key, value)    // escribe en memoria (no toca el DOM)
  onUpdateData(key)     // sincroniza el DOM para esa key
  onRenderData(key, v)   // formatea el valor a string (override-able)
  onRender()              // onUpdateData para todas las keys
}
```

`src/state/Hub.ts` es la instancia concreta para los stats del jugador (HP, hambre, nivel, ataque, defensa, xp, piso). `src/state/index.astro` la expone en `window.STATE = { hub }` y dispara el render inicial cuando el DOM está listo.

**Detalle de implementación y una discrepancia conocida entre el binding de `Base.ts` y el HTML actual de `Hub/index.astro`** están documentados en la skill `.claude/skills/game-state/SKILL.md` — léela antes de tocar esta zona; no es un bug que deba "arreglarse de oficio" sin antes acordar con quien esté desarrollando esta parte cuál convención de IDs se usará.

## 4. Persistencia — solo `localStorage`

No hay backend. Dos capas conviven hoy:

- `src/scripts/storage.ts` — capa genérica heredada de la plantilla base (`loadData`/`saveData`/`resetData`), con su propio `StorageData` (tema, username). No está integrada con el guardado de partida real.
- `src/scripts/game/Game.ts` — guardado real del progreso del juego (jugador, mazmorra, stats), auto-guardado cada 30s y al cerrar, leído/escrito directo con `localStorage.getItem/setItem` usando `STORAGE_KEY`/`STORAGE_VERSION` de `constants.ts`.

Si se necesita persistir un dato nuevo, decidir explícitamente en cuál de las dos capas vive antes de escribir código — no crear una tercera.

## 5. Build → un solo HTML → APK Android

```
astro build          # genera dist/ ; astro.config.mjs fuerza CSS inline (inlineStylesheets, cssCodeSplit: false)
  ↓
post-build.mjs        # busca <script src="..."> en dist/index.html, inyecta el contenido, borra el archivo externo
  ↓
build-apk.mjs          # copia dist/index.html a android/app/src/main/assets/, genera iconos, corre Gradle
```

El resultado de `bun run build` es **un único `dist/index.html`** con CSS y JS embebidos — sin peticiones de red a assets propios. Esto es lo que permite que el WebView de Android (`MainActivity.java`) lo cargue como `file:///android_asset/...` sin conexión.

No introducir: imágenes externas, fuentes remotas (Google Fonts, CDNs), `fetch` a servicios propios, ni dependencias de UI que generen múltiples archivos de salida — todo rompe el modelo de "un solo HTML".

## 6. TypeScript

`tsconfig.json` extiende `astro/tsconfigs/strict`. Todo el código nuevo va en `.ts` (o `<script>` dentro de `.astro`, tipado por el mismo `tsconfig`). Los `.js` que aparecen en documentación antigua (`README` original de la plantilla, `INSTRUCCIONES.md`) son legado de cuando el proyecto no usaba TypeScript — el código real ya vive en `.ts`; no crear archivos `.js` nuevos.

## 7. Gobernanza del agente (Claude Code)

`.claude/settings.json` bloquea `git add/commit/merge/push/rebase` para cualquier agente que opere sobre este repositorio (permission `deny` + hook `PreToolUse` sobre la tool `Bash`, cubre también comandos compuestos). El agente puede compilar, testear, editar y crear archivos libremente; el control de versiones (staging, commit, push) lo hace siempre una persona. Ver `CLAUDE.md` para el detalle y el razonamiento.
