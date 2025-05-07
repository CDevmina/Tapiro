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
import { Link, useLocation } from "react-router";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useUserMetadata } from "../api/hooks/useAuthHooks";

export function Header() {
  const { isLoading, isAuthenticated, user, userRoles, login, logout } =
    useAuth();
  const { data: userMetadata, isLoading: metadataLoading } = useUserMetadata();
  const location = useLocation();

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

  // Determine profile link based on role
  const getProfileLink = () => {
    if (userRoles.includes("store")) {
      return "/profile/store";
    }
    if (userRoles.includes("user")) {
      return "/profile/user";
    }
    return "/";
  };

  // Get display name from metadata or user object
  const getDisplayName = () => {
    // First try to get custom nickname from metadata (set during registration)
    if (userMetadata?.metadata?.nickname) {
      return userMetadata.metadata.nickname;
    }
    return user?.nickname || user?.name || "User";
  };

  const handleLogin = () => login();
  const handleLogout = () => logout();

  return (
    <Navbar fluid rounded>
      <NavbarBrand as={Link} to="/">
        {" "}
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
        {isLoading || metadataLoading ? (
          <LoadingSpinner
            size="sm"
            message=""
            className="flex h-auto w-auto items-center p-0"
          />
        ) : isAuthenticated ? (
          <Dropdown
            arrowIcon={false}
            inline
            label={<Avatar alt="User settings" img={user?.picture} rounded />}
          >
            <DropdownHeader>
              <span className="block text-sm">
                {getDisplayName()} {/* Use the new function */}
              </span>
              <span className="block truncate text-sm font-medium">
                {user?.email}
              </span>
            </DropdownHeader>
            <DropdownItem as={Link} to={getProfileLink()}>
              Profile
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={handleLogout}>Sign out</DropdownItem>
          </Dropdown>
        ) : (
          <>
            <Button onClick={handleLogin} size="sm">
              Login
            </Button>
          </>
        )}
        <NavbarToggle />
      </div>
      <NavbarCollapse>
        {/* Use ` and check `location.pathname` for active state */}
        <NavbarLink as={Link} to="/" active={location.pathname === "/"}>
          Home
        </NavbarLink>
        <NavbarLink
          as={Link}
          to="/about"
          active={location.pathname === "/about"}
        >
          About
        </NavbarLink>
        {/* Conditionally show dashboard links or generic links */}
        {isAuthenticated ? (
          <NavbarLink
            as={Link}
            to={getDashboardLink()}
            active={location.pathname.startsWith("/dashboard")}
          >
            Dashboard
          </NavbarLink>
        ) : (
          <>
            {/* You might want different links for non-logged-in users */}
            {/* <NavbarLink as={Link} to="/features">Features</NavbarLink> */}
          </>
        )}
        <NavbarLink
          as={Link}
          to="/api-docs"
          active={location.pathname === "/api-docs"}
        >
          API Docs
        </NavbarLink>
      </NavbarCollapse>
    </Navbar>
  );
}
