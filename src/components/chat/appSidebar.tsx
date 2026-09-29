"use client";

import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import {
  DatabaseIcon,
  MessageSquareIcon,
  PenSquareIcon,
  ShieldCheckIcon,
  TrashIcon,
  UploadCloudIcon,
} from "lucide-react";
import type { User } from "@/lib/auth";
import { Link, usePathname, useRouter } from "@/lib/router";
import { type MouseEvent, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SidebarHistory } from "@/components/chat/sidebarHistory";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  backendQueryKeys,
  useBackendIdentity,
} from "@/lib/backend/reactQuery";
import {
  type ChatHistory,
  type ChatHistoryEntry,
  getLocalChatHistoryQueryKey,
} from "@/lib/backend/chatHistoryCache";
import { requestBackend } from "@/lib/backend/request";
import { getNewChatPath } from "@/lib/utils";
import { getSidebarNavigationItemClassName } from "./sidebarStyles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alertDialog";
import { Spinner } from "../ui/spinner";
import { ProductWordmark } from "@/components/brand/productWordmark";

export function AppSidebar({
  canManageKnowledgeBases,
  canViewPermissions,
  user,
}: {
  canManageKnowledgeBases: boolean;
  canViewPermissions: boolean;
  user: User | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();
  const queryClient = useQueryClient();
  const identity = useBackendIdentity(user?.id);
  const activePathname = pathname.replace(/\/+$/, "") || "/";
  const isNewChatActive = activePathname === "/";
  const isPermissionsActive = activePathname === "/settings/members";
  const isUploadActive = activePathname === "/upload";
  const isKnowledgeBasesActive = activePathname.startsWith(
    "/settings/knowledge-bases"
  );
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const closeMobile = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const handleNewChat = useCallback(() => {
    setOpenMobile(false);
    router.push(getNewChatPath());
  }, [router, setOpenMobile]);

  const handleShowDeleteAllDialog = useCallback(() => {
    setShowDeleteAllDialog(true);
  }, []);

  const handleDeleteAll = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (isDeletingAll) {
      return;
    }

    setIsDeletingAll(true);
    router.replace("/");
    const historyQueryKey = backendQueryKeys.chatHistory(identity);
    queryClient.setQueryData<InfiniteData<ChatHistory>>(
      historyQueryKey,
      (historyData) =>
        historyData
          ? {
              ...historyData,
              pages: historyData.pages.map(() => ({
                chats: [],
                hasMore: false,
              })),
            }
          : historyData
    );
    queryClient.setQueryData<ChatHistoryEntry[]>(
      getLocalChatHistoryQueryKey(historyQueryKey),
      []
    );

    try {
      await requestBackend(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
        method: "DELETE",
      });
      toast.success(t("sidebar.allChatsDeleted"));
      setShowDeleteAllDialog(false);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsDeletingAll(false);
    }
  }, [identity, isDeletingAll, queryClient, router, t]);

  return (
    <>
      <Sidebar
        className="inset-y-2 data-[side=left]:left-2 h-[calc(100dvh-1rem)] **:data-[slot=sidebar-inner]:rounded-l-lg **:data-[slot=sidebar-inner]:rounded-r-none **:data-[slot=sidebar-inner]:border **:data-[slot=sidebar-inner]:border-r-0 **:data-[slot=sidebar-inner]:border-sidebar-border/70 **:data-[slot=sidebar-inner]:shadow-none"
        collapsible="icon"
        variant="sidebar"
      >
        <SidebarHeader className="h-14 shrink-0 justify-center border-b border-sidebar-border/60 px-3 py-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="h-10 gap-2.5 rounded-lg px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                tooltip={t("app.name")}
              >
                <Link aria-label={t("app.name")} href="/" onClick={closeMobile}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-sidebar-primary/10 text-sidebar-primary">
                    <MessageSquareIcon className="size-4" />
                  </span>
                  <span className="min-w-0 truncate text-sm group-data-[collapsible=icon]:hidden">
                    <ProductWordmark />
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    aria-current={isNewChatActive ? "page" : undefined}
                    className={getSidebarNavigationItemClassName(isNewChatActive)}
                    isActive={isNewChatActive}
                    onClick={handleNewChat}
                    tooltip={t("sidebar.newChat")}
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">{t("sidebar.newChat")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {canViewPermissions ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={getSidebarNavigationItemClassName(isPermissionsActive)}
                      isActive={isPermissionsActive}
                      onClick={closeMobile}
                      tooltip={t("sidebar.permissions")}
                    >
                      <Link
                        aria-current={isPermissionsActive ? "page" : undefined}
                        href="/settings/members"
                      >
                        <ShieldCheckIcon className="size-4" />
                        <span className="text-[13px]">{t("sidebar.permissions")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {canManageKnowledgeBases ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={getSidebarNavigationItemClassName(isUploadActive)}
                      isActive={isUploadActive}
                      onClick={closeMobile}
                      tooltip={t("sidebar.upload")}
                    >
                      <Link
                        aria-current={isUploadActive ? "page" : undefined}
                        href="/upload"
                      >
                        <UploadCloudIcon className="size-4" />
                        <span className="text-[13px]">{t("sidebar.upload")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {canManageKnowledgeBases ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={getSidebarNavigationItemClassName(isKnowledgeBasesActive)}
                      isActive={isKnowledgeBasesActive}
                      onClick={closeMobile}
                      tooltip={t("sidebar.knowledgeBases")}
                    >
                      <Link
                        aria-current={isKnowledgeBasesActive ? "page" : undefined}
                        href="/settings/knowledge-bases/files"
                      >
                        <DatabaseIcon className="size-4" />
                        <span className="text-[13px]">{t("sidebar.knowledgeBases")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {user ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="rounded-lg text-sidebar-foreground/40 transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleShowDeleteAllDialog}
                      tooltip={t("sidebar.deleteAll")}
                    >
                      <TrashIcon className="size-4" />
                      <span className="text-[13px]">{t("sidebar.deleteAll")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarHistory user={user} />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sidebar.deleteAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sidebar.deleteAllDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={isDeletingAll} onClick={handleDeleteAll}>
              {isDeletingAll ? <Spinner /> : null}
              {isDeletingAll ? t("common.deleting") : t("common.deleteAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
