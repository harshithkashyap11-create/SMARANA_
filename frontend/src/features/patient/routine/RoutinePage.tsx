import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  routineRepository,
  type Reminder,
  type ReminderAction,
  type RoutineRepository,
} from "../../../db/repo/routine";
import { ReminderCard } from "./ReminderCard";

export function RoutinePage({
  repo = routineRepository,
}: {
  repo?: RoutineRepository;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Reminder[]>([]);
  const [undo, setUndo] = useState<Reminder | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void repo.getToday().then(setItems);
  }, [repo]);
  const respond = async (item: Reminder, action: ReminderAction) => {
    await repo.respond(item.id, action);
    setSaved(true);
    if (action === "taken") {
      setUndo(item);
      window.setTimeout(() => setUndo(null), 8000);
    }
    setItems((current) =>
      current.map((value) =>
        value.id === item.id ? { ...value, status: action } : value,
      ),
    );
  };
  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">{t("routine.title")}</h1>
      {items.length ? (
        items.map((item) => (
          <ReminderCard
            key={item.id}
            reminder={item}
            onRespond={(action) => {
              void respond(item, action);
            }}
          />
        ))
      ) : (
        <p>{t("routine.empty")}</p>
      )}
      {undo && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 mx-auto flex max-w-md items-center justify-between rounded-card bg-text p-4 text-surface"
        >
          <span>{t("routine.savedOnDevice")}</span>
          <button
            className="min-h-touch px-4 font-bold"
            onClick={() => {
              void repo.respond(undo.id, "later");
              setUndo(null);
            }}
          >
            {t("routine.undo")}
          </button>
        </div>
      )}
      {saved && !undo ? (
        <p className="text-center text-sm text-muted" role="status">
          {t("routine.savedOnDevice")}
        </p>
      ) : null}
    </section>
  );
}
