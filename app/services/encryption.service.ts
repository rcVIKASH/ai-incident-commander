import crypto from "crypto";

// For development convenience, if no key is provided, we use a fallback static key.
// In a real production environment, this should throw an error.
const FALLBACK_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 hex chars (32 bytes)
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const keyString = process.env.INTEGRATION_ENCRYPTION_KEY || FALLBACK_KEY;
  const key = Buffer.from(keyString, "hex");
  if (key.length !== 32) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)."
    );
  }
  return key;
}

/**
 * Encrypts a sensitive string (like an OAuth access token) into a base64 string.
 * Uses AES-256-GCM.
 */
export function encryptIntegrationSecret(value: string): string {
  if (!value) return value;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(value, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag().toString("base64");

  // Format: iv:authTag:encryptedData
  return `${iv.toString("base64")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted integration secret.
 */
export function decryptIntegrationSecret(encryptedValue: string): string {
  if (!encryptedValue) return encryptedValue;

  const parts = encryptedValue.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }

  const [ivBase64, authTagBase64, encryptedData] = parts;
  
  if (!ivBase64 || !authTagBase64 || !encryptedData) {
    throw new Error("Invalid encrypted value parts");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
