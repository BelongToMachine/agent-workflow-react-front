"use client";

import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { isValidElement, lazy, Suspense } from "react";

const DeferredCodeBlock = lazy(() =>
  import("./codeBlock").then(({ CodeBlock }) => ({ default: CodeBlock }))
);

function ToolCodeBlock({ code }: { code: string }) {
  return (
    <Suspense
      fallback={<div className="min-h-20 animate-pulse rounded-md bg-muted" />}
    >
      <DeferredCodeBlock code={code} language="json" />
    </Suspense>
  );
}

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      "group not-prose mb-4 w-full overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-sm",
      className
    )}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

const statusLabels: Record<ToolPart["state"], string> = {
  "approval-requested": "tools.awaitingApproval",
  "approval-responded": "tools.responded",
  "input-available": "tools.running",
  "input-streaming": "tools.pending",
  "output-available": "tools.completed",
  "output-denied": "tools.denied",
  "output-error": "tools.error",
};

const statusIcons: Record<ToolPart["state"], ReactNode> = {
  "approval-requested": <ClockIcon className="size-4 text-amber-600 dark:text-amber-400" />,
  "approval-responded": <CheckCircleIcon className="size-4 text-primary" />,
  "input-available": <ClockIcon className="size-4 animate-pulse text-primary" />,
  "input-streaming": <CircleIcon className="size-4" />,
  "output-available": <CheckCircleIcon className="size-4 text-emerald-600 dark:text-emerald-400" />,
  "output-denied": <XCircleIcon className="size-4 text-amber-600 dark:text-amber-400" />,
  "output-error": <XCircleIcon className="size-4 text-destructive" />,
};

export const getStatusBadge = (
  status: ToolPart["state"],
  t: (key: string) => string
) => (
  <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
    {statusIcons[status]}
    {t(statusLabels[status])}
  </Badge>
);

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const { t } = useTranslation();
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2">
        <WrenchIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium text-sm">{title ?? derivedName}</span>
        <span className="shrink-0">{getStatusBadge(state, t)}</span>
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-4 border-t border-border/60 bg-background/70 p-3.5 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in sm:p-4",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => {
  const { t } = useTranslation();

  return (
    <div className={cn("space-y-2 overflow-hidden", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {t("common.parameters")}
      </h4>
      <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30">
        <ToolCodeBlock code={JSON.stringify(input, null, 2)} />
      </div>
    </div>
  );
};

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  const { t } = useTranslation();
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <ToolCodeBlock code={JSON.stringify(output, null, 2)} />
    );
  } else if (typeof output === "string") {
    Output = <ToolCodeBlock code={output} />;
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? t("common.error") : t("common.result")}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-lg border border-border/60 bg-muted/20 text-xs [&_table]:w-full",
          errorText && "bg-destructive/10 text-destructive"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
