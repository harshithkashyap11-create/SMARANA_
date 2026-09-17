export { gameKeysAllowed } from "./gameContract";
/** Only routes that exist in the patient router. Never accept URLs from a model. */
export const sectionRoutes: Record<string, string> = {
  home: "/patient",
  games: "/patient/games",
  reminders: "/patient/routine",
  routine: "/patient/routine",
  profile: "/patient/settings",
  settings: "/patient/settings",
  progress: "/patient/progress",
  caregiver: "/patient/people",
  people: "/patient/people",
  memories: "/patient/memories",
  medicines: "/patient/medicines",
  "calm-time": "/patient/calm",
  sleep: "/patient/sleep",
};
