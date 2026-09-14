import type { PropsWithChildren } from "react";

import { AppContext, type AppRole, type RepositoryMap } from "./context";

interface AppContextProviderProps extends PropsWithChildren {
  role?: AppRole;
  repos?: RepositoryMap;
}

export function AppContextProvider({
  children,
  repos = {},
  role,
}: AppContextProviderProps) {
  return (
    <AppContext.Provider value={{ repos, role }}>
      {children}
    </AppContext.Provider>
  );
}
