"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  LockKeyholeIcon,
  SaveIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import { type MouseEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  backendQueryKeys,
  useBackendIdentity,
  useBackendMutation,
  useBackendQuery,
} from "@/lib/backend/reactQuery";
import {
  defaultPermissionsByRole,
  type Permission,
  permissionCatalog,
  roleLabels,
  type WorkspaceRole,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Member = {
  effectivePermissions: Permission[];
  email: string;
  id: string;
  name: string | null;
  overrides: { effect: "grant" | "deny"; permission: string }[];
  role: WorkspaceRole;
  status: "active" | "suspended";
  userId: string;
};

type MembersResponse = {
  members: Member[];
  workspace: { id: string; name: string };
};

const roleDescriptions: Record<WorkspaceRole, string> = {
  admin: "Manage members, data, and workspace settings.",
  editor: "Work with knowledge, chats, and documents.",
  owner: "Full control, including workspace ownership.",
  viewer: "Read knowledge and use the assistant.",
};

export function MemberPermissions() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const identity = useBackendIdentity();
  const membersQuery = useBackendQuery<MembersResponse>({
    path: "/api/admin/members",
    queryKey: backendQueryKeys.members(identity),
  });
  const saveMutation = useBackendMutation<
    { member?: Member },
    { memberId: string; permissions: Permission[]; role: WorkspaceRole }
  >({
    mutationKey: ["backend", "user", identity, "members", "update"],
    request: (variables) => ({
      init: {
        body: JSON.stringify(variables),
        method: "PATCH",
      },
      path: "/api/admin/members",
    }),
  });

  const { data, error: queryError, isLoading } = membersQuery;
  const { isPending: isSaving } = saveMutation;
  const loadError = queryError
    ? queryError.status === 403
      ? "You do not have permission to manage members."
      : "Unable to load workspace members."
    : null;

  const selectedMember = data?.members.find(({ id }) => id === selectedId);

  useEffect(() => {
    if (data && !selectedId) {
      setSelectedId(data.members[0]?.id ?? null);
    }
  }, [data, selectedId]);

  useEffect(() => {
    if (!selectedMember) {
      return;
    }
    setRole(selectedMember.role);
    setPermissions(selectedMember.effectivePermissions);
    setIsDirty(false);
  }, [selectedMember]);

  const selectMember = useCallback(
    (memberId: string) => {
      if (isDirty) {
        setPendingMemberId(memberId);
        return;
      }
      setSelectedId(memberId);
    },
    [isDirty]
  );

  const handleMemberClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const { currentTarget } = event;
      const { memberId } = currentTarget.dataset;
      if (memberId) {
        selectMember(memberId);
      }
    },
    [selectMember]
  );

  const discardAndSelectMember = useCallback(() => {
    if (!pendingMemberId) {
      return;
    }
    setIsDirty(false);
    setSelectedId(pendingMemberId);
    setPendingMemberId(null);
  }, [pendingMemberId]);

  const keepEditing = useCallback(() => {
    setPendingMemberId(null);
  }, []);

  const changeRole = useCallback((nextRole: string) => {
    const roleValue = nextRole as WorkspaceRole;
    setRole(roleValue);
    setPermissions([...defaultPermissionsByRole[roleValue]]);
    setIsDirty(true);
  }, []);

  const togglePermission = useCallback((permission: Permission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
    setIsDirty(true);
  }, []);

  const handlePermissionClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const permission = event.currentTarget.dataset.permission as Permission;
      if (permission) {
        togglePermission(permission);
      }
    },
    [togglePermission]
  );

  const save = useCallback(async () => {
    if (!selectedMember) {
      return;
    }

    setError(null);

    try {
      const result = await saveMutation.mutateAsync({
        memberId: selectedMember.id,
        permissions,
        role,
      });
      if (result.member) {
        queryClient.setQueryData<MembersResponse>(
          backendQueryKeys.members(identity),
          (current) =>
            current
              ? {
                  ...current,
                  members: current.members.map((member) =>
                    member.id === result.member?.id ? result.member : member
                  ),
                }
              : current
        );
      }
      setIsDirty(false);
      toast.success("Permissions updated");
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Unable to save permissions.";
      setError(message);
      toast.error(message);
    }
  }, [identity, permissions, queryClient, role, saveMutation, selectedMember]);

  const visibleError = error ?? loadError;

  if (isLoading) {
    return <LoadingState />;
  }

  if (visibleError && !data) {
    return <EmptyState message={visibleError} />;
  }

  if (!data || data.members.length === 0) {
    return <EmptyState message="No workspace members are available yet." />;
  }

  return (
    <main className="min-h-full bg-background px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-border/70 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.18em]">
              <ShieldCheckIcon className="size-4 text-primary" />
              Access control
            </div>
            <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">
              Workspace permissions
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground text-sm leading-6">
              Decide who can work with your knowledge base, conversations, and
              documents. Changes apply to the backend immediately.
            </p>
          </div>
          <Badge className="w-fit gap-1.5 px-3 py-1.5" variant="outline">
            <UsersIcon className="size-3.5" />
            {data.workspace.name}
          </Badge>
        </header>

        {pendingMemberId ? (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>
              Unsaved changes will be discarded if you switch members.
            </span>
            <div className="flex items-center gap-2">
              <Button onClick={keepEditing} size="sm" variant="ghost">
                Keep editing
              </Button>
              <Button
                onClick={discardAndSelectMember}
                size="sm"
                variant="outline"
              >
                Discard changes
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-border/70 bg-card/50 p-2 shadow-sm">
            <div className="px-3 py-3 text-muted-foreground text-xs uppercase tracking-[0.14em]">
              Members · {data.members.length}
            </div>
            <div className="space-y-1">
              {data.members.map((member) => {
                const isSelected = member.id === selectedId;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                    data-member-id={member.id}
                    key={member.id}
                    onClick={handleMemberClick}
                    type="button"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <UserRoundIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-sm">
                        {member.name || member.email}
                      </span>
                      {member.name ? (
                        <span className="block truncate text-muted-foreground text-xs">
                          {member.email}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {roleLabels[member.role]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/50 shadow-sm">
            {selectedMember ? (
              <>
                <div className="flex flex-col gap-5 border-b border-border/70 p-5 md:flex-row md:items-start md:justify-between md:p-7">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-xl tracking-tight">
                        {selectedMember.name || selectedMember.email}
                      </h2>
                      {isDirty ? (
                        <Badge variant="secondary">Unsaved</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {selectedMember.name
                        ? selectedMember.email
                        : "Workspace member"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={changeRole} value={role}>
                      <SelectTrigger aria-label="Member role" className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button disabled={!isDirty || isSaving} onClick={save}>
                      <SaveIcon />
                      {isSaving ? "Saving" : "Save changes"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-8 p-5 md:p-7 xl:grid-cols-[220px_minmax(0,1fr)]">
                  <div>
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <LockKeyholeIcon className="size-4 text-primary" />
                      Role baseline
                    </div>
                    <p className="mt-2 text-muted-foreground text-sm leading-6">
                      {roleDescriptions[role]}
                    </p>
                    <p className="mt-4 text-muted-foreground text-xs leading-5">
                      Individual switches override the baseline for this member.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {permissionCatalog.map(({ description, key, label }) => {
                      const enabled = permissions.includes(key);
                      return (
                        <button
                          aria-pressed={enabled}
                          className={cn(
                            "group flex min-h-20 items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                            enabled
                              ? "border-primary/30 bg-primary/[0.06]"
                              : "border-border/70 bg-background/40 hover:bg-muted/40"
                          )}
                          data-permission={key}
                          key={key}
                          onClick={handlePermissionClick}
                          type="button"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                              enabled
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-transparent group-hover:border-muted-foreground"
                            )}
                          >
                            <CheckIcon className="size-3.5" />
                          </span>
                          <span>
                            <span className="block font-medium text-sm">
                              {label}
                            </span>
                            <span className="mt-1 block text-muted-foreground text-xs leading-5">
                              {description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {visibleError ? (
                  <p className="border-t border-destructive/20 bg-destructive/5 px-5 py-3 text-destructive text-sm md:px-7">
                    {visibleError}
                  </p>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="min-h-full bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-9 w-72 rounded-lg bg-muted" />
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="h-96 rounded-2xl bg-muted/60" />
          <div className="h-96 rounded-2xl bg-muted/60" />
        </div>
      </div>
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <main className="grid min-h-full place-items-center bg-background px-6">
      <div className="max-w-md text-center">
        <ShieldCheckIcon className="mx-auto mb-4 size-8 text-muted-foreground" />
        <h1 className="font-semibold text-xl">Permissions unavailable</h1>
        <p className="mt-2 text-muted-foreground text-sm leading-6">
          {message}
        </p>
      </div>
    </main>
  );
}
