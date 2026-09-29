"use client";

import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { usePathname } from "@/lib/router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarUserNav } from "./sidebarUserNav";
import type { User } from "@/lib/auth";

function getPageTitle(pathname: string, t: TFunction) {
  if (pathname === "/") return t("sidebar.newChat");
  if (pathname.startsWith("/chat/")) return t("sidebar.history");
  if (pathname === "/settings/members") return t("sidebar.permissions");
  if (pathname.startsWith("/settings/knowledge-bases")) {
    return t("sidebar.knowledgeBases");
  }
  if (pathname === "/upload") return t("sidebar.upload");
  if (pathname === "/settings/appearance") return t("settings.accentColor");
  if (pathname === "/settings/password") return t("auth.changePassword");
  if (pathname === "/fastapi-test") return t("settings.fastApiConnection");
  return t("app.name");
}

export function WorkspaceHeader({ user }: { user: User | undefined }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-workspace-background px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="size-9 rounded-lg bg-sidebar-primary/10 text-sidebar-primary hover:bg-sidebar-primary/15 hover:text-sidebar-primary" />
        <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
        <h1 className="truncate text-sm font-semibold text-foreground">
          {getPageTitle(pathname, t)}
        </h1>
      </div>
      {user ? <SidebarUserNav placement="header" user={user} /> : null}
    </header>
  );
}
