import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";

import { i18n } from "../shared/i18n";
import { ThemeProvider } from "../shared/theme/ThemeProvider";
import { AppContextProvider } from "./AppContextProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AppContextProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AppContextProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
