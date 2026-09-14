import { ConfirmDialog } from "./ConfirmDialog";
import { useTranslation } from "react-i18next";

export function BreakPrompt({ open, onBreak, onContinue }: { open: boolean; onBreak: () => void; onContinue: () => void }) {
  const { t } = useTranslation();
  return <ConfirmDialog noLabel={t("quiz.breakContinue")} open={open} title={t("quiz.breakTitle")} yesLabel={t("quiz.breakYes")} onNo={onContinue} onYes={onBreak} />;
}
