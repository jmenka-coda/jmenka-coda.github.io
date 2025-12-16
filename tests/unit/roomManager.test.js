const roomManager = require('../../src/rooms/roomManager');

// Mock dependencies
jest.mock('../../src/utils/database');
jest.mock('../../src/utils/logger');

const { RoomManager: DBRoomManager } = require('../../src/utils/database');
const Logger = require('../../src/utils/logger');

describe('RoomManager Tests', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock Logger
    Logger.mockImplementation(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    }));

    // Mock database methods
    DBRoomManager.upsertRoom = jest.fn();
    DBRoomManager.getRoomByName = jest.fn();
    DBRoomManager.verifyRoomPassword = jest.fn();
    DBRoomManager.getAllRooms = jest.fn();
  });

  describe('getRoomState', () => {
    test('should create new room state if not exists', () => {
      const roomName = 'test-room';
      const state = roomManager.getRoomState(roomName);

      expect(state).toHaveProperty('strokes', []);
      expect(state).toHaveProperty('userCount', 0);
      expect(state).toHaveProperty('createdAt');
      expect(state).toHaveProperty('lastActivity');
      expect(state).toHaveProperty('usersId', []);
      expect(state).toHaveProperty('isPrivate', false);
    });

    test('should return existing room state', () => {
      const roomName = 'existing-room';
      const firstState = roomManager.getRoomState(roomName);
      firstState.userCount = 5; // Modify state

      const secondState = roomManager.getRoomState(roomName);
      expect(secondState.userCount).toBe(5);
    });
  });

  describe('createRoom', () => {
    test('should create public room without password', async () => {
      DBRoomManager.upsertRoom.mockResolvedValue({ id: 'public-room', changes: 1 });

      const result = await roomManager.createRoom('public-room', null, 'user-123');

      expect(DBRoomManager.upsertRoom).toHaveBeenCalledWith('public-room', null, 'user-123');
      expect(result).toEqual({ success: true, isPrivate: false });
    });

    test('should create private room with password', async () => {
      const mockPasswordHash = 'hashed-password';
      DBRoomManager.upsertRoom.mockResolvedValue({ id: 'private-room', changes: 1 });

      // Mock bcrypt
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(mockPasswordHash);

      const result = await roomManager.createRoom('private-room', 'password123', 'user-123');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(DBRoomManager.upsertRoom).toHaveBeenCalledWith('private-room', mockPasswordHash, 'user-123');
      expect(result).toEqual({ success: true, isPrivate: true });
    });

    test('should handle database errors', async () => {
      DBRoomManager.upsertRoom.mockRejectedValue(new Error('Database error'));

      await expect(roomManager.createRoom('error-room', null, 'user-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('verifyRoomPassword', () => {
    test('should verify room password through database', async () => {
      DBRoomManager.verifyRoomPassword.mockResolvedValue(true);

      const result = await roomManager.verifyRoomPassword('test-room', 'password');

      expect(DBRoomManager.verifyRoomPassword).toHaveBeenCalledWith('test-room', 'password');
      expect(result).toBe(true);
    });

    test('should return false on verification error', async () => {
      DBRoomManager.verifyRoomPassword.mockRejectedValue(new Error('DB error'));

      const result = await roomManager.verifyRoomPassword('test-room', 'password');

      expect(result).toBe(false);
    });
  });

  describe('getRoomInfo', () => {
    test('should get room info from database', async () => {
      const mockRoomInfo = { name: 'test-room', is_private: 0 };
      DBRoomManager.getRoomByName.mockResolvedValue(mockRoomInfo);

      const result = await roomManager.getRoomInfo('test-room');

      expect(DBRoomManager.getRoomByName).toHaveBeenCalledWith('test-room');
      expect(result).toEqual(mockRoomInfo);
    });

    test('should return null on database error', async () => {
      DBRoomManager.getRoomByName.mockRejectedValue(new Error('DB error'));

      const result = await roomManager.getRoomInfo('test-room');

      expect(result).toBeNull();
    });
  });

  describe('addStrokeToRoom', () => {
    test('should add stroke and update last activity', () => {
      const roomName = 'test-room';
      const strokeData = {
        userId: 'user-123',
        strokeId: 'stroke-123',
        color: '#000000',
        size: 2,
        points: [{ x: 10, y: 20 }]
      };

      roomManager.addStrokeToRoom(
        roomName,
        strokeData.userId,
        strokeData.strokeId,
        strokeData.color,
        strokeData.size,
        strokeData.points
      );

      const state = roomManager.getRoomState(roomName);
      expect(state.strokes).toHaveLength(1);
      expect(state.strokes[0]).toMatchObject({
        userId: strokeData.userId,
        strokeId: strokeData.strokeId,
        color: strokeData.color,
        size: strokeData.size,
        points: strokeData.points
      });
      expect(state.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('updateStrokeInRoom', () => {
    test('should update existing stroke', () => {
      const roomName = 'test-room';
      const strokeData = {
        userId: 'user-123',
        strokeId: 'stroke-123',
        color: '#000000',
        size: 2,
        points: [{ x: 10, y: 20 }]
      };

      // Add initial stroke
      roomManager.addStrokeToRoom(
        roomName,
        strokeData.userId,
        strokeData.strokeId,
        strokeData.color,
        strokeData.size,
        strokeData.points
      );

      // Update stroke
      const newPoint = { x: 30, y: 40 };
      roomManager.updateStrokeInRoom(roomName, strokeData.userId, strokeData.strokeId, newPoint);

      const state = roomManager.getRoomState(roomName);
      expect(state.strokes[0].points).toHaveLength(2);
      expect(state.strokes[0].points[1]).toEqual({ x: 30, y: 40 });
    });
  });

  describe('removeStrokeFromRoom', () => {
    test('should remove stroke from room', () => {
      const roomName = 'test-room-unique';
      const strokeData = {
        userId: 'user-456',
        strokeId: 'stroke-456',
        color: '#000000',
        size: 2,
        points: [{ x: 10, y: 20 }]
      };

      // Add stroke
      roomManager.addStrokeToRoom(
        roomName,
        strokeData.userId,
        strokeData.strokeId,
        strokeData.color,
        strokeData.size,
        strokeData.points
      );

      const stateBefore = roomManager.getRoomState(roomName);
      expect(stateBefore.strokes).toHaveLength(1);

      // Remove stroke
      roomManager.removeStrokeFromRoom(roomName, strokeData.userId, strokeData.strokeId);

      const stateAfter = roomManager.getRoomState(roomName);
      expect(stateAfter.strokes).toHaveLength(0);
    });
  });

  describe('cleanupInactiveRooms', () => {
    beforeEach(() => {
      DBRoomManager.getAllRooms.mockResolvedValue([
        { name: 'active-room', last_activity: new Date().toISOString() }
        // inactive-room not in DB, so it can be cleaned up
      ]);
    });

    test('should clean up inactive rooms from memory', async () => {
      // Create room in memory that doesn't exist in DB
      const inactiveRoom = roomManager.getRoomState('memory-only-room');
      inactiveRoom.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      inactiveRoom.userCount = 0; // No users

      const cleanedCount = await roomManager.cleanupInactiveRooms(60 * 60 * 1000); // 1 hour timeout

      expect(cleanedCount).toBe(1);
    });

    test('should not clean up active rooms', async () => {
      const activeRoom = roomManager.getRoomState('active-room');
      activeRoom.userCount = 2; // Room has users

      const cleanedCount = await roomManager.cleanupInactiveRooms(30 * 1000); // 30 seconds timeout

      expect(cleanedCount).toBe(0);
    });

    test('should not clean up rooms that exist in database', async () => {
      const dbRoom = roomManager.getRoomState('active-room');
      dbRoom.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      dbRoom.userCount = 0; // No users, but exists in DB

      const cleanedCount = await roomManager.cleanupInactiveRooms(60 * 60 * 1000); // 1 hour timeout

      expect(cleanedCount).toBe(0); // Should not clean up because room exists in DB
    });
  });
});
