# template-astro-android

## Comandos

```bash
bun install           # Instalar dependencias
bun run dev           # Servidor de desarrollo (localhost:4321)
bun run build         # Build estático → dist/
bun run build:apk     # Build + APK → dist/template-astro-android.apk
bun run preview       # Preview del build
```

> **IMPORTANTE**: Usar siempre `bun` como package manager. `npm install` está bloqueado intencionalmente.

## Estructura

- `src/pages/index.astro` - SPA con 3 pantallas (Home, About, Settings)
- `src/scripts/app.js` - Entry point, navegación, orquestación
- `src/scripts/components/` - Componentes modulares (Toast, ConfirmDialog)
- `src/scripts/constants.js` - Constantes (SCREENS, STORAGE_KEY, etc.)
- `src/scripts/helpers.js` - Utilidades (debounce, formatDate, getGreeting)
- `src/scripts/storage.js` - Capa de persistencia (localStorage)
- `src/styles/main.css` - Estilos globales con temas light/dark (552 líneas)
- `src/layouts/BaseLayout.astro` - Shell HTML optimizado para móvil
- `scripts/` - Build automation (post-build, build-apk)
- `android/` - Configuración Android (WebView wrapper)
- `.opencode/` - Configuración de opencode (agentes, skills)

## Arquitectura

- Framework: Astro (SSG) + vanilla JS
- Empaquetado: Android WebView
- Persistencia: localStorage
- Navegación: SPA manual con CSS animations
- Temas: Light/Dark con CSS custom properties
- Build: Un solo archivo HTML autocontenido

## Flujo de Build

1. `astro build` genera archivos estáticos en `dist/`
2. `post-build.mjs` inlinea todo el JS en `index.html`
3. `build-apk.mjs` copia el HTML a Android assets y ejecuta Gradle

## Pantallas

| Pantalla | ID | Descripción |
|----------|-----|-------------|
| Home | `screen-home` | Hero con ícono, nombre, features |
| About | `screen-about` | Info de la app, versión, tecnología |
| Settings | `screen-settings` | Tema oscuro, nombre, reset datos |

## Navegación

- Bottom nav bar (click)
- Swipe gestures (touch events)
- Keyboard shortcuts (1/2/3)

## Componentes

### Toast (`src/scripts/components/Toast.js`)
```javascript
import { showToast } from './components/Toast.js';
showToast('Mensaje', 'info');     // info | success | error
```

### ConfirmDialog (`src/scripts/components/ConfirmDialog.js`)
```javascript
import { showConfirm } from './components/ConfirmDialog.js';
const confirmed = await showConfirm('¿Estás seguro?');
```

## Storage

```javascript
import { loadData, saveData, resetData } from './storage.js';
const data = loadData();      // { version: 1, settings: { theme, username } }
saveData(data);
resetData();                  // Limpia localStorage y retorna defaults
```

## CSS Themes

Variables en `:root` (light) y `[data-theme="dark"]`:
- `--bg`, `--surface`, `--accent`, `--text`, `--text-secondary`
- `--border`, `--shadow`, `--radius`

## Android

- `compileSdk = 34`, `minSdk = 21`, `targetSdk = 34`
- WebView con JavaScript y DOM Storage habilitados
- Interfaz JS: `AndroidExporter` (downloadFile, closeApp, openDownloads)
- Back button navega el historial del WebView

## Reglas de Desarrollo

1. **No agregar dependencias innecesarias** - El proyecto es vanilla JS, mantener así
2. **CSS inline en build** - No crear archivos CSS separados
3. **Componentes en src/scripts/** - No en src/components/
4. **Constates en constants.js** - Evitar magic strings
5. **Storage versionado** - Actualizar STORAGE_VERSION al cambiar esquema
6. **Mobile-first** - Todos los estilos optimizados para móvil
7. **Un solo HTML** - El build final debe ser un archivo autocontenido
