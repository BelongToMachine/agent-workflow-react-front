import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useState,
} from "react";
import {
  clearStoredDirectToken,
  getStoredDirectToken,
} from "./backend/direct-client";

export type User = {
  email?: string | null;
  id?: string | null;
  image?: string | null;
  name?: string | null;
};

export type Session = { user: User } | null;

type AuthContextValue = {
  data: Session;
  status: "authenticated" | "loading" | "unauthenticated";
  update: () => Promise<Session>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeDevelopmentUser(accessToken: string): User {
  const encodedPayload = accessToken.split(".")[1];
  if (!encodedPayload) {
    return { id: "authenticated-user" };
  }

  try {
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(window.atob(padded)) as {
      email?: string | null;
      subject?: string;
    };
    return {
      email: payload.email ?? null,
      id: payload.subject ?? "authenticated-user",
    };
  } catch {
    return { id: "authenticated-user" };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Session>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(() => {
    const token = getStoredDirectToken();
    setData(token ? { user: decodeDevelopmentUser(token.accessToken) } : null);
    setIsReady(true);
  }, []);

  useEffect(() => {
    refreshSession();
    window.addEventListener("asianode-auth-change", refreshSession);
    window.addEventListener("storage", refreshSession);
    const sessionCheck = window.setInterval(refreshSession, 30_000);
    return () => {
      window.removeEventListener("asianode-auth-change", refreshSession);
      window.removeEventListener("storage", refreshSession);
      window.clearInterval(sessionCheck);
    };
  }, [refreshSession]);

  const update = useCallback(async () => {
    refreshSession();
    const token = getStoredDirectToken();
    return token ? { user: decodeDevelopmentUser(token.accessToken) } : null;
  }, [refreshSession]);
  const signOut = useCallback(async () => clearStoredDirectToken(), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      data,
      signOut,
      status: data ? "authenticated" : isReady ? "unauthenticated" : "loading",
      update,
    }),
    [data, isReady, signOut, update]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSession must be used within AuthProvider");
  }
  return context;
}

export async function signOut() {
  clearStoredDirectToken();
  window.location.assign("/dev/oidc");
}
