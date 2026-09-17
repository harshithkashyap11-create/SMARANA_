import type { PerformanceEvent, createIntegratedTransport } from "./engine/integratedTransport";
import type { PrivateImage } from "../shared/ui/PrivateImage";
export interface IntegratedMemoryItem {
  id: string;
  type: string;
  displayName: string;
  imageUrl: string;
  location: string;
  note: string;
  approved?: boolean;
  relationship?: string;
}
/** The host supplies the union of both existing integrated component contracts. */
export interface IntegratedGameProps {
  difficulty: number;
  initialDifficulty: number;
  seed: string;
  rng: () => number;
  speak(text: string): void;
  ddaClient: ReturnType<typeof createIntegratedTransport>;
  submitMetrics: ReturnType<typeof createIntegratedTransport>["submitMetrics"];
  dataProvider: { getItems(): Promise<IntegratedMemoryItem[]> };
  ImageComponent?: typeof PrivateImage;
  onExit(metrics?: PerformanceEvent | null): void;
  onSessionEnd(metrics: PerformanceEvent): void;
  onComplete(metrics: PerformanceEvent): void;
}
