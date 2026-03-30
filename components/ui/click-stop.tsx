"use client";

import React from "react";

export function ClickStop({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span onClick={(e) => e.stopPropagation()} className={className}>
      {children}
    </span>
  );
}
