import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Recommended for AES-GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Returns a 32-byte master key derived from ENCRYPTION_KEY env var or fallback for development.
 */
function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || "indie-crm-default-dev-secret-key-32b!";
  // Ensure key is 32 bytes (256 bits)
  const key = Buffer.alloc(32);
  Buffer.from(secret).copy(key);
  return key;
}

export type EncryptedData = {
  encrypted: string;
  iv: string;
  authTag: string;
};

/**
 * Encrypts a plaintext string using AES-256-GCM.
 */
export function encrypt(text: string): string {
  if (!text) return text;
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Output format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string (format iv:authTag:encrypted).
 * Falls back gracefully if input is unencrypted legacy text.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    // Legacy unencrypted string, return as-is
    return encryptedText;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  try {
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // If decryption fails (e.g. key mismatch or legacy format), return raw
    return encryptedText;
  }
}
