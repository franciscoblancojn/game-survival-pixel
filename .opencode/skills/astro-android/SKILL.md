---
name: astro-android
description: Use when working with this Astro + Android WebView project. Covers build pipeline, SPA architecture, CSS themes, Android wrapper, and mobile-optimized patterns. Use when the user asks about building APKs, modifying screens, adding features, fixing CSS, or understanding the Astro→Android flow.
---

# Astro Android Skill

## Project Overview

This is an Astro (SSG) project that builds to a single self-contained HTML file, wrapped in an Android WebView app.

## Package Manager

**Always use `bun`**. Running `npm install` will fail intentionally (blocked by `scripts/no-npm.sh`).

```bash
bun install           # Install dependencies
bun run dev           # Dev server
bun run build         # Build to dist/
bun run build:apk     # Build + APK
```

## Build Pipeline

```
bun install → astro build → post-build.mjs (inline JS) → build-apk.mjs (Android APK)
```

1. `astro build` outputs to `dist/` with CSS inlined (configured in astro.config.mjs)
2. `post-build.mjs` finds `<script src="...">` tags, inlines their content, removes external files
3. `build-apk.mjs` copies HTML to `android/app/src/main/assets/`, generates icons, runs Gradle

## SPA Architecture

- Single page (`src/pages/index.astro`) with 3 screen divs toggled via `.active` class
- Navigation managed by `app.js` with CSS transitions
- Components are vanilla JS modules in `src/scripts/components/`

### Adding a new screen:
1. Add screen HTML in `index.astro` with `id="screen-{name}"`
2. Add to `SCREENS` array in `constants.js`
3. Add nav button in the `<nav>` element
4. Add CSS styles in `main.css`

### Adding a new component:
1. Create file in `src/scripts/components/`
2. Export functions (e.g., `showX()`, `hideX()`)
3. Import in `app.js`

## CSS Architecture

- Light/Dark themes via CSS custom properties on `:root` and `[data-theme="dark"]`
- All CSS in `src/styles/main.css` (imported in BaseLayout.astro)
- No CSS modules or preprocessors
- Animations defined at end of file

### Theme variables:
- `--bg`, `--surface`, `--accent`, `--text`, `--text-secondary`, `--border`, `--shadow`

## Android Wrapper

- `android/` contains Gradle project with WebView
- `MainActivity.java` loads `file:///android_asset/template-astro-android.html`
- JavaScript interface: `AndroidExporter` with `downloadFile()`, `closeApp()`, `openDownloads()`
- Back button navigates WebView history

## Storage Pattern

```javascript
import { loadData, saveData, resetData } from './storage.js';

const data = loadData();      // { version: 1, settings: { theme: 'light', username: '' } }
data.settings.theme = 'dark';
saveData(data);                // Persists to localStorage
```

Storage key: `template-astro-android_data` (defined in constants.js)
Schema versioning: `STORAGE_VERSION` in constants.js

## Common Tasks

### Change app name:
- `src/layouts/BaseLayout.astro` - title and meta
- `src/pages/index.astro` - hero text
- `android/app/src/main/res/values/strings.xml` - Android app name
- `scripts/build-apk.mjs` - `appName` constant

### Add a new feature:
1. Create component in `src/scripts/components/`
2. Add UI in `index.astro`
3. Wire up in `app.js`
4. Add styles in `main.css`
5. Add constants in `constants.js` if needed

### Modify Android behavior:
- Edit `android/app/src/main/java/com/example/heloapp/MainActivity.java`
- Add permissions in `AndroidManifest.xml`
- Modify theme in `android/app/src/main/res/values/themes.xml`
