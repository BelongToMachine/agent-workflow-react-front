import "server-only";

import { createHmac } from "node:crypto";
import type { Permission, WorkspaceRole } from "@/lib/permissions";

const NEXTAUTH_BRIDGE_FALLBACK_SECRET = "atlas-trade-copilot-nextauth-bridge";

export type NextAuthBridgePayload = {
  email: string | null;
  isGuest: boolean;
  issuedAt: number;
  permissions: Permission[];
  role: WorkspaceRole;
  subject: string;
  workspaceId: string;
};

function getBridgeSecret() {
  return (
    process.env.NEXTAUTH_BRIDGE_SECRET ??
    process.env.AUTH_SECRET ??
    NEXTAUTH_BRIDGE_FALLBACK_SECRET
  );
}

export function createNextAuthBridgeHeaders(
  payload: Omit<NextAuthBridgePayload, "issuedAt">
) {
  const encodedContext = Buffer.from(
    JSON.stringify({ ...payload, issuedAt: Date.now() })
  ).toString("base64url");
  const signature = createHmac("sha256", getBridgeSecret())
    .update(encodedContext)
    .digest("base64url");

  return {
    "x-asianode-auth-context": encodedContext,
    "x-asianode-auth-signature": signature,
  };
}
