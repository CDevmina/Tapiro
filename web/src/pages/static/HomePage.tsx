import { useState, useEffect } from "react";
import { Toast, ToastToggle, Button, Card } from "flowbite-react";
import {
  HiCheck,
  HiOutlineArrowRight,
  HiOutlineUserGroup,
  HiOutlineLockClosed,
  HiOutlineSparkles,
  HiOutlinePuzzlePiece,
  HiOutlineChartBar,
} from "react-icons/hi2"; // Using Hi2 for potentially newer icons
import { Link } from "react-router"; // Assuming react-router is used

// Placeholder icons for features - replace with actual or more suitable icons
const FeatureIconUserControl = HiOutlineUserGroup;
const FeatureIconPersonalization = HiOutlineSparkles;
const FeatureIconTransparency = HiOutlineLockClosed;
const FeatureIconStoreIntegration = HiOutlinePuzzlePiece;
const FeatureIconStoreInsights = HiOutlineChartBar;

export default function HomePage() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const message = sessionStorage.getItem("showPostLogoutToast");
    if (message) {
      setToastMessage(message);
      setShowToast(true);
      sessionStorage.removeItem("showPostLogoutToast");
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="relative bg-white dark:bg-gray-900">
      {/* Toast Notification */}
      {showToast && (
        <Toast className="absolute top-5 right-5 z-50 shadow-lg">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200">
            <HiCheck className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal text-gray-800 dark:text-gray-100">
            {toastMessage}
          </div>
          <ToastToggle onDismiss={() => setShowToast(false)} />
        </Toast>
      )}

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img
            className="absolute top-0 right-0 h-full w-full object-cover opacity-50 dark:hidden"
            alt="Abstract Light Pattern"
            src="/pattern-light.svg" // Assuming you have these patterns
          />
          <img
            className="absolute top-0 right-0 hidden h-full w-full object-cover opacity-30 dark:block"
            alt="Abstract Dark Pattern"
            src="/pattern-dark.svg" // Assuming you have these patterns
          />
        </div>
        <div className="container mx-auto px-4 text-center">
          <h1 className="max-w-8xl mx-auto mb-6 bg-gradient-to-r from-blue-600 via-green-500 to-indigo-400 bg-clip-text pb-1 text-4xl font-extrabold text-transparent md:text-5xl lg:text-6xl dark:from-blue-500 dark:via-green-400 dark:to-indigo-300">
            Tapiro: Centralized Data Management Platform.
          </h1>
          <p className="mx-auto mb-8 max-w-4xl text-lg text-gray-600 lg:text-xl dark:text-gray-300">
            Tired of data fragmentation and lack of control? Tapiro empowers
            users with transparency and provides businesses with ethical,
            high-quality data for truly personalized recommendations.
          </p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
            <Link to="/register">
              <Button size="lg" color="blue" className="w-full sm:w-auto">
                Get Started as a User
                <HiOutlineArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact-sales">
              {" "}
              {/* Or a relevant page for store sign-ups */}
              <Button
                size="lg"
                color="light"
                className="w-full border sm:w-auto dark:border-gray-600"
              >
                Partner as a Store
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* For Users Section */}
      <section className="bg-gray-50 py-16 lg:py-24 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
              Empowering{" "}
              <span className="text-blue-600 dark:text-blue-500">Users</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Take control of your digital footprint and enjoy experiences
              tailored to you.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-800">
              <FeatureIconUserControl className="mb-3 h-10 w-10 text-blue-600 dark:text-blue-500" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Full Data Control
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                View, update, and manage your data sharing consents on a
                per-service or global basis. You decide who sees what.
              </p>
            </Card>
            <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-800">
              <FeatureIconPersonalization className="mb-3 h-10 w-10 text-blue-600 dark:text-blue-500" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Accurate Personalization
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Benefit from more relevant recommendations and offers, thanks to
                centralized and accurately managed preference data.
              </p>
            </Card>
            <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-800">
              <FeatureIconTransparency className="mb-3 h-10 w-10 text-blue-600 dark:text-blue-500" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Enhanced Transparency
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Understand how your data is used with a clear view of your
                interactions and preferences through our modern UI.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* For Stores Section */}
      <section className="bg-white py-16 lg:py-24 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
              Powering{" "}
              <span className="text-green-600 dark:text-green-500">
                Businesses
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Access high-quality, consented data to drive engagement and growth
              ethically.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-800">
              <FeatureIconStoreInsights className="mb-3 h-10 w-10 text-green-600 dark:text-green-500" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Richer User Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Overcome data fragmentation. Leverage sophisticated AI and
                taxonomy systems for deeper understanding of user interests.
              </p>
            </Card>
            <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-800">
              <FeatureIconStoreIntegration className="mb-3 h-10 w-10 text-green-600 dark:text-green-500" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Seamless API Integration
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Easily connect your services with our well-documented
                OpenAPI-based RESTful APIs (Node.js, FastAPI).
              </p>
            </Card>
            <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-800">
              <HiOutlineLockClosed className="mb-3 h-10 w-10 text-green-600 dark:text-green-500" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Ethical Data Practices
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Build trust by using a platform that prioritizes user consent
                and data security (Auth0, 2FA, Passkeys).
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Technology Highlights Section (Optional) */}
      <section className="bg-gray-50 py-16 lg:py-24 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
              Built with Cutting-Edge Technology
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Leveraging robust and scalable solutions for optimal performance
              and security.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-3 lg:grid-cols-4">
            <div className="flex flex-col items-center">
              <img
                src="/icons/tech/react.svg"
                alt="React"
                className="mb-2 h-12 w-12"
              />{" "}
              {/* Replace with actual icon paths */}
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                React & Vite
              </p>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/icons/tech/nodejs.svg"
                alt="Node.js"
                className="mb-2 h-12 w-12"
              />
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                Node.js
              </p>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/icons/tech/fastapi.svg"
                alt="FastAPI"
                className="mb-2 h-12 w-12"
              />
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                FastAPI
              </p>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/icons/tech/auth0.svg"
                alt="Auth0"
                className="mb-2 h-12 w-12"
              />
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                Auth0 Security
              </p>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/icons/tech/huggingface.svg"
                alt="Hugging Face"
                className="mb-2 h-12 w-12"
              />
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                AI/ML Models
              </p>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/icons/tech/swagger.svg"
                alt="OpenAPI"
                className="mb-2 h-12 w-12"
              />
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                OpenAPI Specs
              </p>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/icons/tech/mongodb.svg"
                alt="MongoDB"
                className="mb-2 h-12 w-12"
              />
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                MongoDB
              </p>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/icons/tech/redis.svg"
                alt="Redis"
                className="mb-2 h-12 w-12"
              />
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                Caching
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-blue-600 py-16 lg:py-24 dark:bg-blue-700">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Ready to Join the Future of Data?
          </h2>
          <p className="mt-4 mb-8 text-lg text-blue-100 dark:text-blue-200">
            Experience a new era of data control and personalization with
            Tapiro.
          </p>
          <div className="flex justify-center">
            <Link to="/register">
              <Button
                size="xl"
                color="light"
                className="dark:bg-white dark:text-blue-700 dark:hover:bg-gray-100"
              >
                Sign Up Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
