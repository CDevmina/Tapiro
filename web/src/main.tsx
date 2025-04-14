import { initThemeMode } from "flowbite-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { Layout } from "./layout/Layout";
import HomePage from "./pages/static/HomePage";
import AboutPage from "./pages/static/AboutPage";
import ApiDocsPage from "./pages/static/ApiDocsPage";
import UserDashboard from "./pages/UserDashboard";
import StoreDashboard from "./pages/StoreDashboard";
import { AuthProviderWrapper } from "./context/AuthContext";
import PrivateRoute from "./components/auth/PrivateRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProviderWrapper>
        <Layout />
      </AuthProviderWrapper>
    ),
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "api-docs",
        element: <ApiDocsPage />,
      },
      // --- Protected User Routes ---
      {
        element: <PrivateRoute allowedRoles={["user"]} />,
        children: [
          {
            path: "dashboard/user",
            element: <UserDashboard />,
          },
        ],
      },
      // --- Protected Store Routes ---
      {
        element: <PrivateRoute allowedRoles={["store"]} />,
        children: [
          {
            path: "dashboard/store",
            element: <StoreDashboard />,
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

initThemeMode();
