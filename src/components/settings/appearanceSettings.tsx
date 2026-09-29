"use client";

import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyAccentColor,
  accentColorOptions,
  getStoredAccentColor,
  storeAccentColor,
  type AccentColor,
} from "@/lib/accentColor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SettingsPanel,
  SettingsPanelHeader,
} from "@/components/settings/settingsPage";

export function AppearanceSettings() {
  const { t } = useTranslation();
  const [selectedAccentColor, setSelectedAccentColor] = useState<AccentColor>(
    getStoredAccentColor
  );
  const [appliedAccentColor, setAppliedAccentColor] =
    useState<AccentColor>(getStoredAccentColor);

  useEffect(() => {
    return () => applyAccentColor(getStoredAccentColor());
  }, []);

  const handleAccentColorChange = (accentColor: AccentColor) => {
    setSelectedAccentColor(accentColor);
    applyAccentColor(accentColor);
  };

  const handleApplyAccentColor = () => {
    storeAccentColor(selectedAccentColor);
    setAppliedAccentColor(selectedAccentColor);
  };

  return (
    <SettingsPanel className="max-w-2xl overflow-hidden">
      <SettingsPanelHeader
        className="border-b border-border/60 px-5 py-4 md:px-6"
        description={t("settings.accentColorDescription")}
        title={t("settings.accentColorLabel")}
      />

      <div className="p-5 md:p-6">
        <div
          aria-label={t("settings.accentColorLabel")}
          className="grid grid-cols-2 gap-2 sm:grid-cols-5"
          role="group"
        >
          {accentColorOptions.map((option) => {
            const isSelected = selectedAccentColor === option.value;

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-20 flex-col items-start justify-between gap-3 rounded-lg border border-border/70 bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected &&
                    "border-primary/45 bg-primary/[0.06] ring-1 ring-primary/15"
                )}
                key={option.value}
                onClick={() => handleAccentColorChange(option.value)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="size-5 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                  style={{ backgroundColor: option.swatch }}
                />
                <span className="flex w-full items-center justify-between gap-2 text-xs font-medium">
                  {t(option.labelKey)}
                  {isSelected ? <CheckIcon className="size-3.5" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <section className="mt-6 border-t border-border/60 pt-5">
          <div>
            <h3 className="text-sm font-medium">
              {t("settings.accentColorPreview")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("settings.accentColorPreviewDescription")}
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-primary px-2.5 py-1.5 font-medium text-primary-foreground">
                {t("settings.accentColorPreviewPrimary")}
              </span>
              <span className="rounded-md border border-primary/30 bg-primary/[0.06] px-2.5 py-1.5 font-medium text-primary">
                {t("settings.accentColorPreviewNavigation")}
              </span>
              <span className="text-primary underline decoration-primary/40 underline-offset-4">
                {t("settings.accentColorPreviewSecondary")}
              </span>
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[var(--brand-secondary)]"
              />
            </div>
            <div className="flex justify-end">
              <div className="user-message-bubble max-w-[min(100%,24rem)] rounded-xl border border-border/70 px-3.5 py-2 text-sm leading-6">
                {t("settings.accentColorPreviewMessage")}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 flex justify-end">
          <Button
            disabled={selectedAccentColor === appliedAccentColor}
            onClick={handleApplyAccentColor}
            type="button"
          >
            {t("settings.applyAccentColor")}
          </Button>
        </div>
      </div>
    </SettingsPanel>
  );
}
