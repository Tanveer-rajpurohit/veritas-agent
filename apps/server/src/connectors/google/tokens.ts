import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { ConnectorError, type ConnectorDeps } from "../context";
import type { ConnectorKey, ConnectorRow } from "../store";
import type { Sealed } from "../vault";
import { GoogleOAuthError, refreshAccessToken } from "./oauth";

/** Refresh a little early so a token never expires mid-request. */
export const REFRESH_SKEW_MS = 60_000;
const LOCK_TTL_MS = 15_000;
const LOCK_POLL_MS = 200;
const LOCK_POLL_ATTEMPTS = 50;

const storedTokens = z.object({ accessToken: z.string(), refreshToken: z.string() });
export type StoredTokens = z.infer<typeof storedTokens>;

/** AAD for the vault: a sealed token only opens on the row it was written for. */
export const vaultContext = (key: ConnectorKey) => `${key.workspaceId}:${key.userId}:${key.provider}`;

export function sealTokens(deps: Pick<ConnectorDeps, "vault">, key: ConnectorKey, tokens: StoredTokens) {
  const sealed = deps.vault.seal(JSON.stringify(tokens), vaultContext(key));
  return { tokenCiphertext: sealed.ciphertext, tokenIv: sealed.iv };
}

export function openTokens(deps: Pick<ConnectorDeps, "vault">, row: ConnectorRow): StoredTokens {
  const sealed: Sealed = { ciphertext: row.tokenCiphertext, iv: row.tokenIv };
  return storedTokens.parse(JSON.parse(deps.vault.open(sealed, vaultContext(row))));
}

/**
 * Returns a usable access token for the connector, refreshing it when it is
 * within REFRESH_SKEW_MS of expiry, or when `rejected` (a token Google just
 * answered 401 to) is still the stored one. A Redis lock makes concurrent
 * requests refresh once; the others wait for the new token. invalid_grant
 * means the user revoked access, so the connector is marked needs_reconnect.
 */
export async function getAccessToken(deps: ConnectorDeps, row: ConnectorRow, rejected?: string): Promise<string> {
  if (row.status === "needs_reconnect") throw new ConnectorError("needs_reconnect");
  const google = deps.google;
  if (!google) throw new ConnectorError("not_configured");

  const usable = (r: ConnectorRow, tokens: StoredTokens) =>
    tokens.accessToken !== rejected &&
    r.expiresAt !== null &&
    r.expiresAt.getTime() - deps.now() > REFRESH_SKEW_MS;

  const current = openTokens(deps, row);
  if (usable(row, current)) return current.accessToken;

  const lockKey = `connector:refresh:${row.id}`;
  const owner = randomUUID();
  for (let attempt = 0; attempt < LOCK_POLL_ATTEMPTS; attempt++) {
    const latest = await deps.store.find(row);
    if (!latest) throw new ConnectorError("not_connected");
    if (latest.status === "needs_reconnect") throw new ConnectorError("needs_reconnect");
    const latestTokens = openTokens(deps, latest);
    if (usable(latest, latestTokens)) return latestTokens.accessToken;

    if (await deps.kv.acquire(lockKey, owner, LOCK_TTL_MS)) {
      try {
        // Re-read under the lock: the previous holder may have just refreshed.
        const locked = (await deps.store.find(row)) ?? latest;
        const lockedTokens = openTokens(deps, locked);
        if (usable(locked, lockedTokens)) return lockedTokens.accessToken;
        return await refresh(deps, google, locked, lockedTokens);
      } finally {
        await deps.kv.release(lockKey, owner);
      }
    }
    await sleep(LOCK_POLL_MS);
  }
  throw new ConnectorError("unavailable");
}

async function refresh(
  deps: ConnectorDeps,
  google: NonNullable<ConnectorDeps["google"]>,
  row: ConnectorRow,
  tokens: StoredTokens,
): Promise<string> {
  try {
    const fresh = await refreshAccessToken(deps.fetch, google, tokens.refreshToken, deps.now());
    const next: StoredTokens = { accessToken: fresh.accessToken, refreshToken: fresh.refreshToken ?? tokens.refreshToken };
    await deps.store.updateTokens(row.id, {
      ...sealTokens(deps, row, next),
      expiresAt: fresh.expiresAt,
      scopes: fresh.scopes.length > 0 ? fresh.scopes : row.scopes,
    });
    return next.accessToken;
  } catch (err) {
    if (err instanceof GoogleOAuthError && err.kind === "invalid_grant") {
      await deps.store.setStatus(row.id, "needs_reconnect");
      throw new ConnectorError("needs_reconnect");
    }
    // Any other token-endpoint failure (outage, misconfigured client) isn't the user's to fix by reconnecting.
    if (err instanceof GoogleOAuthError) throw new ConnectorError("unavailable");
    throw err;
  }
}
