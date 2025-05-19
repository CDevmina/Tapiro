import { Outlet, useLocation, matchPath } from "react-router";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Breadcrumbs } from "../components/layout/Breadcrumbs";
import { RegistrationGuard } from "../components/auth/RegistrationGuard";

export function Layout() {
  const location = useLocation();

  const noBreadcrumbPatterns: (string | { path: string; end?: boolean })[] = [
    { path: "/", end: true }, // HomePage
    { path: "/about", end: true }, // AboutPage
    { path: "/api-docs", end: true }, // ApiDocsPage
  ];

  const shouldShowBreadcrumbs = !noBreadcrumbPatterns.some((pattern) =>
    matchPath(
      typeof pattern === "string" ? { path: pattern, end: true } : pattern,
      location.pathname,
    ),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow">
        {shouldShowBreadcrumbs && (
          <div className="container mx-auto px-4 pt-4 sm:px-6 lg:px-8">
            <Breadcrumbs />
          </div>
        )}
        <RegistrationGuard>
          <Outlet />
        </RegistrationGuard>
      </main>
      <Footer />
    </div>
  );
}
