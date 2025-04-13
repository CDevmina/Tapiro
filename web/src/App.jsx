import { Routes, Route, Navigate } from "react-router-dom";
import { Auth0ProviderWithNavigate } from "./components/auth/auth0-provider";
import { RegistrationFlow } from "./components/auth/RegistrationFlow";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ErrorPage from "./pages/ErrorPage";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Unauthorized from "./pages/Unauthorized";
import StoreDashboard from "./pages/StoreDashboard";
import { ProtectedRoute } from "./components/auth/protected-route";
import { AuthGuard } from "./components/auth/AuthGuard"; // Import the guard

function App() {
  return (
    <Auth0ProviderWithNavigate>
      {/* AuthGuard wraps Routes to enforce registration completion */}
      <AuthGuard>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="login" element={<Login />} />
            <Route path="unauthorized" element={<Unauthorized />} />
            {/* The /register route is still needed for AuthGuard to redirect to */}
            <Route path="register" element={<RegistrationFlow />} />

            {/* User-specific routes */}
            <Route
              path="profile"
              element={
                <ProtectedRoute requiredRoles={["user"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Store-specific routes */}
            <Route
              path="store-dashboard"
              element={
                <ProtectedRoute requiredRoles={["store"]}>
                  <StoreDashboard />
                </ProtectedRoute>
              }
            />
          </Route>
          {/* Catch-all route */}
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </AuthGuard>
    </Auth0ProviderWithNavigate>
  );
}

export default App;
