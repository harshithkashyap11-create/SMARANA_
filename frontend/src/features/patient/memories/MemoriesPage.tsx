import { PrivateImage } from "../../../shared/ui/PrivateImage";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { memoriesRepository } from "../../../db/repo/memories";
import type { CachedMemory } from "../../../db/schema";
import { Card } from "../../../shared/ui";

export function MemoriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [memories, setMemories] = useState<CachedMemory[] | null>(null);
  useEffect(() => { void memoriesRepository.list().then(setMemories).catch(() => setMemories([])); }, []);
  if (!memories) return <p>{t("memories.loading")}</p>;
  return <section className="space-y-4"><h1 className="text-3xl font-bold">{t("memories.title")}</h1><button className="min-h-touch w-full rounded-card bg-primary px-4 font-bold text-primary-text" type="button" onClick={() => void navigate("/patient/memories/quiz")}>{t("quiz.start")}</button>{memories.length ? memories.map((memory) => <button className="block min-h-touch w-full text-left" key={memory.id} type="button" onClick={() => void navigate(`/patient/memories/${memory.id}`)}><Card><div className="flex gap-4">{memory.media[0]?.url ? <PrivateImage alt="" className="h-24 w-24 rounded-card object-cover" src={memory.media[0].url} /> : null}<div><span className="text-2xl font-bold">{memory.title}</span><p>{memory.occasion} · {memory.occurredOn}</p></div></div></Card></button>) : <p>{t("memories.empty")}</p>}</section>;
}
