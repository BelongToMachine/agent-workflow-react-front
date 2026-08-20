import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useState,
} from "react";
import { useLogto } from "@logto/react";
import {
  clearStoredDirectToken,
  getStoredDirectToken,
} from "./backend/directClient";
import { isLogtoAuthMode } from "./auth/logtoConfig";
import type { Permission, WorkspaceRole } from "./permissions";

export type User = {
  email?: string | null;
  id?: string | null;
  image?: string | null;
  name?: string | null;
  permissions?: Permission[];
  role?: WorkspaceRole;
  workspaceId?: string | null;
};

export type Session = { user: User } | null;

type AuthContextValue = {
  data: Session;
  status: "authenticated" | "loading" | "unauthenticated";
  update: () => Promise<Session>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let registeredSignOut: (() => Promise<void>) | null = null;

function registerSignOut(handler: (() => Promise<void>) | null) {
  registeredSignOut = handler;
}

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
      permissions?: Permission[];
      role?: WorkspaceRole;
      subject?: string;
      workspaceId?: string | null;
    };
    return {
      email: payload.email ?? null,
      id: payload.subject ?? "authenticated-user",
      permissions: payload.permissions,
      role: payload.role,
      workspaceId: payload.workspaceId,
    };
  } catch {
    return { id: "authenticated-user" };
  }
}

function DevelopmentAuthProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Session>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handler = async () => {
      clearStoredDirectToken();
      window.location.assign("/dev/oidc");
    };
    registerSignOut(handler);
    return () => registerSignOut(null);
  }, []);

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

function LogtoAuthProvider({ children }: { children: ReactNode }) {
  const {
    getIdTokenClaims,
    isAuthenticated,
    isLoading,
    signOut: logtoSignOut,
  } = useLogto();
  const [data, setData] = useState<Session>(null);
  const [isReady, setIsReady] = useState(false);

  const readSession = useCallback(async (): Promise<Session> => {
    if (!isAuthenticated) {
      return null;
    }

    try {
      const claims = await getIdTokenClaims();
      if (!claims?.sub) {
        return null;
      }

      return {
        user: {
          email: claims.email ?? null,
          id: claims.sub,
          image: claims.picture ?? null,
          name: claims.name ?? claims.username ?? null,
        },
      };
    } catch {
      return null;
    }
  }, [getIdTokenClaims, isAuthenticated]);

  useEffect(() => {
    let active = true;
    setIsReady(false);
    void readSession().then((session) => {
      if (!active) {
        return;
      }
      setData(session);
      setIsReady(true);
    });

    return () => {
      active = false;
    };
  }, [readSession]);

  const update = useCallback(async () => {
    const session = await readSession();
    setData(session);
    setIsReady(true);
    return session;
  }, [readSession]);

  const signOut = useCallback(async () => {
    await logtoSignOut(`${window.location.origin}/`);
  }, [logtoSignOut]);

  useEffect(() => {
    registerSignOut(signOut);
    return () => registerSignOut(null);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      data,
      signOut,
      status:
        isLoading || !isReady
          ? "loading"
          : data
            ? "authenticated"
            : "unauthenticated",
      update,
    }),
    [data, isLoading, isReady, signOut, update]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isLogtoAuthMode) {
    return <LogtoAuthProvider>{children}</LogtoAuthProvider>;
  }

  return <DevelopmentAuthProvider>{children}</DevelopmentAuthProvider>;
}

export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSession must be used within AuthProvider");
  }
  return context;
}

export async function signOut() {
  if (registeredSignOut) {
    await registeredSignOut();
    return;
  }

  clearStoredDirectToken();
  window.location.assign(isLogtoAuthMode ? "/login" : "/dev/oidc");
}
