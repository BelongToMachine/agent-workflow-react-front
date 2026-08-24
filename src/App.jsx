import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppSidebar } from "./components/chat/appSidebar";
import { ChatPage } from "./components/chat/chatPage";
import { DataStreamProvider } from "./components/chat/dataStreamProvider";
import { Preview } from "./components/chat/preview";
import { BackendQueryProvider } from "./components/backendQueryProvider";
import { AuthProvider, useSession } from "./lib/auth";
import { useCurrentUserAccess } from "./lib/auth/currentUser";
import { useHandleSignInCallback, useLogto } from "@logto/react";
import {
  authMode,
  canSwitchAuthMode,
  isLogtoAuthMode,
  isLogtoConfigured,
  setAuthMode,
} from "./lib/auth/logtoConfig";
import { LogtoAppProvider } from "./lib/auth/logto";
import { ThemeProvider } from "./components/themeProvider";
import { TooltipProvider } from "./components/ui/tooltip";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { KnowledgeBaseFiles } from "./components/settings/knowledgeBaseFiles";
import { KnowledgeBaseGrants } from "./components/settings/knowledgeBaseGrants";
import { MemberPermissions } from "./components/settings/memberPermissions";
import { FastApiConnectionTest } from "./components/fastapiConnectionTest";
import { DevOidcConsole } from "./components/auth/devOidcConsole";
import { Link, useLocationSearch, usePathname, useRouter } from "./lib/router";

function AuthGuard({ children }) {
  const { status } = useSession();
  const pathname = usePathname();

  const isPublicAuthRoute =
    pathname === "/callback" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/dev/oidc";

  if (!import.meta.env.DEV && !isLogtoConfigured) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center text-sm text-destructive">
        Logto authentication is not configured for this deployment.
      </div>
    );
  }

  if (isPublicAuthRoute) {
    return children;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking authentication status…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate replace to={isLogtoAuthMode ? "/login" : "/dev/oidc"} />;
  }

  return children;
}

function ChatLayout() {
  const { data } = useSession();
  const {
    currentUser,
    error: accessError,
    hasPermission,
    isLoading: isAccessLoading,
  } = useCurrentUserAccess();
  const user = data?.user;

  if (isLogtoAuthMode && isAccessLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
        Loading workspace access…
      </div>
    );
  }

  if (isLogtoAuthMode && accessError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-semibold text-xl">Unable to load workspace access</h1>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            Your Logto session is valid, but the backend could not load your workspace access.
          </p>
        </div>
      </div>
    );
  }

  if (isLogtoAuthMode && currentUser?.accessState === "pending_workspace") {
    return <WorkspaceAccessPendingPage />;
  }

  return (
    <DataStreamProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar
          canManageKnowledgeBases={
            !isAccessLoading && hasPermission("knowledge.manage")
          }
          canViewPermissions={!isAccessLoading && hasPermission("members.read")}
          user={user}
        />
        <SidebarInset>
          <Toaster
            position="top-center"
            theme="system"
            toastOptions={{
              className:
                "!bg-card !text-foreground !border-border/50 !shadow-[var(--shadow-float)]",
            }}
          />
          <Routes>
            <Route element={<ChatPage />} index />
            <Route element={<ChatPage />} path="chat/:id" />
            <Route
              element={
                <PermissionRoute permission="members.read">
                  <SettingsPage title="Workspace permissions">
                    <MemberPermissions />
                  </SettingsPage>
                </PermissionRoute>
              }
              path="settings/members"
            />
            <Route
              element={
                <PermissionRoute permission="knowledge.manage">
                  <SettingsPage title="Knowledge base access">
                    <KnowledgeBaseGrants />
                  </SettingsPage>
                </PermissionRoute>
              }
              path="settings/knowledge-bases"
            />
            <Route
              element={
                <PermissionRoute permission="knowledge.manage">
                  <SettingsPage title="Knowledge base files">
                    <KnowledgeBaseFiles />
                  </SettingsPage>
                </PermissionRoute>
              }
              path="settings/knowledge-bases/files"
            />
            <Route
              element={<SettingsPage title="FastAPI connection"><FastApiConnectionTest /></SettingsPage>}
              path="fastapi-test"
            />
            <Route element={<Navigate replace to="/" />} path="*" />
          </Routes>
        </SidebarInset>
      </SidebarProvider>
    </DataStreamProvider>
  );
}

function WorkspaceAccessPendingPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md">
        <h1 className="font-semibold text-xl">Account created</h1>
        <p className="mt-2 text-muted-foreground text-sm leading-6">
          Your Logto account is authenticated, but it has not been added to a workspace yet.
          Ask a workspace administrator to grant access, then refresh this page.
        </p>
      </div>
    </div>
  );
}

function PermissionRoute({ children, permission }) {
  const { hasPermission, isLoading } = useCurrentUserAccess();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading workspace access…
      </div>
    );
  }

  if (!hasPermission(permission)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-semibold text-xl">Permission required</h1>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            Your account does not have permission to open this workspace area.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

function SettingsPage({ children, title }) {
  return (
    <main className="min-h-dvh overflow-y-auto bg-background px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage workspace configuration and access.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}

function LogtoCallbackPage() {
  if (!isLogtoAuthMode) {
    return <Navigate replace to={import.meta.env.DEV ? "/dev/oidc" : "/"} />;
  }

  return <ConfiguredLogtoCallbackPage />;
}

function ConfiguredLogtoCallbackPage() {
  const router = useRouter();
  const { error, isAuthenticated, isLoading } = useHandleSignInCallback(() => {
    router.replace("/");
  });

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-sm text-destructive">
        Logto sign-in failed: {error.message}
      </div>
    );
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-sm text-muted-foreground">
        Sign-in was not completed. Please return to the login page.
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-sm text-muted-foreground">
      Completing sign-in…
    </div>
  );
}

function LogtoAuthPage({ mode }) {
  const { signIn } = useLogto();
  const search = useLocationSearch();
  const isRegister = mode === "register";
  const isSessionExpired =
    new URLSearchParams(search).get("reason") === "session_expired";

  function handleSignIn() {
    void signIn({
      postRedirectUri: `${window.location.origin}/`,
      redirectUri: `${window.location.origin}/callback`,
    });
  }

  return (
    <div className="flex min-h-dvh w-full bg-sidebar">
      <div className="flex w-full flex-col bg-background p-8 md:p-16 xl:w-[600px] xl:shrink-0 xl:rounded-r-2xl xl:border-r xl:border-border/40">
        <Link
          className="flex w-fit items-center text-[13px] text-muted-foreground hover:text-foreground"
          href="/"
        >
          ← Back
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isRegister ? "Create account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue with Logto to use your configured sign-in methods.
            </p>
          </div>
          {isSessionExpired ? (
            <div
              aria-live="polite"
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800 text-sm dark:text-amber-200"
              role="status"
            >
              Your login session expired. Please sign in again to continue.
            </div>
          ) : null}
          <button
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={handleSignIn}
            type="button"
          >
            Continue with Google or WeChat
          </button>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            Google and WeChat buttons are configured in the Logto sign-in experience.
          </p>
        </div>
      </div>
      <div className="hidden flex-1 overflow-hidden pl-12 pt-8 xl:block">
        <Preview />
      </div>
    </div>
  );
}

function AuthPage({ mode }) {
  const router = useRouter();

  if (isLogtoAuthMode) {
    return <LogtoAuthPage mode={mode} />;
  }

  const isLogin = mode === "login";

  function handleSubmit(event) {
    event.preventDefault();
    router.push("/");
  }

  return (
    <div className="flex min-h-dvh w-full bg-sidebar">
      <div className="flex w-full flex-col bg-background p-8 md:p-16 xl:w-[600px] xl:shrink-0 xl:rounded-r-2xl xl:border-r xl:border-border/40">
        <Link
          className="flex w-fit items-center text-[13px] text-muted-foreground hover:text-foreground"
          href="/"
        >
          ← Back
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin ? "Sign in to your account to continue" : "Get started for free"}
            </p>
          </div>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email
              <input className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="email" required type="email" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Password
              <input className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" minLength={6} name="password" required type="password" />
            </label>
            <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90" type="submit">
              {isLogin ? "Sign in" : "Sign up"}
            </button>
          </form>
          <p className="text-center text-[13px] text-muted-foreground">
            {isLogin ? "No account? " : "Have an account? "}
            <Link className="text-foreground underline-offset-4 hover:underline" href={isLogin ? "/register" : "/login"}>
              {isLogin ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </div>
      </div>
      <div className="hidden flex-1 overflow-hidden pl-12 pt-8 xl:block">
        <Preview />
      </div>
    </div>
  );
}

function AuthModeSwitcher() {
  if (!canSwitchAuthMode) {
    return null;
  }

  const nextMode = authMode === "development" ? "preview" : "development";

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-border/60 bg-background/95 p-2 text-xs shadow-lg backdrop-blur">
      <span className="text-muted-foreground">
        当前：{authMode === "development" ? "开发认证" : "Preview / Logto"}
      </span>
      <button
        className="rounded-md border border-border px-2.5 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        onClick={() => setAuthMode(nextMode)}
        type="button"
      >
        切换到{nextMode === "development" ? "开发" : "Preview"}
      </button>
      {!isLogtoConfigured && nextMode === "preview" ? (
        <span className="text-amber-600 dark:text-amber-400">
          需配置 Logto
        </span>
      ) : null}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Routes>
          <Route
            element={
              import.meta.env.DEV ? (
                <DevOidcConsole />
              ) : (
                <Navigate replace to="/" />
              )
            }
            path="/dev/oidc"
          />
          <Route element={<LogtoCallbackPage />} path="/callback" />
          <Route element={<ChatLayout />} path="/*" />
          <Route element={<AuthPage mode="login" />} path="/login" />
          <Route element={<AuthPage mode="register" />} path="/register" />
        </Routes>
      </AuthGuard>
    </BrowserRouter>
  );
}

export default function AppRoot() {
  return (
    <LogtoAppProvider>
      <AuthProvider>
        <AuthModeSwitcher />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BackendQueryProvider>
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </BackendQueryProvider>
        </ThemeProvider>
      </AuthProvider>
    </LogtoAppProvider>
  );
}
