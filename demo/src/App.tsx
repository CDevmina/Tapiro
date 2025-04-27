import { useState, useEffect, useMemo } from "react"; // Added useMemo
import { UserEmailModal } from "./components/UserEmailModal";
import { SearchBar } from "./components/SearchBar";
import { ProductList } from "./components/ProductList"; // Import ProductList
import { sampleProducts, Product } from "./data/products"; // Import products and type

// Define PreferenceItem structure based on your API response (#preference_retrieval.md)
interface PreferenceItem {
  category: string; // Category ID
  score: number; // 0.0 to 1.0
  attributes?: Record<string, Record<string, number>>; // Optional attribute preferences
}

// Define UserPreferences structure based on API response
interface UserPreferences {
  userId: string;
  preferences: PreferenceItem[];
  updatedAt: string;
}

function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // --- Product and Preference State ---
  const [allProducts] = useState<Product[]>(sampleProducts); // Keep original list
  const [displayedProducts, setDisplayedProducts] =
    useState<Product[]>(sampleProducts); // Products to show (filtered/sorted)
  const [preferences, setPreferences] = useState<PreferenceItem[] | null>(null);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccessMessage, setApiSuccessMessage] = useState<string | null>(
    null
  );

  // Get API details from environment variables
  const apiUrl = import.meta.env.VITE_TAPIRO_API_URL;
  const apiKey = import.meta.env.VITE_STORE_API_KEY;

  // --- Effects ---
  useEffect(() => {
    const storedEmail = localStorage.getItem("tapiroDemoUserEmail");
    if (storedEmail) {
      setUserEmail(storedEmail);
    } else {
      setIsModalOpen(true);
    }
  }, []);

  // Fetch preferences when userEmail changes
  useEffect(() => {
    if (userEmail) {
      fetchPreferences(userEmail);
    } else {
      // Reset when email is cleared
      setPreferences(null);
      setDisplayedProducts(allProducts); // Show default order
      setApiError(null);
      setApiSuccessMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]); // Dependency on userEmail

  // Filter/Sort products based on preferences and search query
  useEffect(() => {
    let filtered = [...allProducts];

    // Basic search filtering (client-side)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description?.toLowerCase().includes(lowerQuery) ||
          p.categoryId.includes(lowerQuery)
      );
    }

    // Sort by preference score if preferences are loaded
    if (preferences && preferences.length > 0) {
      const prefMap = new Map(
        preferences.map((p) => [p.category, p.score ?? 0])
      );
      const getScore = (product: Product): number => {
        // Basic score: category match
        let score = prefMap.get(product.categoryId) ?? 0;

        // Bonus for attribute matches (simple example)
        if (product.attributes && prefMap.has(product.categoryId)) {
          const categoryPrefs = preferences.find(
            (p) => p.category === product.categoryId
          );
          if (categoryPrefs?.attributes) {
            for (const attrKey in product.attributes) {
              if (
                categoryPrefs.attributes[attrKey]?.[product.attributes[attrKey]]
              ) {
                score += 0.1; // Small bonus for each matching attribute value
              }
            }
          }
        }
        return score;
      };
      filtered.sort((a, b) => getScore(b) - getScore(a));
    }

    setDisplayedProducts(filtered);
  }, [allProducts, preferences, searchQuery]); // Re-run when these change

  // --- Handlers ---
  const handleEmailSubmit = (email: string) => {
    setUserEmail(email);
    setIsModalOpen(false);
    if (email) {
      localStorage.setItem("tapiroDemoUserEmail", email);
    } else {
      localStorage.removeItem("tapiroDemoUserEmail");
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Submit search data if user is set
    if (userEmail && query) {
      submitSearchData(userEmail, query);
    }
  };

  const handleProductClick = (product: Product) => {
    console.log(`Product clicked: ${product.name}`); // Placeholder
    // Submit view data if user is set
    if (userEmail) {
      submitInteractionData(userEmail, "view", product); // Using 'view' as dataType
    }
  };

  // --- API Call Functions ---
  const makeApiCall = async (
    endpoint: string,
    method: "GET" | "POST",
    body?: unknown,
    showSuccess = false // Flag to show success message
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    setIsLoadingPrefs(method === "GET"); // Only show loading for GET for now
    setApiError(null);
    setApiSuccessMessage(null);

    if (!apiKey || !apiUrl) {
      const errorMsg = "API Key or URL is missing. Check .env file.";
      setApiError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseData?.message ||
          response.statusText ||
          `HTTP error ${response.status}`;
        throw new Error(errorMessage);
      }

      if (showSuccess) {
        setApiSuccessMessage(
          responseData?.message ||
            `${method} request successful (Status: ${response.status})`
        );
        // Auto-clear success message after a few seconds
        setTimeout(() => setApiSuccessMessage(null), 3000);
      }
      return { success: true, data: responseData };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error(`API call failed: ${message}`);
      setApiError(`API Error: ${message}`);
      return { success: false, error: message };
    } finally {
      setIsLoadingPrefs(false);
    }
  };

  const fetchPreferences = async (email: string) => {
    const result = await makeApiCall(
      `/users/${encodeURIComponent(email)}/preferences`,
      "GET"
    );
    if (result.success && result.data) {
      // Assuming result.data matches the UserPreferences structure
      const prefsData = result.data as UserPreferences;
      setPreferences(prefsData.preferences || []);
    } else {
      setPreferences(null); // Clear prefs on error
    }
  };

  // Generic function to submit interaction data (view, search, purchase etc.)
  // NOTE: Your current API expects 'purchase' or 'search'. We might need a 'view' type later.
  // For now, let's adapt 'search' for views and searches.
  const submitInteractionData = async (
    email: string,
    dataType: "search" | "purchase" | "view",
    data: Product | string
  ) => {
    if (!email) return;

    let payload;
    const timestamp = new Date().toISOString();

    if (dataType === "view" && typeof data === "object") {
      // Adapt 'view' to fit the 'search' structure for now, or create a generic event structure
      // Option 1: Send as 'search' with product details in query/metadata
      payload = {
        email: email,
        dataType: "search", // Using 'search' for now
        entries: [
          {
            timestamp: timestamp,
            query: `viewed: ${data.name}`, // Indicate view in query
            category: data.categoryId, // Include category
            // Potentially add clicked item ID if API supports it
          },
        ],
        metadata: { source: "demo-store-view", productId: data.id },
      };
    } else if (dataType === "search" && typeof data === "string") {
      payload = {
        email: email,
        dataType: "search",
        entries: [
          {
            timestamp: timestamp,
            query: data,
            // category: 'optional_category_if_known'
          },
        ],
        metadata: { source: "demo-store-search" },
      };
    } else if (dataType === "purchase" && typeof data === "object") {
      payload = {
        email: email,
        dataType: "purchase",
        entries: [
          {
            timestamp: timestamp,
            items: [
              {
                sku: data.id, // Use product ID as SKU
                name: data.name,
                category: data.categoryId,
                price: data.price,
                quantity: 1, // Assume quantity 1 for demo
                attributes: data.attributes,
              },
            ],
            totalValue: data.price, // Assume single item purchase
          },
        ],
        metadata: { source: "demo-store-purchase" },
      };
    } else {
      console.warn("Invalid data type or data for submission");
      return;
    }

    // Make the API call, show success message briefly
    await makeApiCall("/users/data", "POST", payload, true);
    // Optionally: Refetch preferences immediately after submission?
    // await fetchPreferences(email);
  };

  // Specific handler for search submission
  const submitSearchData = (email: string, query: string) => {
    submitInteractionData(email, "search", query);
  };

  // --- Recommended Product IDs ---
  const recommendedProductIds = useMemo(() => {
    const ids = new Set<string>();
    if (preferences && preferences.length > 0) {
      const prefMap = new Map(
        preferences.map((p) => [p.category, p.score ?? 0])
      );
      displayedProducts.forEach((p) => {
        const score = prefMap.get(p.categoryId) ?? 0;
        if (score > 0.5) {
          // Example threshold for "recommended"
          ids.add(p.id);
        }
      });
    }
    return ids;
  }, [preferences, displayedProducts]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <UserEmailModal isOpen={isModalOpen} onSubmit={handleEmailSubmit} />

      <header className="sticky top-0 z-10 bg-white p-4 shadow-md dark:bg-gray-800">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tapiro Demo Store
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {userEmail ? `Simulating as: ${userEmail}` : "Not signed in"}
            {userEmail && (
              <button
                onClick={() => handleEmailSubmit("")}
                className="ml-2 text-xs text-red-500 hover:underline"
              >
                (Change User)
              </button>
            )}
          </div>
          <div className="w-full md:w-auto">
            {" "}
            {/* Ensure search bar wraps correctly */}
            <SearchBar onSearch={handleSearch} initialQuery={searchQuery} />
          </div>
        </div>
        {/* Display API Status Messages */}
        {apiError && (
          <div className="container mx-auto mt-2 rounded border border-red-400 bg-red-100 p-2 text-center text-sm text-red-700 dark:border-red-600 dark:bg-red-900 dark:text-red-200">
            {apiError}
          </div>
        )}
        {apiSuccessMessage && (
          <div className="container mx-auto mt-2 rounded border border-green-400 bg-green-100 p-2 text-center text-sm text-green-700 dark:border-green-600 dark:bg-green-900 dark:text-green-200">
            {apiSuccessMessage}
          </div>
        )}
      </header>

      <main className="container mx-auto p-4">
        {/* Product List Area */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Products"}
            {isLoadingPrefs && (
              <span className="ml-2 text-sm text-gray-500">
                (Loading Preferences...)
              </span>
            )}
          </h2>
          <ProductList
            products={displayedProducts}
            onProductClick={handleProductClick}
            recommendedProductIds={recommendedProductIds}
          />
        </div>
      </main>

      <footer className="mt-8 bg-gray-200 p-4 text-center text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        Tapiro Demo Store - {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default App;
