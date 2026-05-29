-- VOID STATION — Database Schema
-- MySQL via Railway plugin

CREATE DATABASE IF NOT EXISTS void_station;
USE void_station;

-- Registered users
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(32) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,           -- bcrypt hash
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scores per match
CREATE TABLE IF NOT EXISTS scores (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    score       INT NOT NULL DEFAULT 0,
    mode        ENUM('story', 'time_attack') NOT NULL,
    difficulty  ENUM('easy', 'hard') NOT NULL,
    time_secs   INT NOT NULL DEFAULT 0,
    room        VARCHAR(32),                     -- reached room
    date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Active multiplayer rooms
CREATE TABLE IF NOT EXISTS rooms (
    id          VARCHAR(64) PRIMARY KEY,          -- room code
    host_id     INT NOT NULL,
    mode        ENUM('story', 'time_attack') NOT NULL,
    difficulty  ENUM('easy', 'hard') NOT NULL,
    current_room VARCHAR(32) DEFAULT 'engine',
    status      ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id)
);
