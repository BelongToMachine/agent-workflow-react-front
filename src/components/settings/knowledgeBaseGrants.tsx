"use client";

import {
  DatabaseIcon,
  KeyRoundIcon,
  PlusIcon,
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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineLoadingState } from "@/components/ui/loadingState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { requestBackend } from "@/lib/backend/request";
import { useCurrentUserAccess } from "@/lib/auth/currentUser";
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
  const { t } = useTranslation();
  const { hasPermission } = useCurrentUserAccess();
  const canManageKnowledgeBases = hasPermission("knowledge.manage");
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState("");
  const [subjectType, setSubjectType] = useState<Grant["subjectType"]>("role");
  const [subjectId, setSubjectId] = useState("");
  const [accessLevel, setAccessLevel] = useState<Grant["accessLevel"]>("read");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingGrantId, setDeletingGrantId] = useState<string | null>(null);
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

  const selectKnowledgeBase = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const { knowledgeBaseId } = event.currentTarget.dataset;
      if (knowledgeBaseId) {
        setSelectedKnowledgeBaseId(knowledgeBaseId);
      }
    },
    []
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
      if (!canManageKnowledgeBases) {
        return;
      }
      const normalizedSubjectId = subjectId.trim();
      if (!selectedKnowledgeBaseId || !normalizedSubjectId) {
        setError(t("settings.chooseKnowledgeBaseAndId"));
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
        toast.success(t("settings.knowledgeBaseAccessUpdated"));
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : t("settings.unableToSaveGrant");
        setError(message);
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [
      accessLevel,
      canManageKnowledgeBases,
      selectedKnowledgeBaseId,
      subjectId,
      subjectType,
      t,
    ]
  );

  const deleteGrant = useCallback(async (grantId: string) => {
    if (!canManageKnowledgeBases) {
      return;
    }
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
      toast.success(t("settings.knowledgeBaseAccessRemoved"));
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : t("settings.unableToRemoveGrant");
      setError(message);
      toast.error(message);
    } finally {
      setDeletingGrantId(null);
    }
  }, [canManageKnowledgeBases, t]);

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
    return <InlineLoadingState message={t("common.loading")} />;
  }

  if (error && knowledgeBases.length === 0) {
    return <EmptyState message={error} />;
  }

  return (
    <>
      <header className="mb-5 flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-muted-foreground text-[11px] font-medium uppercase tracking-[0.14em]">
            <ShieldCheckIcon className="size-3.5 text-primary" />
            {t("settings.knowledgeAccess")}
          </div>
          <h2 className="font-semibold text-lg tracking-tight">
            {t("settings.knowledgeGrants")}
          </h2>
          <p className="mt-1 max-w-xl text-muted-foreground text-sm leading-5">
            {t("settings.knowledgeGrantDescription")}
          </p>
        </div>
        <Badge className="w-fit shrink-0 gap-1.5" variant="outline">
          <KeyRoundIcon className="size-3" />
          {t("settings.activeGrants", { count: grants.length })}
        </Badge>
      </header>

      {!canManageKnowledgeBases ? (
        <p className="mb-5 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-muted-foreground text-sm">
          {t("settings.viewKnowledgeAccess")}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <section className="min-w-0 rounded-xl border border-border bg-card p-2">
          <div className="border-b border-border/70 px-3 py-3 text-muted-foreground text-[11px] font-medium uppercase tracking-[0.12em]">
            {t("settings.knowledgeBasesCount", { count: knowledgeBases.length })}
          </div>
          {knowledgeBases.length === 0 ? (
            <p className="px-3 py-6 text-muted-foreground text-sm">
              {t("settings.noKnowledgeBases")}
            </p>
          ) : (
            <div className="space-y-0.5 pt-2">
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
                      "flex w-full items-center gap-3 rounded-md border-l-2 px-2.5 py-2.5 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-muted/70 text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    data-knowledge-base-id={knowledgeBase.knowledgeBaseId}
                    key={knowledgeBase.knowledgeBaseId}
                    onClick={selectKnowledgeBase}
                    type="button"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
                      <DatabaseIcon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-sm">
                        {knowledgeBase.displayName}
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        {t("settings.grantCount", {
                          count,
                          label: count === 1 ? t("common.grant") : t("common.grants"),
                        })}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card">
          {selectedKnowledgeBase ? (
            <>
              <div className="border-b border-border/70 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <DatabaseIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-lg tracking-tight">
                      {selectedKnowledgeBase.displayName}
                    </h2>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {t("settings.restrictedSource")}
                    </p>
                  </div>
                </div>
              </div>

              <form
                className="grid min-w-0 gap-3 border-b border-border/70 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5 xl:grid-cols-[150px_minmax(0,1fr)_150px_auto] xl:items-end"
                onSubmit={saveGrant}
              >
                <div className="grid gap-2">
                  <Label htmlFor="grant-subject-type">
                    {t("settings.subjectType")}
                  </Label>
                  <Select
                    disabled={!canManageKnowledgeBases}
                    onValueChange={handleSubjectTypeChange}
                    value={subjectType}
                  >
                    <SelectTrigger id="grant-subject-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="role">{t("settings.role")}</SelectItem>
                      <SelectItem value="user">{t("settings.userId")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="grant-subject-id">
                    {subjectType === "role"
                      ? t("settings.roleId")
                      : t("settings.userId")}
                  </Label>
                  <Input
                    id="grant-subject-id"
                    onChange={handleSubjectIdChange}
                    disabled={!canManageKnowledgeBases}
                    placeholder={
                      subjectType === "role"
                        ? t("settings.rolePlaceholder")
                        : t("settings.userUuid")
                    }
                    value={subjectId}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="grant-access-level">
                    {t("settings.accessLevel")}
                  </Label>
                  <Select
                    disabled={!canManageKnowledgeBases}
                    onValueChange={handleAccessLevelChange}
                    value={accessLevel}
                  >
                    <SelectTrigger id="grant-access-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">{t("settings.read")}</SelectItem>
                      <SelectItem value="manage">{t("settings.manage")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  disabled={!canManageKnowledgeBases || isSaving}
                  type="submit"
                >
                  {isSaving ? <Spinner /> : <PlusIcon />}
                  {isSaving ? t("common.saving") : t("settings.grantAccess")}
                </Button>
              </form>

              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2 font-medium text-sm">
                  <UsersRoundIcon className="size-4 text-primary" />
                  {t("settings.currentGrants")}
                </div>
                {selectedGrants.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground text-sm">
                    {t("settings.noExplicitGrants")}
                  </div>
                ) : (
                  <div className="divide-y divide-border/70">
                    {selectedGrants.map((grant) => (
                      <div
                        className="flex flex-col gap-3 px-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                        key={grant.grantId}
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                          <Badge className="shrink-0" variant="secondary">
                            {grant.subjectType === "role"
                              ? t("settings.role")
                              : t("settings.user")}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate font-medium text-sm">
                            {grant.subjectId}
                          </span>
                          <Badge variant="outline">
                            {grant.accessLevel === "manage"
                              ? t("settings.manage")
                              : t("settings.read")}
                          </Badge>
                        </div>
                        <Button
                          aria-label={t("settings.removeGrant", {
                            subject: grant.subjectId,
                          })}
                          data-grant-id={grant.grantId}
                          disabled={
                            !canManageKnowledgeBases ||
                            deletingGrantId === grant.grantId
                          }
                          onClick={handleDeleteClick}
                          size="icon-sm"
                          variant="ghost"
                        >
                          {deletingGrantId === grant.grantId ? (
                            <Spinner />
                          ) : (
                            <Trash2Icon />
                          )}
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
            <EmptyState
              message={t("settings.selectKnowledgeBaseToManageAccess")}
            />
          )}
        </section>
      </div>
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border px-5 py-10 text-center">
      <div className="max-w-md">
        <ShieldCheckIcon className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-muted-foreground text-sm leading-6">
          {message}
        </p>
      </div>
    </div>
  );
}
