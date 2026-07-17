# template-astro-android

Plantilla para crear aplicaciones Android usando Astro como generador de sitios estáticos, empaquetadas en un WebView.

## Características

- **SPA con 3 pantallas**: Home, About, Settings
- **Navegación**: Bottom bar + swipe + teclado (1/2/3)
- **Temas**: Light/Dark con CSS custom properties
- **Persistencia**: localStorage con versionado
- **Build optimizado**: Un solo archivo HTML autocontenido
- **APK**: Empaquetado como Android WebView wrapper

## Requisitos

- Bun (package manager)
- Node.js >= 22.12.0
- Android SDK (para build de APK)
- ImageMagick (opcional, para generar iconos)

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

```
├── src/
│   ├── layouts/BaseLayout.astro    # Shell HTML optimizado para móvil
│   ├── pages/index.astro           # SPA con 3 pantallas
│   ├── scripts/
│   │   ├── app.js                  # Entry point y orquestación
│   │   ├── constants.js            # Constantes de la app
│   │   ├── helpers.js              # Utilidades generales
│   │   ├── storage.js              # Capa de persistencia
│   │   └── components/
│   │       ├── Toast.js            # Notificaciones
│   │       └── ConfirmDialog.js    # Diálogo de confirmación
│   └── styles/main.css             # Estilos globales (552 líneas)
├── scripts/
│   ├── post-build.mjs              # Inline JS en HTML
│   └── build-apk.mjs              # Copia HTML + genera APK
├── android/                        # Proyecto Android (WebView)
├── public/                         # Assets estáticos
├── astro.config.mjs                # Configuración Astro
└── package.json
```

## Arquitectura

- **Framework**: Astro (SSG) + vanilla JS
- **Empaquetado**: Android WebView (MainActivity.java)
- **Persistencia**: localStorage con esquema versionado
- **Navegación**: SPA manual con transiciones CSS
- **Temas**: Light/Dark con CSS custom properties
- **Build**: Un solo archivo HTML (CSS + JS inline)

## Flujo de Build

1. `astro build` genera archivos estáticos en `dist/`
2. `post-build.mjs` inlinea todo el JS en `index.html`
3. `build-apk.mjs` copia el HTML a Android assets y ejecuta Gradle

## Android

El wrapper Android (`android/`) usa:
- `compileSdk = 34`, `minSdk = 21`, `targetSdk = 34`
- WebView con JavaScript y DOM Storage habilitados
- Interfaz JS: `AndroidExporter` (downloadFile, closeApp, openDownloads)
- Back button navega el historial del WebView

## Licencia

MIT

## Desarrollador

- **Nombre:** Francisco Blanco
- **Web:** https://franciscoblanco.vercel.app/
- **Email:** blancofrancisco34@gmail.com
