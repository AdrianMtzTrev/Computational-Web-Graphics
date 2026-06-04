# VOID STATION — Estado del Proyecto

## Estado General
🟡 **En desarrollo** — Mar 2 junio (plan ajustado: pulir Sala Máquinas antes de expandir)

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
| Pantalla de juego | ✅ | Canvas Three.js + loading screen + HUD |

## Frontend — Juego (Three.js)

| Componente | Estado | Notas |
|---|---|---|
| Inicialización Three.js | ✅ | Scene, Camera, WebGLRenderer, ToneMapping |
| Game loop | ✅ | requestAnimationFrame + deltaTime clock |
| Controles (WASD + mouse) | ✅ | PointerLockControls, jump, crouch, run |
| Colisiones | ✅ | AABB Box3 con per-axis slide — 11 cajas estáticas |
| Sala de Máquinas | 🟡 | Kenney room + reactor + pipes + partículas + luces + items pickups + consolas interactivas — falta audio |
| Laboratorio | ❌ | Escenario 2 |
| Puente de Mando | ❌ | Escenario 3 |
| Sistema de puzzles | ✅ | 2 consolas: batería → reactor, tarjeta → puerta |
| Ítems / inventario | ✅ | 3 pickup: tarjeta, batería, kit reparación + inventario HUD |
| IA enemigos | ❌ | Drones patrulla + persecución |
| Partículas | 🟡 | Steam/vapor con PointsMaterial (engine room) |
| Audio | ❌ | Música + SFX |
| HUD | ✅ | Crosshair, barra de vida, prompt interactuar, inventario, mensajes |
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
| Kenney Modular Space Kit | ✅ | Extraído a assets/models/modular-space-kit/ (40+ GLB) |
| Texturas adicionales | ❌ | |
| Música ambiente | ❌ | Por buscar (libre de regalías) |
| SFX (pasos, puertas, alarmas) | ❌ | Por buscar |

## Despliegue

| Componente | Estado | Notas |
|---|---|---|
| GitHub Pages | ❌ | Frontend |
| Railway.app | ❌ | Backend Node.js + MySQL |

## Ejercicios (requisito 30pts)

| # | Descripción | Estado | Archivos |
|---|------------|--------|----------|
| 1 | HTML nombre/matrícula/formulario | ✅ | `index.html`, `target.html` |
| 2 | Formulario con localStorage/sessionStorage | ✅ | `index.html` |
| 3 | Servidor Express con Node.js | ✅ | `server.js`, `index.html`, `package.json` |
| 4 | 3 geometrías Three.js + MeshBasicMaterial | ✅ | `index.html` |
| 5 | MeshPhongMaterial + 3 luces + animación | ✅ | `index.html` |
| 6 | Cargar modelo OBJ con texturas | ✅ | `index.html`, `models/apple.obj/mtl` |
| 7 | Socket.io replicar posición de objetos | ✅ | `server.js`, `package.json`, `public/index.html` |
| 8 | PointLight al colisionar con cubo | ✅ | `index.html` |

## Progreso General

| Fecha | Avance |
|---|---|
| Vie 29 mayo | ✅ Plan creado, documentación lista, HTML/CSS existente |
| Sáb 30 mayo | |
| Dom 31 mayo | ✅ Ejercicios 1-8 completados + zips generados |
| Dom 31 mayo | |
| Lun 1 junio | |
| Mar 2 junio | 🟡 Core engine (Game, Player, HUD, SceneManager, EngineRoom) — pendiente colisiones reales, items, puzzles, audio |
| Mié 3 junio | |
| Jue 4 junio | |
| Vie 5 junio | |
| Sáb 6 junio | 🎯 Entrega final |
