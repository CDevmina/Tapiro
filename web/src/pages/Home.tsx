import { Button } from "flowbite-react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8">
            <div className="flex flex-col justify-center">
              <h1 className="mb-4 text-4xl leading-none font-extrabold tracking-tight md:text-5xl xl:text-6xl dark:text-white">
                Personalized Experiences Through Smart Preferences
              </h1>
              <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl dark:text-gray-400">
                Tapiro creates personalized preference profiles for users based
                on their shopping data, helping stores deliver more relevant
                product recommendations and experiences.
              </p>
              <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                <Button as={Link} to="/register" size="lg">
                  Get started
                </Button>
                <Button as={Link} to="/documentation" color="gray" size="lg">
                  View API Docs
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex lg:items-center">
              <img
                src="/hero-image.svg"
                alt="Tapiro platform visualization"
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Placeholder */}
      <section className="bg-gray-50 py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            How Tapiro Works
          </h2>
          {/* Feature content will go here */}
        </div>
      </section>
    </div>
  );
}
