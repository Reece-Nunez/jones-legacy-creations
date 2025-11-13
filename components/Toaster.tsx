"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#000",
          color: "#fff",
          border: "1px solid #333",
          padding: "16px",
          fontSize: "14px",
        },
        success: {
          iconTheme: {
            primary: "#fff",
            secondary: "#000",
          },
        },
        error: {
          iconTheme: {
            primary: "#fff",
            secondary: "#000",
          },
        },
      }}
    />
  );
}
