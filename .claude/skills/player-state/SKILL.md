---
name: player-state
description: Usar al tocar hp/hambre/nivel/xp del jugador, la detección de muerte, el permadeath (borrado de ranura al morir), o el daño por hambre. Invocar antes de modificar src/scripts/game/entities/Player.ts, Entity.ts, TurnSystem.executeWorldEffects/executeEnemyTurns, o Game.handleDeath.
---

# player-state — HP, hambre, nivel y muerte del jugador

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `src/scripts/game/entities/Entity.ts` | Clase base: `hp`/`maxHp`/`attack`/`defense`, `takeDamage()`, `isAlive()`, `isAdjacentTo()`, `manhattanDistanceTo()`. |
| `src/scripts/game/entities/Player.ts` | `extends Entity` + `hunger`/`maxHunger`/`level`/`xp`/`xpToLevel`/inventario/equipo. `addXP()` (level-up), `equipItem()`/`useItem()`, `toJSON()`/`fromJSON()` para guardado. |
| `src/scripts/game/systems/TurnSystem.ts` | `executeWorldEffects()` (drena hambre, daño por inanición), `executeEnemyTurns()` (daño de combate), y el único punto que decide si el jugador murió este turno. |
| `src/scripts/game/Game.ts` | `handleDeath()` — qué pasa cuando el jugador muere: overlay, permadeath, vuelta al menú. |
| `src/components/Hub/index.astro` + `src/scripts/components/Hub.ts` | HUD: sincroniza `hp`/`hunger`/`xp`/`level` al DOM cada `render()` — no es el sistema de estado `StateBase<T>` (ver skill `game-state`, son cosas distintas con el mismo nombre "Hub"). |

## Ciclo de un turno (dónde se aplica cada cosa)

```
TurnSystem.executePlayerAction(action)
  → resuelve la acción (mover/atacar/recoger/esperar)
  → executeEnemyTurns()       # cada enemigo vivo puede atacar → player.takeDamage()
  → executeWorldEffects()     # hambre -0.15; si hunger<=0, hp -= 1
  → turn++
  → SI player.hp <= 0 Y game.state !== 'dead' → game.handleDeath()   # ← único punto de detección de muerte
```

**Todo el daño al jugador (combate o hambre) converge en este único chequeo al final de `executePlayerAction`.** Si agregas una fuente de daño nueva (trampas, veneno, lo que sea), no necesitas llamar `handleDeath()` vos mismo — solo asegurate de que reste `player.hp` dentro del flujo de un turno (antes de ese chequeo) y la muerte se detecta sola. No dupliques el chequeo `hp <= 0` en otro lado.

### Por qué existe este único punto (bug real, ya arreglado)

`Game.handleDeath()` existía desde el principio pero **nada lo llamaba nunca**. El daño de combate (`executeEnemyTurns`) y el de hambre (`executeWorldEffects`) bajaban `player.hp` hasta 0 sin disparar la muerte — el jugador quedaba "vivo" con 0 hp, totalmente jugable, para siempre. Si tocás esta zona y ves un chequeo `if (player.hp <= 0)` que solo hace `addMessage(...)` sin llamar `game.handleDeath()`, es una regresión a ese mismo bug.

`executeEnemyTurns()` además corta el loop apenas el jugador muere a mitad de ronda (`if (player.hp <= 0) return;` después de aplicar un ataque) — los enemigos restantes no golpean a un cadáver. Si agregás una acción de enemigo nueva que dañe al jugador, replicá ese mismo corte temprano.

## Hambre y daño por inanición

```ts
player.hunger = Math.max(0, player.hunger - 0.15);  // por turno, siempre
if (player.hunger <= 0) {
  player.hp = Math.max(0, player.hp - 1);            // 1 de daño por turno mientras hunger === 0
}
```

Esto corre en `executeWorldEffects()`, llamado una vez por cada acción que consume turno (mover, atacar, recoger, esperar) — no solo "moverse" en sentido estricto, cualquier acción que haga `actionTaken = true` en `executePlayerAction`. Si quisieras que el daño por hambre aplicara *solo* al moverse (excluyendo esperar/atacar), tendría que moverse este chequeo fuera de `executeWorldEffects` y condicionarlo por `action.type === 'move'` — no está así hoy a propósito: permitir "esperar" para esquivar el daño por hambre rompería la presión de recursos que el hambre está pensada para dar. No lo cambies sin que te lo pidan explícitamente.

## Muerte y permadeath

`Game.handleDeath()`:
1. Si `state` ya es `'dead'`, no hace nada (evita procesar la muerte dos veces si combate y hambre coinciden el mismo turno).
2. `state = 'dead'`, para el autosave (`stopAutosave()`).
3. **Borra la ranura de guardado activa** (`deleteSlot(this.currentSlot)`) — permadeath: la partida terminó, no se puede "continuar" un personaje muerto. Esto es lo que hace que, al volver al menú principal, esa ranura aparezca vacía y `Continuar` no la ofrezca.
4. Muestra `#death-overlay` con stats (nivel, piso más profundo, turnos) y un único botón — "Volver al menú" (`Game.backToMenuAfterDeath()`), que oculta el overlay, limpia `currentSlot` y llama `showMainMenu()`.

**No hay botón "Continuar" en la pantalla de muerte, ni la ranura del personaje muerto vuelve a aparecer como continuable.** Si te piden agregar una opción a esa pantalla, que no sea "revivir con el mismo guardado" — el diseño es permadeath deliberado (coherente con la inspiración del juego, Pixel Dungeon). Si en el futuro se pide "reintentar en la misma ranura", es una decisión de diseño nueva a confirmar con el usuario, no algo a asumir.

`Game.saveGame()` tiene un guard `if (this.currentSlot === null || this.state === 'dead') return;` — necesario porque el autosave (cada 30s) o el `beforeunload` podrían disparar mientras el jugador todavía está mirando la pantalla de muerte, y sin el guard **resucitarían la ranura que `handleDeath()` acaba de borrar**. No lo quites.

`Game.continueGame(slot)` también valida esto por las dudas: si una ranura vieja (guardada antes de este fix, o corrupta) tiene `player.hp <= 0`, llama `handleDeath()` en vez de dejar jugar a un cadáver cargado desde disco.

## Nivel y XP

`Player.addXP(amount)`: acumula xp, y mientras `xp >= xpToLevel` sube de nivel (`level++`, `xpToLevel *= 1.5`, `maxHp += 10`, cura 10 hp, `attack += 1`, `defense += 1`). Puede subir más de un nivel de una vez si el XP ganado alcanza. Se llama desde `TurnSystem.playerAttack` al matar un enemigo.

`Player.getEffectiveAttack()`/`getEffectiveDefense()` suman el bonus del arma/armadura equipada (`equipment.weapon`/`equipment.armor`) a los stats base — son las que usa `CombatSystem.calculateDamage`, no `player.attack`/`player.defense` directo. Si necesitás el daño "real" del jugador en un cálculo nuevo, usá los métodos `getEffective*`, no las propiedades crudas.

## Testing

`src/__tests__/scripts/game/systems/CombatSystem.test.ts` § "TurnSystem — detección de muerte del jugador": cubre que `handleDeath()` se llama por daño de combate, por hambre, que el hp baja de a 1 por turno con hambre en 0, que no se llama con hp > 0, que no se duplica si `state` ya es `'dead'`, y que un enemigo "de más" en la misma ronda no golpea a un jugador ya muerto. Si tocás `executeWorldEffects`, `executeEnemyTurns` o `handleDeath`, corré `bun run test` — estos son el contrato de que la muerte se detecta siempre, exactamente una vez, sin importar la causa.
