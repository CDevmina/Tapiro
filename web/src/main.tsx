import { initThemeMode } from "flowbite-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./api/utils/cache";
import "./index.css";
import { Layout } from "./layout/Layout";
import HomePage from "./pages/static/HomePage";
import AboutPage from "./pages/static/AboutPage";
import ApiDocsPage from "./pages/static/ApiDocsPage";
import UserDashboard from "./pages/UserDashboard";
import StoreDashboard from "./pages/StoreDashboard";
import { AuthProviderWrapper } from "./context/AuthContext";
import PrivateRoute from "./components/auth/PrivateRoute";
import NotFoundPage from "./pages/static/NotFoundPage";
import RegistrationPage from "./pages/RegistrationPage"; // <-- Import new page
import CompleteRegistrationPage from "./pages/CompleteRegistrationPage"; // <-- Import new page

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProviderWrapper>
        <Layout />
      </AuthProviderWrapper>
    ),
    children: [
      // --- Public Routes ---
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
      {
        path: "register", // <-- New public registration route
        element: <RegistrationPage />,
      },
      // --- Protected Routes ---
      {
        // Use PrivateRoute to ensure auth state is loaded before accessing completion page
        // No specific role needed, just authenticated
        element: <PrivateRoute />,
        children: [
          {
            path: "complete-registration", // <-- New private completion route
            element: <CompleteRegistrationPage />,
          },
        ],
      },
      {
        element: <PrivateRoute allowedRoles={["user"]} />,
        children: [
          {
            path: "dashboard/user",
            element: <UserDashboard />,
          },
        ],
      },
      {
        element: <PrivateRoute allowedRoles={["store"]} />,
        children: [
          {
            path: "dashboard/store",
            element: <StoreDashboard />,
          },
        ],
      },
      // --- Catch-all 404 Route ---
      {
        path: "*", // This matches any path not matched above
        element: <NotFoundPage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

initThemeMode();
