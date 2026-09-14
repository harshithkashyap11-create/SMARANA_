import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";

import { AppContextProvider } from "../app/AppContextProvider";
import { type AppRole, type RepositoryMap } from "../app/context";
import { i18n } from "../shared/i18n";
import { LanguageProvider } from "../shared/i18n/LanguageProvider";
import { ThemeProvider } from "../shared/theme/ThemeProvider";

interface ProviderOptions extends Omit<RenderOptions, "wrapper"> {
  repos?: RepositoryMap;
  role?: AppRole;
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { repos = {}, role, route = "/", ...options }: ProviderOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return (
    <LanguageProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <AppContextProvider repos={repos} role={role}>
            <MemoryRouter
              initialEntries={[route]}
              future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
            >
              <ThemeProvider>{children}</ThemeProvider>
            </MemoryRouter>
          </AppContextProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </LanguageProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
