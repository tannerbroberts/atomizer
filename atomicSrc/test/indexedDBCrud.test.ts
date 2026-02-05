/**
 * Tests for IndexedDB CRUD access pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as crud from '../main/App/utils/indexedDBCrud';

describe('IndexedDB CRUD Operations', () => {
  beforeEach(async () => {
    // Initialize database before each test
    await crud.initDB();
  });

  afterEach(async () => {
    // Clean up after each test
    for (const store of Object.values(crud.STORES)) {
      try {
        await crud.clear(store);
      } catch {
        // Ignore errors during cleanup
      }
    }
    crud.closeDatabase();
  });

  describe('Basic CRUD Operations', () => {
    it('should write and read data', async () => {
      const testData = { name: 'Test', value: 42 };
      
      await crud.write(crud.STORES.GAME_STATE, 'test-key', testData);
      const result = await crud.read(crud.STORES.GAME_STATE, 'test-key');
      
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await crud.read(crud.STORES.GAME_STATE, 'non-existent');
      expect(result).toBeNull();
    });

    it('should update existing data', async () => {
      const initialData = { count: 1 };
      const updatedData = { count: 2 };
      
      await crud.write(crud.STORES.GAME_STATE, 'counter', initialData);
      await crud.write(crud.STORES.GAME_STATE, 'counter', updatedData);
      
      const result = await crud.read(crud.STORES.GAME_STATE, 'counter');
      expect(result).toEqual(updatedData);
    });

    it('should delete data', async () => {
      const testData = { value: 'test' };
      
      await crud.write(crud.STORES.GAME_STATE, 'to-delete', testData);
      await crud.remove(crud.STORES.GAME_STATE, 'to-delete');
      
      const result = await crud.read(crud.STORES.GAME_STATE, 'to-delete');
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const testData = { exists: true };
      
      await crud.write(crud.STORES.GAME_STATE, 'exists-test', testData);
      
      const exists = await crud.exists(crud.STORES.GAME_STATE, 'exists-test');
      const notExists = await crud.exists(crud.STORES.GAME_STATE, 'not-exists');
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('Store Separation', () => {
    it('should keep settings separate from game state', async () => {
      const gameData = { score: 100 };
      const settingsData = { music: { isMuted: false } };
      
      await crud.write(crud.STORES.GAME_STATE, 'current', gameData);
      await crud.write(crud.STORES.SETTINGS, 'current', settingsData);
      
      const game = await crud.read(crud.STORES.GAME_STATE, 'current');
      const settings = await crud.read(crud.STORES.SETTINGS, 'current');
      
      expect(game).toEqual(gameData);
      expect(settings).toEqual(settingsData);
    });
  });

  describe('Batch Operations', () => {
    it('should write multiple records in a batch', async () => {
      const operations = [
        { storeName: crud.STORES.GAME_STATE, key: 'key1', data: { value: 1 } },
        { storeName: crud.STORES.GAME_STATE, key: 'key2', data: { value: 2 } },
        { storeName: crud.STORES.SETTINGS, key: 'setting1', data: { enabled: true } },
      ];
      
      await crud.batchWrite(operations);
      
      const result1 = await crud.read(crud.STORES.GAME_STATE, 'key1');
      const result2 = await crud.read(crud.STORES.GAME_STATE, 'key2');
      const result3 = await crud.read(crud.STORES.SETTINGS, 'setting1');
      
      expect(result1).toEqual({ value: 1 });
      expect(result2).toEqual({ value: 2 });
      expect(result3).toEqual({ enabled: true });
    });

    it('should read multiple records in a batch', async () => {
      await crud.write(crud.STORES.GAME_STATE, 'key1', { value: 1 });
      await crud.write(crud.STORES.GAME_STATE, 'key2', { value: 2 });
      await crud.write(crud.STORES.SETTINGS, 'key3', { value: 3 });
      
      const operations = [
        { storeName: crud.STORES.GAME_STATE, key: 'key1' },
        { storeName: crud.STORES.GAME_STATE, key: 'key2' },
        { storeName: crud.STORES.SETTINGS, key: 'key3' },
      ];
      
      const results = await crud.batchRead(operations);
      
      expect(results).toEqual([
        { value: 1 },
        { value: 2 },
        { value: 3 },
      ]);
    });

    it('should handle batch reads with missing keys', async () => {
      await crud.write(crud.STORES.GAME_STATE, 'exists', { value: 1 });
      
      const operations = [
        { storeName: crud.STORES.GAME_STATE, key: 'exists' },
        { storeName: crud.STORES.GAME_STATE, key: 'missing' },
      ];
      
      const results = await crud.batchRead(operations);
      
      expect(results).toEqual([
        { value: 1 },
        null,
      ]);
    });
  });

  describe('List Operations', () => {
    it('should list all keys in a store', async () => {
      await crud.write(crud.STORES.GAME_STATE, 'key1', { value: 1 });
      await crud.write(crud.STORES.GAME_STATE, 'key2', { value: 2 });
      await crud.write(crud.STORES.GAME_STATE, 'key3', { value: 3 });
      
      const keys = await crud.listKeys(crud.STORES.GAME_STATE);
      
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should read all values in a store', async () => {
      await crud.write(crud.STORES.GAME_STATE, 'key1', { value: 1 });
      await crud.write(crud.STORES.GAME_STATE, 'key2', { value: 2 });
      
      const values = await crud.readAll(crud.STORES.GAME_STATE);
      
      expect(values).toHaveLength(2);
      expect(values).toContainEqual({ value: 1 });
      expect(values).toContainEqual({ value: 2 });
    });

    it('should return empty array for empty store', async () => {
      const keys = await crud.listKeys(crud.STORES.GAME_STATE);
      const values = await crud.readAll(crud.STORES.GAME_STATE);
      
      expect(keys).toEqual([]);
      expect(values).toEqual([]);
    });
  });

  describe('Clear Operations', () => {
    it('should clear all data in a store', async () => {
      await crud.write(crud.STORES.GAME_STATE, 'key1', { value: 1 });
      await crud.write(crud.STORES.GAME_STATE, 'key2', { value: 2 });
      
      await crud.clear(crud.STORES.GAME_STATE);
      
      const keys = await crud.listKeys(crud.STORES.GAME_STATE);
      expect(keys).toEqual([]);
    });

    it('should only clear the specified store', async () => {
      await crud.write(crud.STORES.GAME_STATE, 'key1', { value: 1 });
      await crud.write(crud.STORES.SETTINGS, 'key2', { value: 2 });
      
      await crud.clear(crud.STORES.GAME_STATE);
      
      const infiniteKeys = await crud.listKeys(crud.STORES.GAME_STATE);
      const settingsKeys = await crud.listKeys(crud.STORES.SETTINGS);
      
      expect(infiniteKeys).toEqual([]);
      expect(settingsKeys).toHaveLength(1);
    });
  });

  describe('Complex Data Types', () => {
    it('should handle nested objects', async () => {
      const complexData = {
        user: {
          name: 'Test User',
          stats: {
            score: 1000,
            level: 5,
          },
        },
        settings: {
          sound: true,
          music: false,
        },
      };
      
      await crud.write(crud.STORES.GAME_STATE, 'complex', complexData);
      const result = await crud.read(crud.STORES.GAME_STATE, 'complex');
      
      expect(result).toEqual(complexData);
    });

    it('should handle arrays', async () => {
      const arrayData = {
        items: [1, 2, 3, 4, 5],
        nested: [
          { id: 1, name: 'First' },
          { id: 2, name: 'Second' },
        ],
      };
      
      await crud.write(crud.STORES.GAME_STATE, 'arrays', arrayData);
      const result = await crud.read(crud.STORES.GAME_STATE, 'arrays');
      
      expect(result).toEqual(arrayData);
    });

    it('should handle null and undefined', async () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        hasValue: 'value',
      };
      
      await crud.write(crud.STORES.GAME_STATE, 'nulls', data);
      const result = await crud.read(crud.STORES.GAME_STATE, 'nulls');
      
      expect(result).toHaveProperty('nullValue', null);
      expect(result).toHaveProperty('hasValue', 'value');
      // IndexedDB uses structured clone, which preserves undefined
      expect(result).toHaveProperty('undefinedValue', undefined);
    });
  });
});
