import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../../../shared/ui";
import { sendSos } from "./sosRepository";
import { patientRepository } from "../../../db/repo/patient";
import type { CachedFamilyMember } from "../../../db/schema";

export function SosButton() {
  const { t } = useTranslation();
  const timer = useRef<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);
  const [shared, setShared] = useState(false);
  const [contacts, setContacts] = useState<CachedFamilyMember[]>([]);
  useEffect(() => {
    const openConfirmation = () => setConfirm(true);
    window.addEventListener("smarana:open-sos-confirm", openConfirmation);
    return () =>
      window.removeEventListener("smarana:open-sos-confirm", openConfirmation);
  }, []);
  const start = () => {
    timer.current = window.setTimeout(() => setConfirm(true), 2000);
  };
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current);
  };
  // T081: voice may open this confirmation, but must never send an SOS directly.
  return (
    <>
      {sent ? (
        <aside className="fixed inset-x-4 bottom-24 z-20 mx-auto max-w-md rounded-card bg-calm p-5 text-center text-xl shadow-card">
          <p>{t(shared ? "sos.sent" : "sos.queued")}</p>
          {contacts
            .filter((contact) => contact.isEmergencyContact && contact.phone)
            .map((contact) => (
              <a
                className="mt-3 block min-h-touch rounded-card bg-primary p-4 font-bold text-primary-text"
                href={`tel:${contact.phone}`}
                key={contact.id}
              >
                {t("people.call", { name: contact.name })}
              </a>
            ))}
        </aside>
      ) : (
        <button
          aria-label={t("sos.label")}
          className="patient-sos-button fixed bottom-24 right-4 z-20 rounded-full bg-warn text-bg font-bold shadow-card"
          disabled={busy}
          type="button"
          onClick={(event) => {
            if (event.detail === 0) setConfirm(true);
          }}
          onPointerDown={start}
          onPointerLeave={stop}
          onPointerUp={stop}
        >
          {t("sos.label")}
        </button>
      )}
      {error && <p role="alert">{t("auth.errors.request_not_completed")}</p>}
      <ConfirmDialog
        noLabel={t("sos.no")}
        open={confirm}
        title={t("sos.confirm")}
        ttsLabel={t("patient.listen")}
        yesLabel={t("sos.yes")}
        onNo={() => setConfirm(false)}
        onYes={() => {
          setConfirm(false);
          setBusy(true);
          setError(false);
          void sendSos().then(async (shared) => {
            setShared(shared);
            setSent(true);
            setContacts(await patientRepository.getFamilyMembers().catch(() => []));
          }).catch(() => setError(true)).finally(() => setBusy(false));
        }}
      />
    </>
  );
}
