import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx,js,jsx}"],
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
