"use client";

import { createContext, useContext, useEffect, useState } from "react";

/** null = still loading */
type ConnectionState = boolean | null;

const QBOConnectionContext = createContext<ConnectionState>(null);

export function useQBOConnection(): ConnectionState {
  return useContext(QBOConnectionContext);
}

export function QBOConnectionProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState<ConnectionState>(null);

  useEffect(() => {
    fetch("/api/quickbooks/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, []);

  return (
    <QBOConnectionContext.Provider value={connected}>
      {children}
    </QBOConnectionContext.Provider>
  );
}
