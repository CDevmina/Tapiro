import { createBrowserRouter, RouteObject } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import Maintenance from "@/pages/Maintenance";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "maintenance",
        element: <Maintenance />,
      },
      {
        path: "features",
        element: <Maintenance />,
      },
      {
        path: "pricing",
        element: <Maintenance />,
      },
      {
        path: "about",
        element: <Maintenance />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
