import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { initialArtifactData, useArtifact } from "@/hooks/useArtifact";
import { CrossIcon } from "./icons";

function PureArtifactCloseButton() {
  const { t } = useTranslation();
  const { setArtifact } = useArtifact();
  const handleClick = useCallback(() => {
    setArtifact((currentArtifact) =>
      currentArtifact.status === "streaming"
        ? {
            ...currentArtifact,
            isVisible: false,
          }
        : { ...initialArtifactData, status: "idle" }
    );
  }, [setArtifact]);

  return (
    <button
      className="group flex size-10 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border/70 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 md:size-8"
      data-testid="artifact-close-button"
      aria-label={t("common.close")}
      onClick={handleClick}
      type="button"
    >
      <CrossIcon size={16} />
    </button>
  );
}

export const ArtifactCloseButton = memo(PureArtifactCloseButton, () => true);
