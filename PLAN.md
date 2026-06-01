# VOID STATION — Plan de Desarrollo

## Descripción
Videojuego de terror/puzzles 3D en nave espacial (inspirado en Alien Isolation).
Desarrollado en WebGL con Three.js para la UA "Gráficas Computacionales en Web".
Entrega final: **Sábado 6 de junio de 2026**.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| 3D | Three.js (CDN) |
| Frontend | HTML + CSS + vanilla JS |
| Backend | Node.js + Express + Socket.io |
| Base de datos | MySQL (Railway plugin) |
| ORM / Query Builder | knex.js |
| Modelos 3D | Kenney Modular Space Kit (GLTF) |
| Hosting frontend | GitHub Pages |
| Hosting backend | Railway.app (free tier) |

## Game Design

### Concepto
El jugador despierta en una estación espacial desactivada. Debe explorar habitaciones, encontrar objetos, resolver acertijos y escapar. Ambiente oscuro, luces parpadeantes, tensión constante.

### 3 Escenarios
1. **Sala de Máquinas** — industrial, tuberías, vapor, iluminación roja/anaranjada, luces parpadeantes
2. **Laboratorio** — frío, estéril, iluminación azul/blanca, contenedores de vidrio
3. **Puente de Mando** — alta tecnología, hologramas, iluminación cyan/verde, vista al espacio

### 2 Modos de Juego
1. **Historia** — recorrer salas en orden, resolver puzzles, escapar
2. **Contrarreloj** — máximo progreso en X minutos, puntuación al final

### 2 Dificultades
- **Fácil:** puzzles simples, IA lenta, más pistas
- **Difícil:** puzzles complejos, IA agresiva, menos pistas

### Mecánica de Puzzles
- Buscar y usar objetos (tarjeta de acceso, batería, kit de reparación)
- Ingresar códigos en terminales/paneles de administración

### 3+ Ítems
- Tarjeta de acceso (abre puertas)
- Batería (activa sistemas)
- Kit de reparación (restaura salud)
- Fragmento de datos (pista)

### Multijugador
- **Cooperativo en tiempo real** (Socket.io)
- 2+ jugadores en la misma sala
- Puzzles compartidos — ambos pueden interactuar
- Ambos ganan cuando completan la sala

### IA Enemiga
- Drones de seguridad patrullan rutas fijas
- Detección por línea de vista + distancia
- Persecución al detectar al jugador

## Arquitectura del Proyecto

```
Computational-Web-Graphics/
├── index.html              ← pantallas (menú, config, scores, pausa, juego)
├── PLAN.md
├── STATUS.md
├── css/
│   └── style.css           ← estilos sci-fi (ya hecho)
├── js/
│   ├── main.js             ← navegación entre pantallas (ya hecho)
│   ├── game.js             ← inicialización Three.js + game loop
│   ├── player.js           ← controles WASD + PointerLock
│   ├── scene-manager.js    ← cambiar entre salas
│   ├── rooms/
│   │   ├── engine-room.js
│   │   ├── lab.js
│   │   └── bridge.js
│   ├── puzzle-system.js    ← objetos + códigos
│   ├── items.js            ← ítems recolectables + inventario
│   ├── enemies.js          ← IA de drones
│   ├── particles.js        ← efectos visuales
│   ├── audio.js            ← sonido y música
│   ├── multiplayer.js      ← cliente Socket.io
│   ├── hud.js              ← UI dentro del juego
│   └── modes.js            ← lógica de modos Historia / Contrarreloj
├── sql/
│   ├── schema.sql          ← CREATE TABLEs
│   └── queries.sql         ← queries de uso común
├── assets/
│   ├── models/             ← Kenney Modular Space Kit (GLTF)
│   │   ├── modular-space-kit/
│   ├── textures/
│   └── audio/
│       ├── music/
│       └── sfx/
└── server/
    ├── package.json
    ├── index.js             ← Express + Socket.io server
    ├── db.js                ← MySQL connection con knex.js
    └── schema.sql           ← CREATE TABLEs (scores, usuarios, salas)
```

## Cronograma (8 días)

| Día | Tema | Conceptos Three.js |
|---|---|---|
| **Vie 29** | Fundamentals | Scene, Camera, Renderer, Mesh, materiales básicos, animación loop |
| **Sáb 30** | Modelos 3D | GLTFLoader, cargar piezas Kenney, posicionamiento, escena |
| **Dom 31** | Controles + Colisiones | PointerLockControls, WASD, Raycaster, triggers |
| **Lun 1** | Sala de Máquinas | Escenario 1: modelos, ambient + point light, oscuridad |
| **Mar 2** | Laboratorio + Puente | Escenarios 2 y 3, texturas, atmósferas distintas |
| **Mié 3** | Puzzles + Ítems | Interacción con objetos, inventory, terminales con código |
| **Jue 4** | IA + Partículas + Sonido | Enemigos patrulla/persecución, PointsMaterial, PositionalAudio |
| **Vie 5** | Backend + Multiplayer | Express, Socket.io rooms, MySQL + knex.js, API REST |
| **Sáb 6** | Deploy + Pruebas | GitHub Pages, Railway, Railway MySQL plugin, ajustes finales, probar en Chrome |

## Checklist de Requisitos (Rúbrica)

- [x] Pantalla menú inicial
- [x] Pantalla configuraciones
- [x] Pantalla puntuaciones
- [x] Pantalla pausa
- [x] 4 ejercicios realizados en clase (1-8 completados)
- [ ] Detección y uso de colisiones
- [ ] Iluminación ambiental
- [ ] Iluminación focal (point light)
- [ ] 2 niveles de dificultad (no basados en tiempo)
- [ ] 3 escenarios totalmente distintos
- [ ] 2 modos de juego distintos
- [ ] Servicio web (API REST)
- [ ] Uso de redes sociales (compartir puntuación)
- [ ] Efectos de sonido y música de fondo
- [ ] 3+ ítems especiales
- [ ] Multijugador en tiempo real
- [ ] Partículas
- [ ] IA (seguimiento de enemigos al personaje)
- [ ] Modelos con texturas y animaciones (GLTF)
- [ ] Almacenamiento local (LocalStorage)
- [ ] Almacenamiento remoto (MySQL)
