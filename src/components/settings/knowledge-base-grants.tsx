"use client";

import {
  DatabaseIcon,
  KeyRoundIcon,
  PlusIcon,
  SaveIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UsersRoundIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestBackend } from "@/lib/backend/request";
import { cn } from "@/lib/utils";

type KnowledgeBase = {
  displayName: string;
  knowledgeBaseId: string;
  sourceType?: string;
};

type Grant = {
  accessLevel: "read" | "manage";
  grantId: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  subjectId: string;
  subjectType: "role" | "user";
};

type KnowledgeBaseListResponse = {
  knowledgeBases: KnowledgeBase[];
};

type GrantsResponse = {
  grants: Grant[];
};

export function KnowledgeBaseGrants() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState("");
  const [subjectType, setSubjectType] = useState<Grant["subjectType"]>("role");
  const [subjectId, setSubjectId] = useState("");
  const [accessLevel, setAccessLevel] = useState<Grant["accessLevel"]>("read");
  const [newKnowledgeBaseName, setNewKnowledgeBaseName] = useState("");
  const [editedKnowledgeBaseName, setEditedKnowledgeBaseName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingKnowledgeBase, setIsCreatingKnowledgeBase] = useState(false);
  const [isUpdatingKnowledgeBase, setIsUpdatingKnowledgeBase] = useState(false);
  const [deletingGrantId, setDeletingGrantId] = useState<string | null>(null);
  const [deletingKnowledgeBaseId, setDeletingKnowledgeBaseId] = useState<
    string | null
  >(null);
  const [pendingKnowledgeBaseDelete, setPendingKnowledgeBaseDelete] =
    useState<KnowledgeBase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      requestBackend<KnowledgeBaseListResponse>("/api/knowledge-bases"),
      requestBackend<GrantsResponse>("/api/admin/knowledge-base-grants"),
    ])
      .then(([knowledgeBaseData, grantsData]) => {
        if (cancelled) {
          return;
        }
        setKnowledgeBases(knowledgeBaseData.knowledgeBases);
        setGrants(grantsData.grants);
        setSelectedKnowledgeBaseId(
          knowledgeBaseData.knowledgeBases[0]?.knowledgeBaseId ?? ""
        );
      })
      .catch((loadError: Error) => {
        if (!cancelled) {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedKnowledgeBase = knowledgeBases.find(
    ({ knowledgeBaseId }) => knowledgeBaseId === selectedKnowledgeBaseId
  );
  const selectedGrants = useMemo(
    () =>
      grants.filter(
        ({ knowledgeBaseId }) => knowledgeBaseId === selectedKnowledgeBaseId
      ),
    [grants, selectedKnowledgeBaseId]
  );

  useEffect(() => {
    setEditedKnowledgeBaseName(selectedKnowledgeBase?.displayName ?? "");
  }, [selectedKnowledgeBase]);

  const selectKnowledgeBase = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const { knowledgeBaseId } = event.currentTarget.dataset;
      if (knowledgeBaseId) {
        setSelectedKnowledgeBaseId(knowledgeBaseId);
      }
    },
    []
  );

  const handleNewKnowledgeBaseNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setNewKnowledgeBaseName(event.target.value);
    },
    []
  );

  const handleEditedKnowledgeBaseNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEditedKnowledgeBaseName(event.target.value);
    },
    []
  );

  const createKnowledgeBase = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const displayName = newKnowledgeBaseName.trim();
      if (!displayName) {
        setError("Enter a name for the new knowledge base.");
        return;
      }

      setIsCreatingKnowledgeBase(true);
      setError(null);
      try {
        const createdKnowledgeBase = await requestBackend<KnowledgeBase>(
          "/api/knowledge-bases",
          {
            body: JSON.stringify({ displayName, sourceType: "manual" }),
            method: "POST",
          }
        );
        setKnowledgeBases((current) => [createdKnowledgeBase, ...current]);
        setSelectedKnowledgeBaseId(createdKnowledgeBase.knowledgeBaseId);
        setNewKnowledgeBaseName("");
        toast.success("Knowledge base created");
      } catch (createError) {
        const message =
          createError instanceof Error
            ? createError.message
            : "Unable to create this knowledge base.";
        setError(message);
        toast.error(message);
      } finally {
        setIsCreatingKnowledgeBase(false);
      }
    },
    [newKnowledgeBaseName]
  );

  const renameKnowledgeBase = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const displayName = editedKnowledgeBaseName.trim();
      if (!selectedKnowledgeBaseId || !displayName) {
        setError("Enter a name for this knowledge base.");
        return;
      }

      setIsUpdatingKnowledgeBase(true);
      setError(null);
      try {
        const updatedKnowledgeBase = await requestBackend<KnowledgeBase>(
          `/api/knowledge-bases/${encodeURIComponent(selectedKnowledgeBaseId)}`,
          {
            body: JSON.stringify({
              displayName,
              sourceType: selectedKnowledgeBase?.sourceType ?? "manual",
            }),
            method: "PATCH",
          }
        );
        setKnowledgeBases((current) =>
          current.map((knowledgeBase) =>
            knowledgeBase.knowledgeBaseId ===
            updatedKnowledgeBase.knowledgeBaseId
              ? { ...knowledgeBase, ...updatedKnowledgeBase }
              : knowledgeBase
          )
        );
        setEditedKnowledgeBaseName(updatedKnowledgeBase.displayName);
        toast.success("Knowledge base renamed");
      } catch (updateError) {
        const message =
          updateError instanceof Error
            ? updateError.message
            : "Unable to rename this knowledge base.";
        setError(message);
        toast.error(message);
      } finally {
        setIsUpdatingKnowledgeBase(false);
      }
    },
    [editedKnowledgeBaseName, selectedKnowledgeBase, selectedKnowledgeBaseId]
  );

  const deleteKnowledgeBase = useCallback(async () => {
    if (!pendingKnowledgeBaseDelete) {
      return;
    }

    const { knowledgeBaseId } = pendingKnowledgeBaseDelete;
    setDeletingKnowledgeBaseId(knowledgeBaseId);
    setError(null);
    try {
      await requestBackend(
        `/api/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`,
        { method: "DELETE" }
      );

      const remainingKnowledgeBases = knowledgeBases.filter(
        ({ knowledgeBaseId: id }) => id !== knowledgeBaseId
      );
      setKnowledgeBases(remainingKnowledgeBases);
      setSelectedKnowledgeBaseId(
        remainingKnowledgeBases[0]?.knowledgeBaseId ?? ""
      );
      setGrants((current) =>
        current.filter(({ knowledgeBaseId: id }) => id !== knowledgeBaseId)
      );
      setPendingKnowledgeBaseDelete(null);
      toast.success("Knowledge base deleted");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this knowledge base.";
      setError(message);
      toast.error(message);
    } finally {
      setDeletingKnowledgeBaseId(null);
    }
  }, [knowledgeBases, pendingKnowledgeBaseDelete]);

  const requestKnowledgeBaseDelete = useCallback(() => {
    if (selectedKnowledgeBase) {
      setPendingKnowledgeBaseDelete(selectedKnowledgeBase);
    }
  }, [selectedKnowledgeBase]);

  const handleKnowledgeBaseDeleteDialogChange = useCallback(
    (open: boolean) => {
      if (!open && !deletingKnowledgeBaseId) {
        setPendingKnowledgeBaseDelete(null);
      }
    },
    [deletingKnowledgeBaseId]
  );

  const handleConfirmKnowledgeBaseDelete = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      await deleteKnowledgeBase();
    },
    [deleteKnowledgeBase]
  );

  const handleSubjectTypeChange = useCallback((value: string) => {
    if (value === "role" || value === "user") {
      setSubjectType(value);
    }
  }, []);

  const handleAccessLevelChange = useCallback((value: string) => {
    if (value === "read" || value === "manage") {
      setAccessLevel(value);
    }
  }, []);

  const handleSubjectIdChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSubjectId(event.target.value);
    },
    []
  );

  const saveGrant = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const normalizedSubjectId = subjectId.trim();
      if (!selectedKnowledgeBaseId || !normalizedSubjectId) {
        setError("Choose a knowledge base and enter a user or role ID.");
        return;
      }

      setIsSaving(true);
      setError(null);
      try {
        const payload = await requestBackend<{ grant?: Grant }>(
          "/api/admin/knowledge-base-grants",
          {
            body: JSON.stringify({
              accessLevel,
              knowledgeBaseId: selectedKnowledgeBaseId,
              subjectId: normalizedSubjectId,
              subjectType,
            }),
            method: "PUT",
          }
        );
        if (payload.grant) {
          const nextGrant = payload.grant;
          setGrants((current) => {
            const index = current.findIndex(
              ({ grantId }) => grantId === nextGrant.grantId
            );
            if (index === -1) {
              return [nextGrant, ...current];
            }
            return current.map((grant, grantIndex) =>
              grantIndex === index ? nextGrant : grant
            );
          });
        }
        setSubjectId("");
        toast.success("Knowledge base access updated");
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : "Unable to save this grant.";
        setError(message);
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [accessLevel, selectedKnowledgeBaseId, subjectId, subjectType]
  );

  const deleteGrant = useCallback(async (grantId: string) => {
    setDeletingGrantId(grantId);
    setError(null);
    try {
      await requestBackend(
        `/api/admin/knowledge-base-grants/${encodeURIComponent(grantId)}`,
        { method: "DELETE" }
      );
      setGrants((current) =>
        current.filter(({ grantId: id }) => id !== grantId)
      );
      toast.success("Knowledge base access removed");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to remove this grant.";
      setError(message);
      toast.error(message);
    } finally {
      setDeletingGrantId(null);
    }
  }, []);

  const handleDeleteClick = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const { grantId } = event.currentTarget.dataset;
      if (grantId) {
        await deleteGrant(grantId);
      }
    },
    [deleteGrant]
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error && knowledgeBases.length === 0) {
    return <EmptyState message={error} />;
  }

  return (
    <main className="min-h-full bg-background px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-border/70 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.18em]">
              <ShieldCheckIcon className="size-4 text-primary" />
              Knowledge access
            </div>
            <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">
              Knowledge base grants
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground text-sm leading-6">
              Give a specific user or workspace role read or manage access to a
              knowledge base. FastAPI enforces these grants on every list and
              search request.
            </p>
          </div>
          <Badge className="w-fit gap-1.5 px-3 py-1.5" variant="outline">
            <KeyRoundIcon className="size-3.5" />
            {grants.length} active grants
          </Badge>
        </header>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-border/70 bg-card/50 p-2 shadow-sm">
            <div className="px-3 py-3 text-muted-foreground text-xs uppercase tracking-[0.14em]">
              Knowledge bases · {knowledgeBases.length}
            </div>
            <form
              className="flex gap-2 border-b border-border/70 px-2 pb-3"
              onSubmit={createKnowledgeBase}
            >
              <Label className="sr-only" htmlFor="new-knowledge-base-name">
                New knowledge base name
              </Label>
              <Input
                className="min-w-0"
                id="new-knowledge-base-name"
                onChange={handleNewKnowledgeBaseNameChange}
                placeholder="New knowledge base"
                value={newKnowledgeBaseName}
              />
              <Button
                aria-label="Create knowledge base"
                disabled={isCreatingKnowledgeBase}
                size="icon-sm"
                type="submit"
              >
                <PlusIcon />
              </Button>
            </form>
            {knowledgeBases.length === 0 ? (
              <p className="px-3 py-6 text-muted-foreground text-sm">
                No knowledge bases are available yet.
              </p>
            ) : (
              <div className="space-y-1">
                {knowledgeBases.map((knowledgeBase) => {
                  const isSelected =
                    knowledgeBase.knowledgeBaseId === selectedKnowledgeBaseId;
                  const count = grants.filter(
                    ({ knowledgeBaseId }) =>
                      knowledgeBaseId === knowledgeBase.knowledgeBaseId
                  ).length;
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        isSelected
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                      data-knowledge-base-id={knowledgeBase.knowledgeBaseId}
                      key={knowledgeBase.knowledgeBaseId}
                      onClick={selectKnowledgeBase}
                      type="button"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <DatabaseIcon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-sm">
                          {knowledgeBase.displayName}
                        </span>
                        <span className="block text-muted-foreground text-xs">
                          {count} {count === 1 ? "grant" : "grants"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/50 shadow-sm">
            {selectedKnowledgeBase ? (
              <>
                <div className="border-b border-border/70 p-5 md:p-7">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <DatabaseIcon className="size-5" />
                      </span>
                      <div>
                        <h2 className="font-semibold text-xl tracking-tight">
                          {selectedKnowledgeBase.displayName}
                        </h2>
                        <p className="mt-1 text-muted-foreground text-sm">
                          Only matching user and role grants can read this
                          restricted source.
                        </p>
                      </div>
                    </div>
                    <form
                      className="flex flex-col gap-2 sm:flex-row"
                      onSubmit={renameKnowledgeBase}
                    >
                      <Label className="sr-only" htmlFor="knowledge-base-name">
                        Knowledge base name
                      </Label>
                      <Input
                        className="sm:max-w-sm"
                        id="knowledge-base-name"
                        onChange={handleEditedKnowledgeBaseNameChange}
                        value={editedKnowledgeBaseName}
                      />
                      <Button disabled={isUpdatingKnowledgeBase} type="submit">
                        <SaveIcon />
                        {isUpdatingKnowledgeBase ? "Saving" : "Save name"}
                      </Button>
                      <Button
                        disabled={deletingKnowledgeBaseId !== null}
                        onClick={requestKnowledgeBaseDelete}
                        type="button"
                        variant="destructive"
                      >
                        <Trash2Icon />
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>

                <form
                  className="grid gap-4 border-b border-border/70 p-5 md:grid-cols-[130px_minmax(0,1fr)_130px_auto] md:items-end md:p-7"
                  onSubmit={saveGrant}
                >
                  <div className="grid gap-2">
                    <Label htmlFor="grant-subject-type">Subject type</Label>
                    <Select
                      onValueChange={handleSubjectTypeChange}
                      value={subjectType}
                    >
                      <SelectTrigger id="grant-subject-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="role">Role</SelectItem>
                        <SelectItem value="user">User ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="grant-subject-id">
                      {subjectType === "role" ? "Role ID" : "User ID"}
                    </Label>
                    <Input
                      id="grant-subject-id"
                      onChange={handleSubjectIdChange}
                      placeholder={
                        subjectType === "role" ? "contractor" : "user UUID"
                      }
                      value={subjectId}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="grant-access-level">Access</Label>
                    <Select
                      onValueChange={handleAccessLevelChange}
                      value={accessLevel}
                    >
                      <SelectTrigger id="grant-access-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="manage">Manage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button disabled={isSaving} type="submit">
                    <PlusIcon />
                    {isSaving ? "Saving" : "Grant access"}
                  </Button>
                </form>

                <div className="p-5 md:p-7">
                  <div className="mb-4 flex items-center gap-2 font-medium text-sm">
                    <UsersRoundIcon className="size-4 text-primary" />
                    Current grants
                  </div>
                  {selectedGrants.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-center text-muted-foreground text-sm">
                      No explicit grants. Workspace-level members can still use
                      this knowledge base.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGrants.map((grant) => (
                        <div
                          className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          key={grant.grantId}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Badge variant="secondary">
                              {grant.subjectType === "role" ? "Role" : "User"}
                            </Badge>
                            <span className="truncate font-medium text-sm">
                              {grant.subjectId}
                            </span>
                            <Badge variant="outline">
                              {grant.accessLevel === "manage"
                                ? "Manage"
                                : "Read"}
                            </Badge>
                          </div>
                          <Button
                            aria-label={`Remove ${grant.subjectId} grant`}
                            data-grant-id={grant.grantId}
                            disabled={deletingGrantId === grant.grantId}
                            onClick={handleDeleteClick}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {error ? (
                  <p className="border-t border-destructive/20 bg-destructive/5 px-5 py-3 text-destructive text-sm md:px-7">
                    {error}
                  </p>
                ) : null}
              </>
            ) : (
              <EmptyState message="Select a knowledge base to manage access." />
            )}
          </section>
        </div>
      </div>

      <AlertDialog
        onOpenChange={handleKnowledgeBaseDeleteDialogChange}
        open={pendingKnowledgeBaseDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this knowledge base?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingKnowledgeBaseDelete
                ? `${pendingKnowledgeBaseDelete.displayName}, its grants, files, and processed chunks will be permanently removed.`
                : "The knowledge base and its related data will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingKnowledgeBaseId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingKnowledgeBaseId !== null}
              onClick={handleConfirmKnowledgeBaseDelete}
              variant="destructive"
            >
              {deletingKnowledgeBaseId ? "Deleting" : "Delete knowledge base"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="min-h-full bg-background px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-28 rounded-2xl bg-muted/50" />
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="h-80 rounded-2xl bg-muted/50" />
          <div className="h-80 rounded-2xl bg-muted/50" />
        </div>
      </div>
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <main className="flex min-h-full items-center justify-center bg-background px-4 py-10">
      <div className="max-w-md rounded-2xl border border-border/70 bg-card/50 px-6 py-8 text-center shadow-sm">
        <ShieldCheckIcon className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-muted-foreground text-sm leading-6">
          {message}
        </p>
      </div>
    </main>
  );
}
