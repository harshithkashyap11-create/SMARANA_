import { createContext, useContext } from "react";

export type AppRole = "patient" | "caregiver" | "doctor" | "admin";
export type RepositoryMap = Readonly<Record<string, unknown>>;

export interface AppContextValue {
  role?: AppRole;
  repos: RepositoryMap;
}

export const AppContext = createContext<AppContextValue>({ repos: {} });

export function useAppContext() {
  return useContext(AppContext);
}
