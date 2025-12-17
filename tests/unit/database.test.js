const { UserManager, RoomManager, SessionManager } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

describe('Database Tests', () => {
  const testDbPath = path.join(__dirname, '../../data/test.db');

  beforeAll(async () => {
    const dataDir = path.dirname(testDbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    process.env.DB_PATH = testDbPath;
  });

  afterAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('UserManager', () => {
    const testUser = {
      id: 'test-user-123',
      nickname: 'TestUser',
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent/1.0'
    };

    test('should create a new user', async () => {
      const result = await UserManager.upsertUser(
        testUser.id,
        testUser.nickname,
        testUser.ipAddress,
        testUser.userAgent
      );

      expect(result).toHaveProperty('id', testUser.id);
      expect(result).toHaveProperty('changes');
    });

    test('should get user by ID', async () => {
      const user = await UserManager.getUserById(testUser.id);

      expect(user).toBeTruthy();
      expect(user.id).toBe(testUser.id);
      expect(user.nickname).toBe(testUser.nickname);
      expect(user.ip_address).toBe(testUser.ipAddress);
      expect(user.user_agent).toBe(testUser.userAgent);
    });

    test('should update existing user', async () => {
      const updatedNickname = 'UpdatedUser';
      const result = await UserManager.upsertUser(
        testUser.id,
        updatedNickname,
        testUser.ipAddress,
        testUser.userAgent
      );

      expect(result).toHaveProperty('id', testUser.id);

      const updatedUser = await UserManager.getUserById(testUser.id);
      expect(updatedUser.nickname).toBe(updatedNickname);
    });

    test('should find user by fingerprint', async () => {
      const user = await UserManager.findUserByFingerprint(
        testUser.ipAddress,
        testUser.userAgent
      );

      expect(user).toBeTruthy();
      expect(user.id).toBe(testUser.id);
    });

    test('should return null for non-existent user', async () => {
      const user = await UserManager.getUserById('non-existent-id');
      expect(user).toBeUndefined();
    });
  });

  describe('RoomManager', () => {
    const testRoom = {
      name: 'test-room-123',
      password: 'test-password',
      createdBy: 'test-user-123'
    };

    beforeAll(async () => {
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockImplementation((password, hash) => {
        return Promise.resolve(password === 'test-password');
      });
    });

    test('should create a new room', async () => {
      const result = await RoomManager.upsertRoom(
        testRoom.name,
        testRoom.password,
        testRoom.createdBy
      );

      expect(result).toHaveProperty('id', testRoom.name);
      expect(result).toHaveProperty('changes');
    });

    test('should get room by name', async () => {
      const room = await RoomManager.getRoomByName(testRoom.name);

      expect(room).toBeTruthy();
      expect(room.name).toBe(testRoom.name);
      expect(room.is_private).toBe(1); // password provided
      expect(room.created_by).toBe(testRoom.createdBy);
    });

    test('should verify correct room password', async () => {
      const isValid = await RoomManager.verifyRoomPassword(testRoom.name, testRoom.password);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect room password', async () => {
      const isValid = await RoomManager.verifyRoomPassword(testRoom.name, 'wrong-password');
      expect(isValid).toBe(false);
    });

    test('should create public room without password', async () => {
      const publicRoomName = 'public-room-123';
      await RoomManager.upsertRoom(publicRoomName, null, testRoom.createdBy);

      const room = await RoomManager.getRoomByName(publicRoomName);
      expect(room.is_private).toBe(0);
    });

    test('should return null for non-existent room', async () => {
      const room = await RoomManager.getRoomByName('non-existent-room');
      expect(room).toBeUndefined();
    });
  });

  describe('SessionManager', () => {
    let testSession;

    beforeEach(() => {
      testSession = {
        sessionId: `test-session-${Date.now()}-${Math.random()}`,
        userId: 'test-user-123',
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent/1.0',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    });

    test('should create a new session', async () => {
      const result = await SessionManager.createSession(
        testSession.sessionId,
        testSession.userId,
        testSession.ipAddress,
        testSession.userAgent,
        testSession.expiresAt
      );

      expect(result).toHaveProperty('id', testSession.sessionId);
    });

    test('should get session by ID', async () => {
      await SessionManager.createSession(
        testSession.sessionId,
        testSession.userId,
        testSession.ipAddress,
        testSession.userAgent,
        testSession.expiresAt
      );

      const session = await SessionManager.getSession(testSession.sessionId);

      expect(session).toBeTruthy();
      expect(session.session_id).toBe(testSession.sessionId);
      expect(session.user_id).toBe(testSession.userId);
    });

    test('should return null for non-existent session', async () => {
      const session = await SessionManager.getSession('non-existent-session');
      expect(session).toBeUndefined();
    });

    test('should clean expired sessions', async () => {
      const expiredSessionId = `expired-session-${Date.now()}-${Math.random()}`;
      const expiredDate = new Date(Date.now() - 60 * 60 * 1000);

      await SessionManager.createSession(
        expiredSessionId,
        testSession.userId,
        testSession.ipAddress,
        testSession.userAgent,
        expiredDate
      );

      await new Promise(resolve => setTimeout(resolve, 50));

      const cleanedCount = await SessionManager.cleanExpiredSessions();
      expect(typeof cleanedCount).toBe('number');
    });
  });
});
