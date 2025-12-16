/**
 * Database utilities for managing SQLite database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/app.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeTables();
    }
});

// Initialize database tables
function initializeTables() {
    // Users table for storing user nicknames and persistent IDs
    db.run(`
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
    db.run(`
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
    db.run(`
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

// User management functions
const UserManager = {
    // Create or update user
    async upsertUser(userId, nickname, ipAddress, userAgent) {
        return new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO users (id, nickname, ip_address, user_agent, last_seen)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    nickname = excluded.nickname,
                    ip_address = excluded.ip_address,
                    user_agent = excluded.user_agent,
                    last_seen = CURRENT_TIMESTAMP
            `, [userId, nickname, ipAddress, userAgent], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: userId, changes: this.changes });
                }
            });
        });
    },

    // Get user by ID
    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Find user by IP and user agent (for persistent identification)
    async findUserByFingerprint(ipAddress, userAgent) {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT * FROM users
                WHERE ip_address = ? AND user_agent = ?
                ORDER BY last_seen DESC
                LIMIT 1
            `, [ipAddress, userAgent], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Get database statistics
    async getStats() {
        return new Promise((resolve, reject) => {
            const stats = {};

            // Count users
            db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                stats.users = row.count;

                // Count sessions
                db.get('SELECT COUNT(*) as count FROM user_sessions', [], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    stats.sessions = row.count;

                    // Count rooms
                    db.get('SELECT COUNT(*) as count FROM rooms', [], (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        stats.rooms = row.count;

                        // Count private rooms
                        db.get('SELECT COUNT(*) as count FROM rooms WHERE is_private = 1', [], (err, row) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            stats.privateRooms = row.count;

                            resolve(stats);
                        });
                    });
                });
            });
        });
    },

    // Delete old rooms (inactive for more than specified minutes)
    async deleteOldRooms(maxAgeMinutes = 5) {
        return new Promise((resolve, reject) => {
            const maxAgeMs = maxAgeMinutes * 60 * 1000;
            const cutoffTime = new Date(Date.now() - maxAgeMs);

            db.run('DELETE FROM rooms WHERE last_activity <= ?', [cutoffTime.toISOString()], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    },

    // Delete all rooms (for admin purposes)
    async deleteAllRooms() {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM rooms', [], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }
};

// Room management functions
const RoomManager = {
    // Create or update room
    async upsertRoom(roomName, passwordHash = null, createdBy = null) {
        const isPrivate = passwordHash !== null;
        return new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO rooms (name, password_hash, is_private, created_by, last_activity)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(name) DO UPDATE SET
                    password_hash = excluded.password_hash,
                    is_private = excluded.is_private,
                    last_activity = CURRENT_TIMESTAMP
            `, [roomName, passwordHash, isPrivate, createdBy], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: roomName, changes: this.changes });
                }
            });
        });
    },

    // Get room by name
    async getRoomByName(roomName) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM rooms WHERE name = ?', [roomName], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Verify room password
    async verifyRoomPassword(roomName, password) {
        const bcrypt = require('bcryptjs');
        return new Promise((resolve, reject) => {
            db.get('SELECT password_hash FROM rooms WHERE name = ?', [roomName], async (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(false); // Room doesn't exist
                } else if (!row.password_hash) {
                    resolve(true); // Room is public
                } else {
                    try {
                        const isValid = await bcrypt.compare(password, row.password_hash);
                        resolve(isValid);
                    } catch (bcryptErr) {
                        reject(bcryptErr);
                    }
                }
            });
        });
    },

    // Update room activity timestamp
    async updateRoomActivity(roomName) {
        return new Promise((resolve, reject) => {
            db.run(`
                UPDATE rooms
                SET last_activity = CURRENT_TIMESTAMP
                WHERE name = ?
            `, [roomName], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    },

    // Get all rooms
    async getAllRooms() {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT name, is_private, created_by, created_at, last_activity
                FROM rooms
                ORDER BY last_activity DESC
            `, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
};

// Session management functions
const SessionManager = {
    // Create session
    async createSession(sessionId, userId, ipAddress, userAgent, expiresAt) {
        return new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, expires_at)
                VALUES (?, ?, ?, ?, ?)
            `, [sessionId, userId, ipAddress, userAgent, expiresAt], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: sessionId });
                }
            });
        });
    },

    // Get session by ID
    async getSession(sessionId) {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT us.*, u.nickname
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.session_id = ? AND us.expires_at > CURRENT_TIMESTAMP
            `, [sessionId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Clean expired sessions
    async cleanExpiredSessions() {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP', [], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    },

    // Delete all sessions (for admin purposes)
    async deleteAllSessions() {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM user_sessions', [], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    },

    // Delete old rooms (inactive for more than specified minutes)
    async deleteOldRooms(maxAgeMinutes = 5) {
        return new Promise((resolve, reject) => {
            const maxAgeMs = maxAgeMinutes * 60 * 1000;
            const cutoffTime = new Date(Date.now() - maxAgeMs);

            db.run('DELETE FROM rooms WHERE last_activity <= ?', [cutoffTime.toISOString()], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    },

    // Delete all rooms (for admin purposes)
    async deleteAllRooms() {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM rooms', [], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    },

    // Get database statistics
    async getStats() {
        return new Promise((resolve, reject) => {
            const stats = {};

            // Count users
            db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                stats.users = row.count;

                // Count sessions
                db.get('SELECT COUNT(*) as count FROM user_sessions', [], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    stats.sessions = row.count;

                    // Count rooms
                    db.get('SELECT COUNT(*) as count FROM rooms', [], (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        stats.rooms = row.count;

                        // Count private rooms
                        db.get('SELECT COUNT(*) as count FROM rooms WHERE is_private = 1', [], (err, row) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            stats.privateRooms = row.count;

                            resolve(stats);
                        });
                    });
                });
            });
        });
    }
};

module.exports = {
    db,
    UserManager,
    RoomManager,
    SessionManager
};
