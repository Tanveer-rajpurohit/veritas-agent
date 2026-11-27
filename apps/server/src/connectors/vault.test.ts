import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createVault, deriveKey, VaultError } from "./vault";

const KEK = randomBytes(32).toString("base64");
const CTX = "ws-1:user-1:google";
const SECRET = JSON.stringify({ accessToken: "ya29.secret-access", refreshToken: "1//secret-refresh" });

describe("token vault", () => {
  it("round-trips and never stores plaintext", () => {
    const vault = createVault([{ version: 1, kek: KEK }]);
    const sealed = vault.seal(SECRET, CTX);
    expect(Buffer.from(sealed.ciphertext, "base64").toString("utf8")).not.toContain("ya29");
    expect(sealed.ciphertext).not.toContain("ya29");
    expect(Buffer.from(sealed.ciphertext, "base64")[0]).toBe(1);
    expect(Buffer.from(sealed.iv, "base64")).toHaveLength(12);
    expect(vault.open(sealed, CTX)).toBe(SECRET);
  });

  it("uses a fresh IV per value", () => {
    const vault = createVault([{ version: 1, kek: KEK }]);
    const a = vault.seal(SECRET, CTX);
    const b = vault.seal(SECRET, CTX);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("detects a tampered ciphertext, tag or IV", () => {
    const vault = createVault([{ version: 1, kek: KEK }]);
    const sealed = vault.seal(SECRET, CTX);
    const flip = (b64: string, index: number) => {
      const buf = Buffer.from(b64, "base64");
      buf[index] = buf[index]! ^ 0x01;
      return buf.toString("base64");
    };
    expect(() => vault.open({ ...sealed, ciphertext: flip(sealed.ciphertext, 3) }, CTX)).toThrow(VaultError);
    const lastByte = Buffer.from(sealed.ciphertext, "base64").length - 1;
    expect(() => vault.open({ ...sealed, ciphertext: flip(sealed.ciphertext, lastByte) }, CTX)).toThrow(VaultError);
    expect(() => vault.open({ ...sealed, iv: flip(sealed.iv, 0) }, CTX)).toThrow(VaultError);
  });

  it("rejects a ciphertext moved to another connector row", () => {
    const vault = createVault([{ version: 1, kek: KEK }]);
    const sealed = vault.seal(SECRET, CTX);
    expect(() => vault.open(sealed, "ws-2:user-1:google")).toThrow("Ciphertext failed authentication");
  });

  it("rejects the wrong key", () => {
    const sealed = createVault([{ version: 1, kek: KEK }]).seal(SECRET, CTX);
    const other = createVault([{ version: 1, kek: randomBytes(32).toString("base64") }]);
    expect(() => other.open(sealed, CTX)).toThrow(VaultError);
  });

  it("decrypts old values after a key rotation and seals with the new key", () => {
    const oldKek = KEK;
    const newKek = randomBytes(32).toString("base64");
    const sealedOld = createVault([{ version: 1, kek: oldKek }]).seal(SECRET, CTX);
    const rotated = createVault([
      { version: 2, kek: newKek },
      { version: 1, kek: oldKek },
    ]);
    expect(rotated.open(sealedOld, CTX)).toBe(SECRET);
    expect(Buffer.from(rotated.seal(SECRET, CTX).ciphertext, "base64")[0]).toBe(2);
    expect(() => createVault([{ version: 2, kek: newKek }]).open(sealedOld, CTX)).toThrow("Unknown key version");
  });

  it("uses a 32-byte base64 KEK directly and stretches passphrases with HKDF", () => {
    expect(deriveKey(KEK).equals(Buffer.from(KEK, "base64"))).toBe(true);
    const stretched = deriveKey("a passphrase that is long enough to pass env validation");
    expect(stretched).toHaveLength(32);
    expect(deriveKey("a passphrase that is long enough to pass env validation").equals(stretched)).toBe(true);
  });

  it("rejects malformed input without leaking detail", () => {
    const vault = createVault([{ version: 1, kek: KEK }]);
    expect(() => vault.open({ ciphertext: "AQ==", iv: "AAAAAAAAAAAAAAAA" }, CTX)).toThrow("Malformed ciphertext");
  });
});
