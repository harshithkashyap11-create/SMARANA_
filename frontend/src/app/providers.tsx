import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, type PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";

import { i18n } from "../shared/i18n";
import { LanguageProvider } from "../shared/i18n/LanguageProvider";
import { ThemeProvider } from "../shared/theme/ThemeProvider";
import { AppContextProvider } from "./AppContextProvider";
import { useAuthStore } from "../features/auth/authStore";

export function AppProviders({ children }: PropsWithChildren) {
  const owner = useAuthStore((state) => state.user?.id ?? null);
  // Replace the cache synchronously on account change, before a new dashboard
  // can render data from the previous caregiver/doctor's query keys.
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000, meta: { owner } },
        },
      }),
    [owner],
  );
  useEffect(
    () => () => {
      void queryClient.cancelQueries();
    },
    [queryClient],
  );
  return (
    <LanguageProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider key={owner ?? "signed-out"} client={queryClient}>
          <AppContextProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </AppContextProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </LanguageProvider>
  );
}
