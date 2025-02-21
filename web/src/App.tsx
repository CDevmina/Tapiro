import "./App.css";
import { useAuth } from "./hooks/useAuth";

function App() {
  const { isAuthenticated, login, register, logout, user } = useAuth();

  return (
    <div className="app">
      <header>
        {!isAuthenticated ? (
          <div>
            <button onClick={login}>Log In</button>
            <button onClick={register}>Sign Up</button>
          </div>
        ) : (
          <div>
            <p>Welcome, {user?.email}</p>
            <button onClick={logout}>Log Out</button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
