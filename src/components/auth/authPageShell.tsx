import { lazy, Suspense, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SparklesIcon } from "lucide-react";
import { Link } from "@/lib/router";

const AuthPreview = lazy(() =>
  import("../chat/preview").then((module) => ({ default: module.Preview }))
);

export function AuthPageShell({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow: string;
}) {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-dvh bg-muted/30 xl:grid-cols-[minmax(30rem,0.8fr)_minmax(0,1.2fr)]">
      <section className="flex min-h-dvh flex-col bg-background px-5 py-6 sm:px-8 sm:py-8 lg:px-12 xl:border-r xl:border-border/70">
        <Link
          aria-label={t("app.name")}
          className="flex w-fit items-center gap-2.5 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
          href="/"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <SparklesIcon aria-hidden="true" className="size-4" />
          </span>
          {t("app.name")}
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8 sm:py-12">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
          {children}
        </div>

        <p className="mx-auto w-full max-w-md border-t border-border/70 pt-4 text-xs leading-5 text-muted-foreground">
          {t("auth.productDescription")}
        </p>
      </section>

      <aside className="hidden min-h-dvh p-3 pl-0 xl:block">
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="h-full min-h-[calc(100dvh-1.5rem)] rounded-lg border border-border/70 bg-card"
            />
          }
        >
          <AuthPreview />
        </Suspense>
      </aside>
    </main>
  );
}
