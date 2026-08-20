import { LogtoProvider, useLogto } from "@logto/react";
import { useEffect, type ReactNode } from "react";
import { isLogtoAuthMode, logtoConfig } from "./logtoConfig";
import { setLogtoAccessTokenProvider } from "./logtoToken";

function LogtoAccessTokenBridge({ children }: { children: ReactNode }) {
  const { getAccessToken } = useLogto();

  useEffect(() => {
    setLogtoAccessTokenProvider(getAccessToken);
    return () => setLogtoAccessTokenProvider(null);
  }, [getAccessToken]);

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
