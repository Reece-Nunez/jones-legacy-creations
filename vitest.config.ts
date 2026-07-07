import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the "@/*" tsconfig path alias natively (no extra plugin needed).
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // Scope to our own unit tests; keeps stale copies under .claude/worktrees out.
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
