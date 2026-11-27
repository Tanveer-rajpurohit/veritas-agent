import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HKDF_INFO = "veritas/connector-tokens";

export type VaultKey = { version: number; kek: string };
/** Stored in `token_ciphertext` (base64: version byte, ciphertext, tag) and `token_iv` (base64). */
export type Sealed = { ciphertext: string; iv: string };

export class VaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultError";
  }
}

/**
 * A 32-byte base64 secret is used as the key directly; anything else (a
 * passphrase) is stretched with HKDF-SHA256 so the key is always uniform.
 */
export function deriveKey(kek: string): Buffer {
  const decoded = Buffer.from(kek, "base64");
  if (decoded.length === KEY_BYTES && decoded.toString("base64") === kek) return decoded;
  return Buffer.from(hkdfSync("sha256", Buffer.from(kek, "utf8"), Buffer.alloc(0), HKDF_INFO, KEY_BYTES));
}

/**
 * AES-256-GCM token vault. The first key encrypts; every listed key can
 * decrypt, selected by the version byte, so a KEK can rotate without a
 * re-encryption migration. `context` is bound as additional authenticated
 * data so a ciphertext cannot be moved to another connector row.
 */
export function createVault(keys: VaultKey[]) {
  const [current] = keys;
  if (!current) throw new VaultError("No vault key configured");
  const byVersion = new Map<number, Buffer>();
  for (const key of keys) {
    if (!Number.isInteger(key.version) || key.version < 0 || key.version > 255) throw new VaultError("Key version must be 0-255");
    byVersion.set(key.version, deriveKey(key.kek));
  }

  const aad = (version: number, context: string) => Buffer.concat([Buffer.from([version]), Buffer.from(context, "utf8")]);

  return {
    seal(plaintext: string, context: string): Sealed {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, byVersion.get(current.version)!, iv, { authTagLength: TAG_BYTES });
      cipher.setAAD(aad(current.version, context));
      const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return {
        ciphertext: Buffer.concat([Buffer.from([current.version]), body, cipher.getAuthTag()]).toString("base64"),
        iv: iv.toString("base64"),
      };
    },

    open(sealed: Sealed, context: string): string {
      const blob = Buffer.from(sealed.ciphertext, "base64");
      const iv = Buffer.from(sealed.iv, "base64");
      if (blob.length < 1 + TAG_BYTES || iv.length !== IV_BYTES) throw new VaultError("Malformed ciphertext");
      const version = blob[0]!;
      const key = byVersion.get(version);
      if (!key) throw new VaultError("Unknown key version");
      const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
      decipher.setAAD(aad(version, context));
      decipher.setAuthTag(blob.subarray(blob.length - TAG_BYTES));
      try {
        return Buffer.concat([decipher.update(blob.subarray(1, blob.length - TAG_BYTES)), decipher.final()]).toString("utf8");
      } catch {
        // Never echo the underlying error: it adds nothing and keeps the message uniform.
        throw new VaultError("Ciphertext failed authentication");
      }
    },
  };
}

export type Vault = ReturnType<typeof createVault>;
