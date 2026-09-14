import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { memoriesRepository, type QuizQuestion } from "../../../../db/repo/memories";
import { BigButton, BreakPrompt, OptionGrid } from "../../../../shared/ui";

export function MemoryQuizPage() {
  const { t } = useTranslation(); const navigate = useNavigate();
  const [question, setQuestion] = useState<QuizQuestion | null>(null); const [feedback, setFeedback] = useState<string | null>(null); const [breakOpen, setBreakOpen] = useState(false);
  const incorrect = useRef(0); const fast = useRef(0); const started = useRef(0);
  const load = () => void memoriesRepository.nextQuestion().then((next) => { setQuestion(next); setFeedback(null); started.current = Date.now(); });
  useEffect(load, []);
  const answer = (given: string) => { if (!question) return; const responseMs = Date.now() - started.current; const correct = given === question.expected_label; incorrect.current = correct ? 0 : incorrect.current + 1; fast.current = responseMs < 700 ? fast.current + 1 : 0; const now = new Date().toISOString(); void memoriesRepository.saveAttempt({ id: crypto.randomUUID(), memoryId: question.memory_id, questionType: question.question_type, expected: question.expected_label, given, correct, attemptedAt: now, responseMs, idempotencyKey: crypto.randomUUID() }); setFeedback(correct ? t("quiz.correct", { label: question.expected_label }) : t("quiz.saved_as", { label: question.expected_label })); if (incorrect.current >= 3 || fast.current >= 3) setBreakOpen(true); else window.setTimeout(load, 2000); };
  return <section className="space-y-5">{question?.media_url ? <img alt="" className="h-56 w-full rounded-card object-cover" src={question.media_url} /> : null}<h1 className="text-3xl font-bold">{feedback ?? (question ? t(`quiz.prompt.${question.question_type}`) : t("memories.loading"))}</h1>{question && !feedback ? <OptionGrid options={question.options.map((label) => ({ label }))} onChoose={(option) => answer(option.label)} /> : null}<BigButton variant="secondary" onClick={() => navigate("/patient/memories")}>{t("quiz.enough")}</BigButton><BreakPrompt open={breakOpen} onBreak={() => navigate("/patient/memories")} onContinue={() => { setBreakOpen(false); load(); }} /></section>;
}
