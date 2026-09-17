import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
export function CheckInPanel({ patientId }: { patientId: string }) {
  const url = `/api/v1/patients/${patientId}/checkins/`;
  const query = useQuery({
    queryKey: ["caregiver", patientId, "checkins"],
    queryFn: () =>
      apiClient<Array<{ id: string; answer: string | null }>>(url, {
        method: "GET",
      }),
    refetchInterval: 30000,
  });
  const send = useMutation({
    mutationFn: () => apiClient(url, { method: "POST" }),
    onSuccess: () => {
      void query.refetch();
    },
  });
  return (
    <section className="space-y-3 rounded-card bg-surface p-4">
      <h2 className="text-xl font-bold">Patient check-in</h2>
      <button
        className="min-h-[44px] rounded bg-primary p-3 text-primary-text"
        disabled={send.isPending}
        onClick={() => send.mutate()}
      >
        Ask “Are you okay?”
      </button>
      {(send.isError || query.isError) && (
        <p role="alert">
          Could not load or send the check-in. Please try again.
        </p>
      )}
      {query.isPending && <p>Loading check-ins…</p>}
      {query.data?.map((x) => (
        <p key={x.id}>
          {x.answer === "okay"
            ? "Patient is okay"
            : x.answer === "need_help"
              ? "Patient needs help"
              : "Waiting for a reply on the patient device"}
        </p>
      ))}
    </section>
  );
}
