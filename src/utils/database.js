/**
 * Database utilities for managing SQLite database
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/app.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new Database(DB_PATH);
console.log('Connected to SQLite database');

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize database tables
function initializeTables() {
    // Users table for storing user nicknames and persistent IDs
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            nickname TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Rooms table for storing room information including passwords
    db.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
            name TEXT PRIMARY KEY,
            password_hash TEXT,
            is_private BOOLEAN DEFAULT 0,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    `);

    // User sessions table for tracking active sessions
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
}

initializeTables();

// User management functions
const UserManager = {
    // Create or update user
    upsertUser(userId, nickname, ipAddress, userAgent) {
        const stmt = db.prepare(`
            INSERT INTO users (id, nickname, ip_address, user_agent, last_seen)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                nickname = excluded.nickname,
                ip_address = excluded.ip_address,
                user_agent = excluded.user_agent,
                last_seen = CURRENT_TIMESTAMP
        `);
        const result = stmt.run(userId, nickname, ipAddress, userAgent);
        return { id: userId, changes: result.changes };
    },

    // Get user by ID
    getUserById(userId) {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(userId);
    },

    // Find user by IP and user agent (for persistent identification)
    findUserByFingerprint(ipAddress, userAgent) {
        const stmt = db.prepare(`
            SELECT * FROM users
            WHERE ip_address = ? AND user_agent = ?
            ORDER BY last_seen DESC
            LIMIT 1
        `);
        return stmt.get(ipAddress, userAgent);
    },

    // Get database statistics
    getStats() {
        const stats = {};

        // Count users
        const userStmt = db.prepare('SELECT COUNT(*) as count FROM users');
        stats.users = userStmt.get().count;

        // Count sessions
        const sessionStmt = db.prepare('SELECT COUNT(*) as count FROM user_sessions');
        stats.sessions = sessionStmt.get().count;

        // Count rooms
        const roomStmt = db.prepare('SELECT COUNT(*) as count FROM rooms');
        stats.rooms = roomStmt.get().count;

        // Count private rooms
        const privateRoomStmt = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE is_private = 1');
        stats.privateRooms = privateRoomStmt.get().count;

        return stats;
    },

    // Delete old rooms (inactive for more than specified minutes)
    deleteOldRooms(maxAgeMinutes = 5) {
        const maxAgeMs = maxAgeMinutes * 60 * 1000;
        const cutoffTime = new Date(Date.now() - maxAgeMs);

        const stmt = db.prepare('DELETE FROM rooms WHERE last_activity <= ?');
        const result = stmt.run(cutoffTime.toISOString());
        return result.changes;
    },

    // Delete all rooms (for admin purposes)
    deleteAllRooms() {
        const stmt = db.prepare('DELETE FROM rooms');
        const result = stmt.run();
        return result.changes;
    }
};

// Room management functions
const RoomManager = {
    // Create or update room
    upsertRoom(roomName, passwordHash = null, createdBy = null) {
        const isPrivate = passwordHash !== null;
        const stmt = db.prepare(`
            INSERT INTO rooms (name, password_hash, is_private, created_by, last_activity)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
                password_hash = excluded.password_hash,
                is_private = excluded.is_private,
                last_activity = CURRENT_TIMESTAMP
        `);
        const result = stmt.run(roomName, passwordHash, isPrivate, createdBy);
        return { id: roomName, changes: result.changes };
    },

    // Get room by name
    getRoomByName(roomName) {
        const stmt = db.prepare('SELECT * FROM rooms WHERE name = ?');
        return stmt.get(roomName);
    },

    // Verify room password
    verifyRoomPassword(roomName, password) {
        const bcrypt = require('bcryptjs');
        const stmt = db.prepare('SELECT password_hash FROM rooms WHERE name = ?');
        const row = stmt.get(roomName);

        if (!row) {
            return false; // Room doesn't exist
        } else if (!row.password_hash) {
            return true; // Room is public
        } else {
            try {
                return bcrypt.compareSync(password, row.password_hash);
            } catch (bcryptErr) {
                throw bcryptErr;
            }
        }
    },

    // Update room activity timestamp
    updateRoomActivity(roomName) {
        const stmt = db.prepare(`
            UPDATE rooms
            SET last_activity = CURRENT_TIMESTAMP
            WHERE name = ?
        `);
        const result = stmt.run(roomName);
        return { changes: result.changes };
    },

    // Get all rooms
    getAllRooms() {
        const stmt = db.prepare(`
            SELECT name, is_private, created_by, created_at, last_activity
            FROM rooms
            ORDER BY last_activity DESC
        `);
        return stmt.all();
    }
};

// Session management functions
const SessionManager = {
    // Create session
    createSession(sessionId, userId, ipAddress, userAgent, expiresAt) {
        const stmt = db.prepare(`
            INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(sessionId, userId, ipAddress, userAgent, expiresAt);
        return { id: sessionId };
    },

    // Get session by ID
    getSession(sessionId) {
        const stmt = db.prepare(`
            SELECT us.*, u.nickname
            FROM user_sessions us
            JOIN users u ON us.user_id = u.id
            WHERE us.session_id = ? AND us.expires_at > CURRENT_TIMESTAMP
        `);
        return stmt.get(sessionId);
    },

    // Clean expired sessions
    cleanExpiredSessions() {
        const stmt = db.prepare('DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
        const result = stmt.run();
        return result.changes;
    },

    // Delete all sessions (for admin purposes)
    deleteAllSessions() {
        const stmt = db.prepare('DELETE FROM user_sessions');
        const result = stmt.run();
        return result.changes;
    }
};

module.exports = {
    UserManager,
    RoomManager,
    SessionManager
};
