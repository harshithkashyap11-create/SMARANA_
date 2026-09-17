import { create } from "zustand";
export const useCalmStore = create<{
  calmMode: boolean;
  setCalmMode: (value: boolean) => void;
}>((set) => ({
  calmMode: false,
  setCalmMode: (calmMode) => set({ calmMode }),
}));
