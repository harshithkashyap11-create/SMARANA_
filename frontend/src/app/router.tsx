import { createBrowserRouter } from "react-router-dom";

import { HomePage } from "../features/home";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
]);
