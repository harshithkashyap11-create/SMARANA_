import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BigButton } from "../../shared/ui";
export function SupportiveEndScreen({
  messageKey,
  onReplay,
  homePath = "/patient",
}: {
  messageKey: string;
  onReplay: () => void;
  homePath?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <section className="space-y-5 text-center">
      <h1 className="text-3xl font-bold">{t(messageKey)}</h1>
      <BigButton onClick={onReplay}>{t("games.playAgain")}</BigButton>
      <BigButton variant="secondary" onClick={() => navigate(homePath)}>
        {t("games.backHome")}
      </BigButton>
    </section>
  );
}
