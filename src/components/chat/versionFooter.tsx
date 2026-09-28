"use client";

import { isAfter } from "date-fns";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, DiffIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { useArtifact } from "@/hooks/useArtifact";
import { requestBackend } from "@/lib/backend/request";
import type { Document } from "@/lib/db/schema";
import { cn, getDocumentTimestampByIndex } from "@/lib/utils";
import { LoaderIcon } from "./icons";

type VersionFooterProps = {
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  documents: Document[] | undefined;
  currentVersionIndex: number;
  mode: "edit" | "diff";
  setMode: Dispatch<SetStateAction<"edit" | "diff">>;
};

export const VersionFooter = ({
  handleVersionChange,
  documents,
  currentVersionIndex,
  mode,
  setMode,
}: VersionFooterProps) => {
  const { artifact } = useArtifact();
  const { t } = useTranslation();

  const { mutate } = useSWRConfig();
  const [isMutating, setIsMutating] = useState(false);

  const isFirst = currentVersionIndex === 0;
  const isLast = documents
    ? currentVersionIndex === documents.length - 1
    : true;
  const handlePrevious = useCallback(() => {
    handleVersionChange("prev");
  }, [handleVersionChange]);

  const handleNext = useCallback(() => {
    handleVersionChange("next");
  }, [handleVersionChange]);

  const handleToggleMode = useCallback(() => {
    setMode(mode === "diff" ? "edit" : "diff");
  }, [mode, setMode]);

  const handleRestore = useCallback(async () => {
    if (!documents) {
      return;
    }

    setIsMutating(true);

    try {
      await mutate(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/document?id=${artifact.documentId}`,
        await requestBackend(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/document?id=${artifact.documentId}&timestamp=${getDocumentTimestampByIndex(
            documents,
            currentVersionIndex
          )}`,
          {
            method: "DELETE",
          }
        ),
        {
          optimisticData: documents
            ? [
                ...documents.filter((document) =>
                  isAfter(
                    new Date(document.createdAt),
                    new Date(
                      getDocumentTimestampByIndex(
                        documents,
                        currentVersionIndex
                      )
                    )
                  )
                ),
              ]
            : [],
        }
      );
    } finally {
      setIsMutating(false);
    }
  }, [artifact.documentId, currentVersionIndex, documents, mutate]);

  const handleLatest = useCallback(() => {
    setMode("edit");
    handleVersionChange("latest");
  }, [handleVersionChange, setMode]);

  if (!documents) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="z-50 flex w-full shrink-0 flex-col gap-2 border-t border-border/60 bg-background/95 px-3 py-2.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-4"
      exit={{ opacity: 0, transition: { duration: 0 } }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between gap-3 sm:justify-start">
        <div className="flex items-center gap-1">
          <button
            aria-label={t("artifacts.viewPreviousVersion")}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 sm:size-8"
            disabled={isFirst}
            onClick={handlePrevious}
            type="button"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <span className="min-w-[5rem] text-center text-xs tabular-nums text-muted-foreground">
            {t("common.versionOf", {
              current: currentVersionIndex + 1,
              total: documents.length,
            })}
          </span>
          <button
            aria-label={t("artifacts.viewNextVersion")}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 sm:size-8"
            disabled={isLast}
            onClick={handleNext}
            type="button"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>

        <button
          className={cn(
            "flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-8",
            mode === "diff" && "bg-muted text-foreground"
          )}
          aria-pressed={mode === "diff"}
          onClick={handleToggleMode}
          title={t("common.showChanges")}
          type="button"
        >
          <DiffIcon className="size-4" />
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          disabled={isMutating}
          onClick={handleRestore}
          type="button"
        >
          {t("common.restore")}
          {isMutating ? (
            <div className="animate-spin">
              <LoaderIcon size={14} />
            </div>
          ) : null}
        </button>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border/70 bg-background px-3.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={handleLatest}
          type="button"
        >
          {t("common.latest")}
        </button>
      </div>
    </motion.div>
  );
};
