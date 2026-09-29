import { cn } from "@/lib/utils";

export function getSidebarNavigationItemClassName(isActive: boolean) {
  return cn(
    "h-8 rounded-lg border text-[13px] transition-colors duration-150",
    isActive
        ? "border-sidebar-border/70 bg-sidebar-accent text-sidebar-accent-foreground"
        : "border-transparent text-sidebar-foreground/60 hover:border-sidebar-border/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
  );
}
