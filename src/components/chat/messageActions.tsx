import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import type { ChatMessage } from "@/lib/types";
import {
  MessageAction as Action,
  MessageActions as Actions,
} from "../ai-elements/message";
import { CopyIcon, PencilEditIcon } from "./icons";

export function PureMessageActions({
  message,
  isLoading,
  onEdit,
}: {
  message: ChatMessage;
  isLoading: boolean;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const [_, copyToClipboard] = useCopyToClipboard();

  const textFromParts = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  const handleCopy = useCallback(async () => {
    if (!textFromParts) {
      toast.error(t("chat.noTextToCopy"));
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success(t("common.copied"));
  }, [copyToClipboard, t, textFromParts]);

  if (isLoading) {
    return null;
  }

  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end opacity-100 transition-opacity duration-150 focus-within:opacity-100 md:opacity-0 md:group-hover/message:opacity-100">
        <div className="flex items-center gap-0.5">
          {onEdit ? (
            <Action
              className="size-10 text-muted-foreground/50 hover:text-foreground md:size-7"
              data-testid="message-edit-button"
              onClick={onEdit}
              tooltip={t("common.edit")}
            >
              <PencilEditIcon />
            </Action>
          ) : null}
          <Action
            className="size-10 text-muted-foreground/50 hover:text-foreground md:size-7"
            onClick={handleCopy}
            tooltip={t("common.copy")}
          >
            <CopyIcon />
          </Action>
        </div>
      </Actions>
    );
  }

  return (
    <Actions className="-ml-0.5 opacity-100 transition-opacity duration-150 focus-within:opacity-100 md:opacity-0 md:group-hover/message:opacity-100">
      <Action
        className="size-10 text-muted-foreground/50 hover:text-foreground md:size-7"
        onClick={handleCopy}
        tooltip={t("common.copy")}
      >
        <CopyIcon />
      </Action>

    </Actions>
  );
}

export const MessageActions = memo(PureMessageActions);
