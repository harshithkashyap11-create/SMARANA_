import { apiClient } from "../../api/client";
import { db, type CachedMemory, type CachedQuizAttempt } from "../schema";

interface PatientList { results: Array<{ id: string }> }
export interface QuizQuestion { memory_id: string | null; question_type: string; prompt: string; options: string[]; expected_label: string; media_url: string | null }

async function patientId(): Promise<string> {
  const cached = await db.profile.orderBy("refreshedAt").last();
  if (cached) return cached.id;
  const list = await apiClient<PatientList>("/api/v1/patients/", { method: "GET" });
  if (!list.results[0]) throw new Error("Patient profile is unavailable");
  return list.results[0].id;
}

export const memoriesRepository = {
  async list(): Promise<CachedMemory[]> {
    const id = await patientId();
    try {
      const remote = await apiClient<Array<{ id: string; title: string; occasion: string; occurred_on: string | null; place: string; summary: string; people: CachedMemory["people"]; media: CachedMemory["media"] }>>(`/api/v1/patients/${id}/memories/`, { method: "GET" });
      const memories = remote.map((item) => ({ ...item, patientId: id, occurredOn: item.occurred_on }));
      await db.memories.bulkPut(memories);
      return memories;
    } catch { return db.memories.where("patientId").equals(id).toArray(); }
  },
  async get(memoryId: string): Promise<CachedMemory | undefined> {
    const cached = await db.memories.get(memoryId);
    if (cached) return cached;
    return (await this.list()).find((memory) => memory.id === memoryId);
  },
  async nextQuestion(): Promise<QuizQuestion> {
    const id = await patientId();
    return apiClient<QuizQuestion>(`/api/v1/patients/${id}/memory-quiz/next/`, { method: "GET" });
  },
  async saveAttempt(attempt: Omit<CachedQuizAttempt, "patientId">): Promise<void> {
    const id = await patientId();
    await db.quizAttempts.put({ ...attempt, patientId: id });
    try {
      await apiClient(`/api/v1/patients/${id}/memory-quiz/attempts/`, { method: "POST", body: JSON.stringify({ id: attempt.id, memory_id: attempt.memoryId, question_type: attempt.questionType, expected: attempt.expected, given: attempt.given, correct: attempt.correct, attempted_at: attempt.attemptedAt, response_ms: attempt.responseMs, device_updated_at: attempt.attemptedAt, idempotency_key: attempt.idempotencyKey }) });
    } catch { /* The local attempt remains ready for the sync phase. */ }
  },
};
