import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const { isAuthenticated, user, login, logout } = useAuth();

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-xl font-bold">
            Tapiro
          </Link>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/profile">{user?.email}</Link>
                <button onClick={() => logout()} className="btn btn-secondary">
                  Logout
                </button>
              </>
            ) : (
              <button onClick={() => login()} className="btn btn-primary">
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
