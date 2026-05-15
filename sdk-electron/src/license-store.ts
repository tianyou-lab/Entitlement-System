import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { LicenseCache } from './types';

const VERSION = 'v1';
const SAFE_STORAGE_VERSION = 'v2';
const requireElectron = createRequire(__filename);

interface SafeStorage {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

export class LicenseStore {
  constructor(
    private readonly productCode: string,
    private readonly storagePath = defaultStoragePath(productCode),
  ) {}

  read(): LicenseCache | null {
    try {
      const raw = readFileSync(this.storagePath, 'utf8');
      const safeStorageCache = this.readSafeStorage(raw);
      if (safeStorageCache) {
        return safeStorageCache;
      }

      const [version, iv, tag, encrypted] = raw.split(':');
      if (version !== VERSION || !iv || !tag || !encrypted) {
        return null;
      }
      const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8')) as LicenseCache;
    } catch {
      return null;
    }
  }

  write(cache: LicenseCache) {
    mkdirSync(dirname(this.storagePath), { recursive: true });
    const safeStorage = loadSafeStorage();
    if (safeStorage) {
      const encrypted = safeStorage.encryptString(JSON.stringify(cache)).toString('base64url');
      writeFileSync(this.storagePath, [SAFE_STORAGE_VERSION, 'safeStorage', encrypted].join(':'), 'utf8');
      return;
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(cache), 'utf8'), cipher.final()]);
    const value = [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join(':');
    writeFileSync(this.storagePath, value, 'utf8');
  }

  clear() {
    try {
      rmSync(this.storagePath, { force: true });
    } catch {
      return;
    }
  }

  path() {
    return this.storagePath;
  }

  private key() {
    return createHash('sha256').update(`${this.productCode}:${process.env.USERNAME ?? process.env.USER ?? 'local'}`).digest();
  }

  private readSafeStorage(raw: string) {
    const [version, provider, encrypted] = raw.split(':');
    if (version !== SAFE_STORAGE_VERSION || provider !== 'safeStorage' || !encrypted) {
      return null;
    }

    const safeStorage = loadSafeStorage();
    if (!safeStorage) {
      return null;
    }

    return JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64url'))) as LicenseCache;
  }
}

function defaultStoragePath(productCode: string) {
  const base = process.env.APPDATA || process.cwd();
  return join(base, '.license-cache', `${productCode}.bin`);
}

function loadSafeStorage(): SafeStorage | null {
  try {
    const electron = requireElectron('electron') as { safeStorage?: SafeStorage };
    if (!electron.safeStorage?.isEncryptionAvailable()) {
      return null;
    }

    return electron.safeStorage;
  } catch {
    return null;
  }
}
