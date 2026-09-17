export { default as GameLayout } from "./GameLayout.jsx";
export { useTranslation } from "react-i18next";
/**
 * @param {import('../../engine/integratedTransport').PerformanceEvent} _event
 * @returns {Promise<number>}
 */
export async function submitGameMetrics(_event) {
  throw new Error("Authenticated game transport unavailable");
}
