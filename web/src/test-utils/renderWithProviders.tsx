import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthContext, AuthContextProps } from "../context/AuthContextType"; // Adjust path if needed

// Create a default mock auth context value
const defaultMockAuth: AuthContextProps = {
  isLoading: false,
  isAuthenticated: false,
  user: undefined,
  userRoles: [],
  getAccessToken: async () => "mock-token",
  login: async () => {},
  logout: async () => {},
  tokenError: null,
  refreshTokens: async () => {},
};

// Create a query client instance for tests
const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
    },
  },
});

interface RenderWithProvidersOptions extends RenderOptions {
  initialRoutes?: string[];
  mockAuth?: Partial<AuthContextProps>;
}

const renderWithProviders = (
  ui: ReactElement,
  {
    initialRoutes = ["/"],
    mockAuth = {},
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) => {
  const authValue = { ...defaultMockAuth, ...mockAuth };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={testQueryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={initialRoutes}>
          {/* Wrap in Routes to allow Route components */}
          <Routes>
            {/* Render the UI within a Route to match paths */}
            <Route path="*" element={children} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export * from "@testing-library/react";
export { renderWithProviders };
