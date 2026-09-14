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
import { PatientHomePage } from "../features/patient/home/PatientHomePage";
import { PlaceholderPage } from "../features/patient/PlaceholderPage";
import { RoutinePage } from "../features/patient/routine/RoutinePage";
import { MedicinesPage } from "../features/patient/medicines/MedicinesPage";
import { ProgressPage } from "../features/patient/progress/ProgressPage";

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
        element: <PatientHomePage />,
      },
      { path: "/patient/routine", element: <RoutinePage /> },
      { path: "/patient/medicines", element: <MedicinesPage /> },
      { path: "/patient/progress", element: <ProgressPage /> },
      { path: "/patient/:section", element: <PlaceholderPage /> },
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
