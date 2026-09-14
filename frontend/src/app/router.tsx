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
import { MemoriesPage } from "../features/patient/memories/MemoriesPage";
import { MemoryDetailPage } from "../features/patient/memories/MemoryDetailPage";
import { MemoryQuizPage } from "../features/patient/memories/quiz/MemoryQuizPage";
import { PeoplePage } from "../features/patient/people/PeoplePage";
import { CaregiverPortal } from "../features/caregiver/CaregiverPortal";
import { GamesPage } from "../features/patient/games/GamesPage";
import { GamePage } from "../features/patient/games/GamePage";

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
      { path: "/patient/memories", element: <MemoriesPage /> },
      { path: "/patient/memories/quiz", element: <MemoryQuizPage /> },
      { path: "/patient/memories/:memoryId", element: <MemoryDetailPage /> },
      { path: "/patient/people", element: <PeoplePage /> },
      { path: "/patient/games", element: <GamesPage /> },
      { path: "/patient/games/:gameKey", element: <GamePage /> },
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
        path: "/caregiver/:patientId?/:tab?",
        element: (
          <RequireRole allowed={["caregiver"]}>
            <CaregiverPortal />
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
