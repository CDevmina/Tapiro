import {
  DocsIcon,
  BlocksIcon,
  IconsIcon,
  IllustrationsIcon,
} from "../components/icons/ResourceIcons";

export default function HomePage() {
  const CARDS = [
    {
      title: "Flowbite React Docs",
      description:
        "Learn more on how to get started and use the Flowbite React components",
      url: "https://flowbite-react.com/",
      icon: <DocsIcon />,
    },
    {
      title: "Flowbite Blocks",
      description:
        "Get started with over 450 blocks to build websites even faster",
      url: "https://flowbite.com/blocks/",
      icon: <BlocksIcon />,
    },
    {
      title: "Flowbite Icons",
      description:
        "Get started with over 650+ SVG free and open-source icons for your apps",
      url: "https://flowbite.com/icons/",
      icon: <IconsIcon />,
    },
    {
      title: "Flowbite Illustrations",
      description:
        "Start using over 50+ SVG illustrations in 3D style to add character to your apps",
      url: "https://flowbite.com/illustrations/",
      icon: <IllustrationsIcon />,
    },
    {
      title: "Flowbite Pro",
      description:
        "Upgrade your development stack with more components and templates from Flowbite",
      url: "https://flowbite.com/pro/",
      icon: <img alt="Flowbite Pro logo" src="/flowbite.svg" />,
    },
    {
      title: "Flowbite Figma",
      description:
        "Use our Figma Design System to design and collaborate better within your team",
      url: "https://flowbite.com/figma/",
      icon: <img alt="Figma logo" src="/figma.svg" />,
    },
  ];

  // Removed the outer <main> tag and DarkThemeToggle from original App.tsx
  // Added container and padding for spacing within the Layout's main area
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Background pattern - kept for visual style */}
      <div className="absolute inset-0 -z-10 size-full">
        <div className="relative h-full w-full select-none">
          <img
            className="absolute right-0 min-w-dvh dark:hidden"
            alt="Pattern Light"
            src="/pattern-light.svg"
          />
          <img
            className="absolute right-0 hidden min-w-dvh dark:block"
            alt="Pattern Dark"
            src="/pattern-dark.svg"
          />
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-12">
        {" "}
        {/* Centered content */}
        <div className="relative flex flex-col items-center gap-6">
          <h1 className="relative text-center text-4xl leading-[125%] font-bold text-gray-900 dark:text-gray-200">
            Welcome to Tapiro {/* Updated Title */}
          </h1>
          <span className="inline-flex flex-wrap items-center justify-center gap-2.5 text-center">
            <span className="inline text-xl text-gray-600 dark:text-gray-400">
              Manage your preferences and data sharing easily.{" "}
              {/* Updated Subtitle */}
            </span>
            {/* You can add more introductory text here */}
          </span>
        </div>
        {/* Placeholder/Example Section - Kept from original App.tsx */}
        <div className="relative flex w-full flex-col items-start gap-6 self-stretch">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Explore Resources
          </h2>
          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
            {CARDS.map((card) => (
              <a
                key={card.title}
                href={card.url}
                target="_blank"
                rel="noopener noreferrer" // Added for security
                className="outline-primary-600 dark:outline-primary-500 group hover:border-primary-600 dark:hover:border-primary-500 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-50 outline-offset-2 focus:outline-2 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-6 p-4">
                  <div className="flex flex-1 items-center gap-2">
                    <div className="size-9">{card.icon}</div>
                    <div className="flex flex-1 flex-col items-start justify-center gap-1.5 border-l border-gray-200 pl-3.5 dark:border-gray-700">
                      <div className="w-full font-sans text-lg leading-4 font-semibold text-gray-900 dark:text-gray-200">
                        {card.title}
                      </div>
                      <div className="w-full font-sans text-sm leading-5 font-normal text-gray-500 dark:text-gray-400">
                        {card.description}
                      </div>
                    </div>
                  </div>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="group-hover:text-primary-600 dark:group-hover:text-primary-500 h-6 w-6 text-gray-500 transition-transform group-hover:translate-x-1"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M14.2929 7.29289C14.6834 6.90237 15.3166 6.90237 15.7071 7.29289L19.7071 11.2929C19.8946 11.4804 20 11.7348 20 12C20 12.2652 19.8946 12.5196 19.7071 12.7071L15.7071 16.7071C15.3166 17.0976 14.6834 17.0976 14.2929 16.7071C13.9024 16.3166 13.9024 15.6834 14.2929 15.2929L16.5858 13H5C4.44772 13 4 12.5523 4 12C4 11.4477 4.44772 11 5 11H16.5858L14.2929 8.70711C13.9024 8.31658 13.9024 7.68342 14.2929 7.29289Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
