import { useAuthStore } from "../../auth/authStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
type Preference = {
  id: string;
  channel: string;
  rule_key: string;
  enabled: boolean;
};
const rules = [
  "no_login_2d",
  "missed_meds_3in7",
  "level_drop_x3",
  "reaction_time_worsening",
  "engagement_drop",
  "low_mood_3d",
  "sos",
  "pin_lockout",
  "device_offline_3d",
  "prescription_updated",
  "pin_reset_request",
  "sync_error",
  "checkin_help",
];
export function NotificationPreferences() {
  const userId = useAuthStore((state) => state.user?.id);
  const url = "/api/v1/notification-preferences/";
  const query = useQuery({
    queryKey: ["notification-preferences", userId],
    queryFn: () => apiClient<Preference[]>(url, { method: "GET" }),
  });
  const save = useMutation({
    mutationFn: (data: Omit<Preference, "id">) =>
      apiClient(url, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void query.refetch();
    },
  });
  if (query.isPending) return <p>Loading notification preferences…</p>;
  if (query.isError) return <p>Could not load notification preferences.</p>;
  return (
    <details className="rounded-card bg-surface p-4">
      <summary>Notification preferences</summary>
      <p>
        Email is sent for urgent alerts. Push and SMS are not available yet.
      </p>
      {rules.map((rule) => (
        <fieldset className="my-3" key={rule}>
          <legend>{rule.replaceAll("_", " ")}</legend>
          {["in_app", "email", "push", "sms"].map((channel) => (
            <label
              className="mr-3 inline-flex min-h-[44px] items-center gap-2"
              key={channel}
            >
              <input
                type="checkbox"
                disabled={
                  save.isPending || channel === "push" || channel === "sms"
                }
                checked={
                  query.data.find(
                    (x) => x.rule_key === rule && x.channel === channel,
                  )?.enabled ??
                  (channel === "in_app" || channel === "email")
                }
                onChange={(e) =>
                  save.mutate({
                    channel,
                    rule_key: rule,
                    enabled: e.target.checked,
                  })
                }
              />
              {channel.replaceAll("_", " ")}
            </label>
          ))}
        </fieldset>
      ))}
      {save.isError && (
        <p role="alert">Could not save preferences. Please try again.</p>
      )}
    </details>
  );
}
