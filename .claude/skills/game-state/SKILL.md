---
name: game-state
description: Usar al trabajar en el manejo de estado del proyecto (src/state/*.ts) o al conectar un componente Astro a ese estado (binding a DOM, IDs, onRender). Invocar antes de crear un nuevo StateBase<T>, modificar Base.ts, o depurar por qué un valor no se actualiza en pantalla.
---

# game-state — Sistema de estado `StateBase<T>`

## Archivos

- `src/state/Base.ts` — clase genérica `StateBase<T>`: estado + binding a DOM.
- `src/state/Hub.ts` — instancia `hub` (HP, hambre, nivel, ataque, defensa, xp, piso).
- `src/state/index.astro` — expone `window.STATE = { hub, ... }` y dispara el render inicial al cargar el DOM.
- `src/env.d.ts` — declara el tipo de `window.STATE` (amplíalo cuando agregues un nuevo estado).

## Cómo funciona `StateBase<T>`

```typescript
import { StateBase } from "../state/Base";

interface MiEstado {
  nombre: string;
  valor: number;
}

const miEstado = new StateBase<MiEstado>("mikey", { nombre: "test", valor: 0 });
```

O como clase dedicada (patrón usado por `Hub`):

```typescript
// src/state/MiEstado.ts
import { StateBase } from "./Base";

export interface MiEstadoProps { nombre: string; valor: number; }

const defaultData: MiEstadoProps = { nombre: "test", valor: 0 };

export class MiEstado extends StateBase<MiEstadoProps> {
  constructor() {
    super("mikey", defaultData);
  }
}

export const miEstado = new MiEstado();
```

### API

| Método | Qué hace |
|---|---|
| `onGet(key)` | Lee un valor del estado en memoria |
| `onSet(key, value)` | Escribe un valor en el estado en memoria (no toca el DOM por sí solo) |
| `onUpdateData(key)` | Actualiza el DOM para esa key — ver "Convención de IDs" abajo |
| `onRenderData(key, value)` | Formatea `value` a string antes de insertarlo — overridealo para HTML custom (barras, iconos) |
| `onRender()` | Llama `onUpdateData` para cada key del estado |

## ⚠️ Convención de IDs — LEE ESTO ANTES DE ENLAZAR UN COMPONENTE

La implementación actual de `onUpdateData` en `Base.ts` hace:

```typescript
const element = document.getElementById(`${this.key}`); // un único elemento, id === this.key (p. ej. "hub")
element.innerHTML = element.innerHTML.replaceAll(`__${key}__`, value);
```

Es decir: **un solo contenedor** con `id="{key}"` (p. ej. `id="hub"`) que contiene placeholders `__prop__` (p. ej. `__hp__`, `__level__`) en su `innerHTML`. Esto es distinto de la convención documentada en `.opencode/skills/use-state` (ids por propiedad tipo `{key}-{prop}`, p. ej. `#hub-hp`) — esa convención **no** es la que `Base.ts` implementa hoy.

`src/components/Hub/index.astro` mezcla ambos estilos (ids compuestos `hub-hp-text`, más placeholders `__hub-hp__` en vez de `__hp__`), lo que hace que `onUpdateData` no encuentre nada que reemplazar y varios tests de `src/__tests__/state/Hub.test.ts` fallen. **No es un bug tuyo que debas corregir de oficio** — es una zona en desarrollo activo del usuario.

Antes de tocar `Base.ts`, `Hub.ts` o cualquier `.astro` bajo `src/components/`:

1. Corre `bun run test` y compara contra este estado conocido (18 fallos en `Hub.test.ts` a la fecha de este documento) para no confundir regresiones nuevas con las ya existentes.
2. Si el usuario pide "arreglar el HUD" o "que se actualice el HP en pantalla", pregunta explícitamente si prefiere:
   - (a) que `onUpdateData` soporte múltiples elementos por key (`{key}-{prop}`), o
   - (b) que el HTML de los componentes vuelva a placeholders únicos `__prop__` dentro de un solo contenedor `id="{key}"`.
   No asumas una de las dos sin confirmarlo — cambia el contrato para todos los componentes de estado existentes y futuros.

## Uso típico

```typescript
import { hub } from "../state/Hub";

hub.onGet("hp");           // lee
hub.onSet("hp", 75);        // escribe en memoria
hub.onUpdateData("hp");     // sincroniza el DOM para esa key
hub.onRender();              // sincroniza todo el estado con el DOM
```

`window.STATE.hub` es la misma instancia — úsalo desde `<script>` inline en componentes `.astro` (ver `Hub/index.astro`) para no reimportar el módulo en cada isla.

## Personalizar el renderizado

```typescript
hub.onRenderData = (key, value) => {
  if (key === "hp") {
    const pct = (value as number / hub.onGet("maxHp")) * 100;
    return `<div class="bar" style="width:${pct}%"></div>${value}`;
  }
  return `${value}`;
};
```

## Crear un estado nuevo

1. `src/state/<Nombre>.ts` con su interfaz de props y clase `extends StateBase<Props>`.
2. Registrarlo en `window.STATE` desde `src/state/index.astro` (import + añadir al objeto).
3. Ampliar la interfaz `Window.STATE` en `src/env.d.ts`.
4. Seguir la convención de IDs que se haya acordado (ver advertencia arriba) en el `.astro` que lo consuma.
5. Añadir tests en `src/__tests__/state/<Nombre>.test.ts` (ver `Hub.test.ts` como referencia de estructura, aunque hoy tenga fallos).
