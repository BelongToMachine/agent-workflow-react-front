import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppSidebar } from "./components/chat/app-sidebar";
import { ChatPage } from "./components/chat/chat-page";
import { DataStreamProvider } from "./components/chat/data-stream-provider";
import { Preview } from "./components/chat/preview";
import { BackendQueryProvider } from "./components/backend-query-provider";
import { AuthProvider, useSession } from "./lib/auth";
import { ThemeProvider } from "./components/theme-provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { KnowledgeBaseFiles } from "./components/settings/knowledge-base-files";
import { KnowledgeBaseGrants } from "./components/settings/knowledge-base-grants";
import { MemberPermissions } from "./components/settings/member-permissions";
import { FastApiConnectionTest } from "./components/fastapi-connection-test";
import { DevOidcConsole } from "./components/auth/dev-oidc-console";
import { Link, usePathname, useRouter } from "./lib/router";

function AuthGuard({ children }) {
  const { status } = useSession();
  const pathname = usePathname();

  if (!import.meta.env.DEV) {
    return children;
  }

  if (pathname === "/dev/oidc") {
    return children;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking development session…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate replace to="/dev/oidc" />;
  }

  return children;
}

function ChatLayout() {
  const { data } = useSession();
  const user = data?.user;

  return (
    <DataStreamProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar canManageKnowledgeBases canViewPermissions user={user} />
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
              element={<SettingsPage title="Workspace permissions"><MemberPermissions /></SettingsPage>}
              path="settings/members"
            />
            <Route
              element={<SettingsPage title="Knowledge base access"><KnowledgeBaseGrants /></SettingsPage>}
              path="settings/knowledge-bases"
            />
            <Route
              element={<SettingsPage title="Knowledge base files"><KnowledgeBaseFiles /></SettingsPage>}
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

function AuthPage({ mode }) {
  const router = useRouter();
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
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BackendQueryProvider>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </BackendQueryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
