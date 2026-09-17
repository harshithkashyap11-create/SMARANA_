import { defineConfig } from "orval";

export default defineConfig({
  smarana: {
    input: {
      target: "../backend/schema.yml",
    },
    output: {
      target: "./src/api/generated/smarana.ts",
      schemas: "./src/api/generated/models",
      client: "fetch",
      clean: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: "./src/api/client.ts",
          name: "apiClient",
        },
      },
    },
  },
});
