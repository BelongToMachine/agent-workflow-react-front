"use client";

import { useTranslation } from "react-i18next";
import { KnowledgeBaseGrants } from "@/components/settings/knowledgeBaseGrants";
import { KnowledgeBaseManagement } from "@/components/settings/knowledgeBaseManagement";
import { Link, usePathname } from "@/lib/router";
import { cn } from "@/lib/utils";
import { getKnowledgeBaseWorkspaceSection } from "./knowledgeBaseWorkspaceNavigation";

export function KnowledgeBaseWorkspace() {
  const { t } = useTranslation();
  const activeSection = getKnowledgeBaseWorkspaceSection(usePathname());

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label={t("settings.knowledgeBases")}
        className="flex max-w-full overflow-x-auto border-b border-border"
      >
        <Link
          aria-current={activeSection === "management" ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex min-h-10 shrink-0 items-center justify-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            activeSection === "management"
              ? "border-primary bg-primary/[0.04] text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          href="/settings/knowledge-bases/files"
        >
          {t("settings.knowledgeBaseManagement")}
        </Link>
        <Link
          aria-current={activeSection === "access" ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex min-h-10 shrink-0 items-center justify-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            activeSection === "access"
              ? "border-primary bg-primary/[0.04] text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          href="/settings/knowledge-bases"
        >
          {t("settings.knowledgeBaseAccess")}
        </Link>
      </nav>

      {activeSection === "management" ? (
        <KnowledgeBaseManagement />
      ) : (
        <KnowledgeBaseGrants />
      )}
    </div>
  );
}
