/**
 * User management system with persistent nicknames
 */

const { UserManager: DBUserManager, SessionManager } = require('./database');
const { v4: uuidv4 } = require('uuid');

class UserManager {
    constructor() {
        this.activeUsers = new Map(); // sessionId -> user data
    }

    /**
     * Get or create user based on session/fingerprint
     * @param {string} sessionId - Session ID from cookie
     * @param {string} ipAddress - User's IP address
     * @param {string} userAgent - User's browser user agent
     * @returns {Promise<Object>} User data
     */
    async getOrCreateUser(sessionId, ipAddress, userAgent) {
        try {
            // First, try to get user from active session
            if (sessionId && this.activeUsers.has(sessionId)) {
                const cachedUser = this.activeUsers.get(sessionId);
                // Update last seen in database
                await DBUserManager.upsertUser(
                    cachedUser.id,
                    cachedUser.nickname,
                    ipAddress,
                    userAgent
                );
                return cachedUser;
            }

            // Try to get user from database session
            if (sessionId) {
                const session = await SessionManager.getSession(sessionId);
                if (session) {
                    const user = {
                        id: session.user_id,
                        nickname: session.nickname,
                        sessionId: sessionId
                    };
                    this.activeUsers.set(sessionId, user);
                    // Update last seen
                    await DBUserManager.upsertUser(
                        user.id,
                        user.nickname,
                        ipAddress,
                        userAgent
                    );
                    return user;
                }
            }

            // Try to find existing user by fingerprint (IP + User Agent)
            const existingUser = await DBUserManager.findUserByFingerprint(ipAddress, userAgent);
            if (existingUser) {
                // Create new session for existing user
                const newSessionId = this.generateSessionId();
                const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

                await SessionManager.createSession(
                    newSessionId,
                    existingUser.id,
                    ipAddress,
                    userAgent,
                    expiresAt
                );

                const user = {
                    id: existingUser.id,
                    nickname: existingUser.nickname,
                    sessionId: newSessionId
                };

                this.activeUsers.set(newSessionId, user);
                return user;
            }

            // Create new user
            return await this.createNewUser(ipAddress, userAgent);

        } catch (error) {
            console.error('Error in getOrCreateUser:', error);
            // Fallback to creating a new user
            return await this.createNewUser(ipAddress, userAgent);
        }
    }

    /**
     * Create a new user with default nickname
     * @param {string} ipAddress - User's IP address
     * @param {string} userAgent - User's browser user agent
     * @returns {Promise<Object>} New user data
     */
    async createNewUser(ipAddress, userAgent) {
        const userId = uuidv4();
        const defaultNickname = `Пользователь${Math.floor(Math.random() * 10000)}`;
        const sessionId = this.generateSessionId();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Save to database
        await DBUserManager.upsertUser(userId, defaultNickname, ipAddress, userAgent);
        await SessionManager.createSession(sessionId, userId, ipAddress, userAgent, expiresAt);

        const user = {
            id: userId,
            nickname: defaultNickname,
            sessionId: sessionId
        };

        this.activeUsers.set(sessionId, user);
        return user;
    }

    /**
     * Update user's nickname
     * @param {string} sessionId - Session ID
     * @param {string} newNickname - New nickname
     * @param {string} ipAddress - User's IP address
     * @param {string} userAgent - User's browser user agent
     * @returns {Promise<Object>} Updated user data
     */
    async updateNickname(sessionId, newNickname, ipAddress, userAgent) {
        if (!sessionId || !this.activeUsers.has(sessionId)) {
            throw new Error('Invalid session');
        }

        // Validate nickname
        const trimmedNickname = newNickname.trim();
        if (!trimmedNickname || trimmedNickname.length < 2 || trimmedNickname.length > 20) {
            throw new Error('Nickname must be between 2 and 20 characters');
        }

        // Check if nickname contains only allowed characters
        if (!/^[a-zA-Zа-яА-Я0-9\s\-_]+$/.test(trimmedNickname)) {
            throw new Error('Nickname can only contain letters, numbers, spaces, hyphens, and underscores');
        }

        const user = this.activeUsers.get(sessionId);

        // Update in database
        await DBUserManager.upsertUser(user.id, trimmedNickname, ipAddress, userAgent);

        // Update in memory
        user.nickname = trimmedNickname;
        this.activeUsers.set(sessionId, user);

        return user;
    }

    /**
     * Get user by session ID
     * @param {string} sessionId - Session ID
     * @returns {Object|null} User data or null if not found
     */
    getUserBySession(sessionId) {
        return this.activeUsers.get(sessionId) || null;
    }

    /**
     * Remove user session (logout)
     * @param {string} sessionId - Session ID
     */
    removeSession(sessionId) {
        this.activeUsers.delete(sessionId);
    }

    /**
     * Generate a unique session ID
     * @returns {string} Session ID
     */
    generateSessionId() {
        return uuidv4();
    }

    /**
     * Clean expired sessions from database
     * @returns {Promise<number>} Number of cleaned sessions
     */
    async cleanExpiredSessions() {
        return await SessionManager.cleanExpiredSessions();
    }

    /**
     * Get all active users
     * @returns {Array} Array of active users
     */
    getActiveUsers() {
        return Array.from(this.activeUsers.values());
    }
}

module.exports = new UserManager();
