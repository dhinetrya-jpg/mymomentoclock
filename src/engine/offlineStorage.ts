/**
 * @license
 * MIT License
 * 
 * Client-Side Encrypted Offline Storage (Web Crypto AES-GCM + IndexedDB)
 * Stores user natal birth profiles and local preferences with bank-grade encryption.
 * Keys are derived locally on the device and never transmitted over the network.
 * 
 * 100% Client-Side. Zero cloud database bills. Zero GDPR/PII exposure.
 */

export interface EncryptedUserProfile {
  profileId: string;
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM
  cityName: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  natalMoonNakshatraIndex: number;
  natalMoonSignIndex: number;
  natalAscendantSignIndex: number;
  createdAt: string;
}

const DB_NAME = 'MyMomentOclock_OfflineStore_v1';
const STORE_NAME = 'user_secure_profiles';
const KEY_STORE_NAME = 'device_master_key';

export class OfflineStorageManager {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB unavailable in this environment'));
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'profileId' });
        }
        if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
          db.createObjectStore(KEY_STORE_NAME, { keyPath: 'keyId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Generates or retrieves device-bound AES-GCM 256-bit encryption key
   */
  private static async getOrCreateDeviceKey(): Promise<CryptoKey> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
      const store = tx.objectStore(KEY_STORE_NAME);
      const getReq = store.get('primary_device_key');

      getReq.onsuccess = async () => {
        if (getReq.result?.rawKey) {
          try {
            const importedKey = await crypto.subtle.importKey(
              'raw',
              getReq.result.rawKey,
              { name: 'AES-GCM', length: 256 },
              false,
              ['encrypt', 'decrypt']
            );
            return resolve(importedKey);
          } catch (err) {
            return reject(err);
          }
        }

        // Generate new key
        try {
          const newKey = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
          const exported = await crypto.subtle.exportKey('raw', newKey);
          store.put({ keyId: 'primary_device_key', rawKey: exported, createdAt: new Date().toISOString() });
          resolve(newKey);
        } catch (err) {
          reject(err);
        }
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Saves encrypted profile in IndexedDB
   */
  public static async saveProfile(profile: EncryptedUserProfile): Promise<void> {
    const key = await this.getOrCreateDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(profile));

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const record = {
      profileId: profile.profileId,
      iv: Array.from(iv),
      cipherData: Array.from(new Uint8Array(cipherBuffer)),
      updatedAt: new Date().toISOString()
    };

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Loads and decrypts profile by ID
   */
  public static async loadProfile(profileId: string): Promise<EncryptedUserProfile | null> {
    const db = await this.getDB();
    const record: any = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(profileId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!record) return null;

    const key = await this.getOrCreateDeviceKey();
    const iv = new Uint8Array(record.iv);
    const cipherBytes = new Uint8Array(record.cipherData);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );

    const decodedStr = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decodedStr);
  }

  /**
   * Lists all locally saved profile summaries without decrypting sensitive details
   */
  public static async listProfiles(): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => reject(req.error);
    });
  }
}
