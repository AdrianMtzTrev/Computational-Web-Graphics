-- VOID STATION — Common Queries
-- Useful for manual testing and debugging

-- ==================== USERS ====================

-- Register new user
INSERT INTO users (username, password) VALUES ('demo', 'password_hash_here');

-- Find user by username (login)
SELECT * FROM users WHERE username = 'demo';

-- List all users
SELECT id, username, created_at FROM users ORDER BY created_at DESC;

-- ==================== SCORES ====================

-- Insert a score
INSERT INTO scores (user_id, score, mode, difficulty, time_secs, room)
VALUES (1, 1200, 'story', 'easy', 340, 'engine');

-- Global top 10 (with username)
SELECT u.username, s.score, s.mode, s.difficulty, s.time_secs, s.date
FROM scores s
JOIN users u ON s.user_id = u.id
ORDER BY s.score DESC
LIMIT 10;

-- Top 10 by mode
SELECT u.username, s.score, s.time_secs, s.date
FROM scores s
JOIN users u ON s.user_id = u.id
WHERE s.mode = 'story'
ORDER BY s.score DESC
LIMIT 10;

-- Scores for a specific user
SELECT * FROM scores WHERE user_id = 1 ORDER BY date DESC;

-- ==================== ROOMS (MULTIPLAYER) ====================

-- Create room
INSERT INTO rooms (id, host_id, mode, difficulty) VALUES ('ROOM01', 1, 'story', 'easy');

-- Join room (update status)
UPDATE rooms SET status = 'playing' WHERE id = 'ROOM01';

-- Available rooms (waiting for players)
SELECT * FROM rooms WHERE status = 'waiting' ORDER BY created_at DESC;

-- Close room
UPDATE rooms SET status = 'finished' WHERE id = 'ROOM01';

-- ==================== DIAGNOSTICS ====================

-- Check tables / row count
SELECT TABLE_NAME, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'void_station';

-- Last 10 scores
SELECT * FROM scores ORDER BY date DESC LIMIT 10;
