/**
 * IndexedDB CRUD Access Pattern
 *
 * Provides a clean, type-safe interface for reading and writing data to IndexedDB.
 *
 * Design principles:
 * - Single game state store for the infinite mode
 * - Global settings separated from game state
 * - Type-safe operations with proper error handling
 * - Supports both keyed (single record) and indexed (multiple records) access
 */

const DB_NAME = 'TetrixGameDB';
const DB_VERSION = 9; // Simplified to single game mode

// Store names
export const STORES = {
  // Game state
  GAME_STATE: 'gameState',

  // Global stores
  SETTINGS: 'settings',
  MODIFIERS: 'modifiers',

  // Data integrity
  CHECKSUMS: 'checksums',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * Open or create the database with proper schema
 */
async function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB not available in this environment');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(new Error(`Failed to open IndexedDB: ${request.error}`));
    };

    request.onsuccess = () => {
      const db = request.result;

      // Verify required stores exist
      const requiredStores = Object.values(STORES);
      const missingStores = requiredStores.filter((store) => !db.objectStoreNames.contains(store));

      if (missingStores.length > 0) {
        console.warn('Missing stores:', missingStores, '- Database may need upgrade');
      }

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create all required stores
      for (const storeName of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      }
    };
  });
}

// Singleton database connection
let dbConnection: IDBDatabase | null = null;

/**
 * Get or create database connection
 */
async function getDatabase(): Promise<IDBDatabase> {
  if (dbConnection && dbConnection.objectStoreNames.length > 0) {
    return dbConnection;
  }

  dbConnection = await openDatabase();
  return dbConnection;
}

/**
 * CREATE/UPDATE - Write data to a store
 * @param storeName - The store to write to
 * @param key - The key to store data under
 * @param data - The data to store
 */
export async function write<T>(
  storeName: StoreName,
  key: IDBValidKey,
  data: T,
): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readwrite');

      transaction.onerror = () => {
        console.error(`Transaction failed for ${storeName}:`, transaction.error);
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };

      const store = transaction.objectStore(storeName);
      const request = store.put(data, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`Failed to write to ${storeName}:`, request.error);
        reject(new Error(`Failed to write: ${request.error}`));
      };
    } catch (error) {
      console.error(`Error creating transaction for ${storeName}:`, error);
      reject(error);
    }
  });
}

/**
 * READ - Read data from a store
 * @param storeName - The store to read from
 * @param key - The key to retrieve
 * @returns The stored data or null if not found
 */
export async function read<T>(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<T | null> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };

      request.onerror = () => {
        console.error(`Failed to read from ${storeName}:`, request.error);
        reject(new Error(`Failed to read: ${request.error}`));
      };
    } catch (error) {
      console.error(`Error reading from ${storeName}:`, error);
      reject(error);
    }
  });
}

/**
 * DELETE - Remove data from a store
 * @param storeName - The store to delete from
 * @param key - The key to delete
 */
export async function remove(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`Failed to delete from ${storeName}:`, request.error);
        reject(new Error(`Failed to delete: ${request.error}`));
      };
    } catch (error) {
      console.error(`Error deleting from ${storeName}:`, error);
      reject(error);
    }
  });
}

/**
 * LIST - Get all keys in a store
 * @param storeName - The store to list
 * @returns Array of all keys in the store
 */
export async function listKeys(storeName: StoreName): Promise<IDBValidKey[]> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`Failed to list keys from ${storeName}:`, request.error);
        reject(new Error(`Failed to list keys: ${request.error}`));
      };
    } catch (error) {
      console.error(`Error listing keys from ${storeName}:`, error);
      reject(error);
    }
  });
}

/**
 * LIST ALL - Get all records in a store
 * @param storeName - The store to read all from
 * @returns Array of all values in the store
 */
export async function readAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        console.error(`Failed to read all from ${storeName}:`, request.error);
        reject(new Error(`Failed to read all: ${request.error}`));
      };
    } catch (error) {
      console.error(`Error reading all from ${storeName}:`, error);
      reject(error);
    }
  });
}

/**
 * CLEAR - Remove all data from a store
 * @param storeName - The store to clear
 */
export async function clear(storeName: StoreName): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`Failed to clear ${storeName}:`, request.error);
        reject(new Error(`Failed to clear: ${request.error}`));
      };
    } catch (error) {
      console.error(`Error clearing ${storeName}:`, error);
      reject(error);
    }
  });
}

/**
 * BATCH WRITE - Write multiple records in a single transaction
 * @param operations - Array of write operations to perform
 */
export async function batchWrite(
  operations: Array<{
    storeName: StoreName;
    key: IDBValidKey;
    data: unknown;
  }>,
): Promise<void> {
  if (operations.length === 0) {
    return;
  }

  const db = await getDatabase();

  // Group operations by store for efficient transactions
  const storeNames = [...new Set(operations.map((op) => op.storeName))];

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeNames, 'readwrite');

      transaction.onerror = () => {
        console.error('Batch write transaction failed:', transaction.error);
        reject(new Error(`Batch write failed: ${transaction.error}`));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      // Execute all operations
      for (const { storeName, key, data } of operations) {
        const store = transaction.objectStore(storeName);
        store.put(data, key);
      }
    } catch (error) {
      console.error('Error creating batch write transaction:', error);
      reject(error);
    }
  });
}

/**
 * BATCH READ - Read multiple records in a single transaction
 * @param operations - Array of read operations to perform
 * @returns Array of results in the same order as operations
 */
export async function batchRead<T>(
  operations: Array<{
    storeName: StoreName;
    key: IDBValidKey;
  }>,
): Promise<(T | null)[]> {
  if (operations.length === 0) {
    return [];
  }

  const db = await getDatabase();
  const storeNames = [...new Set(operations.map((op) => op.storeName))];

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeNames, 'readonly');
      const results: (T | null)[] = new Array(operations.length).fill(null);
      let completed = 0;

      transaction.onerror = () => {
        console.error('Batch read transaction failed:', transaction.error);
        reject(new Error(`Batch read failed: ${transaction.error}`));
      };

      for (let i = 0; i < operations.length; i++) {
        const { storeName, key } = operations[i];
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          results[i] = request.result ?? null;
          completed++;

          if (completed === operations.length) {
            resolve(results);
          }
        };
      }
    } catch (error) {
      console.error('Error creating batch read transaction:', error);
      reject(error);
    }
  });
}

/**
 * EXISTS - Check if a key exists in a store
 * @param storeName - The store to check
 * @param key - The key to check for
 * @returns True if the key exists, false otherwise
 */
export async function exists(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<boolean> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getKey(key);

      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };

      request.onerror = () => {
        console.error(`Failed to check existence in ${storeName}:`, request.error);
        reject(new Error(`Failed to check existence: ${request.error}`));
      };
    } catch (error) {
      console.error(`Error checking existence in ${storeName}:`, error);
      reject(error);
    }
  });
}

/**
 * Initialize the database (optional - first operation will auto-init)
 */
export async function initDB(): Promise<void> {
  await getDatabase();
}

/**
 * Close the database connection (call this on cleanup)
 */
export function closeDatabase(): void {
  if (dbConnection) {
    dbConnection.close();
    dbConnection = null;
  }
}
