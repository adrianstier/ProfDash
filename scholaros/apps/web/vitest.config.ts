import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    setupFiles: ["__tests__/setup.ts"],
    environmentMatchGlobs: [
      // Schema tests can use node environment (faster)
      ["__tests__/schemas/**/*.test.ts", "node"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@scholaros/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
