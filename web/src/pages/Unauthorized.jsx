import { Link } from "react-router-dom";
import { Button } from "../components/common";

function Unauthorized() {
  return (
    <div className="max-w-lg mx-auto text-center">
      <h1 className="text-3xl font-bold mb-6">Access Denied</h1>
      <p className="mb-6">
        You don't have permission to access this page. Please contact an
        administrator if you believe you should have access.
      </p>
      <div className="flex justify-center gap-4">
        <Button as={Link} to="/" variant="secondary">
          Return to Home
        </Button>
      </div>
    </div>
  );
}

export default Unauthorized;
