import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { patientRepository } from "../../../db/repo/patient";
import type { CachedFamilyMember } from "../../../db/schema";
import { ConfirmDialog } from "../../../shared/ui";

export function PeoplePage({ call = (phone: string) => { window.location.href = `tel:${phone}`; } }: { call?: (phone: string) => void }) {
  const { t } = useTranslation(); const [members, setMembers] = useState<CachedFamilyMember[]>([]); const [selected, setSelected] = useState<CachedFamilyMember | null>(null);
  useEffect(() => { void patientRepository.getFamilyMembers().then(setMembers); }, []);
  return <section className="space-y-4"><h1 className="text-3xl font-bold">{t("people.title")}</h1><div className="grid grid-cols-2 gap-3">{members.map((member) => <button className="min-h-touch rounded-card bg-surface p-4 shadow-card" key={member.id} type="button" onClick={() => setSelected(member)}>{member.photoUrl ? <img alt={member.name} className="mx-auto h-28 w-28 rounded-full object-cover" src={member.photoUrl} /> : null}<strong className="block text-2xl">{member.name}</strong><span>{member.relationship}</span></button>)}</div><ConfirmDialog noLabel={t("people.no")} open={Boolean(selected)} title={t("people.call", { name: selected?.name })} ttsLabel={t("patient.listen")} yesLabel={t("people.yes")} onNo={() => setSelected(null)} onYes={() => { if (selected?.phone) call(selected.phone); }} /></section>;
}
