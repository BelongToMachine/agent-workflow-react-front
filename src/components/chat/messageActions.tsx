import { useQueryClient } from "@tanstack/react-query";
import equal from "fast-deep-equal";
import { memo, useCallback } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import {
  backendQueryKeys,
  useBackendIdentity,
  useBackendMutation,
} from "@/lib/backend/reactQuery";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import {
  MessageAction as Action,
  MessageActions as Actions,
} from "../ai-elements/message";
import { CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";

const feedbackActionClassName =
  "h-8 w-fit rounded-full border-border/50 bg-card/30 px-3 text-xs text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)]";

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  onEdit,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  onEdit?: () => void;
}) {
  const queryClient = useQueryClient();
  const identity = useBackendIdentity();
  const [_, copyToClipboard] = useCopyToClipboard();
  const voteMutation = useBackendMutation<string, { type: "up" | "down" }>({
    mutationKey: ["backend", "user", identity, "vote", chatId, message.id],
    request: ({ type }) => ({
      init: {
        body: JSON.stringify({
          chatId,
          messageId: message.id,
          type,
        }),
        method: "PATCH",
      },
      path: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote`,
    }),
  });

  const textFromParts = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  const handleCopy = useCallback(async () => {
    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success("Copied to clipboard!");
  }, [copyToClipboard, textFromParts]);

  const handleVote = useCallback(
    (type: "up" | "down") => {
      const isUpvoted = type === "up";
      const votePromise = voteMutation.mutateAsync({ type });

      toast.promise(votePromise, {
        error: isUpvoted
          ? "Failed to upvote response."
          : "Failed to downvote response.",
        loading: isUpvoted ? "Upvoting Response..." : "Downvoting Response...",
        success: () => {
          queryClient.setQueryData<Vote[]>(
            backendQueryKeys.chatVotes(identity, chatId),
            (currentVotes = []) => [
              ...currentVotes.filter(
                (currentVote) => currentVote.messageId !== message.id
              ),
              { chatId, isUpvoted, messageId: message.id },
            ]
          );

          return isUpvoted ? "Upvoted Response!" : "Downvoted Response!";
        },
      });
    },
    [chatId, identity, message.id, queryClient, voteMutation]
  );

  const handleUpvote = useCallback(() => handleVote("up"), [handleVote]);
  const handleDownvote = useCallback(() => handleVote("down"), [handleVote]);

  if (isLoading) {
    return null;
  }

  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
        <div className="flex items-center gap-0.5">
          {onEdit ? (
            <Action
              className="size-7 text-muted-foreground/50 hover:text-foreground"
              data-testid="message-edit-button"
              onClick={onEdit}
              tooltip="Edit"
            >
              <PencilEditIcon />
            </Action>
          ) : null}
          <Action
            className="size-7 text-muted-foreground/50 hover:text-foreground"
            onClick={handleCopy}
            tooltip="Copy"
          >
            <CopyIcon />
          </Action>
        </div>
      </Actions>
    );
  }

  return (
    <Actions className="-ml-0.5 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        onClick={handleCopy}
        tooltip="Copy"
      >
        <CopyIcon />
      </Action>

      <Action
        className={feedbackActionClassName}
        data-testid="message-upvote"
        disabled={vote?.isUpvoted || voteMutation.isPending}
        label="Like"
        onClick={handleUpvote}
        size="sm"
        tooltip="Upvote Response"
        variant="outline"
      >
        <ThumbUpIcon />
        Like
      </Action>

      <Action
        className={feedbackActionClassName}
        data-testid="message-downvote"
        disabled={(vote && !vote.isUpvoted) || voteMutation.isPending}
        label="Dislike"
        onClick={handleDownvote}
        size="sm"
        tooltip="Downvote Response"
        variant="outline"
      >
        <ThumbDownIcon />
        Dislike
      </Action>
    </Actions>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    return true;
  }
);
