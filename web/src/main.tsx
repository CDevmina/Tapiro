import { initThemeMode } from "flowbite-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { Layout } from "./layout/Layout"; // Updated path to layout folder
import HomePage from "./pages/HomePage"; // Updated path to pages folder

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />, // Layout wraps the routes
    children: [
      {
        index: true, // Default route for "/"
        element: <HomePage />,
      },
      // Add other routes here later
      // { path: "about", element: <AboutPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

initThemeMode();
