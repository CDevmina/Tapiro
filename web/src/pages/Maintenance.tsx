const Maintenance = () => {
  return (
    <div className="py-16 text-center">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-8 rounded-lg shadow-md max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <svg
            className="h-12 w-12 text-yellow-500 mr-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <h1 className="text-3xl font-bold text-gray-800">
            Under Maintenance
          </h1>
        </div>

        <p className="text-lg text-gray-700 mb-6">
          We're currently improving this section of our website to enhance your
          experience.
        </p>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">
            What to Expect
          </h2>
          <ul className="text-left text-gray-700 space-y-2">
            <li className="flex items-center">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              New and improved features
            </li>
            <li className="flex items-center">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Better performance and stability
            </li>
            <li className="flex items-center">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Enhanced user interface
            </li>
          </ul>
        </div>

        <p className="text-gray-600">
          We apologize for any inconvenience. Please check back soon!
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
