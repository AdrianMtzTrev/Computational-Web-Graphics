-- VOID STATION — Database Schema
-- MySQL via Railway plugin

CREATE DATABASE IF NOT EXISTS void_station;
USE void_station;

-- Scores per match
CREATE TABLE IF NOT EXISTS scores (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(32) NOT NULL,
    score       INT NOT NULL DEFAULT 0,
    mode        VARCHAR(32) NOT NULL,
    difficulty  VARCHAR(16),
    time_secs   INT NOT NULL DEFAULT 0,
    room        VARCHAR(32),                     -- reached room
    date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active multiplayer rooms (runtime state, managed via Socket.io)
CREATE TABLE IF NOT EXISTS rooms (
    id           VARCHAR(64) PRIMARY KEY,          -- room code
    host_name    VARCHAR(32) NOT NULL,
    mode         VARCHAR(32) NOT NULL,
    difficulty   VARCHAR(16),
    current_room VARCHAR(32) DEFAULT 'engine',
    status       VARCHAR(16) DEFAULT 'waiting',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
