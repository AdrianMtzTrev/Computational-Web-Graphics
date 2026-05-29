# VOID STATION — Estado del Proyecto

## Estado General
🟡 **En desarrollo** — Día 1 de 8

## Leyenda
- ✅ Completado
- 🟡 En progreso
- ❌ Pendiente

## Frontend — Pantallas

| Componente | Estado | Notas |
|---|---|---|
| Menú inicial | ✅ | Con estrellas animadas, botones JUGAR/CONFIG/PUNTUACIONES |
| Configuración | ✅ | Sliders volumen, selector dificultad, tabla controles |
| Puntuaciones | ✅ | Tabla con datos quemados (placeholder), conectará a BD |
| Pausa | ✅ | Overlay con CONTINUAR/REINICIAR/SALIR |
| Pantalla de juego | 🟡 | Placeholder "EN DESARROLLO" — se reemplazará con canvas Three.js |

## Frontend — Juego (Three.js)

| Componente | Estado | Notas |
|---|---|---|
| Inicialización Three.js | ❌ | Scene, Camera, Renderer |
| Game loop | ❌ | requestAnimationFrame + deltaTime |
| Controles (WASD + mouse) | ❌ | PointerLockControls |
| Colisiones | ❌ | Raycaster / bounding boxes |
| Sala de Máquinas | ❌ | Escenario 1 con Kenney pack |
| Laboratorio | ❌ | Escenario 2 |
| Puente de Mando | ❌ | Escenario 3 |
| Sistema de puzzles | ❌ | Objetos + terminales con código |
| Ítems / inventario | ❌ | 3+ objetos coleccionables |
| IA enemigos | ❌ | Drones patrulla + persecución |
| Partículas | ❌ | Chispas, hologramas, humo |
| Audio | ❌ | Música + SFX |
| HUD | ❌ | Vida, puntuación, items, tiempo |
| Modos de juego | ❌ | Historia + Contrarreloj |
| Dificultad | ❌ | Fácil / Difícil |

## Backend

| Componente | Estado | Notas |
|---|---|---|
| Servidor Express | ❌ | |
| Socket.io (salas) | ❌ | |
| MySQL + knex.js | ❌ | Railway plugin |
| API REST (/api/scores, /api/users) | ❌ | |
| LocalStorage | ❌ | Config + scores offline |
| Schema SQL | ✅ | `sql/schema.sql` — users, scores, rooms |
| Queries SQL | ✅ | `sql/queries.sql` — inserts, selects, top 10 |

## Multijugador

| Componente | Estado | Notas |
|---|---|---|
| Cliente Socket.io | ❌ | |
| Sala compartida | ❌ | |
| Sincronización de puzzles | ❌ | Ambos jugadores ven/afectan el mismo estado |

## Assets

| Componente | Estado | Notas |
|---|---|---|
| Kenney Modular Space Kit | ❌ | Por descargar y colocar en assets/models/ |
| Texturas adicionales | ❌ | |
| Música ambiente | ❌ | Por buscar (libre de regalías) |
| SFX (pasos, puertas, alarmas) | ❌ | Por buscar |

## Despliegue

| Componente | Estado | Notas |
|---|---|---|
| GitHub Pages | ❌ | Frontend |
| Railway.app | ❌ | Backend Node.js + MySQL |

## Ejercicios (requisito 30pts)

| Ejercicio | Estado | Notas |
|---|---|---|
| 1. Cubo 3D con iluminación | ❌ | Three.js básico |
| 2. Sistema solar miniatura | ❌ | Geometrías + animación |
| 3. Colisiones con raycasting | ❌ | |
| 4. Partículas | ❌ | |

## Progreso General

| Fecha | Avance |
|---|---|
| Vie 29 mayo | ✅ Plan creado, documentación lista, HTML/CSS existente |
| Sáb 30 mayo | |
| Dom 31 mayo | |
| Lun 1 junio | |
| Mar 2 junio | |
| Mié 3 junio | |
| Jue 4 junio | |
| Vie 5 junio | |
| Sáb 6 junio | 🎯 Entrega final |
