/**
 * DevVault Browser Crypto
 *
 * Implements AES-256-GCM encryption using the native Web Crypto API.
 * Key derivation uses PBKDF2 with 600,000 iterations (OWASP 2024 recommendation).
 *
 * The encryption key is derived from:
 *   - User's password (never sent to server)
 *   - Per-user PBKDF2 salt (fetched from server, not secret)
 *
 * This means even if the database is fully compromised, encrypted values
 * remain unreadable without the user's password.
 */

const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = 'SHA-256';
const KEY_LENGTH = 256;

/**
 * Derive an AES-256-GCM CryptoKey from a password and salt using PBKDF2.
 * The derived key never leaves the browser.
 */
export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const salt = base64ToBuffer(saltBase64);
  const encoder = new TextEncoder();

  // Import the password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64-encoded ciphertext and iv for storage.
 */
export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt a base64-encoded ciphertext using AES-256-GCM.
 * Returns the plaintext string.
 */
export async function decrypt(
  key: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string
): Promise<string> {
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ── Master Key & Recovery Key Support ──────────────────────────────────────────

/**
 * Generate a random 256-bit AES-GCM Master Key.
 */
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_LENGTH },
    true, // extractable so it can be wrapped/encrypted
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a human-friendly recovery key: e.g. DVRK-A8F2-K9X1-M4B7-P2Q6-W3E5
 */
export function generateRecoveryKey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 (no 0, 1, O, I to prevent confusion)
  const getRandomChunk = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
  };
  return `DVRK-${getRandomChunk()}-${getRandomChunk()}-${getRandomChunk()}-${getRandomChunk()}-${getRandomChunk()}`;
}

/**
 * Generate a random 32-byte salt as base64 string.
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  return bufferToBase64(salt);
}

/**
 * Export CryptoKey to raw base64 string.
 */
export async function exportKeyRaw(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64(raw);
}

/**
 * Import raw base64 string to CryptoKey.
 */
export async function importKeyRaw(rawBase64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(rawBase64);
  return crypto.subtle.importKey(
    'raw',
    buffer.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a Master Key using a Wrapping Key (derived from password or recovery key).
 */
export async function wrapMasterKey(
  masterKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ encryptedMasterKey: string; iv: string }> {
  const rawMasterKey = await crypto.subtle.exportKey('raw', masterKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    rawMasterKey
  );

  return {
    encryptedMasterKey: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt an Encrypted Master Key using a Wrapping Key.
 */
export async function unwrapMasterKey(
  encryptedMasterKeyBase64: string,
  ivBase64: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(encryptedMasterKeyBase64);

  const decryptedRaw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    ciphertext
  );

  return crypto.subtle.importKey(
    'raw',
    decryptedRaw,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
