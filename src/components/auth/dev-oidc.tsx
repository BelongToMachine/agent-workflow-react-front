"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type DevOidcStandardScope,
  devOidcStandardScopes,
} from "@/lib/auth/dev-oidc-types";
import {
  type Permission,
  permissionCatalog,
  roleLabels,
  type WorkspaceRole,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

type OidcLoginFormProps = {
  clientId: string;
  clientName: string;
  requestedPermissions: Permission[];
  requestedScopes: DevOidcStandardScope[];
  returnTo: string;
};

export function OidcLoginForm({
  clientId,
  clientName,
  requestedPermissions,
  requestedScopes,
  returnTo,
}: OidcLoginFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setIsPending(true);

      try {
        const result = await signIn("credentials", {
          callbackUrl: returnTo,
          email,
          password,
          redirect: false,
        });

        if (!result?.ok) {
          setError("Invalid email or password.");
          return;
        }

        await update();
        router.replace(returnTo);
        router.refresh();
      } catch {
        setError("Unable to sign in right now.");
      } finally {
        setIsPending(false);
      }
    },
    [email, password, returnTo, router, update]
  );

  const continueAsGuest = useCallback(async () => {
    setError(null);
    setIsPending(true);

    try {
      const result = await signIn("guest", {
        callbackUrl: returnTo,
        redirect: false,
      });

      if (!result?.ok) {
        setError("Guest sign-in is disabled.");
        return;
      }

      await update();
      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("Unable to start a guest session.");
    } finally {
      setIsPending(false);
    }
  }, [returnTo, router, update]);

  const handleEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEmail(event.target.value);
    },
    []
  );

  const handlePasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value);
    },
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <OidcHeader
        clientId={clientId}
        clientName={clientName}
        description="Sign in before choosing which workspace access to share with this local client."
        eyebrow="Development OIDC"
      />

      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.14em]">
          <KeyRoundIcon className="size-3.5 text-primary" />
          Requested access
        </div>
        <ScopeSummary
          permissions={requestedPermissions}
          scopes={requestedScopes}
        />
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="oidc-email">Email</Label>
          <Input
            autoComplete="email"
            autoFocus
            id="oidc-email"
            onChange={handleEmailChange}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="oidc-password">Password</Label>
          <Input
            autoComplete="current-password"
            id="oidc-password"
            onChange={handlePasswordChange}
            placeholder="••••••••"
            required
            type="password"
            value={password}
          />
        </div>
        <Button disabled={isPending} type="submit">
          {isPending ? "Signing in" : "Sign in and continue"}
          <ArrowRightIcon />
        </Button>
        <Button
          disabled={isPending}
          onClick={continueAsGuest}
          type="button"
          variant="outline"
        >
          Continue as development guest
        </Button>
        {error ? (
          <p
            aria-live="polite"
            className="text-center text-destructive text-sm"
          >
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

type OidcConsentScreenProps = {
  actor: {
    email: string;
    isGuest: boolean;
    permissions: Permission[];
    role: WorkspaceRole;
    userId: string;
    workspaceName: string;
  };
  clientId: string;
  clientName: string;
  redirectUri: string;
  requestedPermissions: Permission[];
  requestedScopes: DevOidcStandardScope[];
  state?: string;
};

export function OidcConsentScreen({
  actor,
  clientId,
  clientName,
  redirectUri,
  requestedPermissions,
  requestedScopes,
  state,
}: OidcConsentScreenProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    () =>
      requestedPermissions.filter((permission) =>
        actor.permissions.includes(permission)
      )
  );
  const [selectedScopes, setSelectedScopes] =
    useState<DevOidcStandardScope[]>(requestedScopes);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const availablePermissionKeys = useMemo(
    () => new Set(actor.permissions),
    [actor.permissions]
  );

  const togglePermission = useCallback((permission: Permission) => {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }, []);

  const toggleScope = useCallback((scope: DevOidcStandardScope) => {
    if (scope === "openid") {
      return;
    }

    setSelectedScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope]
    );
  }, []);

  const authorize = useCallback(async () => {
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/dev/oidc/consent", {
        body: JSON.stringify({
          clientId,
          permissions: selectedPermissions,
          redirectUri,
          scopes: selectedScopes,
          state,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as {
        message?: string;
        redirectUrl?: string;
      } | null;

      if (!response.ok || !result?.redirectUrl) {
        throw new Error(result?.message ?? "Unable to authorize this client.");
      }

      window.location.assign(result.redirectUrl);
    } catch (authorizationError) {
      setError(
        authorizationError instanceof Error
          ? authorizationError.message
          : "Unable to authorize this client."
      );
    } finally {
      setIsPending(false);
    }
  }, [clientId, redirectUri, selectedPermissions, selectedScopes, state]);

  const handleScopeClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const scope = event.currentTarget.dataset.scope as DevOidcStandardScope;
      if (scope) {
        toggleScope(scope);
      }
    },
    [toggleScope]
  );

  const handlePermissionClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const permission = event.currentTarget.dataset.permission as Permission;
      if (permission) {
        togglePermission(permission);
      }
    },
    [togglePermission]
  );

  const handleCancel = useCallback(() => {
    window.location.assign("/");
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <OidcHeader
        clientId={clientId}
        clientName={clientName}
        description="Review and choose the access this local client may use for this session."
        eyebrow="Authorize local client"
      />

      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserRoundIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{actor.email}</p>
          <p className="truncate text-muted-foreground text-xs">
            {roleLabels[actor.role]} · {actor.workspaceName}
          </p>
        </div>
        {actor.isGuest ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-700 text-[11px] dark:text-amber-300">
            Guest
          </span>
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-sm">Identity scopes</h2>
            <p className="mt-1 text-muted-foreground text-xs">
              Standard OIDC claims requested by the client.
            </p>
          </div>
          <ShieldCheckIcon className="size-4 text-primary" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {devOidcStandardScopes.map((scope) => {
            const isSelected = selectedScopes.includes(scope);
            const isRequired = scope === "openid";
            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-20 flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors",
                  isSelected
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border/70 bg-card/40 text-muted-foreground hover:bg-muted/60",
                  isRequired && "cursor-default"
                )}
                data-scope={scope}
                disabled={isRequired}
                key={scope}
                onClick={handleScopeClick}
                type="button"
              >
                <span className="flex w-full items-center justify-between gap-2 font-medium text-xs">
                  {scope}
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {isSelected ? <CheckIcon className="size-3" /> : null}
                  </span>
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {isRequired ? "Required for OIDC" : "Optional claim"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-sm">Workspace permissions</h2>
            <p className="mt-1 text-muted-foreground text-xs">
              Only permissions already granted to your account can be shared.
            </p>
          </div>
          <LockKeyholeIcon className="size-4 text-primary" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {permissionCatalog.map(({ description, key, label }) => {
            const isAvailable = availablePermissionKeys.has(key);
            const isSelected = selectedPermissions.includes(key);
            const wasRequested = requestedPermissions.includes(key);
            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  isSelected
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border/70 bg-card/40 text-muted-foreground hover:bg-muted/60",
                  !isAvailable && "cursor-not-allowed opacity-45"
                )}
                data-permission={key}
                disabled={!isAvailable}
                key={key}
                onClick={handlePermissionClick}
                type="button"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {isSelected ? <CheckIcon className="size-3" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium text-xs">
                    {label}
                    {wasRequested ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                        requested
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-muted-foreground text-[11px] leading-4">
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-border/70 pt-5">
        <p className="text-muted-foreground text-xs">
          Callback:{" "}
          <code className="break-all text-foreground/80">{redirectUri}</code>
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={isPending}
            onClick={handleCancel}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button disabled={isPending} onClick={authorize} type="button">
            {isPending ? "Authorizing" : "Authorize access"}
            <ArrowRightIcon />
          </Button>
        </div>
        {error ? (
          <p aria-live="polite" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function OidcHeader({
  clientId,
  clientName,
  description,
  eyebrow,
}: {
  clientId: string;
  clientName: string;
  description: string;
  eyebrow: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.16em]">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheckIcon className="size-3.5" />
        </span>
        {eyebrow}
      </div>
      <h1 className="font-semibold text-2xl tracking-tight">{clientName}</h1>
      <p className="text-muted-foreground text-sm leading-6">{description}</p>
      <p className="font-mono text-muted-foreground text-xs">
        client_id: {clientId}
      </p>
    </div>
  );
}

function ScopeSummary({
  permissions,
  scopes,
}: {
  permissions: Permission[];
  scopes: DevOidcStandardScope[];
}) {
  const labels = permissionCatalog
    .filter(({ key }) => permissions.includes(key))
    .map(({ label }) => label);
  const items = [...scopes, ...labels];

  return items.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          className="rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-muted-foreground text-xs"
          key={item}
        >
          {item}
        </span>
      ))}
    </div>
  ) : (
    <p className="text-muted-foreground text-xs">No scopes requested.</p>
  );
}
