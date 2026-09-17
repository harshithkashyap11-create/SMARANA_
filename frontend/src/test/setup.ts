import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { useThemeStore } from "../shared/theme/store";

afterEach(() => {
  cleanup();
  useThemeStore.setState({ theme: "light", fontScale: 1 });
});
