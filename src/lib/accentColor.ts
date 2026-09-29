export const ACCENT_COLOR_STORAGE_KEY = "asianode-accent-color";
export const DEFAULT_ACCENT_COLOR: AccentColor = "sage";

export const accentColorValues = [
  "neutral",
  "blue",
  "sage",
  "amber",
  "rose",
] as const;

export type AccentColor = (typeof accentColorValues)[number];

export const accentColorOptions: Array<{
  labelKey: string;
  swatch: string;
  value: AccentColor;
}> = [
  {
    labelKey: "settings.accentColorNeutral",
    swatch: "oklch(0.76 0 0)",
    value: "neutral",
  },
  {
    labelKey: "settings.accentColorBlue",
    swatch: "oklch(0.57 0.15 245)",
    value: "blue",
  },
  {
    labelKey: "settings.accentColorSage",
    swatch: "hsl(191 92% 26%)",
    value: "sage",
  },
  {
    labelKey: "settings.accentColorAmber",
    swatch: "hsl(38 92% 33%)",
    value: "amber",
  },
  {
    labelKey: "settings.accentColorRose",
    swatch: "oklch(0.58 0.15 20)",
    value: "rose",
  },
];

export function isAccentColor(value: string | null): value is AccentColor {
  return value !== null && accentColorValues.includes(value as AccentColor);
}

export function getStoredAccentColor(): AccentColor {
  if (typeof window === "undefined") {
    return DEFAULT_ACCENT_COLOR;
  }

  try {
    const saved = window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
    return isAccentColor(saved) ? saved : DEFAULT_ACCENT_COLOR;
  } catch {
    return DEFAULT_ACCENT_COLOR;
  }
}

export function applyAccentColor(accentColor: AccentColor) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.accentColor = accentColor;
  }
}

export function storeAccentColor(accentColor: AccentColor) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, accentColor);
    } catch {
      // The visual preference still applies if storage is unavailable.
    }
  }

  applyAccentColor(accentColor);
}
