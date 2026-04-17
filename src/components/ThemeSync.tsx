"use client";

import { useEffect } from "react";
import { applyThemeToDocument, readThemePreference } from "@/lib/theme";

/**
 * Applies the user's persisted theme preference after hydration.
 * CSS rules in `src/app/globals.css` read `html[data-theme="..."]`
 * and/or `prefers-color-scheme` for "system" mode.
 */
export default function ThemeSync() {
  useEffect(() => {
    applyThemeToDocument(readThemePreference());
  }, []);

  return null;
}

