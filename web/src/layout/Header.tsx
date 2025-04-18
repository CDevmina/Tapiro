import {
  Avatar,
  Button,
  DarkThemeToggle,
  Dropdown,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  NavbarToggle,
  DropdownItem,
  DropdownDivider,
  DropdownHeader,
} from "flowbite-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "react-router";
import LoadingSpinner from "../components/common/LoadingSpinner";

export function Header() {
  const { isLoading, isAuthenticated, user, userRoles, logout } = useAuth(); // Use the auth context
  const location = useLocation(); // Get current location for active links

  // Determine dashboard link based on role
  const getDashboardLink = () => {
    if (userRoles.includes("store")) {
      return "/dashboard/store";
    }
    if (userRoles.includes("user")) {
      return "/dashboard/user";
    }
    return "/";
  };

  const handleLogout = () => logout();

  return (
    <Navbar fluid rounded>
      <NavbarBrand href="/">
        {" "}
        {/* Use Link for internal navigation */}
        <img
          src="/flowbite-react.svg"
          className="mr-3 h-6 sm:h-9"
          alt="Tapiro Logo"
        />
        <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
          Tapiro
        </span>
      </NavbarBrand>
      <div className="flex items-center gap-3 md:order-2">
        <DarkThemeToggle />
        {isLoading ? (
          <LoadingSpinner
            size="sm"
            message=""
            className="flex h-auto w-auto items-center p-0"
          />
        ) : isAuthenticated ? (
          <Dropdown
            arrowIcon={false}
            inline
            label={<Avatar alt="User settings" img={user?.picture} rounded />} // Use user picture from Auth0
          >
            <DropdownHeader>
              <span className="block text-sm">
                {user?.name || user?.nickname}
              </span>{" "}
              {/* Use name or nickname */}
              <span className="block truncate text-sm font-medium">
                {user?.email}
              </span>
            </DropdownHeader>
            <DropdownDivider />
            <DropdownItem onClick={handleLogout}>Sign out</DropdownItem>
          </Dropdown>
        ) : (
          <>
            {/* --- Replace Login with Register Button --- */}
            <Button href="/register" size="sm">
              {" "}
              {/* Link href /register */}
              Register / Login
            </Button>
            {/* --- End of change --- */}
          </>
        )}
        <NavbarToggle />
      </div>
      <NavbarCollapse>
        {/* Use ` and check `location.pathname` for active state */}
        <NavbarLink href="/" active={location.pathname === "/"}>
          Home
        </NavbarLink>
        <NavbarLink href="/about" active={location.pathname === "/about"}>
          About
        </NavbarLink>
        {/* Conditionally show dashboard links or generic links */}
        {isAuthenticated ? (
          <NavbarLink
            href={getDashboardLink()}
            active={location.pathname.startsWith("/dashboard")}
          >
            Dashboard
          </NavbarLink>
        ) : (
          <>
            {/* You might want different links for non-logged-in users */}
            {/* <NavbarLink href="/features">Features</NavbarLink> */}
          </>
        )}
        <NavbarLink href="/api-docs" active={location.pathname === "/api-docs"}>
          API Docs
        </NavbarLink>
      </NavbarCollapse>
    </Navbar>
  );
}
