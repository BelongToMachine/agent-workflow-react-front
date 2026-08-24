import { logtoAppId } from "./logtoConfig";

export function clearLogtoBrowserStorage() {
  if (typeof window === "undefined" || !logtoAppId) {
    return;
  }

  const prefixes = [`logto:${logtoAppId}`, `logto_cache:${logtoAppId}`];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    let keys: string[] = [];
    try {
      keys = Object.keys(storage);
    } catch {
      continue;
    }

    for (const key of keys) {
      if (
        prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))
      ) {
        try {
          storage.removeItem(key);
        } catch {
          // Continue with the other storage key and storage area.
        }
      }
    }
  }
}
