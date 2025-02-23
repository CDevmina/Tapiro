import "./App.css";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/routes";
import { AuthProvider } from "./auth/AuthContext";
import { AuthStateManager } from "./auth/AuthStateManager";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthStateManager>
          <RouterProvider router={router} />
        </AuthStateManager>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
