import { Link } from "react-router-dom";
import { BackButton } from "@/components/common/BackButton";

const RegisterType = () => {
  return (
    <div className="max-w-md mx-auto py-12">
      <BackButton to="/" />
      <h1 className="text-3xl font-bold mb-8 text-center">
        Choose Account Type
      </h1>

      <div className="space-y-6">
        <Link
          to="/register/user"
          className="flex flex-col p-6 border rounded-lg shadow hover:shadow-md transition-all w-full"
        >
          <h2 className="text-xl font-semibold mb-2">Personal Account</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create an account to discover personalized offers and products
          </p>
        </Link>

        <Link
          to="/register/store"
          className="flex flex-col p-6 border rounded-lg shadow hover:shadow-md transition-all w-full"
        >
          <h2 className="text-xl font-semibold mb-2">Business Account</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create a store account to reach customers with targeted advertising
          </p>
        </Link>
      </div>
    </div>
  );
};

export default RegisterType;
