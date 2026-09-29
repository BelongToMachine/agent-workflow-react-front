"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  accentColorOptions,
  getStoredAccentColor,
  storeAccentColor,
  type AccentColor,
} from "@/lib/accentColor";
import { cn } from "@/lib/utils";
import {
  SettingsPanel,
  SettingsPanelHeader,
} from "@/components/settings/settingsPage";

export function AppearanceSettings() {
  const { t } = useTranslation();
  const [selectedAccentColor, setSelectedAccentColor] = useState<AccentColor>(
    getStoredAccentColor
  );

  const handleAccentColorChange = (accentColor: AccentColor) => {
    setSelectedAccentColor(accentColor);
    storeAccentColor(accentColor);
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
                  "flex min-h-20 flex-col items-start justify-between gap-3 rounded-lg border border-border/70 bg-background p-3 text-left transition-colors hover:border-foreground/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected &&
                    "border-foreground/40 bg-muted/60 ring-1 ring-foreground/10"
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
            <div className="flex justify-end">
              <div className="user-message-bubble max-w-[min(100%,24rem)] rounded-xl border border-border/70 px-3.5 py-2 text-sm leading-6">
                {t("settings.accentColorPreviewMessage")}
              </div>
            </div>
          </div>
        </section>
      </div>
    </SettingsPanel>
  );
}
