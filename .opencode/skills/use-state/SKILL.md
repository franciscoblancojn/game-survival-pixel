---
name: use-state
description: Usar cuando este trabajando en el manejo de estado del proyecto en clases y actualizacion de pantalla.
---

# Use State - Sistema de Gestión de Estado

## Archivos del Sistema

- `src/state/Base.ts` - Clase genérica `StateBase<T>` para manejo de estado
- `src/state/Hub.ts` - Instancia de estado para datos del jugador (HP, hambre, stats)

## Cómo Funciona

### StateBase<T>

Clase genérica que gestiona estado con renderizado automático al DOM.

```typescript
import { StateBase } from "./Base";

// Definir interfaz de props
interface MiEstado {
  nombre: string;
  valor: number;
}

// Crear instancia con key y valores por defecto
const miEstado = new StateBase<MiEstado>("mikey", {
  nombre: "test",
  valor: 0
});
```

### Props Interface

```typescript
interface StateBaseProps<T> {
  key: string;                    // Prefijo para IDs de elementos DOM
  data: T;                        // Datos del estado
  
  onGet: <K extends keyof T>(key: K) => T[K];        // Obtener valor
  onSet: <K extends keyof T>(key: K, value: T[K]) => void;  // Establecer valor
  
  onUpdateData: <K extends keyof T>(key: K) => void;  // Actualizar DOM
  onRenderData: <K extends keyof T>(key: K, value: T[K]) => string;  // Formatear valor
  
  onRender: () => void;           // Renderizar todos los datos
}
```

### Métodos Principales

| Método | Descripción |
|--------|-------------|
| `onGet(key)` | Obtiene un valor del estado |
| `onSet(key, value)` | Establece un valor en el estado |
| `onUpdateData(key)` | Actualiza el elemento DOM correspondiente |
| `onRenderData(key, value)` | Convierte valor a string para mostrar (override para personalizar) |
| `onRender()` | Renderiza todos los datos al DOM |

## Convención de IDs del DOM

Los elementos HTML deben tener IDs en formato: `{key}-{propiedad}`

```html
<!-- Para hub con key="hub" -->
<div id="hub-level">1</div>
<div id="hub-hp">100</div>
<div id="hub-maxHp">100</div>
<div id="hub-hunger">85</div>
<div id="hub-attack">10</div>
```

## Ejemplo: Hub (Estado del Jugador)

```typescript
// src/state/Hub.ts
import { StateBase } from "./Base";

interface HubProps {
  level: number;
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  attack: number;
  defense: number;
  xp: number;
  xpToLevel: number;
}

export const hub = new StateBase<HubProps>("hub", {
  level: 1,
  hp: 100,
  maxHp: 100,
  hunger: 100,
  maxHunger: 100,
  attack: 10,
  defense: 5,
  xp: 0,
  xpToLevel: 100,
});
```

### Uso

```typescript
import { hub } from "../state/Hub";

// Obtener valor
const hpActual = hub.onGet("hp");  // 100

// Establecer valor
hub.onSet("hp", 75);

// Actualizar un elemento en el DOM
hub.onUpdateData("hp");  // Actualiza #hub-hp

// Renderizar todos los datos
hub.onRender();  // Actualiza todos los elementos #hub-*
```

## Personalizar Renderizado

Override `onRenderData` para formatear valores:

```typescript
const hub = new StateBase<HubProps>("hub", defaults);

// Override para HP con barra visual
hub.onRenderData = (key, value) => {
  if (key === "hp") {
    const pct = (value / hub.onGet("maxHp")) * 100;
    return `<div class="bar" style="width:${pct}%"></div>${value}`;
  }
  return `${value}`;
};
```

## Crear Nuevo Estado

1. Crear archivo `src/state/MiEstado.ts`
2. Definir interfaz de props
3. Exportar instancia con `new StateBase<MiProps>("key", defaults)`
4. Agregar IDs en HTML: `id="{key}-{propiedad}"`
