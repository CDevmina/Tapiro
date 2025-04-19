import { Outlet } from "react-router";
import { Header } from "./Header"; // Assuming Header is in the same layout folder
import { Footer } from "./Footer"; // Assuming Footer is in the same layout folder
import { RegistrationGuard } from "../components/auth/RegistrationGuard"; // Import the guard

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col dark:bg-gray-900">
      {" "}
      {/* Added dark background */}
      <Header />
      {/* Wrap Outlet with RegistrationGuard */}
      <main className="flex-grow">
        <RegistrationGuard>
          <Outlet />
        </RegistrationGuard>
      </main>
      <Footer />
    </div>
  );
}
