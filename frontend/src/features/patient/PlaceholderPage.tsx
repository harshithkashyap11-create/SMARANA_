import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export function PlaceholderPage() {
  const { t } = useTranslation();
  const { section = "games" } = useParams();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{t(`home.tiles.${section}`)}</h1>
      <p>{t("home.placeholder")}</p>
    </div>
  );
}
