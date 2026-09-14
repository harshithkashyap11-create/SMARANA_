import { createBrowserRouter } from "react-router-dom";

import { LandingPage } from "../features/auth/LandingPage";
import { ProfessionalLoginPage } from "../features/auth/ProfessionalLoginPage";
import { PatientLoginPage } from "../features/auth/PatientLoginPage";
import {
  PatientLayout,
  ProLayout,
  RequireRole,
  RoleHome,
} from "./layouts/RoleLayouts";

export const router = createBrowserRouter([
  {
    path: "/login/patient",
    element: <PatientLoginPage />,
  },
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    element: (
      <RequireRole allowed={["patient"]}>
        <PatientLayout />
      </RequireRole>
    ),
    children: [
      {
        path: "/patient",
        element: <RoleHome role="patient" />,
      },
    ],
  },
  {
    path: "/login/caregiver",
    element: <ProfessionalLoginPage role="caregiver" />,
  },
  { path: "/login/doctor", element: <ProfessionalLoginPage role="doctor" /> },
  { path: "/login/admin", element: <ProfessionalLoginPage role="admin" /> },
  {
    element: (
      <RequireRole allowed={["caregiver", "doctor"]}>
        <ProLayout />
      </RequireRole>
    ),
    children: [
      {
        path: "/caregiver",
        element: (
          <RequireRole allowed={["caregiver"]}>
            <RoleHome role="caregiver" />
          </RequireRole>
        ),
      },
      {
        path: "/doctor",
        element: (
          <RequireRole allowed={["doctor"]}>
            <RoleHome role="doctor" />
          </RequireRole>
        ),
      },
    ],
  },
  { path: "*", element: <LandingPage /> },
]);
