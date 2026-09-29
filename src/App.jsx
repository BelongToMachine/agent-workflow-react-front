import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  CircleHelpIcon,
  Clock3Icon,
  LockKeyholeIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BackendQueryProvider } from "./components/backendQueryProvider";
import { AuthProvider, useSession } from "./lib/auth";
import {
  ApplicationAuthProvider,
  useApplicationAuth,
} from "./lib/auth/applicationAuth";
import { LocalAuthRequestError, signInWithLocalSession } from "./lib/auth/localSession";
import { ThemeProvider } from "./components/themeProvider";
import { TooltipProvider } from "./components/ui/tooltip";
import { LoadingState } from "./components/ui/loadingState";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { AuthPageShell } from "./components/auth/authPageShell";
import { Link, usePathname, useRouter } from "./lib/router";
import { applyAccentColor, getStoredAccentColor } from "./lib/accentColor";
import { cn } from "./lib/utils";
import { WorkspaceHeader } from "./components/chat/workspaceHeader";
import { SettingsPage } from "./components/settings/settingsPage";

function lazyNamed(loader, exportName) {
  return lazy(() =>
    loader().then((module) => ({
      default: module[exportName],
    }))
  );
}

const ChatPage = lazyNamed(
  () => import("./components/chat/chatPage"),
  "ChatPage"
);
const AppSidebar = lazyNamed(
  () => import("./components/chat/appSidebar"),
  "AppSidebar"
);
const Toaster = lazyNamed(() => import("sonner"), "Toaster");
const KnowledgeBaseWorkspace = lazyNamed(
  () => import("./components/settings/knowledgeBaseWorkspace"),
  "KnowledgeBaseWorkspace"
);
const MemberPermissions = lazyNamed(
  () => import("./components/settings/memberPermissions"),
  "MemberPermissions"
);
const AppearanceSettings = lazyNamed(
  () => import("./components/settings/appearanceSettings"),
  "AppearanceSettings"
);
const FastApiConnectionTest = lazyNamed(
  () => import("./components/fastapiConnectionTest"),
  "FastApiConnectionTest"
);
const UploadPage = lazyNamed(
  () => import("./components/upload/uploadPage"),
  "UploadPage"
);
const LocalActivationPage = lazyNamed(
  () => import("./components/auth/localAccountPages"),
  "LocalActivationPage"
);
const LocalChangePasswordPage = lazyNamed(
  () => import("./components/auth/localAccountPages"),
  "LocalChangePasswordPage"
);

const BusinessDataTablesPage = lazy(() =>
  import("./components/businessTables/businessDataTablesPage").then((module) => ({
    default: module.BusinessDataTablesPage,
  }))
);

function isKnownRoute(pathname) {
  if (
    pathname === "/" ||
    pathname === "/activate" ||
    pathname === "/access-pending" ||
    pathname === "/account-suspended" ||
    pathname === "/admin/data-tables" ||
    pathname === "/fastapi-test" ||
    pathname === "/forbidden" ||
    pathname === "/forgot-password" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/upload" ||
    pathname === "/reset-password" ||
    pathname === "/settings/knowledge-bases" ||
    pathname === "/settings/knowledge-bases/files" ||
    pathname === "/settings/members" ||
    pathname === "/settings/password" ||
    pathname === "/settings/appearance"
  ) {
    return true;
  }

  return /^\/chat\/[^/]+$/.test(pathname);
}

function NotFoundPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <StatusPage
      code="404"
      description={t("app.notFoundDescription")}
      eyebrow={t("app.error404")}
      icon={CircleHelpIcon}
      title={t("app.notFoundTitle")}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={() => router.back()} type="button" variant="outline">
          <ArrowLeftIcon />
          {t("common.previousPage")}
        </Button>
        <Button asChild>
          <Link href="/">{t("common.backToWorkspace")}</Link>
        </Button>
      </div>
    </StatusPage>
  );
}

function StatusPage({
  children,
  code,
  description,
  eyebrow,
  fullScreen = true,
  icon: Icon = CircleAlertIcon,
  title,
  tone = "neutral",
}) {
  const toneClass = {
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-primary/10 text-primary",
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/20 text-foreground",
  }[tone];

  return (
    <main
      aria-labelledby="status-page-title"
      className={cn(
        "flex w-full items-center justify-center bg-muted/20 p-4 sm:p-8",
        fullScreen ? "min-h-dvh" : "min-h-full"
      )}
    >
      <section className="w-full max-w-xl overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:gap-5 sm:p-6">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", toneClass)}>
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {eyebrow}
              </p>
              {code ? <Badge variant="outline">{code}</Badge> : null}
            </div>
            <h1 className="text-balance text-xl font-semibold tracking-tight" id="status-page-title">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {children ? (
          <div className="border-t border-border/70 bg-muted/15 p-4 sm:px-6 sm:py-4">
            {children}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function AuthGuard({ children }) {
  const { status } = useSession();
  const pathname = usePathname();
  const { t } = useTranslation();

  const isPublicAuthRoute =
    pathname === "/activate" ||
    pathname === "/forgot-password" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/reset-password";

  if (isPublicAuthRoute) {
    return children;
  }

  if (status === "loading") {
    return <LoadingState message={t("app.loadingAuth")} />;
  }

  if (status === "unauthenticated") {
    if (!isKnownRoute(pathname)) {
      return <NotFoundPage />;
    }
    return <Navigate replace to="/login" />;
  }

  return children;
}

function RouteSuspense({ children }) {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<LoadingState message={t("app.loadingAccess")} />}>
      {children}
    </Suspense>
  );
}

function ChatLayout() {
  const { t } = useTranslation();
  const { data } = useSession();
  const {
    error: accessError,
    hasPermission,
    refreshCurrentUser,
    status: authStatus,
  } = useApplicationAuth();
  const user = data?.user;

  if (authStatus === "loading" || authStatus === "initializing") {
    return <LoadingState message={t("app.loadingAccess")} />;
  }

  if (authStatus === "unauthenticated") {
    return <Navigate replace to="/login" />;
  }

  if (authStatus === "suspended") {
    return <Navigate replace to="/account-suspended" />;
  }

  if (authStatus === "pending_workspace") {
    return <Navigate replace to="/access-pending" />;
  }

  if (authStatus === "error" && accessError) {
    return (
      <StatusPage
        description={t("app.accessLoadDescription")}
        eyebrow={t("app.routeStatus")}
        icon={CircleAlertIcon}
        title={t("app.unableToLoadAccess")}
        tone="destructive"
      >
        <div className="flex justify-end">
          <Button onClick={() => void refreshCurrentUser()} type="button" variant="outline">
            <RefreshCwIcon />
            {t("app.retry")}
          </Button>
        </div>
      </StatusPage>
    );
  }

  return (
    <SidebarProvider
      className="h-dvh min-h-0 overflow-hidden"
      defaultOpen
      style={{ "--sidebar-width-icon": "3.25rem" }}
    >
      <RouteSuspense>
        <AppSidebar
          canManageKnowledgeBases={
            authStatus === "authenticated" && hasPermission("knowledge.manage")
          }
          canViewPermissions={
            authStatus === "authenticated" && hasPermission("members.read")
          }
          user={user}
        />
      </RouteSuspense>
      <SidebarInset className="m-2 h-[calc(100dvh-1rem)] min-h-0 overflow-hidden rounded-l-none rounded-r-lg border border-border/70 bg-workspace-background max-md:m-0 max-md:h-dvh max-md:rounded-none max-md:border-0">
        <WorkspaceHeader user={user} />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-workspace-background">
          <RouteSuspense>
            <Toaster
              position="top-center"
              theme="system"
              toastOptions={{
                className:
                  "!bg-card !text-foreground !border-border/50 !shadow-[var(--shadow-float)]",
              }}
            />
          </RouteSuspense>
          <Routes>
            <Route
              element={
                <RouteSuspense>
                  <ChatPage />
                </RouteSuspense>
              }
              index
            />
            <Route
              element={
                <RouteSuspense>
                  <ChatPage />
                </RouteSuspense>
              }
              path="chat/:id"
            />
            <Route
              element={
                <PermissionRoute permission="knowledge.manage">
                  <RouteSuspense>
                    <BusinessDataTablesPage />
                  </RouteSuspense>
                </PermissionRoute>
              }
              path="admin/data-tables"
            />
            <Route
              element={
                <PermissionRoute permission="members.read">
                  <RouteSuspense>
                    <SettingsPage
                      descriptionKey="settings.decideAccess"
                      titleKey="settings.workspacePermissions"
                    >
                      <MemberPermissions />
                    </SettingsPage>
                  </RouteSuspense>
                </PermissionRoute>
              }
              path="settings/members"
            />
            <Route
              element={
                <PermissionRoute permission="knowledge.manage">
                  <RouteSuspense>
                    <SettingsPage
                      descriptionKey="settings.knowledgeBaseWorkspaceDescription"
                      titleKey="settings.knowledgeBases"
                    >
                      <KnowledgeBaseWorkspace />
                    </SettingsPage>
                  </RouteSuspense>
                </PermissionRoute>
              }
              path="settings/knowledge-bases"
            />
            <Route
              element={
                <PermissionRoute permission="knowledge.manage">
                  <RouteSuspense>
                    <UploadPage />
                  </RouteSuspense>
                </PermissionRoute>
              }
              path="upload"
            />
            <Route
              element={
                <PermissionRoute permission="knowledge.manage">
                  <RouteSuspense>
                    <SettingsPage
                      descriptionKey="settings.knowledgeBaseWorkspaceDescription"
                      titleKey="settings.knowledgeBases"
                    >
                      <KnowledgeBaseWorkspace />
                    </SettingsPage>
                  </RouteSuspense>
                </PermissionRoute>
              }
              path="settings/knowledge-bases/files"
            />
            <Route
              element={
                <RouteSuspense>
                  <SettingsPage
                    descriptionKey="settings.accentColorPageDescription"
                    titleKey="settings.accentColor"
                  >
                    <AppearanceSettings />
                  </SettingsPage>
                </RouteSuspense>
              }
              path="settings/appearance"
            />
            <Route
              element={
                <RouteSuspense>
                  <SettingsPage titleKey="settings.fastApiConnection">
                    <FastApiConnectionTest />
                  </SettingsPage>
                </RouteSuspense>
              }
              path="fastapi-test"
            />
            <Route
              element={
                <RouteSuspense>
                  <SettingsPage titleKey="auth.changePassword">
                    <LocalChangePasswordPage />
                  </SettingsPage>
                </RouteSuspense>
              }
              path="settings/password"
            />
            <Route element={<NotFoundPage />} path="*" />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AccentColorSync() {
  useEffect(() => {
    applyAccentColor(getStoredAccentColor());
  }, []);

  return null;
}

function WorkspaceAccessPendingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <StatusPage
      description={t("app.accountCreatedDescription")}
      eyebrow={t("app.routeStatus")}
      icon={Clock3Icon}
      title={t("app.accountCreated")}
      tone="warning"
    >
      <div className="flex justify-end">
        <Button onClick={() => router.refresh()} type="button" variant="outline">
          <RefreshCwIcon />
          {t("app.retry")}
        </Button>
      </div>
    </StatusPage>
  );
}

function AccountSuspendedPage() {
  const { signOut } = useApplicationAuth();
  const { t } = useTranslation();

  return (
    <StatusPage
      description={t("app.accountSuspendedDescription")}
      eyebrow={t("app.routeStatus")}
      icon={LockKeyholeIcon}
      title={t("app.accountSuspended")}
      tone="destructive"
    >
      <div className="flex justify-end">
        <Button onClick={() => void signOut()} type="button" variant="outline">
          <ArrowLeftIcon />
          {t("sidebar.signOut")}
        </Button>
      </div>
    </StatusPage>
  );
}

function PasswordHelpPage() {
  const { t } = useTranslation();
  return (
    <StatusPage
      description={t("auth.contactAdmin")}
      eyebrow={t("auth.accountSecurity")}
      icon={ShieldAlertIcon}
      title={t("auth.noPasswordReset")}
      tone="info"
    >
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/login">{t("auth.backToSignIn")}</Link>
        </Button>
      </div>
    </StatusPage>
  );
}

function ForbiddenPage({ inline = false }) {
  const { t } = useTranslation();
  return (
    <StatusPage
      code="403"
      description={t("app.permissionRequiredDescription")}
      eyebrow={t("app.routeStatus")}
      fullScreen={!inline}
      icon={LockKeyholeIcon}
      title={t("app.permissionRequired")}
      tone="destructive"
    >
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/">{t("common.backToWorkspace")}</Link>
        </Button>
      </div>
    </StatusPage>
  );
}

function PermissionRoute({ children, permission }) {
  const { hasPermission, status } = useApplicationAuth();
  const { t } = useTranslation();

  if (status === "loading" || status === "initializing") {
    return <LoadingState message={t("app.loadingAccess")} />;
  }

  if (status === "suspended") {
    return <Navigate replace to="/account-suspended" />;
  }

  if (status === "pending_workspace") {
    return <Navigate replace to="/access-pending" />;
  }

  if (!hasPermission(permission)) {
    return <ForbiddenPage inline />;
  }

  return children;
}

function AuthPage({ mode }) {
  return <LocalSessionAuthPage mode={mode} />;
}

function LocalSessionAuthPage({ mode }) {
  const router = useRouter();
  const { update } = useSession();
  const { t } = useTranslation();
  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isLogin) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await signInWithLocalSession(email, password);
      await update();
      router.replace("/");
    } catch (error) {
      setErrorMessage(
        error instanceof LocalAuthRequestError && error.status === 401
          ? t("auth.emailOrPasswordIncorrect")
          : t("auth.unableToSignIn")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell eyebrow={t("auth.productEyebrow")}>
      <header className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {isLogin ? t("auth.welcomeBack") : t("auth.invitationRequired")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isLogin ? t("auth.signInOrganization") : t("auth.invitationOnly")}
        </p>
      </header>

      {errorMessage ? (
        <div
          aria-live="assertive"
          className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
          id="login-error"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      {isLogin ? (
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="login-email">{t("auth.email")}</Label>
            <Input
              aria-describedby={errorMessage ? "login-error" : undefined}
              aria-invalid={Boolean(errorMessage)}
              autoComplete="email"
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="login-password">{t("auth.password")}</Label>
            <Input
              aria-describedby={errorMessage ? "login-error" : undefined}
              aria-invalid={Boolean(errorMessage)}
              autoComplete="current-password"
              id="login-password"
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <Button className="mt-1 h-10 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            {t("auth.forgotPassword")}
          </p>
        </form>
      ) : (
        <div className="rounded-lg border border-border bg-muted/25 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <LockKeyholeIcon aria-hidden="true" className="size-4" />
            </span>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("auth.invitationOnly")}
            </p>
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => router.replace("/login")}
            type="button"
            variant="outline"
          >
            {t("auth.backToSignIn")}
          </Button>
        </div>
      )}

      {isLogin ? (
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          {t("auth.needAccess")}
        </p>
      ) : null}
    </AuthPageShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Routes>
          <Route
            element={
              <RouteSuspense>
                <LocalActivationPage />
              </RouteSuspense>
            }
            path="/activate"
          />
          <Route element={<PasswordHelpPage />} path="/forgot-password" />
          <Route element={<PasswordHelpPage />} path="/reset-password" />
          <Route element={<WorkspaceAccessPendingPage />} path="/access-pending" />
          <Route element={<AccountSuspendedPage />} path="/account-suspended" />
          <Route element={<ForbiddenPage />} path="/forbidden" />
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
    <BackendQueryProvider>
      <AuthProvider>
        <ApplicationAuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AccentColorSync />
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </ThemeProvider>
        </ApplicationAuthProvider>
      </AuthProvider>
    </BackendQueryProvider>
  );
}
