import { Card, Button } from "flowbite-react";
import {
  HiOutlineShieldCheck,
  HiOutlineUsers,
  HiOutlineLightBulb,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLocationMarker,
  HiOutlineChatAlt2,
  HiOutlineQuestionMarkCircle,
  HiOutlineArrowRight,
} from "react-icons/hi"; // Using Hi for consistency if Hi2 not used elsewhere or if these are preferred
import { Link } from "react-router"; // Assuming react-router is used

export default function AboutPage() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-slate-100 py-20 dark:bg-slate-800">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white">
            About Tapiro
          </h1>
          <p className="mt-4 text-xl text-slate-600 dark:text-slate-300">
            Redefining the relationship between users, data, and
            personalization.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {/* The Challenge Section */}
        <section className="mb-16">
          <Card className="shadow-lg dark:bg-gray-800">
            <div className="mb-3 flex items-center">
              <HiOutlineLightBulb className="mr-4 h-10 w-10 text-yellow-500" />
              <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
                The Challenge: Data Fragmentation & User Disempowerment
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              In today's digital world, personalized experiences are key.
              However, this has often led to aggressive and fragmented data
              collection across countless platforms. Users are left with little
              transparency or control over their personal information, and
              businesses struggle with siloed data that hinders truly effective
              personalization.
            </p>
          </Card>
        </section>

        {/* Our Mission Section */}
        <section className="mb-16">
          <Card className="shadow-lg dark:bg-gray-800">
            <div className="mb-3 flex items-center">
              <HiOutlineShieldCheck className="mr-4 h-10 w-10 text-blue-600 dark:text-blue-500" />
              <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
                Our Mission: Centralized Control, Enhanced Personalization
              </h2>
            </div>
            <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              Tapiro is engineered to address these challenges head-on. We are
              building a secure, centralized platform that acts as a trusted
              intermediary, managing the flow of data between individuals and
              the services that require this data for personalization.
            </p>
            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              Our core aim is to return control of data to the user while
              simultaneously enabling businesses to achieve better, more
              accurate, and ethically-sourced personalization results.
            </p>
          </Card>
        </section>

        {/* What This Means for You Section */}
        <section className="mb-16">
          <div className="mb-8 text-center">
            <HiOutlineUsers className="mx-auto mb-3 h-12 w-12 text-green-500" />
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
              What This Means for You
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="shadow-md dark:bg-gray-800">
              <h3 className="mb-3 text-2xl font-medium text-gray-800 dark:text-gray-100">
                For Users:
              </h3>
              <ul className="list-inside list-disc space-y-2 text-lg text-gray-700 dark:text-gray-300">
                <li>
                  <span className="font-semibold">Empowerment:</span> Manage
                  your data sharing preferences with ease. View, update, or
                  revoke consent at any time.
                </li>
                <li>
                  <span className="font-semibold">Transparency:</span>{" "}
                  Understand how your data contributes to the experiences you
                  receive.
                </li>
                <li>
                  <span className="font-semibold">Better Experiences:</span>{" "}
                  Enjoy more relevant recommendations and offers from services
                  that respect your choices.
                </li>
              </ul>
            </Card>
            <Card className="shadow-md dark:bg-gray-800">
              <h3 className="mb-3 text-2xl font-medium text-gray-800 dark:text-gray-100">
                For Stores & Services:
              </h3>
              <ul className="list-inside list-disc space-y-2 text-lg text-gray-700 dark:text-gray-300">
                <li>
                  <span className="font-semibold">Quality Data:</span> Access
                  richer, consented user data for superior personalization.
                </li>
                <li>
                  <span className="font-semibold">Ethical Approach:</span> Build
                  trust by partnering with a platform that prioritizes user
                  privacy.
                </li>
                <li>
                  <span className="font-semibold">Simplified Integration:</span>{" "}
                  Leverage our robust APIs and AI-driven insights to enhance
                  your offerings.
                </li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Our Vision Section */}
        <section className="mb-16">
          <Card className="shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 text-3xl font-semibold text-gray-900 dark:text-white">
              Our Vision
            </h2>
            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              Tapiro envisions a future where data management is transparent,
              ethical, and user-centric. We believe that by fostering a
              respectful data ecosystem, both individuals and businesses can
              thrive. We are committed to developing solutions that not only
              address current data privacy concerns but also anticipate the
              needs of a rapidly evolving digital landscape.
            </p>
          </Card>
        </section>

        {/* Contact Us Section */}
        <section className="mb-16 rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800">
          <h2 className="mb-8 text-center text-3xl font-semibold text-gray-900 dark:text-white">
            Get in Touch
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Email */}
            <div className="flex flex-col items-center text-center">
              <HiOutlineMail className="mb-3 h-12 w-12 text-blue-600 dark:text-blue-500" />
              <h3 className="mb-2 text-xl font-medium text-gray-800 dark:text-gray-100">
                Email Us
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Have questions or feedback?
              </p>
              <a
                href="mailto:support@tapiro.com"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                support@tapiro.com
              </a>
            </div>

            {/* Phone (Placeholder) */}
            <div className="flex flex-col items-center text-center">
              <HiOutlinePhone className="mb-3 h-12 w-12 text-green-500" />
              <h3 className="mb-2 text-xl font-medium text-gray-800 dark:text-gray-100">
                Call Us
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Mon - Fri, 9am - 5pm (EST)
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                +1 (555) 123-4567
              </p>
            </div>

            {/* Location (Placeholder) */}
            <div className="flex flex-col items-center text-center">
              <HiOutlineLocationMarker className="mb-3 h-12 w-12 text-purple-500" />
              <h3 className="mb-2 text-xl font-medium text-gray-800 dark:text-gray-100">
                Our Office
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                123 Tapiro Lane
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Data City, DC 54321
              </p>
            </div>
          </div>
        </section>

        {/* Chat & Support Section */}
        <section className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
              Need Help?
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="shadow-md hover:shadow-lg dark:bg-gray-800">
              <div className="flex items-start">
                <HiOutlineChatAlt2 className="mr-4 h-10 w-10 flex-shrink-0 text-teal-500" />
                <div>
                  <h3 className="mb-2 text-xl font-medium text-gray-800 dark:text-gray-100">
                    Live Chat
                  </h3>
                  <p className="mb-3 text-gray-700 dark:text-gray-300">
                    Connect with our support team instantly for quick
                    assistance. (Coming Soon)
                  </p>
                  <Button color="teal" disabled>
                    Start Chat
                  </Button>
                </div>
              </div>
            </Card>
            <Card className="shadow-md hover:shadow-lg dark:bg-gray-800">
              <div className="flex items-start">
                <HiOutlineQuestionMarkCircle className="mr-4 h-10 w-10 flex-shrink-0 text-indigo-500" />
                <div>
                  <h3 className="mb-2 text-xl font-medium text-gray-800 dark:text-gray-100">
                    Support & FAQ
                  </h3>
                  <p className="mb-3 text-gray-700 dark:text-gray-300">
                    Find answers to common questions in our comprehensive FAQ or
                    join our community forum.
                  </p>
                  <Link to="/faq">
                    {" "}
                    {/* Assuming you might have an FAQ page */}
                    <Button color="indigo" outline>
                      Visit FAQ
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
            Ready to Experience the Future of Data?
          </h2>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
            Join Tapiro today and take control of your digital identity or
            empower your business with ethical data.
          </p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
            <Link to="/register">
              <Button size="lg" color="blue">
                Get Started as a User
                <HiOutlineArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact-sales">
              <Button size="lg" color="green" outline>
                Partner as a Store
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
