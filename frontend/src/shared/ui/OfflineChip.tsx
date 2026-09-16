import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
export function OfflineChip() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    addEventListener("online", update);
    addEventListener("offline", update);
    return () => {
      removeEventListener("online", update);
      removeEventListener("offline", update);
    };
  }, []);
  return online ? null : (
    <span
      className="rounded-full bg-calm px-3 py-2 text-sm font-bold"
      role="status"
    >
      ☁ {t("offline.working")}
    </span>
  );
}
