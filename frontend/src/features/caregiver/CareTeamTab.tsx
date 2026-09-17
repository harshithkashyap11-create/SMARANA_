import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
export function CareTeamTab({ patientId }: { patientId: string }) {
  const query = useQuery({
    queryKey: ["care-team", patientId],
    queryFn: () =>
      apiClient<
        Array<{
          id: string;
          name: string;
          role: string;
          phone: string;
          email: string;
        }>
      >(`/api/v1/patients/${patientId}/care-team/`, { method: "GET" }),
  });
  return (
    <section>
      <h2 className="text-xl font-bold">Care team</h2>
      {query.isPending ? (
        <p>Loading care team…</p>
      ) : query.isError ? (
        <p>We could not load the care team.</p>
      ) : !query.data.length ? (
        <p>No active care-team members.</p>
      ) : (
        <ul>
          {query.data.map((member) => (
            <li className="rounded-card bg-surface p-4" key={member.id}>
              <strong>{member.name}</strong>
              <p>{member.role}</p>
              {member.phone && (
                <a
                  className="inline-block min-h-[44px] p-3"
                  href={`tel:${member.phone}`}
                >
                  Call
                </a>
              )}
              {member.email && (
                <a
                  className="inline-block min-h-[44px] p-3"
                  href={`mailto:${member.email}`}
                >
                  Email
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
