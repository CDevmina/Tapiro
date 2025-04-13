import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Home from "./pages/Home";

// Create a router with routes configuration
const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      // These are placeholder routes that will be implemented later
      {
        path: "features",
        element: (
          <div className="container mx-auto py-10">
            Features Page (Coming Soon)
          </div>
        ),
      },
      {
        path: "documentation",
        element: (
          <div className="container mx-auto py-10">
            API Documentation (Coming Soon)
          </div>
        ),
      },
      {
        path: "pricing",
        element: (
          <div className="container mx-auto py-10">
            Pricing Page (Coming Soon)
          </div>
        ),
      },
      {
        path: "login",
        element: (
          <div className="container mx-auto py-10">
            Login Page (Coming Soon)
          </div>
        ),
      },
      {
        path: "register",
        element: (
          <div className="container mx-auto py-10">
            Registration Page (Coming Soon)
          </div>
        ),
      },
      // Dashboard routes (will be protected later)
      {
        path: "dashboard",
        children: [
          {
            path: "user",
            element: (
              <div className="container mx-auto py-10">
                User Dashboard (Coming Soon)
              </div>
            ),
          },
          {
            path: "store",
            element: (
              <div className="container mx-auto py-10">
                Store Dashboard (Coming Soon)
              </div>
            ),
          },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
