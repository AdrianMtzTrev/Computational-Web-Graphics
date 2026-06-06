# VOID STATION — Estado del Proyecto

## Estado General
✅ **Completo** — Sáb 6 junio (entrega final)

## Leyenda
- ✅ Completado
- 🟡 En progreso
- ❌ Pendiente

## Frontend — Pantallas

| Componente | Estado | Notas |
|---|---|---|
| Menú inicial | ✅ | Con estrellas animadas, botones JUGAR/CONTINUAR/CONFIG/PUNTUACIONES |
| Configuración | ✅ | Sliders volumen, selector modo (Historia/No Daño), selector dificultad (Fácil/Difícil), tabla controles |
| Puntuaciones | ✅ | Conecta a API REST remota, fallback a datos quemados |
| Pausa | ✅ | Slider volumen ambiente, CONTINUAR/REINICIAR/SALIR |
| Pantalla de juego | ✅ | Canvas Three.js + loading screen + HUD |
| Win / Death | ✅ | Pantallas con mensaje, botones compartir/reintentar/salir |

## Frontend — Juego (Three.js)

| Componente | Estado | Notas |
|---|---|---|
| Inicialización Three.js | ✅ | Scene, Camera, WebGLRenderer, ToneMapping |
| Game loop | ✅ | requestAnimationFrame + deltaTime clock + EffectComposer |
| Controles (WASD + mouse) | ✅ | PointerLockControls, jump, crouch, run, flashlight (F) |
| Colisiones | ✅ | AABB Box3 con per-axis slide — colisiones por sala |
| Post-processing | ✅ | UnrealBloomPass + vignette ShaderPass |
| Sala de Máquinas | ✅ | Sci-Fi walls + reactor + pipes + partículas vapor/sparks + items pickups + consolas interactivas + luces parpadeantes + wall decor + audio ambiente + drone IA |
| Laboratorio | ✅ | Sci-Fi walls + gate-lasers + mobiliario procedural + terminal puzzle + items pickup + partículas/burbujas + audio ambiente |
| Puente de Mando | ✅ | Sci-Fi walls + ventanas con starfield + holo table + workstations + consola navegación + items pickup + partículas/data stream + audio ambiente + wall decor |
| Sistema de puzzles | ✅ | 3 puzzles: reactor (engine), terminal (lab), navegación (bridge) |
| Ítems / inventario | ✅ | 3+ pickup por sala + inventario HUD |
| IA enemigos | ✅ | SecurityDrone: patrulla → detección → persecución → daño |
| Partículas | ✅ | Steam (engine), sparks (engine), burbujas (lab), data stream (bridge), polvo flotante (todas) |
| Audio | ✅ | Ambiente (3 salas) + SFX procedurales (pasos, pickups, puertas, terminales, alarmas) |
| HUD | ✅ | Crosshair, barra de vida (colores), nombre de sala, objetivo, prompt interactuar, inventario, mensajes |
| Modos de juego | ✅ | Historia + No Daño |
| Dificultad | ✅ | Fácil (150 HP) / Difícil (75 HP + láser dañino) |
| Save/Load | ✅ | localStorage — guarda sala, inventario, puzzles; botón CONTINUAR en menú |

## Backend

| Componente | Estado | Notas |
|---|---|---|
| Servidor Express | ✅ | `server/index.js` — API REST + Socket.io |
| Socket.io (salas) | ✅ | Server + cliente `js/multiplayer.js` |
| MySQL + knex.js | ✅ | `server/db.js` — MySQL (Railway) o SQLite local |
| API REST | ✅ | GET/POST `/api/scores`, GET `/api/health` |
| LocalStorage | ✅ | Config + saves + scores offline |
| Schema SQL | ✅ | `sql/schema.sql` — users, scores, rooms |
| Queries SQL | ✅ | `sql/queries.sql` — inserts, selects, top 10 |

## Multijugador

| Componente | Estado | Notas |
|---|---|---|
| Cliente Socket.io | ✅ | `js/multiplayer.js` — conexión, salas, sync posición/puzzles |
| Sala compartida | 🟡 | Server soporta, cliente conecta — requiere Railway deploy |
| Sincronización de puzzles | ✅ | Server + cliente sincronizan estado |

## Assets

| Componente | Estado | Notas |
|---|---|---|
| Kenney Modular Space Kit | ✅ | Extraído a assets/models/modular-space-kit/ (40+ GLB) |
| Sci-Fi Series A | ✅ | Usado para paredes y decoraciones |
| Audio ambiente | ✅ | 3 tracks WAV/OGG por sala |
| SFX | ✅ | Procedurales vía Web Audio API (sin archivos) |

## Ejercicios (requisito 30pts)

| # | Descripción | Estado | Archivos |
|---|---|---|---|
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
| Dom 31 mayo | ✅ Ejercicios 1-8 completados + zips generados |
| Mar 2 junio | 🟡 Core engine (Game, Player, HUD, SceneManager, EngineRoom) |
| Jue 4 junio | ✅ Lab room implementada |
| Sáb 6 junio | ✅ **Entrega final** — todos los requisitos cubiertos |
