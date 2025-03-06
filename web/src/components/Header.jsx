import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button, Avatar } from "./common";

function Header() {
  const { isAuthenticated, user, login, logout, isLoading, hasRole } =
    useAuth();

  return (
    <header className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold">Tapiro</div>
        <nav>
          <ul className="flex space-x-6 items-center">
            <li>
              <Link to="/" className="hover:text-gray-300">
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-gray-300">
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-gray-300">
                Contact
              </Link>
            </li>

            {isAuthenticated && (
              <>
                {hasRole("user") && (
                  <li>
                    <Link to="/profile" className="hover:text-gray-300">
                      Profile
                    </Link>
                  </li>
                )}

                {hasRole("store") && (
                  <li>
                    <Link to="/store-dashboard" className="hover:text-gray-300">
                      Store Dashboard
                    </Link>
                  </li>
                )}

                {(hasRole("admin") || hasRole("store")) && (
                  <li>
                    <Link to="/dashboard" className="hover:text-gray-300">
                      Admin Dashboard
                    </Link>
                  </li>
                )}

                <li>
                  <div className="flex items-center space-x-4">
                    <Link
                      to={hasRole("store") ? "/store-dashboard" : "/profile"}
                    >
                      <Avatar src={user?.picture} name={user?.name} size="sm" />
                    </Link>
                    <Button
                      onClick={logout}
                      size="sm"
                      variant="secondary"
                      isLoading={isLoading}
                    >
                      Logout
                    </Button>
                  </div>
                </li>
              </>
            )}

            {!isAuthenticated && (
              <li>
                <Button
                  onClick={login}
                  size="sm"
                  variant="primary"
                  isLoading={isLoading}
                >
                  Login
                </Button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;
