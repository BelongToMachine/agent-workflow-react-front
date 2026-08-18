import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckIcon,
  ChevronLeftIcon,
  ClipboardIcon,
  LogInIcon,
  KeyRoundIcon,
  ArrowRightIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import { Link } from "@/lib/router";
import {
  defaultPermissionsByRole,
  permissionCatalog,
  roleLabels,
  type Permission,
  type WorkspaceRole,
} from "@/lib/permissions";
import {
  clearStoredDirectToken,
  setStoredDirectToken,
  type DirectToken,
} from "@/lib/backend/direct-client";
import { Button } from "@/components/ui/button";

const DEFAULT_WORKSPACE_ID =
  process.env.NEXT_PUBLIC_WORKSPACE_ID ??
  "00000000-0000-0000-0000-000000000001";
const SAVED_PROFILES_STORAGE_KEY = "asianode-dev-oidc-profiles";

type ProfileInput = {
  email: string;
  isGuest: boolean;
  permissions: Permission[];
  role: WorkspaceRole;
  subject: string;
  workspaceId: string;
};

type SavedProfile = ProfileInput & {
  savedAt: number;
};

type IssuedToken = DirectToken & {
  email: string | null;
  permissions: Permission[];
  role: WorkspaceRole;
  subject: string;
};

function createSubject(role: WorkspaceRole) {
  return `dev-${role}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DevOidcConsole() {
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [subject, setSubject] = useState(() => createSubject("viewer"));
  const [email, setEmail] = useState("viewer@example.com");
  const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
  const [permissions, setPermissions] = useState<Permission[]>(() => [
    ...defaultPermissionsByRole.viewer,
  ]);
  const [issuedToken, setIssuedToken] = useState<IssuedToken | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SAVED_PROFILES_STORAGE_KEY);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved) as unknown;
      if (Array.isArray(parsed)) {
        setSavedProfiles(parsed as SavedProfile[]);
      }
    } catch {
      window.localStorage.removeItem(SAVED_PROFILES_STORAGE_KEY);
    }
  }, []);

  const selectedPermissionCount = permissions.length;
  const permissionSummary = useMemo(
    () =>
      permissionCatalog
        .filter(({ key }) => permissions.includes(key))
        .map(({ label }) => label),
    [permissions]
  );

  function handleRoleChange(nextRole: WorkspaceRole) {
    setRole(nextRole);
    setPermissions([...defaultPermissionsByRole[nextRole]]);
    setSubject(createSubject(nextRole));
    setEmail(`${nextRole}@example.com`);
  }

  function togglePermission(permission: Permission) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  async function activateProfile(profile: ProfileInput) {
    setError(null);
    setCopied(false);
    setIsPending(true);

    try {
      const response = await fetch("/api/v1/dev/oidc/token", {
        body: JSON.stringify({
          email: profile.email || null,
          isGuest: profile.isGuest,
          permissions: profile.permissions,
          role: profile.role,
          subject: profile.subject,
          workspaceId: profile.workspaceId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as {
        accessToken?: string;
        detail?: string | { msg?: string }[];
        expiresAt?: number;
        message?: string;
        workspaceId?: string;
      } | null;

      if (!response.ok || !result?.accessToken || !result.expiresAt) {
        const detail = Array.isArray(result?.detail)
          ? result.detail.map((item) => item.msg).filter(Boolean).join(", ")
          : result?.detail;
        throw new Error(
          result?.message ?? detail ?? "Unable to create a development user."
        );
      }

      const token: DirectToken = {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        workspaceId: result.workspaceId ?? profile.workspaceId,
      };
      setStoredDirectToken(token);
      setIssuedToken({
        ...token,
        email: profile.email || null,
        permissions: profile.permissions,
        role: profile.role,
        subject: profile.subject,
      });

      setSavedProfiles((current) => {
        const next = [
          { ...profile, savedAt: Date.now() },
          ...current.filter(
            (item) =>
              item.subject !== profile.subject ||
              item.workspaceId !== profile.workspaceId
          ),
        ];
        try {
          window.localStorage.setItem(
            SAVED_PROFILES_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          // The active session still works when local storage is unavailable.
        }
        return next;
      });
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Unable to create a development user."
      );
    } finally {
      setIsPending(false);
    }
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void activateProfile({
      email: email.trim(),
      isGuest: false,
      permissions,
      role,
      subject: subject.trim(),
      workspaceId: workspaceId.trim(),
    });
  }

  function activateSavedProfile(profile: SavedProfile) {
    setEmail(profile.email);
    setIsPending(true);
    setPermissions(profile.permissions);
    setRole(profile.role);
    setSubject(profile.subject);
    setWorkspaceId(profile.workspaceId);
    void activateProfile(profile);
  }

  function removeSavedProfile(profile: SavedProfile) {
    setSavedProfiles((current) => {
      const next = current.filter(
        (item) =>
          item.subject !== profile.subject ||
          item.workspaceId !== profile.workspaceId
      );
      try {
        window.localStorage.setItem(
          SAVED_PROFILES_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // Nothing else is required; the in-memory list is still updated.
      }
      return next;
    });
  }

  async function copyToken() {
    if (!issuedToken) {
      return;
    }

    await navigator.clipboard.writeText(issuedToken.accessToken);
    setCopied(true);
  }

  function clearToken() {
    clearStoredDirectToken();
    setIssuedToken(null);
    setCopied(false);
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/"
          >
            <ChevronLeftIcon className="size-4" />
            Back to app
          </Link>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            Development only
          </span>
        </div>

        <header className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <ShieldAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
            Temporary OIDC profile issuer
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Create a permission profile
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Issue a five-minute development bearer token with a selected role
            and permission set. Profiles are saved in this browser's local
            storage so you can activate them again later; the active token is
            attached to FastAPI requests and SSE.
          </p>
        </header>

        {savedProfiles.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Local profiles
                </p>
                <h2 className="mt-1 font-medium">Use a saved development user</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {savedProfiles.length} saved
              </span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {savedProfiles.map((profile) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                  key={`${profile.workspaceId}:${profile.subject}`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {profile.email || profile.subject}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {roleLabels[profile.role]} · {profile.subject}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      disabled={isPending}
                      onClick={() => activateSavedProfile(profile)}
                      size="sm"
                      type="button"
                    >
                      <LogInIcon />
                      Sign in
                    </Button>
                    <button
                      aria-label={`Remove ${profile.subject}`}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                      onClick={() => removeSavedProfile(profile)}
                      type="button"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <form
            className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"
            onSubmit={handleCreate}
          >
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <UserRoundIcon className="size-4 text-primary" />
                <h2 className="font-medium">Identity</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Role preset
                  <select
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) =>
                      handleRoleChange(event.target.value as WorkspaceRole)
                    }
                    value={role}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Email
                  <input
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    value={email}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Subject
                  <input
                    className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => setSubject(event.target.value)}
                    required
                    value={subject}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Workspace ID
                  <input
                    className="h-10 rounded-lg border border-input bg-background px-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => setWorkspaceId(event.target.value)}
                    required
                    value={workspaceId}
                  />
                </label>
              </div>
            </section>

            <section className="flex flex-col gap-4 border-t border-border pt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRoundIcon className="size-4 text-primary" />
                    <h2 className="font-medium">Workspace permissions</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The selected set is enforced by FastAPI for this token.
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {selectedPermissionCount}/{permissionCatalog.length} selected
                </span>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {permissionCatalog.map(({ description, key, label }) => {
                  const isSelected = permissions.includes(key);
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-primary/40 bg-primary/10"
                          : "border-border bg-background hover:bg-muted/60"
                      }`}
                      key={key}
                      onClick={() => togglePermission(key)}
                      type="button"
                    >
                      <span
                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {isSelected ? <CheckIcon className="size-3" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                          {description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {error ? (
              <p aria-live="polite" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button disabled={isPending} size="lg" type="submit">
              {isPending ? "Signing in…" : "Create profile and sign in"}
            </Button>
          </form>

          <aside className="flex h-fit flex-col gap-5 rounded-2xl border border-border bg-muted/30 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Active profile
              </p>
              {issuedToken ? (
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <p className="font-medium">{issuedToken.email || issuedToken.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {roleLabels[issuedToken.role]} · {issuedToken.subject}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {permissionSummary.map((permission) => (
                      <span
                        className="rounded-full border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground"
                        key={permission}
                      >
                        {permission}
                      </span>
                    ))}
                    {permissionSummary.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No permissions</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(issuedToken.expiresAt).toLocaleTimeString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href="/">
                        <ArrowRightIcon />
                        Open app
                      </Link>
                    </Button>
                    <Button onClick={copyToken} size="sm" type="button" variant="outline">
                      <ClipboardIcon />
                      {copied ? "Copied" : "Copy token"}
                    </Button>
                    <Button onClick={clearToken} size="sm" type="button" variant="ghost">
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  No development profile is active. Create one to make the
                  selected permissions effective in the app.
                </p>
              )}
            </div>
            <div className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              This route and token endpoint are intended for local development
              only. FastAPI rejects the endpoint outside the development
              environment.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
