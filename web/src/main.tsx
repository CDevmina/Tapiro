import { initThemeMode } from "flowbite-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  BrowserRouter,
} from "react-router-dom"; // Import BrowserRouter
import "./index.css";
import { Layout } from "./layout/Layout";
import HomePage from "./pages/static/HomePage";
import AboutPage from "./pages/static/AboutPage";
import ApiDocsPage from "./pages/static/ApiDocsPage";
import UserDashboard from "./pages/UserDashboard";
import StoreDashboard from "./pages/StoreDashboard";
import { AuthProviderWrapper } from "./context/AuthContext"; // Import Auth Provider
import PrivateRoute from "./components/auth/PrivateRoute"; // Import Private Route

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
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
        element: <PrivateRoute allowedRoles={["user"]} />, // Protect routes needing 'user' role
        children: [
          {
            path: "dashboard/user",
            element: <UserDashboard />,
          },
          // Add other user-specific routes here
        ],
      },
      // --- Protected Store Routes ---
      {
        element: <PrivateRoute allowedRoles={["store"]} />, // Protect routes needing 'store' role
        children: [
          {
            path: "dashboard/store",
            element: <StoreDashboard />,
          },
          // Add other store-specific routes here
        ],
      },
      // --- Auth Routes (Add components later) ---
      // { path: "login", element: <LoginPage /> }, // You might not need a dedicated login page if using Auth0 universal login
      // { path: "register", element: <RegisterPage /> }, // Registration is often handled by Auth0 universal login
      // { path: "unauthorized", element: <UnauthorizedPage /> }, // Add an unauthorized page

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
    {/* Wrap RouterProvider with BrowserRouter for hooks like useNavigate in AuthProviderWrapper */}
    <BrowserRouter>
      {/* AuthProviderWrapper provides Auth0 context and handles redirects */}
      <AuthProviderWrapper>
        {/* RouterProvider now uses the router configuration */}
        <RouterProvider router={router} />
      </AuthProviderWrapper>
    </BrowserRouter>
  </StrictMode>,
);

initThemeMode();
