export type ThemePreference = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "scrawl:theme:v1";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(raw)) return raw;
  } catch {
    // Ignore storage errors (private mode, blocked access, etc.)
  }
  return "system";
}

export function setThemePreference(pref: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Ignore storage errors
  }
}

export function applyThemeToDocument(pref: ThemePreference): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}

