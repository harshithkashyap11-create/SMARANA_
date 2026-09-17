import { useQuery } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AppProviders } from "./providers";
import { useAuthStore } from "../features/auth/authStore";

afterEach(() => useAuthStore.setState({ user: null, role: null }));

it("does not show a previous professional's cached patient data after account change", async () => {
  useAuthStore.setState({
    user: {
      id: "caregiver-one",
      display_name: "One",
      role: "caregiver",
      email: "",
      phone: "",
    },
    role: "caregiver",
  });
  let owner = "Private patient of One";
  function Dashboard() {
    const query = useQuery({
      queryKey: ["caregiver", "patients"],
      queryFn: () => Promise.resolve(owner),
    });
    return <p>{query.data ?? "Loading"}</p>;
  }
  render(
    <AppProviders>
      <Dashboard />
    </AppProviders>,
  );
  await screen.findByText("Private patient of One");
  owner = "Private patient of Two";
  act(() =>
    useAuthStore.setState({
      user: {
        id: "caregiver-two",
        display_name: "Two",
        role: "caregiver",
        email: "",
        phone: "",
      },
    }),
  );
  expect(screen.queryByText("Private patient of One")).not.toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByText("Private patient of Two")).toBeInTheDocument(),
  );
});
