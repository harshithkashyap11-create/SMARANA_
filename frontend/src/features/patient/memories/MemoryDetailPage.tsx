import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CachedMemory } from "../../../db/schema";
import { useTts } from "../../../shared/hooks/useTts";
import { BigButton, PhotoStrip } from "../../../shared/ui";
import { memoriesRepository } from "../../../db/repo/memories";

export function MemoryDetailPage() {
  const initialMemory = useLocation().state as CachedMemory | null;
  const { memoryId } = useParams();
  const [memory, setMemory] = useState(initialMemory);
  const { t } = useTranslation(); const speak = useTts();
  useEffect(() => { if (!memory && memoryId) void memoriesRepository.get(memoryId).then((item) => setMemory(item ?? null)); }, [memory, memoryId]);
  if (!memory) return <p>{t("memories.loading")}</p>;
  return <article className="space-y-5"><h1 className="text-3xl font-bold">{memory.title}</h1><PhotoStrip label={t("memories.photos")} photos={memory.media} /><p className="text-2xl leading-relaxed">{memory.summary}</p><BigButton onClick={() => speak(memory.summary)}>{t("memories.read")}</BigButton><div className="flex flex-wrap gap-2">{memory.people.map((person) => <span className="rounded-full bg-calm px-4 py-2" key={person.id}>{person.name} · {person.relationship}</span>)}</div></article>;
}
