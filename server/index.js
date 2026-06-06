const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { getDb, initDb } = require('./db');

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : '*',
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// API Routes

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/scores', async (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const mode = req.query.mode;
    const difficulty = req.query.difficulty;

    let query = db('scores').select('*').orderBy('score', 'desc').limit(limit);
    if (mode) query = query.where('mode', mode);
    if (difficulty) query = query.where('difficulty', difficulty);

    const rows = await query;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scores', async (req, res) => {
  try {
    const { username, score, mode, difficulty, time_secs, room } = req.body;
    if (!username || score === undefined) {
      return res.status(400).json({ error: 'username and score required' });
    }
    const db = getDb();
    const [id] = await db('scores').insert({
      username: username.substring(0, 32),
      score: Math.max(0, Math.floor(score)),
      mode: mode || 'story',
      difficulty: difficulty || 'easy',
      time_secs: Math.max(0, Math.floor(time_secs || 0)),
      room: room || 'engine',
    });
    const saved = await db('scores').where('id', id).first();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.io — multiplayer rooms

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('player-joined', { id: socket.id });
  });

  socket.on('player-move', (data) => {
    socket.to(data.room).emit('sync-move', { id: socket.id, pos: data.pos, rot: data.rot });
  });

  socket.on('puzzle-solve', (data) => {
    socket.to(data.room).emit('puzzle-update', { puzzle: data.puzzle, solved: true });
  });

  socket.on('disconnect', () => {
    // notify rooms
  });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDb();
    console.log('Database initialized');
  } catch (err) {
    console.warn('Database init failed (will use in-memory):', err.message);
  }
  server.listen(PORT, () => {
    console.log(`VOID STATION server running on port ${PORT}`);
  });
}

start();
