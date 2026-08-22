"use client";

import { createContext, useContext, useCallback } from "react";
import { QBOConnectionProvider } from "./QBOConnectionContext";
import { useMediaQuery, useStoredValue, writeStoredValue } from "@/lib/hooks/useBrowserStore";

type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "admin-theme";
const THEMES: Theme[] = ["light", "dark", "system"];

const AdminThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

/** Anything unrecognised in storage falls back rather than rendering undefined. */
function parseTheme(stored: string | null): Theme {
  return THEMES.includes(stored as Theme) ? (stored as Theme) : "light";
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  // Both of these are browser state, not React state. Holding them in useState
  // and syncing from a mount effect forced an extra render pass on every load
  // and left `resolved` free to drift out of step with `theme`.
  const theme = parseTheme(useStoredValue(THEME_STORAGE_KEY));
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  // Pure derivation — there is no state here to keep in sync.
  const resolved: "light" | "dark" =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  const setTheme = useCallback((t: Theme) => {
    writeStoredValue(THEME_STORAGE_KEY, t);
  }, []);

  return (
    <AdminThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      <QBOConnectionProvider>
        <div className={resolved === "dark" ? "dark" : undefined}>
          {children}
        </div>
      </QBOConnectionProvider>
    </AdminThemeContext.Provider>
  );
}
