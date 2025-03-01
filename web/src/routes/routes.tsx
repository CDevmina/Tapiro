import { createBrowserRouter, RouteObject } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AuthStateWrapper } from "@/components/common/AuthStateWrapper";
import { NavigationLoader } from "@/components/common/NavigationLoader";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import Maintenance from "@/pages/Maintenance";
import RegisterUser from "@/pages/RegisterUser";
import RegisterStore from "@/pages/RegisterStore";
import RegisterType from "@/pages/RegisterType";

export const routes: RouteObject[] = [
  {
    element: <AuthStateWrapper />,
    children: [
      {
        element: <NavigationLoader />,
        children: [
          {
            path: "register",
            element: <RegisterType />,
          },
          {
            path: "register/user",
            element: <RegisterUser />,
          },
          {
            path: "register/store",
            element: <RegisterStore />,
          },
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
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
