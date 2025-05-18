import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import {
  HiOutlineClipboardList,
  HiOutlineCode,
  HiOutlineKey,
  HiOutlineCloudUpload,
  HiOutlineCloudDownload,
  HiOutlineBookOpen,
  HiOutlineExclamationCircle,
  HiOutlineLink,
  HiOutlineHeart,
} from "react-icons/hi";

// Helper for section titles
const SectionTitle = ({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: React.ElementType;
}) => (
  <div className="mb-8 pt-5">
    {" "}
    {/* Increased mb and added pt for spacing before title */}
    {Icon && <Icon className="mr-3 h-7 w-7 text-blue-600 dark:text-blue-500" />}
    <h3
      id={title.toLowerCase().replace(/\s+/g, "-")}
      className="scroll-mt-20 text-2xl font-semibold text-gray-900 dark:text-white" // Added scroll-mt-20 for scroll offset
    >
      {title}
    </h3>
  </div>
);

// Define sidebarLinks outside the component as it's static
const sidebarLinks = [
  { title: "Introduction", href: "#introduction" },
  { title: "Authentication", href: "#authentication" },
  { title: "Base URL", href: "#base-url" },
  { title: "Core Concepts", href: "#core-concepts" },
  {
    title: "Endpoints",
    href: "#endpoints",
    sublinks: [
      { title: "Submit User Data", href: "#submit-user-data" },
      {
        title: "Retrieve User Preferences",
        href: "#retrieve-user-preferences",
      },
      { title: "Health Check", href: "#health-check" },
    ],
  },
  { title: "Taxonomy", href: "#taxonomy" },
  {
    title: "Data Schemas",
    href: "#data-schemas",
    sublinks: [
      { title: "UserData", href: "#schema-userdata" },
      { title: "PurchaseEntry", href: "#schema-purchaseentry" },
      { title: "PurchaseItem", href: "#schema-purchaseitem" },
      { title: "SearchEntry", href: "#schema-searcheentry" },
      { title: "UserPreferences", href: "#schema-userpreferences" },
      { title: "PreferenceItem", href: "#schema-preferenceitem" },
      { title: "Error", href: "#schema-error" },
    ],
  },
  { title: "Error Handling", href: "#error-handling" },
  { title: "Code Examples", href: "#code-examples" },
];

interface LocalCodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

const LocalCodeBlock: React.FC<LocalCodeBlockProps> = ({
  code,
  language,
  className,
}) => {
  // Refactored to use Tailwind classes for both light and dark mode
  return (
    <pre
      className={`my-4 overflow-x-auto rounded-md border border-gray-200 bg-gray-100 p-4 font-mono text-sm break-all whitespace-pre-wrap shadow-sm dark:border-gray-600 dark:bg-gray-700 ${/* Added margin for spacing */ ""} ${className || ""} `}
    >
      <code className={`language-${language} text-gray-800 dark:text-gray-200`}>
        {code.trim()}
      </code>
    </pre>
  );
};

export default function ApiDocsPage() {
  const [activeId, setActiveId] = useState(sidebarLinks[0]?.href || "");
  const observer = useRef<IntersectionObserver | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement | null>>(new Map());

  useEffect(() => {
    const currentSectionRefs = sectionRefs.current; // Capture for cleanup

    // Ensure all refs are populated
    sidebarLinks.forEach((link) => {
      if (link.href) {
        const el = document.getElementById(link.href.substring(1));
        currentSectionRefs.set(link.href, el);
      }
      link.sublinks?.forEach((sublink) => {
        if (sublink.href) {
          const el = document.getElementById(sublink.href.substring(1));
          currentSectionRefs.set(sublink.href, el);
        }
      });
    });

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Check if the element is sufficiently visible
          setActiveId(`#${entry.target.id}`);
        }
      });
    };

    observer.current = new IntersectionObserver(handleIntersect, {
      rootMargin: "-20% 0px -50% 0px", // Adjust rootMargin to trigger when section is in middle/upper part of viewport
      threshold: 0.5, // Trigger when 50% of the element is visible
    });

    const currentObserver = observer.current;

    currentSectionRefs.forEach((el) => {
      if (el) currentObserver.observe(el);
    });

    return () => {
      currentSectionRefs.forEach((el) => {
        if (el) currentObserver.unobserve(el);
      });
    };
  }, []); // sidebarLinks is now stable and defined outside, so it's not needed as a dependency

  // Function to determine if a link or its sublink is active
  const isLinkActive = (
    linkHref: string,
    sublinks?: Array<{ href: string }>,
  ) => {
    if (activeId === linkHref) return true;
    return sublinks?.some((sublink) => activeId === sublink.href);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Tapiro API Documentation
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Integrate with Tapiro to power personalized experiences ethically and
          effectively.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:space-x-8">
        {/* Sidebar */}
        <aside className="mb-8 w-full lg:mb-0 lg:w-72 lg:flex-shrink-0">
          {/* Ensure sticky div has appropriate dark mode background and border */}
          <div className="sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 shadow dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100">
              Navigation
            </h2>
            <ul className="space-y-1">
              {sidebarLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setActiveId(link.href)}
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      isLinkActive(link.href, link.sublinks)
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-white" // Active link dark styles
                        : "text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100" // Default & hover dark styles
                    }`}
                  >
                    {link.title}
                  </a>
                  {link.sublinks && (
                    <ul className="mt-1 ml-4 space-y-1 border-l border-gray-300 pl-3 dark:border-gray-600">
                      {link.sublinks.map((sublink) => (
                        <li key={sublink.href}>
                          <a
                            href={sublink.href}
                            onClick={() => setActiveId(sublink.href)}
                            className={`block rounded-md px-3 py-1.5 text-xs transition-colors duration-150 ${
                              activeId === sublink.href
                                ? "font-semibold text-blue-600 dark:text-blue-400" // Active sublink dark styles
                                : "text-gray-500 hover:bg-gray-200 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-blue-400" // Default & hover sublink dark styles
                            }`}
                          >
                            {sublink.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="w-full min-w-0 lg:flex-1">
          {/* Card already has dark:bg-gray-800 */}
          <Card className="p-6 shadow-xl dark:bg-gray-800">
            {/* Introduction Section (Example) */}
            <section
              id="introduction"
              ref={(el) => {
                sectionRefs.current.set("#introduction", el);
              }}
              className="mb-12 scroll-mt-20"
            >
              <SectionTitle title="Introduction" icon={HiOutlineBookOpen} />
              {/* Paragraphs already use dark:text-gray-300 */}
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Welcome to the Tapiro Store Operations API. This API allows your
                services (stores, e-commerce platforms) to submit user
                interaction data (like purchases and searches) for analysis and
                to retrieve processed user preferences. This enables you to
                build personalized experiences while respecting user consent and
                privacy.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Our platform leverages AI and a structured taxonomy to infer
                user interests, helping you overcome data fragmentation and
                deliver more accurate recommendations.
              </p>
            </section>

            {/* Authentication Section (Example with inline code) */}
            <section
              id="authentication"
              ref={(el) => {
                sectionRefs.current.set("#authentication", el);
              }}
              className="mb-12 scroll-mt-20"
            >
              <SectionTitle title="Authentication" icon={HiOutlineKey} />
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Include your API key in the{" "}
                {/* Inline code styling for dark mode */}
                <code className="rounded bg-gray-200 px-1 py-0.5 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  X-API-Key
                </code>{" "}
                header for every request.
              </p>
              <LocalCodeBlock
                code={`X-API-Key: YOUR_API_KEY`}
                language="text"
              />
            </section>

            {/* Base URL */}
            <section
              id="base-url"
              ref={(el) => {
                sectionRefs.current.set("#base-url", el);
              }}
              className="mb-12 scroll-mt-20"
            >
              <SectionTitle title="Base URL" icon={HiOutlineLink} />
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                The primary base URL for the Tapiro Store Operations API is:
              </p>
              <LocalCodeBlock
                code={`https://api.tapiro.com/v1`}
                language="text"
              />
              <p className="text-gray-700 dark:text-gray-300">
                Please use the appropriate URLs provided for development or
                staging environments if applicable.
              </p>
            </section>
            {/* Core Concepts */}
            <section
              id="core-concepts"
              ref={(el) => {
                sectionRefs.current.set("#core-concepts", el);
              }}
              className="mb-12 scroll-mt-20"
            >
              <SectionTitle
                title="Core Concepts"
                icon={HiOutlineClipboardList}
              />
              <ul className="list-disc space-y-3 pl-5 text-gray-700 dark:text-gray-300">
                <li>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                    User Identification:
                  </span>{" "}
                  Users are primarily identified by their email address when
                  submitting data or retrieving preferences. This email must
                  correspond to a user registered within the Tapiro ecosystem.
                </li>
                <li>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                    Consent:
                  </span>{" "}
                  Tapiro is built on user consent. Data submissions are
                  processed only if the user has granted{" "}
                  <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                    dataSharingConsent
                  </code>{" "}
                  in Tapiro and has not explicitly opted-out of sharing data
                  with your specific store. Preference retrieval will result in
                  a{" "}
                  <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                    403 Forbidden
                  </code>{" "}
                  error if consent is not granted for your store.
                </li>
                <li>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                    Taxonomy:
                  </span>{" "}
                  A hierarchical system for categorizing products and interests.
                  Using correct category IDs or names from the Tapiro Taxonomy
                  is crucial for the AI models to generate accurate preferences.
                  (See{" "}
                  <a
                    href="#taxonomy"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Taxonomy Section
                  </a>
                  ).
                </li>
                <li>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                    Rate Limiting:
                  </span>{" "}
                  (Information about rate limits, if any, would go here. E.g.,
                  "API requests are rate-limited to X requests per minute per
                  API key.")
                </li>
              </ul>
            </section>
            {/* Endpoints */}
            <section
              id="endpoints"
              ref={(el) => {
                sectionRefs.current.set("#endpoints", el);
              }}
              className="mb-12 scroll-mt-20"
            >
              <SectionTitle title="Endpoints" icon={HiOutlineCode} />

              <article
                id="submit-user-data"
                ref={(el) => {
                  sectionRefs.current.set("#submit-user-data", el);
                }}
                className="mb-10 scroll-mt-20"
              >
                {" "}
                {/* Increased mb */}
                <h4 className="mb-3 flex items-center text-xl font-medium text-gray-800 dark:text-gray-100">
                  <HiOutlineCloudUpload className="mr-2 h-6 w-6 text-green-500" />{" "}
                  POST /users/data
                </h4>
                <p className="mb-2 text-gray-700 dark:text-gray-300">
                  Submits user interaction data (purchases or searches) for
                  analysis and preference building.
                </p>
                <p className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
                  Request Body:
                </p>
                <p className="mb-2 text-gray-700 dark:text-gray-300">
                  A JSON object conforming to the{" "}
                  <a
                    href="#schema-userdata"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    UserData schema
                  </a>
                  .
                </p>
                <LocalCodeBlock
                  code={`{\n  "email": "user@example.com",\n  "dataType": "purchase", // or "search"\n  "entries": [\n    // ... PurchaseEntry or SearchEntry objects ...\n  ]\n}`}
                />
                <p className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
                  Responses:
                </p>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                  <li>
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                      202 Accepted
                    </code>
                    : Data accepted for processing.
                  </li>
                  <li>
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                      400 Bad Request
                    </code>
                    : Invalid input or schema violation.
                  </li>
                  <li>
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                      401 Unauthorized
                    </code>
                    : Invalid or missing API key.
                  </li>
                </ul>
              </article>

              <article
                id="retrieve-user-preferences"
                ref={(el) => {
                  sectionRefs.current.set("#retrieve-user-preferences", el);
                }}
                className="mb-10 scroll-mt-20"
              >
                <h4 className="mb-3 flex items-center text-xl font-medium text-gray-800 dark:text-gray-100">
                  <HiOutlineCloudDownload className="mr-2 h-6 w-6 text-blue-500" />{" "}
                  GET /users/{`{userId}`}/preferences
                </h4>
                <p className="mb-2 text-gray-700 dark:text-gray-300">
                  Retrieves processed interest preferences for a specific user.
                </p>
                <p className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
                  Path Parameter:
                </p>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                  <li>
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">{`{userId}`}</code>{" "}
                    (string, required): The email address of the user.
                  </li>
                </ul>
                <p className="mt-2 mb-1 font-semibold text-gray-800 dark:text-gray-100">
                  Example URL:
                </p>
                <LocalCodeBlock
                  code={`/users/user@example.com/preferences`}
                  language="text"
                />
                <p className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
                  Responses:
                </p>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                  <li>
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                      200 OK
                    </code>
                    : Successfully retrieved preferences. Body contains{" "}
                    <a
                      href="#schema-userpreferences"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      UserPreferences
                    </a>{" "}
                    object.
                  </li>
                  <li>
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                      401 Unauthorized
                    </code>
                    : Invalid or missing API key.
                  </li>
                  <li>
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                      403 Forbidden
                    </code>
                    : User has not consented or has opted out of sharing with
                    your store.
                  </li>
                  <li>
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                      404 Not Found
                    </code>
                    : User not found in Tapiro.
                  </li>
                </ul>
              </article>

              <article
                id="health-check"
                ref={(el) => {
                  sectionRefs.current.set("#health-check", el);
                }}
                className="mb-8 scroll-mt-20"
              >
                <h4 className="mb-3 flex items-center text-xl font-medium text-gray-800 dark:text-gray-100">
                  <HiOutlineHeart className="mr-2 h-6 w-6 text-red-500" /> GET
                  /health & GET /ping
                </h4>
                <p className="mb-2 text-gray-700 dark:text-gray-300">
                  <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                    GET /health
                  </code>
                  : Provides a comprehensive health check of the API and its
                  dependencies.
                </p>
                <p className="mb-2 text-gray-700 dark:text-gray-300">
                  <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                    GET /ping
                  </code>
                  : A simple uptime check endpoint.
                </p>
                <p className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
                  Responses (for /ping):
                </p>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                  <li>
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                      200 OK
                    </code>
                    : Body contains{" "}
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">{`{"status": "ok", "timestamp": "..."}`}</code>
                    .
                  </li>
                </ul>
              </article>
            </section>

            {/* Taxonomy Section */}
            <section
              id="taxonomy"
              ref={(el) => {
                sectionRefs.current.set("#taxonomy", el);
              }}
              className="mb-12 scroll-mt-20"
            >
              <SectionTitle title="Taxonomy" icon={HiOutlineClipboardList} />
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                The Tapiro Taxonomy is a hierarchical classification system for
                products, services, and user interests. Accurate use of this
                taxonomy is **critical** for the effectiveness of Tapiro's AI
                models in generating meaningful user preferences.
              </p>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                **Structure:** The taxonomy consists of categories, each with a
                unique ID and a human-readable name. Categories can have
                parent-child relationships to form a hierarchy.
              </p>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                **Usage:** When submitting data (e.g.,{" "}
                <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                  PurchaseItem.category
                </code>{" "}
                or{" "}
                <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                  SearchEntry.category
                </code>
                ), you must use either the category ID or the exact category
                name as defined in the Tapiro Taxonomy.
              </p>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                **Obtaining the Taxonomy:** (Details on how stores can
                access/view the taxonomy. E.g., "The full taxonomy can be
                retrieved via the `/taxonomy/categories` endpoint in the Tapiro
                Internal API if exposed, or it is provided during
                onboarding/available in your Store Dashboard.")
              </p>
              <p className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
                Example Snippet:
              </p>
              <LocalCodeBlock
                code={`[\n  { "id": "100", "name": "Electronics", "parent_id": null },\n  { "id": "101", "name": "Mobile Phones", "parent_id": "100" },\n  { "id": "10101", "name": "Smartphones", "parent_id": "101" },\n  { "id": "200", "name": "Apparel", "parent_id": null },\n  { "id": "201", "name": "Men's Clothing", "parent_id": "200" }\n]`}
              />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                It is recommended to use the most specific category ID possible
                for accurate preference inference.
              </p>
            </section>

            {/* Data Schemas */}
            <section
              id="data-schemas"
              ref={(el) => {
                sectionRefs.current.set("#data-schemas", el);
              }}
              className="mb-12 scroll-mt-20"
            >
              <SectionTitle title="Data Schemas" icon={HiOutlineCode} />
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                The following tables describe the main data objects used in API
                requests and responses.
              </p>

              {/* UserData Schema */}
              <article
                id="schema-userdata"
                ref={(el) => {
                  sectionRefs.current.set("#schema-userdata", el);
                }}
                className="mb-10 scroll-mt-20"
              >
                <h5 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-100">
                  UserData Object
                </h5>
                <div className="overflow-x-auto">
                  <Table striped>
                    <TableHead>
                      <TableHeadCell>Field</TableHeadCell>
                      <TableHeadCell>Type</TableHeadCell>
                      <TableHeadCell>Required</TableHeadCell>
                      <TableHeadCell>Description</TableHeadCell>
                    </TableHead>
                    <TableBody className="divide-y dark:divide-gray-700">
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>email</TableCell>
                        <TableCell>string (email format)</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>User's email address.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>dataType</TableCell>
                        <TableCell>
                          string (enum: "purchase", "search")
                        </TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>Type of data being submitted.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>entries</TableCell>
                        <TableCell>
                          array of (PurchaseEntry or SearchEntry)
                        </TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>Array of interaction entries.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </article>

              {/* PurchaseEntry Schema */}
              <article
                id="schema-purchaseentry"
                ref={(el) => {
                  sectionRefs.current.set("#schema-purchaseentry", el);
                }}
                className="mb-10 scroll-mt-20"
              >
                <h5 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-100">
                  PurchaseEntry Object
                </h5>
                <div className="overflow-x-auto">
                  <Table striped>
                    <TableHead>
                      <TableHeadCell>Field</TableHeadCell>
                      <TableHeadCell>Type</TableHeadCell>
                      <TableHeadCell>Required</TableHeadCell>
                      <TableHeadCell>Description</TableHeadCell>
                    </TableHead>
                    <TableBody className="divide-y dark:divide-gray-700">
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>timestamp</TableCell>
                        <TableCell>string (date-time)</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>ISO 8601 timestamp of purchase.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>items</TableCell>
                        <TableCell>array of PurchaseItem</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>List of items in the purchase.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>totalValue</TableCell>
                        <TableCell>number (float)</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>
                          Optional total value of the purchase.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </article>

              {/* PurchaseItem Schema */}
              <article
                id="schema-purchaseitem"
                ref={(el) => {
                  sectionRefs.current.set("#schema-purchaseitem", el);
                }}
                className="mb-10 scroll-mt-20"
              >
                <h5 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-100">
                  PurchaseItem Object
                </h5>
                <div className="overflow-x-auto">
                  <Table striped>
                    <TableHead>
                      <TableHeadCell>Field</TableHeadCell>
                      <TableHeadCell>Type</TableHeadCell>
                      <TableHeadCell>Required</TableHeadCell>
                      <TableHeadCell>Description</TableHeadCell>
                    </TableHead>
                    <TableBody className="divide-y dark:divide-gray-700">
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>sku</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>Stock Keeping Unit or product ID.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>name</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>Name of the item.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>category</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>
                          Category ID or name from Taxonomy.
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>price</TableCell>
                        <TableCell>number (float)</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>Price of a single unit.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>quantity</TableCell>
                        <TableCell>integer</TableCell>
                        <TableCell>No (default: 1)</TableCell>
                        <TableCell>Number of units purchased.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>attributes</TableCell>
                        <TableCell>object</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>
                          Key-value pairs of product attributes (e.g.,{" "}
                          {'{ "color": "blue", "size": "L" }'})
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </article>

              {/* SearchEntry Schema */}
              <article
                id="schema-searcheentry"
                ref={(el) => {
                  sectionRefs.current.set("#schema-searcheentry", el);
                }}
                className="mb-10 scroll-mt-20"
              >
                {" "}
                {/* Corrected ID */}
                <h5 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-100">
                  SearchEntry Object
                </h5>
                <div className="overflow-x-auto">
                  <Table striped>
                    <TableHead>
                      <TableHeadCell>Field</TableHeadCell>
                      <TableHeadCell>Type</TableHeadCell>
                      <TableHeadCell>Required</TableHeadCell>
                      <TableHeadCell>Description</TableHeadCell>
                    </TableHead>
                    <TableBody className="divide-y dark:divide-gray-700">
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>timestamp</TableCell>
                        <TableCell>string (date-time)</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>ISO 8601 timestamp of search.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>query</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>The search query string.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>category</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>
                          Optional category context for the search (from
                          Taxonomy).
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>results</TableCell>
                        <TableCell>integer</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>
                          Optional number of results returned.
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>clicked</TableCell>
                        <TableCell>array of string</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>
                          Optional list of product IDs/SKUs clicked from
                          results.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </article>

              {/* UserPreferences Schema */}
              <article
                id="schema-userpreferences"
                ref={(el) => {
                  sectionRefs.current.set("#schema-userpreferences", el);
                }}
                className="mb-10 scroll-mt-20"
              >
                <h5 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-100">
                  UserPreferences Object (Response for GET /users/{`{userId}`}
                  /preferences)
                </h5>
                <div className="overflow-x-auto">
                  <Table striped>
                    <TableHead>
                      <TableHeadCell>Field</TableHeadCell>
                      <TableHeadCell>Type</TableHeadCell>
                      <TableHeadCell>Description</TableHeadCell>
                    </TableHead>
                    <TableBody className="divide-y dark:divide-gray-700">
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>userId</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>Tapiro's internal User ID.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>preferences</TableCell>
                        <TableCell>array of PreferenceItem</TableCell>
                        <TableCell>
                          List of user's interest preferences.
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>updatedAt</TableCell>
                        <TableCell>string (date-time)</TableCell>
                        <TableCell>
                          Timestamp of when preferences were last updated.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </article>

              {/* PreferenceItem Schema */}
              <article
                id="schema-preferenceitem"
                ref={(el) => {
                  sectionRefs.current.set("#schema-preferenceitem", el);
                }}
                className="mb-10 scroll-mt-20"
              >
                <h5 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-100">
                  PreferenceItem Object
                </h5>
                <div className="overflow-x-auto">
                  <Table striped>
                    <TableHead>
                      <TableHeadCell>Field</TableHeadCell>
                      <TableHeadCell>Type</TableHeadCell>
                      <TableHeadCell>Required</TableHeadCell>
                      <TableHeadCell>Description</TableHeadCell>
                    </TableHead>
                    <TableBody className="divide-y dark:divide-gray-700">
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>category</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>
                          Category ID or name from Taxonomy.
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>score</TableCell>
                        <TableCell>number (float, 0.0-1.0)</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>Interest score for this category.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>attributes</TableCell>
                        <TableCell>object</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>
                          Category-specific attribute preferences (e.g.,{" "}
                          {'{ "brand": "Nike", "color_preference_score": 0.8 }'}
                          )
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </article>

              {/* Error Schema */}
              <article
                id="schema-error"
                ref={(el) => {
                  sectionRefs.current.set("#schema-error", el);
                }}
                className="mb-10 scroll-mt-20"
              >
                <h5 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-100">
                  Error Object (Standard Error Response)
                </h5>
                <div className="overflow-x-auto">
                  <Table striped>
                    <TableHead>
                      <TableHeadCell>Field</TableHeadCell>
                      <TableHeadCell>Type</TableHeadCell>
                      <TableHeadCell>Required</TableHeadCell>
                      <TableHeadCell>Description</TableHeadCell>
                    </TableHead>
                    <TableBody className="divide-y dark:divide-gray-700">
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>code</TableCell>
                        <TableCell>integer</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>HTTP status code.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>message</TableCell>
                        <TableCell>string</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>Description of the error.</TableCell>
                      </TableRow>
                      <TableRow className="bg-white dark:bg-gray-800">
                        <TableCell>details</TableCell>
                        <TableCell>object</TableCell>
                        <TableCell>No</TableCell>
                        <TableCell>
                          Additional error details (e.g., field validation
                          issues).
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </article>
            </section>

            {/* Error Handling */}
            <section
              id="error-handling"
              ref={(el) => {
                sectionRefs.current.set("#error-handling", el);
              }}
              className="mb-12 scroll-mt-20"
            >
              <SectionTitle
                title="Error Handling"
                icon={HiOutlineExclamationCircle}
              />
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                Tapiro API uses standard HTTP status codes to indicate the
                success or failure of an API request.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-gray-700 dark:text-gray-300">
                <li>
                  <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                    2xx
                  </code>{" "}
                  codes indicate success.
                </li>
                <li>
                  <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                    4xx
                  </code>{" "}
                  codes indicate client-side errors (e.g., bad input,
                  authentication failure, insufficient permissions). Check the
                  response body for an{" "}
                  <a
                    href="#schema-error"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Error object
                  </a>{" "}
                  with details.
                </li>
                <li>
                  <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                    5xx
                  </code>{" "}
                  codes indicate server-side errors. Please retry after a short
                  delay or contact support if the issue persists.
                </li>
              </ul>
            </section>

            {/* Code Examples */}
            <section
              id="code-examples"
              ref={(el) => {
                sectionRefs.current.set("#code-examples", el);
              }}
              className="scroll-mt-20"
            >
              {" "}
              {/* Removed mb-12 for last section */}
              <SectionTitle title="Code Examples" icon={HiOutlineCode} />
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                Below are basic examples of how to interact with the API.
              </p>
              <h5 className="mt-4 mb-2 text-lg font-medium text-gray-800 dark:text-gray-100">
                Submitting Purchase Data (Conceptual JavaScript Example)
              </h5>
              <LocalCodeBlock
                code={`async function submitPurchaseData(apiKey, userDataPayload) {\n  const response = await fetch('https://api.tapiro.com/v1/users/data', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json',\n      'X-API-Key': apiKey\n    },\n    body: JSON.stringify(userDataPayload)\n  });\n  if (!response.ok) {\n    const errorData = await response.json();\n    console.error('API Error:', errorData);\n    throw new Error(errorData.message || 'Failed to submit data');\n  }\n  return response.status; // 202 if successful\n}\n\n// Example Usage:\nconst purchasePayload = {\n  email: "customer@example.com",\n  dataType: "purchase",\n  entries: [\n    {\n      timestamp: new Date().toISOString(),\n      items: [\n        {\n          sku: "PROD123",\n          name: "Awesome T-Shirt",\n          category: "201", // From Taxonomy\n          price: 29.99,\n          quantity: 1\n        }\n      ]\n    }\n  ]\n};\n// submitPurchaseData('YOUR_ACTUAL_API_KEY', purchasePayload);`}
                language="javascript"
              />
              <h5 className="mt-4 mb-2 text-lg font-medium text-gray-800 dark:text-gray-100">
                Retrieving User Preferences (Conceptual JavaScript Example)
              </h5>
              <LocalCodeBlock
                code={`async function getUserPreferences(apiKey, userEmail) {\n  const response = await fetch(\`https://api.tapiro.com/v1/users/\${encodeURIComponent(userEmail)}/preferences\`, {\n    headers: {\n      'X-API-Key': apiKey\n    }\n  });\n  if (!response.ok) {\n    const errorData = await response.json();\n    console.error('API Error:', errorData);\n    throw new Error(errorData.message || 'Failed to retrieve preferences');\n  }\n  return await response.json();\n}\n\n// Example Usage:\n// getUserPreferences('YOUR_ACTUAL_API_KEY', 'customer@example.com');`}
                language="javascript"
              />
            </section>
          </Card>
        </main>
      </div>
    </div>
  );
}
