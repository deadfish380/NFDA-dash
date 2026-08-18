import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Symmetric encryption for secrets at rest (Facebook page tokens). Uses
 * AES-256-GCM with a key derived from APP_ENCRYPTION_KEY. Ciphertext is tagged
 * with a version prefix so we can tell encrypted values from legacy plaintext and
 * decrypt safely either way.
 *
 * If APP_ENCRYPTION_KEY is unset, encrypt() is a no-op passthrough — the app
 * still works, tokens are just stored as-is (dev). Set the key in production.
 */
const PREFIX = "enc:v1:";

function keyMaterial(): Buffer | null {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) return null;
  // Deterministic 32-byte key from the configured secret.
  return scryptSync(secret, "nfda-token-salt", 32);
}

export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null) return null;
  const key = keyMaterial();
  if (!key) return plain; // no key configured — passthrough
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext
  const key = keyMaterial();
  if (!key) return value; // can't decrypt without the key
  const raw = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
