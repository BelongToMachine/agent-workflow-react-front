import { LogtoProvider, useLogto } from "@logto/react";
import { useCallback, useEffect, type ReactNode } from "react";
import {
  isLogtoAuthMode,
  logtoAppId,
  logtoConfig,
} from "./logtoConfig";
import {
  handleLogtoSessionFailure,
  isLogtoSessionExpiredError,
  setLogtoAccessTokenProvider,
  setLogtoTokenFailureHandler,
} from "./logtoToken";

function clearLogtoBrowserStorage() {
  if (typeof window === "undefined" || !logtoAppId) {
    return;
  }

  const prefixes = [`logto:${logtoAppId}`, `logto_cache:${logtoAppId}`];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) {
        try {
          storage.removeItem(key);
        } catch {
          // Continue with the other storage area and the direct redirect.
        }
      }
    }
  }
}

function LogtoAccessTokenBridge({ children }: { children: ReactNode }) {
  const { clearAllTokens, error, getAccessToken } = useLogto();

  const handleTokenFailure = useCallback(async () => {
    const redirectUri = `${window.location.origin}/login?reason=session_expired`;
    await clearAllTokens();
    clearLogtoBrowserStorage();
    window.location.assign(redirectUri);
  }, [clearAllTokens]);

  useEffect(() => {
    setLogtoAccessTokenProvider(getAccessToken);
    setLogtoTokenFailureHandler(handleTokenFailure);
    return () => {
      setLogtoAccessTokenProvider(null);
      setLogtoTokenFailureHandler(null);
    };
  }, [getAccessToken, handleTokenFailure]);

  useEffect(() => {
    if (!isLogtoSessionExpiredError(error)) {
      return;
    }

    void handleLogtoSessionFailure(error);
  }, [error, handleTokenFailure]);

  return children;
}

export function LogtoAppProvider({ children }: { children: ReactNode }) {
  if (!logtoConfig || !isLogtoAuthMode) {
    return children;
  }

  return (
    <LogtoProvider config={logtoConfig} unstable_enableCache>
      <LogtoAccessTokenBridge>{children}</LogtoAccessTokenBridge>
    </LogtoProvider>
  );
}
