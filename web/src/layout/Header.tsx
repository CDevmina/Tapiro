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

export function Header() {
  // Placeholder for authentication status - replace with actual logic later
  const isAuthenticated = false;
  const user = {
    name: "Bonnie Green",
    email: "[email protected]",
    avatarUrl: "https://flowbite.com/docs/images/people/profile-picture-5.jpg", // Example avatar
  };

  return (
    <Navbar fluid rounded>
      <NavbarBrand href="/">
        {/* You can replace this with your logo SVG or image */}
        <img
          src="/flowbite-react.svg" // Using vite logo as placeholder
          className="mr-3 h-6 sm:h-9"
          alt="Tapiro Logo"
        />
        <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
          Tapiro
        </span>
      </NavbarBrand>
      <div className="flex items-center gap-3 md:order-2">
        <DarkThemeToggle />
        {isAuthenticated ? (
          <Dropdown
            arrowIcon={false}
            inline
            label={<Avatar alt="User settings" img={user.avatarUrl} rounded />}
          >
            <DropdownHeader>
              <span className="block text-sm">{user.name}</span>
              <span className="block truncate text-sm font-medium">
                {user.email}
              </span>
            </DropdownHeader>
            {/* Add Dashboard links based on role later */}
            <DropdownItem href="/dashboard">Dashboard</DropdownItem>
            <DropdownItem>Settings</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Sign out</DropdownItem>
          </Dropdown>
        ) : (
          <>
            <Button href="/login" size="sm">
              Login
            </Button>
            <Button href="/register" size="sm" color="gray">
              Register
            </Button>
          </>
        )}
        <NavbarToggle />
      </div>
      <NavbarCollapse>
        <NavbarLink href="/" active>
          {" "}
          {/* Use active prop based on current route */}
          Home
        </NavbarLink>
        <NavbarLink href="/about">About</NavbarLink>
        <NavbarLink href="/for-users">For Users</NavbarLink>
        <NavbarLink href="/for-stores">For Stores</NavbarLink>
        <NavbarLink href="/api-docs">API Docs</NavbarLink>
      </NavbarCollapse>
    </Navbar>
  );
}
