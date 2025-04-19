import { Button, Card } from "flowbite-react";
import { HiExclamationCircle } from "react-icons/hi";
import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="max-w-lg text-center">
        {/* Icon color already handled by dark:text-gray-200 */}
        <HiExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
        {/* Add dark mode text color */}
        <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
          404 - Page Not Found
        </h2>
        {/* Add dark mode text color */}
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          Oops! The page you are looking for does not exist. It might have been
          moved or deleted.
        </p>
        <div className="flex justify-center">
          <Link to="/">
            <Button color="blue">Go back home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
