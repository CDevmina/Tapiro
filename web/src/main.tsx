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
import UserProfilePage from "./pages/UserProfilePage";
import StoreProfilePage from "./pages/StoreProfilePage";
import UserPreferencesPage from "./pages/UserPreferencesPage";
import UserConsentPage from "./pages/UserConsentPage";
import UserAnalyticsPage from "./pages/UserAnalyticsPage";

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
          {
            path: "profile/user", // Base profile page
            element: <UserProfilePage />,
          },
          // --- Add these new routes ---
          {
            path: "profile/user/preferences",
            element: <UserPreferencesPage />,
          },
          {
            path: "profile/user/consent",
            element: <UserConsentPage />,
          },
          {
            path: "profile/user/analytics",
            element: <UserAnalyticsPage />,
          },
          // --- End of new routes ---
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
          {
            path: "profile/store",
            element: <StoreProfilePage />,
          },
          // Add store-specific sub-routes here if needed
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
