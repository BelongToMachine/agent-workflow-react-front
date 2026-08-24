import { isLogtoAuthMode, logtoApiResource } from "./logtoConfig";

type AccessTokenProvider = (
  resource: string
) => Promise<string | null | undefined>;
type LogtoTokenFailureHandler = () => Promise<void> | void;

let accessTokenProvider: AccessTokenProvider | null = null;
let tokenFailureHandler: LogtoTokenFailureHandler | null = null;
let hasExpiredSession = false;
let recoveryPromise: Promise<void> | null = null;

export class LogtoSessionExpiredError extends Error {
  constructor() {
    super("The Logto session has expired.");
    this.name = "LogtoSessionExpiredError";
  }
}

export function setLogtoAccessTokenProvider(
  provider: AccessTokenProvider | null
) {
  accessTokenProvider = provider;
  if (provider) {
    hasExpiredSession = false;
    recoveryPromise = null;
  }
}

export function setLogtoTokenFailureHandler(
  handler: LogtoTokenFailureHandler | null
) {
  tokenFailureHandler = handler;
}

export function isLogtoSessionExpiredError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const code = String(error.code);
  return code === "not_authenticated" || code.endsWith(".invalid_grant");
}

export async function handleLogtoSessionFailure(error: unknown) {
  if (!isLogtoSessionExpiredError(error)) {
    return false;
  }

  hasExpiredSession = true;
  await recoverExpiredSession();
  return true;
}

async function recoverExpiredSession() {
  if (!recoveryPromise) {
    recoveryPromise = Promise.resolve(tokenFailureHandler?.()).catch(() => {
      // The fallback redirect in the bridge handles cleanup if Logto's
      // end-session request itself cannot complete.
    });
  }

  await recoveryPromise;
}

export async function getLogtoAccessToken(): Promise<string | null> {
  if (!isLogtoAuthMode || !accessTokenProvider) {
    return null;
  }

  if (hasExpiredSession) {
    throw new LogtoSessionExpiredError();
  }

  try {
    return (await accessTokenProvider(logtoApiResource)) ?? null;
  } catch (error) {
    if (await handleLogtoSessionFailure(error)) {
      throw new LogtoSessionExpiredError();
    }

    // Keep transient network failures from logging the user out. The caller
    // will handle the missing token or the resulting API error normally.
    return null;
  }
}
