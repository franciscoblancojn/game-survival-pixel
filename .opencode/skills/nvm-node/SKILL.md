---
name: nvm-node
description: Usar cuando se necesite ejecutar npm install, npm run dev, npm run build o cualquier comando npm. Recuerda usar nvm use 22.12.0 primero.
---

# NVM + Node.js - Gestión de Versión

## Requisito

Este proyecto requiere **Node.js >= 22.12.0**. El sistema tiene instalada la versión por defecto v18.20.2, que **NO es compatible**.

## Antes de cualquier comando npm

Siempre ejecutar:

```bash
source ~/.nvm/nvm.sh && nvm use 22.12.0
```

Esto carga nvm (necesario en scripts no-interactivos) y cambia a la versión correcta.

## Comandos comunes

```bash
# 1. Cambiar a Node.js 22.12.0
source ~/.nvm/nvm.sh && nvm use 22.12.0

# 2. Instalar dependencias
bun install

# 3. Desarrollo
npm run dev

# 4. Build estático
npm run build

# 5. Build + APK
npm run build:apk

# 6. Preview del build
npm run preview
```

## Alternativa con bun

El proyecto también soporta `bun` como package manager, que no requiere nvm:

```bash
bun install
bun run dev
bun run build
```

Pero si usas `npm`, **siempre** cambia la versión de Node primero.

## Script rápido (atajo)

Para no tener que escribir `source ~/.nvm/nvm.sh` cada vez, puedes crear un alias:

```bash
alias nvm22='source ~/.nvm/nvm.sh && nvm use 22.12.0'
```

Y luego solo:

```bash
nvm22 && npm run dev
```

## Notas

- La versión **22.12.0** es la mínima requerida por Astro 5.x
- `nvm use 22.12.0` solo afecta la shell actual
- Si abres una nueva terminal, repite el `nvm use`
