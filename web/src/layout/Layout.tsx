import { Outlet } from "react-router-dom";
import { Header } from "./Header"; // Assuming Header is in the same layout folder
import { Footer } from "./Footer"; // Assuming Footer is in the same layout folder

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col dark:bg-gray-900">
      {" "}
      {/* Added dark background */}
      <Header />
      {/* Outlet renders the matched child route component (e.g., HomePage) */}
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
