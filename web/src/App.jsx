import { Routes, Route } from "react-router-dom";
import { Auth0ProviderWithNavigate } from "./components/auth/auth0-provider";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ErrorPage from "./pages/ErrorPage";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Unauthorized from "./pages/Unauthorized";
import Dashboard from "./pages/Dashboard";
import { ProtectedRoute } from "./components/auth/protected-route";

function App() {
  return (
    <Auth0ProviderWithNavigate>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="unauthorized" element={<Unauthorized />} />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute requiredRoles={["admin", "store"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </Auth0ProviderWithNavigate>
  );
}

export default App;
