import { useTranslation } from "react-i18next";
import type { Orientation } from "../../db/repo/patient";
import { Card } from "./Card";

export function OrientationCard({ orientation }: { orientation: Orientation }) {
  const { t } = useTranslation();
  const member = orientation.family_member;
  return (
    <Card className="space-y-4 text-[1.1rem] leading-snug">
      <div>
        <p className="font-bold">
          {orientation.day}, {orientation.date}
        </p>
        <p>
          {orientation.time}
          {orientation.home_label ? ` · ${orientation.home_label}` : ""}
        </p>
      </div>
      {member ? (
        <div className="flex items-center gap-4">
          {member.photo_url ? (
            <img
              className="h-20 w-20 shrink-0 rounded-full object-cover"
              src={member.photo_url}
              alt={member.name}
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-calm text-3xl"
            >
              ☺
            </span>
          )}
          <p>
            {t("home.familyPhoto", {
              name: member.name,
              relationship: member.relationship,
            })}
          </p>
        </div>
      ) : null}
      <div className="rounded-card bg-calm p-4">
        <strong>{t("home.nextActivity")}</strong>
        <p>{orientation.next_activity?.title ?? t("home.noNextActivity")}</p>
      </div>
    </Card>
  );
}
