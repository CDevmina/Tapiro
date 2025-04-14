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
  Spinner, // Import Spinner for loading state
} from "flowbite-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "react-router"; // Import Link and useLocation

export function Header() {
  const { isLoading, isAuthenticated, user, userRoles, login, logout } =
    useAuth(); // Use the auth context
  const location = useLocation(); // Get current location for active links

  // Determine dashboard link based on role
  const getDashboardLink = () => {
    if (userRoles.includes("store")) {
      return "/dashboard/store";
    }
    if (userRoles.includes("user")) {
      return "/dashboard/user";
    }
    return "/"; // Fallback if no specific role dashboard
  };

  const handleLogin = () => login();
  const handleLogout = () => logout();
  // Registration is typically handled by Auth0's Universal Login page
  // const handleRegister = () => login({ authorizationParams: { screen_hint: 'signup' } });

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
          <Spinner size="sm" /> // Show spinner while loading
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
            <DropdownItem href={getDashboardLink()}>Dashboard</DropdownItem>{" "}
            {/* Use Link */}
            {/* <DropdownItem>Settings</DropdownItem> */}
            <DropdownDivider />
            <DropdownItem onClick={handleLogout}>Sign out</DropdownItem>
          </Dropdown>
        ) : (
          <>
            {/* Use onClick for Auth0 actions */}
            <Button onClick={handleLogin} size="sm">
              Login
            </Button>
            {/* <Button onClick={handleRegister} size="sm" color="gray">
              Register
            </Button> */}
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
        {/* Example links - adjust as needed */}
        {/* <NavbarLink href="/dashboard/user" active={location.pathname === '/dashboard/user'}>For Users</NavbarLink> */}
        {/* <NavbarLink href="/dashboard/store" active={location.pathname === '/dashboard/store'}>For Stores</NavbarLink> */}
      </NavbarCollapse>
    </Navbar>
  );
}
