import "server-only";

import { createHmac } from "node:crypto";

const DEV_DIRECT_TOKEN_TTL_MS = 5 * 60 * 1000;
const DEV_DIRECT_TOKEN_FALLBACK_SECRET = "atlas-trade-copilot-dev-direct";

export type DevDirectTokenPayload = {
  email: string | null;
  isGuest: boolean;
  issuedAt: number;
  permissions: string[];
  role: string;
  subject: string;
  workspaceId: string;
};

function getSecret() {
  return (
    process.env.DEV_DIRECT_AUTH_SECRET ??
    process.env.NEXTAUTH_BRIDGE_SECRET ??
    process.env.AUTH_SECRET ??
    DEV_DIRECT_TOKEN_FALLBACK_SECRET
  );
}

function encodePayload(payload: DevDirectTokenPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createDevDirectToken(
  payload: Omit<DevDirectTokenPayload, "issuedAt">
) {
  const encodedPayload = encodePayload({
    ...payload,
    issuedAt: Date.now(),
  });

  return {
    accessToken: `dev.${encodedPayload}.${signPayload(encodedPayload)}`,
    expiresAt: Date.now() + DEV_DIRECT_TOKEN_TTL_MS,
  };
}
