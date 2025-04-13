import {
  Avatar,
  Button,
  DarkThemeToggle,
  Dropdown,
  Navbar,
} from "flowbite-react";
import { Link } from "react-router-dom";

export default function Header() {
  // This will be expanded with auth logic later
  const isLoggedIn = false;

  return (
    <Navbar
      fluid
      className="border-b border-gray-200 shadow-sm dark:border-gray-700"
    >
      <Navbar.Brand as={Link} to="/">
        <img
          src="/flowbite-react.svg"
          className="mr-3 h-6 sm:h-8"
          alt="Tapiro Logo"
        />
        <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
          Tapiro
        </span>
      </Navbar.Brand>

      <div className="flex items-center gap-2 md:order-2">
        <DarkThemeToggle />

        {isLoggedIn ? (
          <Dropdown
            arrowIcon={false}
            inline
            label={
              <Avatar alt="User settings" img="/default-avatar.png" rounded />
            }
          >
            <Dropdown.Header>
              <span className="block text-sm">User Name</span>
              <span className="block truncate text-sm font-medium">
                user@example.com
              </span>
            </Dropdown.Header>
            <Dropdown.Item>Dashboard</Dropdown.Item>
            <Dropdown.Item>Settings</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item>Sign out</Dropdown.Item>
          </Dropdown>
        ) : (
          <div className="flex gap-2">
            <Button as={Link} to="/login" color="gray" size="sm">
              Login
            </Button>
            <Button as={Link} to="/register" size="sm">
              Register
            </Button>
          </div>
        )}

        <Navbar.Toggle />
      </div>

      <Navbar.Collapse>
        <Navbar.Link as={Link} to="/" active>
          Home
        </Navbar.Link>
        <Navbar.Link as={Link} to="/features">
          Features
        </Navbar.Link>
        <Navbar.Link as={Link} to="/documentation">
          Documentation
        </Navbar.Link>
        <Navbar.Link as={Link} to="/pricing">
          Pricing
        </Navbar.Link>
      </Navbar.Collapse>
    </Navbar>
  );
}
