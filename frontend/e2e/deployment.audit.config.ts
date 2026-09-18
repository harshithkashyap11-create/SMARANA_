import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["e2e/*.audit.tsx"],
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
