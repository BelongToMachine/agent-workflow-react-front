"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2Icon, CircleAlertIcon, RefreshCwIcon, ServerIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  fastApiBrowserBaseUrl,
  isFastApiDirectMode,
  isFastApiProxyMode,
} from "@/lib/backend/mode";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConnectionState =
  | { status: "checking" }
  | { status: "success"; message: string; payload: unknown }
  | { status: "error"; message: string; payload?: unknown };

export function FastApiConnectionTest() {
  const { t } = useTranslation();
  const [connection, setConnection] = useState<ConnectionState>({
    status: "checking",
  });

  const checkConnection = useCallback(async () => {
    setConnection({ status: "checking" });

    try {
      const response = await fetch(
        isFastApiDirectMode
          ? `${fastApiBrowserBaseUrl}/api/v1/healthz`
          : "/api/v1/healthz",
        { cache: "no-store" }
      );
      const payload = await response.json();

      if (!response.ok) {
        setConnection({
          message: isFastApiDirectMode
            ? t("settings.browserCannotConnect")
            : t("settings.proxyCannotConnect"),
          payload,
          status: "error",
        });
        return;
      }

      const isFastApi = isFastApiDirectMode || isFastApiProxyMode;
      setConnection({
        message: isFastApiDirectMode
          ? t("settings.directConnectionSuccess")
          : t("settings.proxyConnectionSuccess"),
        payload,
        status: isFastApi ? "success" : "error",
      });
    } catch {
      setConnection({
        message: t("settings.integrationRequestFailed"),
        status: "error",
      });
    }
  }, [t]);

  const handleCheckConnection = useCallback(() => {
    checkConnection().catch(() => undefined);
  }, [checkConnection]);

  useEffect(() => {
    checkConnection().catch(() => undefined);
  }, [checkConnection]);

  const isSuccess = connection.status === "success";

  return (
    <section className="w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="border-b border-border/70 p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t("settings.backendMigration")}
          </p>
          <Badge className="font-mono" variant="outline">
            <ServerIcon aria-hidden="true" />
            GET /api/v1/healthz
          </Badge>
        </div>
        <h2 className="text-base font-medium tracking-tight text-foreground">
          {t("settings.connectionTestTitle")}
        </h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {t("settings.connectionTestDescription")}
        </p>
      </header>

      <div className="p-4 sm:p-5">
        <div
          aria-live="polite"
          className={cn(
            "flex min-h-14 items-start gap-3 rounded-lg border px-3.5 py-3 text-sm",
            connection.status === "checking"
              ? "border-border bg-muted/60 text-muted-foreground"
              : isSuccess
                ? "border-success/30 bg-success/10 text-foreground"
                : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
          role="status"
        >
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
            {connection.status === "checking" ? (
              <Spinner />
            ) : isSuccess ? (
              <CheckCircle2Icon aria-hidden="true" className="size-4 text-success" />
            ) : (
              <CircleAlertIcon aria-hidden="true" className="size-4" />
            )}
          </span>
          <p className="font-medium leading-5">
            {connection.status === "checking"
              ? t("settings.checkingConnection")
              : connection.message}
          </p>
        </div>

        {connection.status !== "checking" && connection.payload ? (
          <pre
            aria-label={t("settings.connectionTestTitle")}
            className="mt-4 max-h-72 overflow-auto rounded-lg border border-border/70 bg-muted/40 p-3 font-mono text-xs leading-5 text-muted-foreground"
          >
            <code>{JSON.stringify(connection.payload, null, 2)}</code>
          </pre>
        ) : null}
      </div>

      <footer className="flex justify-end border-t border-border/70 bg-muted/15 px-4 py-3 sm:px-5">
        <Button
          disabled={connection.status === "checking"}
          onClick={handleCheckConnection}
          type="button"
          variant="outline"
        >
          <RefreshCwIcon className={cn(connection.status === "checking" && "animate-spin")} />
          {connection.status === "checking" ? t("settings.checkingConnection") : t("settings.retest")}
        </Button>
      </footer>
    </section>
  );
}
