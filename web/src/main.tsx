import { initThemeMode } from "flowbite-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { Layout } from "./layout/Layout"; // Updated path to layout folder
import HomePage from "./pages/static/HomePage"; // Updated path to pages folder
import AboutPage from "./pages/static/AboutPage"; // Import new page
import ApiDocsPage from "./pages/static/ApiDocsPage"; // Import new page
import UserDashboard from "./pages/UserDashboard"; // Import new page
import StoreDashboard from "./pages/StoreDashboard"; // Import new page

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />, // Layout wraps the routes
    children: [
      {
        index: true, // Default route for "/"
        element: <HomePage />,
      },
      {
        path: "about", // Route for About page
        element: <AboutPage />,
      },
      {
        path: "api-docs", // Route for API Docs page
        element: <ApiDocsPage />,
      },
      // --- Protected Routes (Add guards later) ---
      {
        path: "dashboard/user", // Placeholder route for User Dashboard
        element: <UserDashboard />,
      },
      {
        path: "dashboard/store", // Placeholder route for Store Dashboard
        element: <StoreDashboard />,
      },
      // --- Auth Routes (Add later) ---
      // { path: "login", element: <LoginPage /> },
      // { path: "register", element: <RegisterPage /> },

      // --- Other Static Pages (Optional) ---
      // { path: "for-users", element: <ForUsersPage /> },
      // { path: "for-stores", element: <ForStoresPage /> },
      // { path: "privacy", element: <PrivacyPage /> },
      // { path: "terms", element: <TermsPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

initThemeMode();
