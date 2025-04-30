// filepath: /Users/cdevmina/Projects/Tapiro/web/src/setupTests.ts
import { afterEach, beforeAll, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest"; // Use /vitest import
import { server } from "./mocks/server"; // Import the MSW server

// Establish API mocking before all tests.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => {
  server.resetHandlers();
  // Runs a cleanup after each test case (e.g., clearing jsdom)
  cleanup();
});

// Clean up after the tests are finished.
afterAll(() => server.close());

// Optional: Mock matchMedia for components that use it (like Flowbite)
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});
