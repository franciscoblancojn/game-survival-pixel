---
name: mazmorra-astro-android
description: Usar al trabajar en este proyecto (Mazmorra) — build Astro→Android, arquitectura de una sola página con sistema de componentes, pipeline de inlineado a un solo HTML, wrapper WebView y convenciones TypeScript/localStorage. Invocar antes de tocar astro.config.mjs, scripts/, android/, src/pages/index.astro, o al añadir un componente nuevo.
---

# Mazmorra — Astro + Android (TypeScript, single page)

## Qué es este proyecto

Roguelike de supervivencia top-down. Astro genera un sitio estático que un post-build **inlinea en un único `index.html`** (CSS y JS embebidos), y ese HTML se empaqueta como asset de una app Android WebView. No hay backend: todo el estado vive en `localStorage`.

## Package manager

**Siempre `bun`.** `npm install` está bloqueado intencionalmente por `scripts/no-npm.sh` (actualmente el script está comentado/inerte, pero la convención del proyecto sigue siendo bun-only — no lo reactives sin que te lo pidan). Si por algún motivo se usa `npm`/`node` directo, se requiere Node >= 22.12.0 (`nvm use 22.23.1` si hace falta cambiar de versión).

```bash
bun install
bun run dev            # localhost:4321
bun run build           # dist/index.html (autocontenido)
bun run build:apk       # + dist/mazmorra.apk
bun run preview
bun run test            # vitest run
```

## Pipeline de build

```
bun install → astro build (CSS inline vía astro.config.mjs) → scripts/post-build.mjs (inlinea <script src>) → scripts/build-apk.mjs (copia a android/app/.../assets, genera iconos, corre Gradle)
```

1. `astro.config.mjs` fuerza `inlineStylesheets: 'always'` y `cssCodeSplit: false` — nunca quites esas opciones, son las que garantizan "un solo HTML".
2. `post-build.mjs` busca `<script src="...">` en `dist/index.html`, inyecta el contenido y borra el archivo externo. Si añades un `<script type="module" src="...">` nuevo en algún `.astro`, verifica que siga siendo detectado por ese script tras el build.
3. `build-apk.mjs` copia el HTML final a `android/app/src/main/assets/`, genera iconos si hay ImageMagick, y ejecuta Gradle.

No introduzcas imágenes externas, fuentes remotas (Google Fonts, CDNs) ni `fetch` a orígenes propios: rompe el modelo "un solo HTML" y el modo offline del WebView.

## Arquitectura: una sola página + sistema de componentes

- **Una única ruta**: `src/pages/index.astro`. Las "pantallas" (inventario, crafteo, minimapa, pantalla de muerte, confirmación) son overlays superpuestos con CSS, montados todos en el mismo DOM — no crear rutas nuevas en `src/pages/`.
- **Componente = par `.astro` + `.ts`**:
  - `src/components/<Nombre>/index.astro` — solo markup y estilos scoped del overlay/widget. Puede tener un `<script>` mínimo para exponer/enlazar el DOM (ver `Hub/index.astro`), pero la lógica de negocio va en TS aparte.
  - `src/scripts/components/<Nombre>.ts` — clase TS que gobierna ese componente (mostrar/ocultar, eventos, lectura de estado).
  - El motor de juego (`src/scripts/game/`) es agnóstico de Astro: es TS puro (clases `Game`, `Renderer`, `Input`, entidades, sistemas, mundo).
- **Estado global compartido**: `src/state/index.astro` expone `window.STATE` (ver skill `game-state`) para que cualquier componente lea/actualice datos sin prop-drilling.

### Añadir un componente nuevo

1. `src/components/<Nombre>/index.astro` con el markup + `class="..."` propio (namespacing simple por prefijo, como `hud-*`, `inv-*`).
2. `src/scripts/components/<Nombre>.ts` con la clase que lo controla.
3. Importar el `.astro` en `src/pages/index.astro` y montarlo dentro de `#game-container` (o donde corresponda visualmente).
4. Si el componente necesita datos del juego, léelos vía `window.STATE` o pasándolos desde `Game.ts` — no dupliques estado.
5. Estilos en `src/styles/main.css` (único archivo CSS, sin CSS modules ni preprocesadores).

## TypeScript estricto

`tsconfig.json` extiende `astro/tsconfigs/strict`. Evita `any`; para el DOM tipado en `env.d.ts` amplía `Window` (ver el patrón ya usado para `window.STATE`).

## Android

- `android/app/src/main/java/.../MainActivity.java` carga el HTML final desde `android_asset/`.
- Interfaz JS expuesta al WebView: `AndroidExporter` (`downloadFile`, `closeApp`, `openDownloads`).
- Botón atrás → navega el historial del WebView.
- `compileSdk 34`, `minSdk 21`, `targetSdk 34`.
- Cambiar nombre de la app: `BaseLayout.astro` (title/meta), `android/app/.../res/values/strings.xml`, `scripts/build-apk.mjs` (`appName`).

## Persistencia (resumen)

Todo por `localStorage`, versionado con `STORAGE_KEY`/`STORAGE_VERSION` (`src/scripts/constants.ts`). El guardado real de partida vive en `Game.ts` (auto-guardado + al cerrar); `src/scripts/storage.ts` es una capa genérica más simple heredada de la plantilla base — no la dupliques, si necesitas persistir algo nuevo decide con el usuario cuál de las dos capas usar.

## Git

Este repo tiene bloqueados `git add/commit/merge/push/rebase` para agentes vía `.claude/settings.json` (permission deny + hook `PreToolUse`). No lo rodees. Ver `CLAUDE.md` § "Git".
