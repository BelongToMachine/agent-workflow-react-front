import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Session>(null);

  const update = useCallback(async () => data, [data]);
  const signOut = useCallback(async () => setData(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      data,
      signOut,
      status: data ? "authenticated" : "unauthenticated",
      update,
    }),
    [data, signOut, update]
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
  window.location.assign("/");
}
