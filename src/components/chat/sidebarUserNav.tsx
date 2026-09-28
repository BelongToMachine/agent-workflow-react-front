"use client";

import {
  ChevronDown,
  ChevronUp,
  LanguagesIcon,
  PaletteIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { User } from "@/lib/auth";
import { useSession } from "@/lib/auth";
import { useApplicationAuth } from "@/lib/auth/applicationAuth";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownMenu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { guestRegex } from "@/lib/constants";
import {
  languageOptions,
  setAppLanguage,
  type AppLanguage,
} from "@/lib/i18n";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";
import { cn } from "@/lib/utils";

function emailToHue(email: string): number {
  let hash = 0;
  for (const char of email) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function SidebarUserNav({
  placement = "sidebar",
  user,
}: {
  placement?: "header" | "sidebar";
  user: User;
}) {
  const { data, status } = useSession();
  const { signOut } = useApplicationAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const isGuest = guestRegex.test(data?.user?.email ?? "");
  const handleThemeSelect = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const handleAuthClick = useCallback(() => {
    if (status === "loading") {
      toast({
        description: t("sidebar.authStatusLoading"),
        type: "error",
      });

      return;
    }

    void signOut();
  }, [signOut, status, t]);

  const handleLanguageChange = useCallback((value: string) => {
    if (value === "en" || value === "zh") {
      void setAppLanguage(value as AppLanguage);
    }
  }, []);

  const currentLanguage: AppLanguage = i18n.language.startsWith("zh")
    ? "zh"
    : "en";
  const isHeader = placement === "header";
  const displayName = isGuest ? t("sidebar.guest") : user.email ?? "";
  const avatar = (
    <span
      aria-hidden="true"
      className="size-6 shrink-0 rounded-full ring-1 ring-border/70"
      style={{
        background: `linear-gradient(135deg, oklch(0.35 0.08 ${emailToHue(user.email ?? "")}), oklch(0.25 0.05 ${emailToHue(user.email ?? "") + 40}))`,
      }}
    />
  );
  const trigger =
    status === "loading" ? (
      isHeader ? (
        <Button
          aria-label={t("common.loadingShort")}
          className="size-9 rounded-lg text-muted-foreground"
          data-testid="user-nav-button"
          disabled
          variant="ghost"
        >
          <span className="size-5 animate-pulse rounded-full bg-muted" />
          <span className="animate-spin">
            <LoaderIcon />
          </span>
        </Button>
      ) : (
        <SidebarMenuButton className="h-10 justify-between rounded-lg bg-transparent text-sidebar-foreground/50 transition-colors duration-150 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
          <div className="flex flex-row items-center gap-2">
            <span className="size-6 animate-pulse rounded-full bg-sidebar-foreground/10" />
            <span className="animate-pulse rounded-md bg-sidebar-foreground/10 text-transparent text-[13px]">
              {t("common.loadingShort")}
            </span>
          </div>
          <span className="animate-spin text-sidebar-foreground/50">
            <LoaderIcon />
          </span>
        </SidebarMenuButton>
      )
    ) : isHeader ? (
      <Button
        aria-label={displayName}
        className="h-9 max-w-48 justify-start gap-2 rounded-lg px-2 text-foreground hover:bg-muted"
        data-testid="user-nav-button"
        variant="ghost"
      >
        {avatar}
        <span className="hidden max-w-32 truncate text-[13px] sm:inline">
          {displayName}
        </span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      </Button>
    ) : (
      <SidebarMenuButton
        className="h-8 rounded-lg bg-transparent px-2 text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        data-testid="user-nav-button"
      >
        {avatar}
        <span className="truncate text-[13px]" data-testid="user-email">
          {displayName}
        </span>
        <ChevronUp className="ml-auto size-3.5 text-sidebar-foreground/50" />
      </SidebarMenuButton>
    );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={isHeader ? "end" : "start"}
        className={cn(
          "rounded-lg border border-border/70 bg-popover shadow-lg",
          isHeader ? "w-56" : "w-(--radix-popper-anchor-width)"
        )}
        data-testid="user-nav-menu"
        side={isHeader ? "bottom" : "top"}
      >
        <DropdownMenuItem
          asChild
          className="cursor-pointer text-[13px]"
          data-testid="user-nav-item-accent-color"
        >
          <Link href="/settings/appearance">
            <PaletteIcon className="size-4" />
            <span>{t("settings.accentColor")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer text-[13px]"
          data-testid="user-nav-item-theme"
          onSelect={handleThemeSelect}
        >
          {resolvedTheme === "light"
            ? t("theme.toggleDark")
            : t("theme.toggleLight")}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LanguagesIcon />
            <span>{t("language.label")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                onValueChange={handleLanguageChange}
                value={currentLanguage}
              >
                {languageOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.code} value={option.code}>
                    {option.code === "en"
                      ? t("language.english")
                      : t("language.chinese")}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild data-testid="user-nav-item-auth">
          <button
            className="w-full cursor-pointer text-[13px]"
            onClick={handleAuthClick}
            type="button"
          >
            {isGuest ? t("sidebar.loginToAccount") : t("sidebar.signOut")}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isHeader) {
    return menu;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>{menu}</SidebarMenuItem>
    </SidebarMenu>
  );
}
