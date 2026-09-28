import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function SettingsPage({
  children,
  descriptionKey = "settings.manageDescription",
  titleKey,
}: {
  children: ReactNode;
  descriptionKey?: string;
  titleKey: string;
}) {
  const { t } = useTranslation();

  return (
    <main className="min-h-full bg-background px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="border-b border-border/60 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight">{t(titleKey)}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t(descriptionKey)}
          </p>
        </header>
        {children}
      </div>
    </main>
  );
}

export function SettingsPanel({
  children,
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-border/70 bg-card shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SettingsPanelHeader({
  action,
  className,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-medium tracking-tight">
          {icon ? (
            <span className="shrink-0 text-primary [&_svg]:size-4">{icon}</span>
          ) : null}
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SettingsEmptyState({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section
      aria-live="polite"
      className="grid min-h-64 place-items-center rounded-xl border border-dashed border-border/80 bg-card/50 px-6 py-10 text-center"
      role="status"
    >
      <div className="max-w-md">
        <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
          {icon}
        </span>
        <h2 className="font-medium text-base tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  );
}
