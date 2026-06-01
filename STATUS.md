# VOID STATION — Estado del Proyecto

## Estado General
🟡 **En desarrollo** — Día 3 de 8

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
| Mar 2 junio | |
| Mié 3 junio | |
| Jue 4 junio | |
| Vie 5 junio | |
| Sáb 6 junio | 🎯 Entrega final |
