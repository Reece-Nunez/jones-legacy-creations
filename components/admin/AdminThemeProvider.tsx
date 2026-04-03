"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

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

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("admin-theme") as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  useEffect(() => {
    if (theme === "system") {
      setResolved(getSystemTheme());
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => setResolved(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      setResolved(theme);
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("admin-theme", t);
  }, []);

  return (
    <AdminThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      <div className={resolved === "dark" ? "dark" : undefined}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}
