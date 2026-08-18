import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Permission } from "@/lib/permissions";
import type { DevOidcStandardScope } from "./dev-oidc-types";

const DEV_OIDC_CODE_TTL_MS = 5 * 60 * 1000;
const DEV_OIDC_FALLBACK_SECRET = "atlas-trade-copilot-dev-oidc";

export type DevOidcCodePayload = {
  clientId: string;
  email: string | null;
  issuedAt: number;
  permissions: Permission[];
  redirectUri: string;
  scopes: DevOidcStandardScope[];
  state?: string;
  subject: string;
  workspaceId: string;
};

type DevOidcBridgePayload = {
  email: string | null;
  isGuest: boolean;
  issuedAt: number;
  permissions: Permission[];
  subject: string;
  workspaceId: string;
};

function getSigningSecret() {
  return process.env.AUTH_SECRET ?? DEV_OIDC_FALLBACK_SECRET;
}

function encodePayload(payload: unknown) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signPayload(encodedPayload: string, secret = getSigningSecret()) {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

export function createDevOidcCode(
  payload: Omit<DevOidcCodePayload, "issuedAt">
) {
  const encodedPayload = encodePayload({
    ...payload,
    issuedAt: Date.now(),
  });

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function createDevOidcBridgeHeaders(
  payload: Omit<DevOidcBridgePayload, "issuedAt">
) {
  const encodedPayload = encodePayload({
    ...payload,
    issuedAt: Date.now(),
  });
  const bridgeSecret =
    process.env.DEV_OIDC_INTERNAL_SECRET ?? getSigningSecret();

  return {
    "x-asianode-dev-oidc-context": encodedPayload,
    "x-asianode-dev-oidc-signature": signPayload(encodedPayload, bridgeSecret),
  };
}

export function verifyDevOidcCode(code: string): DevOidcCodePayload | null {
  const [encodedPayload, encodedSignature] = code.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = Buffer.from(
    signPayload(encodedPayload),
    "base64url"
  );
  const receivedSignature = Buffer.from(encodedSignature, "base64url");

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as DevOidcCodePayload;

    if (
      !payload.issuedAt ||
      Date.now() - payload.issuedAt > DEV_OIDC_CODE_TTL_MS ||
      payload.issuedAt > Date.now() + 30_000
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function normalizeDevRedirectUri(
  value: string | undefined,
  requestUrl = "http://localhost"
) {
  if (!value) {
    return "/dev/oidc/result";
  }

  if (!value.startsWith("/") && !/^https?:\/\//i.test(value)) {
    return null;
  }

  try {
    const parsed = new URL(value, requestUrl);
    const loopbackHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !loopbackHostnames.has(parsed.hostname) ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    ) {
      return null;
    }

    return value.startsWith("/")
      ? `${parsed.pathname}${parsed.search}`
      : parsed.toString();
  } catch {
    return null;
  }
}
