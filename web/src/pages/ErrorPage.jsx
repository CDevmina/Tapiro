import { useRouteError, Link } from "react-router-dom";

function ErrorPage() {
  const error = useRouteError();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold mb-4">Oops!</h1>
      <p className="text-xl mb-6">Sorry, an unexpected error has occurred.</p>
      <p className="text-gray-600 mb-8">{error.statusText || error.message}</p>
      <Link
        to="/"
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Go to Homepage
      </Link>
    </div>
  );
}

export default ErrorPage;
