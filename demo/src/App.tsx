import { useState, useEffect, useMemo } from "react"; // Added useMemo
import { UserEmailModal } from "./components/UserEmailModal";
import { ApiKeyModal } from "./components/ApiKeyModal"; // Import ApiKeyModal
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

// --- NEW: Define types for simulated purchase data ---
interface SimulatedPurchaseItem {
  sku: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  attributes: Record<string, string | number | boolean>; // Or a more specific type if attributes have a consistent structure
}

interface SimulatedPurchaseEntry {
  timestamp: string; // ISO 8601 format
  items: SimulatedPurchaseItem[];
  totalValue: number;
}
// --- END NEW: Define types ---

// Simple map for category IDs to names for the demo
const categoryNameMap: Record<string, string> = {
  "100": "Electronics",
  "101": "Mobile Phones",
  "102": "Laptops",
  "103": "Tablets",
  "104": "Wearables",
  "105": "Audio Devices",
  "200": "Fashion",
  "201": "Apparel",
  "202": "Footwear",
  "300": "Home Goods",
  "301": "Furniture",
  "302": "Kitchenware",
  "303": "Gardening",
  "304": "Home Improvement",
  "400": "Beauty & Personal Care",
  "401": "Skincare",
  "402": "Makeup",
  "500": "Media",
  "501": "Books",
  "502": "Movies & Music",
  "600": "Health & Wellness",
  "700": "Toys & Kids",
  "701": "Baby Gear",
  "702": "Kids Clothing",
  "800": "Office Supplies",
  "900": "Gaming",
  "1100": "Grocery",
  "1101": "Pantry Goods",
  "1200": "Jewelry & Watches",
  "1300": "Gifts",
  "1400": "Software",
};

// --- NEW: Products designed to trigger demographic inference ---
const demographicTriggerProducts: Product[] = [
  {
    id: "sim-p1",
    name: "Organic Baby Food Variety Pack",
    price: 25,
    imageUrl: "/products/apples.webp", // Placeholder image
    categoryId: "701", // Baby Gear
    attributes: { type: "food", dietary_preference: "organic" },
    description: "A selection of organic purees for infants.",
  },
  {
    id: "sim-p2",
    name: "Luxury Wedding Anniversary Gift Basket",
    price: 75,
    imageUrl: "/products/giftbasket.webp", // Placeholder image
    categoryId: "1300", // Gifts
    attributes: { occasion: "anniversary", recipient: "couple" },
    description: "Perfect for celebrating a wedding anniversary.",
  },
  {
    id: "sim-p3",
    name: "University Student Textbook: Advanced Statistics",
    price: 120,
    imageUrl: "/products/fictionnoval.webp", // Placeholder image
    categoryId: "501", // Books
    attributes: { genre: "academic", subject: "statistics" },
    description: "Required textbook for university-level statistics course.",
  },
  {
    id: "sim-p4",
    name: "Men's Classic Leather Wallet",
    price: 45,
    imageUrl: "/products/tshirt.webp", // Placeholder image, replace with actual if available
    categoryId: "201", // Apparel (could be accessories)
    attributes: { type: "wallet", gender: "men", material: "leather" },
    description: "A stylish and durable leather wallet for men.",
  },
  {
    id: "sim-p5",
    name: "Women's Floral Print Summer Dress",
    price: 60,
    imageUrl: "/products/tshirt.webp", // Placeholder image, replace with actual if available
    categoryId: "201", // Apparel
    attributes: { type: "dress", gender: "women", season: "summer" },
    description: "A light and airy floral dress for women.",
  },
  {
    id: "sim-p6",
    name: "Professional Business Laptop Bag",
    price: 80,
    imageUrl: "/products/suitecase.webp", // Placeholder image
    categoryId: "800", // Office Supplies (or a more specific category if available)
    attributes: { type: "bag", use: "business", material: "nylon" },
    description:
      "A durable and professional bag for carrying laptops and documents.",
  },
  {
    id: "sim-p7",
    name: "Newborn Baby Essentials Set (Diapers, Wipes, Onesies)",
    price: 55,
    imageUrl: "/products/genpens.webp", // Placeholder image
    categoryId: "701", // Baby Gear
    attributes: { type: "newborn_set", contents: "diapers_wipes_onesies" },
    description: "A complete starter set for a newborn baby.",
  },
];
// --- END NEW: Products ---

function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null); // State for API Key
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false); // State for API Key Modal
  const [searchQuery, setSearchQuery] = useState<string>("");
  // --- Product and Preference State ---
  const [allProducts] = useState<Product[]>(sampleProducts); // Keep original list
  const [displayedProducts, setDisplayedProducts] =
    useState<Product[]>(sampleProducts); // Products to show (filtered/sorted)
  const [preferences, setPreferences] = useState<PreferenceItem[] | null>(null);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState<boolean>(false);
  const [isSimulatingData, setIsSimulatingData] = useState<boolean>(false); // --- NEW: Loading state for simulation ---
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccessMessage, setApiSuccessMessage] = useState<string | null>(
    null
  );

  // Get API details from environment variables (only URL now)
  const apiUrl = import.meta.env.VITE_STORE_API_URL || "http://localhost:3001";

  // --- Effects ---
  useEffect(() => {
    // Check for stored API Key first
    const storedApiKey = localStorage.getItem("tapiroDemoApiKey");
    if (storedApiKey) {
      setApiKey(storedApiKey);
      // Then check for stored Email
      const storedEmail = localStorage.getItem("tapiroDemoUserEmail");
      if (storedEmail) {
        setUserEmail(storedEmail);
      } else {
        setIsEmailModalOpen(true); // Open email modal if API key exists but email doesn't
      }
    } else {
      setIsApiKeyModalOpen(true); // Open API key modal if it's not stored
    }
  }, []);

  // Fetch preferences when userEmail and apiKey change
  useEffect(() => {
    if (userEmail && apiKey) {
      // Check for both email and apiKey
      fetchPreferences(userEmail);
    } else {
      // Reset when email or apiKey is cleared
      setPreferences(null);
      setDisplayedProducts(allProducts); // Show default order
      setApiError(null);
      setApiSuccessMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, apiKey]); // Dependency on userEmail and apiKey

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
      const getScore = (product: Product): number => {
        const categoryPreference = preferences.find((p) => {
          const prefCat = p.category;
          const prodCat = product.categoryId;
          // Match if exact, or if prefCat is a prefix of prodCat AND
          // (lengths are same OR the char in prodCat after prefCat prefix is not '0' - heuristic for demo)
          return (
            prodCat.startsWith(prefCat) &&
            (prodCat.length === prefCat.length ||
              (prefCat.length < prodCat.length &&
                prodCat.charAt(prefCat.length) !== "0"))
          );
        });

        if (!categoryPreference) {
          return 0; // No preference for this category
        }

        let score = categoryPreference.score; // Base score from category

        // Add bonus for attribute matches
        if (product.attributes && categoryPreference.attributes) {
          let attributeBonus = 0;
          let matchingAttributes = 0;
          const prefAttributes = categoryPreference.attributes;

          for (const attrKey in product.attributes) {
            const productAttrValue = String(
              product.attributes[attrKey]
            ).toLowerCase();
            if (prefAttributes[attrKey]) {
              // Check if the specific product attribute value has a score
              if (prefAttributes[attrKey][productAttrValue]) {
                attributeBonus += prefAttributes[attrKey][productAttrValue]; // Add the specific attribute value's score
                matchingAttributes++;
              } else {
                // If the exact value isn't scored, check if the attribute key itself has a general preference
                // This handles cases where preference is for "brand: Apple" but product has "brand: Apple, color: Red"
                // and "brand" itself might have a score in preferences if not specific value.
                // For simplicity, let's assume if the attribute key (e.g., "brand") exists in preferences, it's a partial match.
                // A more complex logic could assign a smaller bonus here.
                // For now, we only reward exact value matches from prefAttributes.
              }
            }
          }
          // Normalize bonus by number of matching attributes to avoid overly penalizing products with many attributes
          if (matchingAttributes > 0) {
            // Example: Add average bonus of matched attributes.
            // You might want a different logic, e.g., sum of bonuses, or cap the bonus.
            score += attributeBonus / matchingAttributes;
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
    setIsEmailModalOpen(false);
    if (email) {
      localStorage.setItem("tapiroDemoUserEmail", email);
    } else {
      localStorage.removeItem("tapiroDemoUserEmail");
    }
  };

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setIsApiKeyModalOpen(false);
    localStorage.setItem("tapiroDemoApiKey", key);
    // After setting API key, check if we need to ask for email
    if (!userEmail) {
      const storedEmail = localStorage.getItem("tapiroDemoUserEmail");
      if (!storedEmail) {
        setIsEmailModalOpen(true);
      } else {
        setUserEmail(storedEmail);
      }
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Submit search data if user and key are set
    if (userEmail && apiKey && query) {
      submitSearchData(userEmail, query);
    }
  };

  const handleProductClick = (product: Product) => {
    console.log(`Product clicked (View): ${product.name}`);
    if (userEmail && apiKey) {
      submitInteractionData(userEmail, "view", product);
    }
  };

  const handlePurchaseClick = (product: Product) => {
    console.log(`Product purchased: ${product.name}`);
    if (userEmail && apiKey) {
      submitInteractionData(userEmail, "purchase", product);
    }
  };

  // --- NEW: Handler for Simulate Bulk Data ---
  const handleSimulateBulkData = async () => {
    if (!userEmail || !apiKey) {
      setApiError("Please set User Email and API Key before simulating data.");
      if (!apiKey) setIsApiKeyModalOpen(true);
      else if (!userEmail) setIsEmailModalOpen(true);
      return;
    }

    setIsSimulatingData(true);
    setApiSuccessMessage(null);
    setApiError(null);

    const allPurchaseEntries: SimulatedPurchaseEntry[] = [];
    const numMonths = 6;
    const purchasesPerWeekMin = 1;
    const purchasesPerWeekMax = 3;
    const itemsPerPurchaseMin = 1;
    const itemsPerPurchaseMax = 3;
    const today = new Date();

    // --- Define focused product pools ---
    const kidsTriggerProducts = demographicTriggerProducts.filter(
      (p) => ["sim-p1", "sim-p7"].includes(p.id) // Organic Baby Food, Newborn Essentials
    );
    const marriedTriggerProducts = demographicTriggerProducts.filter(
      (p) => p.id === "sim-p2" // Luxury Wedding Anniversary Gift Basket
    );
    const maleTriggerProducts = demographicTriggerProducts.filter(
      (p) => p.id === "sim-p4" // Men's Classic Leather Wallet
    );
    const femaleTriggerProducts = demographicTriggerProducts.filter(
      (p) => p.id === "sim-p5" // Women's Floral Print Summer Dress
    );

    const highlyTargetedProducts = Array.from(
      new Set([
        ...kidsTriggerProducts,
        ...marriedTriggerProducts,
        ...maleTriggerProducts,
        ...femaleTriggerProducts,
      ])
    );

    // Products for general variety, excluding those already in highlyTargetedProducts
    const varietyPool = [
      ...sampleProducts,
      ...demographicTriggerProducts.filter(
        (p) => !highlyTargetedProducts.find((ht) => ht.id === p.id)
      ),
    ];

    // Fallback pool, same as original
    const combinedProductPool = [
      ...sampleProducts,
      ...demographicTriggerProducts,
    ];
    // --- End focused product pools ---

    for (let week = 0; week < numMonths * 4; week++) {
      const purchasesThisWeek =
        Math.floor(
          Math.random() * (purchasesPerWeekMax - purchasesPerWeekMin + 1)
        ) + purchasesPerWeekMin;
      for (let p = 0; p < purchasesThisWeek; p++) {
        const simDate = new Date(today);
        simDate.setDate(
          today.getDate() - week * 7 - Math.floor(Math.random() * 7)
        ); // Random day within the target week
        simDate.setHours(
          Math.floor(Math.random() * 24),
          Math.floor(Math.random() * 60),
          Math.floor(Math.random() * 60)
        );

        const purchaseItems: SimulatedPurchaseItem[] = [];
        let totalValue = 0;
        const numItems =
          Math.floor(
            Math.random() * (itemsPerPurchaseMax - itemsPerPurchaseMin + 1)
          ) + itemsPerPurchaseMin;

        for (let i = 0; i < numItems; i++) {
          let productToPurchase: Product;
          const randomChoice = Math.random();

          // 70% chance to pick a product focused on kids, marriage, or gender
          if (randomChoice < 0.7 && highlyTargetedProducts.length > 0) {
            productToPurchase =
              highlyTargetedProducts[
                Math.floor(Math.random() * highlyTargetedProducts.length)
              ];
          }
          // 30% chance for a product from the general variety pool
          else {
            if (varietyPool.length > 0) {
              productToPurchase =
                varietyPool[Math.floor(Math.random() * varietyPool.length)];
            } else if (highlyTargetedProducts.length > 0) {
              // Fallback if variety pool is empty
              productToPurchase =
                highlyTargetedProducts[
                  Math.floor(Math.random() * highlyTargetedProducts.length)
                ];
            } else if (combinedProductPool.length > 0) {
              // Absolute fallback
              productToPurchase =
                combinedProductPool[
                  Math.floor(Math.random() * combinedProductPool.length)
                ];
            } else {
              console.error("CRITICAL: No products available for simulation!");
              // If this happens, the simulation might generate empty purchases or fail.
              // Consider adding a default placeholder product or stopping simulation.
              // For now, we'll let it proceed, but it indicates a setup issue.
              continue; // Skip this item if no product can be selected
            }
          }

          purchaseItems.push({
            sku: productToPurchase.id,
            name: productToPurchase.name,
            category: productToPurchase.categoryId,
            price: productToPurchase.price,
            quantity: 1,
            attributes: productToPurchase.attributes || {},
          });
          totalValue += productToPurchase.price;
        }

        if (purchaseItems.length > 0) {
          allPurchaseEntries.push({
            timestamp: simDate.toISOString(),
            items: purchaseItems,
            totalValue: totalValue,
          });
        }
      }
    }

    if (allPurchaseEntries.length === 0) {
      setApiError("No purchase entries generated for simulation.");
      setIsSimulatingData(false);
      return;
    }

    const payload = {
      email: userEmail,
      dataType: "purchase",
      entries: allPurchaseEntries,
      metadata: { source: "demo-bulk-simulation" },
    };

    console.log(`Simulating ${allPurchaseEntries.length} purchase entries...`);
    const result = await makeApiCall("/users/data", "POST", payload, true);

    if (result.success) {
      setApiSuccessMessage(
        `Successfully submitted ${allPurchaseEntries.length} simulated purchase entries. Analytics and demographics will update shortly.`
      );
      // Optionally, trigger a refetch of preferences or analytics data
      // await fetchPreferences(userEmail);
    } else {
      // Error is set by makeApiCall
    }
    setIsSimulatingData(false);
  };
  // --- END NEW: Handler ---

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
      // Check apiKey from state
      const errorMsg = !apiUrl
        ? "API URL is missing."
        : "API Key is missing. Please set it.";
      setApiError(errorMsg);
      setIsApiKeyModalOpen(!apiKey); // Re-open modal if key is missing
      return { success: false, error: errorMsg };
    }

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey, // Use apiKey from state
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseData?.message ||
          response.statusText ||
          `HTTP error ${response.status}`;
        // If unauthorized, prompt for API key again
        if (response.status === 401) {
          setApiError(`API Error: ${errorMessage}. Please check your API Key.`);
          localStorage.removeItem("tapiroDemoApiKey"); // Clear potentially invalid key
          setApiKey(null);
          setIsApiKeyModalOpen(true);
        } else {
          setApiError(`API Error: ${errorMessage}`);
        }
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
      // Error is already set in the try block for specific cases like 401
      if (!apiError) {
        // Avoid overwriting specific errors
        setApiError(`API Error: ${message}`);
      }
      return { success: false, error: message };
    } finally {
      setIsLoadingPrefs(false);
    }
  };

  const fetchPreferences = async (email: string) => {
    // No need to check apiKey here, makeApiCall does it
    const result = await makeApiCall(
      `/users/${encodeURIComponent(email)}/preferences`,
      "GET"
    );
    if (result.success && result.data) {
      // Assuming result.data matches the UserPreferences structure
      const prefsData = result.data as UserPreferences;
      setPreferences(prefsData.preferences || []);
    } else {
      // Error is set by makeApiCall
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
    if (!email || !apiKey) return; // Check apiKey here too

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
    const ids = new Map<string, "high" | "medium">(); // Changed to Map
    if (preferences && preferences.length > 0 && displayedProducts.length > 0) {
      // Get scores for all currently displayed products
      const productScores = displayedProducts.map((product) => {
        const categoryPreference = preferences.find((p) => {
          const prefCat = p.category;
          const prodCat = product.categoryId;
          return (
            prodCat.startsWith(prefCat) &&
            (prodCat.length === prefCat.length ||
              (prefCat.length < prodCat.length &&
                prodCat.charAt(prefCat.length) !== "0"))
          );
        });
        if (!categoryPreference) return { id: product.id, score: 0 };

        let score = categoryPreference.score;
        if (product.attributes && categoryPreference.attributes) {
          let attributeBonus = 0;
          let matchingAttributes = 0;
          const prefAttributes = categoryPreference.attributes;
          for (const attrKey in product.attributes) {
            const productAttrValue = String(
              product.attributes[attrKey]
            ).toLowerCase();
            if (
              prefAttributes[attrKey] &&
              prefAttributes[attrKey][productAttrValue]
            ) {
              attributeBonus += prefAttributes[attrKey][productAttrValue];
              matchingAttributes++;
            }
          }
          if (matchingAttributes > 0) {
            score += attributeBonus / matchingAttributes; // Average bonus
          }
        }
        return { id: product.id, score };
      });

      // Sort products by score to find the top ones
      productScores.sort((a, b) => b.score - a.score);

      // Recommend top N products or products above a certain score threshold
      const highRecommendationThreshold = 0.6; // Existing threshold for strong recommendation
      const mediumRecommendationThreshold = 0.1; // New threshold for medium recommendation

      productScores.forEach((ps) => {
        if (ps.score > highRecommendationThreshold) {
          ids.set(ps.id, "high");
        } else if (ps.score > mediumRecommendationThreshold) {
          ids.set(ps.id, "medium");
        }
      });

      // If no products are above the high threshold, ensure top products with medium score are still captured
      // This part might need adjustment based on desired behavior if you want to *only* show medium if no high,
      // or if the above loop already covers it. The current logic will add 'medium' if score is > 0.1 and <= 0.6.

      // Example: If you want to ensure at least one medium recommendation if no high ones exist
      // and the top product has a score > 0.1
      if (
        ids.size === 0 &&
        productScores.length > 0 &&
        productScores[0].score > mediumRecommendationThreshold
      ) {
        // This check is somewhat redundant if the loop above correctly sets 'medium'
        // but can be kept if specific fallback logic is needed.
        // For simplicity, the loop above should handle it.
        // Let's refine the fallback: if no 'high' recommendations, and top product is 'medium'
        let hasHighRecommendation = false;
        ids.forEach((level) => {
          if (level === "high") hasHighRecommendation = true;
        });

        if (
          !hasHighRecommendation &&
          productScores.length > 0 &&
          productScores[0].score > mediumRecommendationThreshold &&
          productScores[0].score <= highRecommendationThreshold
        ) {
          // This ensures if there are ONLY medium recommendations, the top ones are still recommended.
          // The main loop already handles this, so this specific block might be redundant
          // unless you want to *force* a recommendation if nothing meets 'high'.
          // For now, the primary loop is sufficient.
        }
      }
    }
    return ids;
  }, [preferences, displayedProducts]); // Recalculate when preferences or displayed products change

  // Helper to display API Key (show prefix only for brevity/security)
  const displayApiKey = apiKey ? `${apiKey.substring(0, 8)}...` : "Not Set";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Render Modals */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onSubmit={handleApiKeySubmit}
        currentApiKey={apiKey}
      />
      <UserEmailModal
        isOpen={isEmailModalOpen && !isApiKeyModalOpen} // Only open if API key modal is closed
        onSubmit={handleEmailSubmit}
      />

      {/* Header Area */}
      <header className="bg-white py-4 shadow-md dark:bg-gray-800">
        <div className="container mx-auto flex flex-col items-center justify-between px-4 md:flex-row">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            Tapiro Demo Store
          </h1>
          <div className="mt-2 flex items-center space-x-4 md:mt-0">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              User: {userEmail || "Not Set"}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              API Key: {displayApiKey}
            </span>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Set Key
            </button>
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Set User
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto p-4">
        {/* API Messages */}
        {apiError && (
          <div
            className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-gray-800 dark:text-red-400"
            role="alert"
          >
            <span className="font-medium">Error:</span> {apiError}
          </div>
        )}
        {apiSuccessMessage && (
          <div
            className="mb-4 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-gray-800 dark:text-green-400"
            role="alert"
          >
            <span className="font-medium">Success:</span> {apiSuccessMessage}
          </div>
        )}

        {/* --- NEW: Simulate Data Button --- */}
        <div className="my-4 text-center">
          <button
            onClick={handleSimulateBulkData}
            disabled={isSimulatingData || !userEmail || !apiKey}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800"
          >
            {isSimulatingData ? (
              <>
                <svg
                  aria-hidden="true"
                  role="status"
                  className="mr-2 inline h-4 w-4 animate-spin text-white"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="#E5E7EB"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentColor"
                  />
                </svg>
                Simulating Data...
              </>
            ) : (
              "Simulate Bulk Purchase Data (6 Months)"
            )}
          </button>
        </div>
        {/* --- END NEW: Simulate Data Button --- */}

        <SearchBar onSearch={handleSearch} initialQuery={searchQuery} />

        {isLoadingPrefs && !preferences && (
          <div className="my-8 flex justify-center">
            <svg
              aria-hidden="true"
              className="mr-2 h-8 w-8 animate-spin fill-blue-600 text-gray-200 dark:text-gray-600"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="#E5E7EB"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentColor"
              />
            </svg>
          </div>
        )}

        {/* User Info & Preferences Display Area */}
        {(userEmail || apiKey) && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Demo Store
                </h2>
                {userEmail && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    User: {userEmail}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  API Key:{" "}
                  <span className="font-mono text-xs">{displayApiKey}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsApiKeyModalOpen(true)}
                  className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  {apiKey ? "Change API Key" : "Set API Key"}
                </button>
                <button
                  onClick={() => {
                    setUserEmail(null);
                    localStorage.removeItem("tapiroDemoUserEmail");
                    setIsEmailModalOpen(true);
                  }}
                  className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  {userEmail ? "Change User" : "Set User"}
                </button>
              </div>
            </div>
            {apiError && (
              <div className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900 dark:text-red-200">
                <strong>Error:</strong> {apiError}
              </div>
            )}
            {apiSuccessMessage && (
              <div className="mt-4 rounded-md bg-green-100 p-3 text-sm text-green-700 dark:bg-green-900 dark:text-green-200">
                <strong>Success:</strong> {apiSuccessMessage}
              </div>
            )}
          </div>
        )}

        {/* Preferences Display - only if preferences exist */}
        {preferences && preferences.length > 0 && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              Your Inferred Preferences
            </h3>
            <ul className="space-y-2">
              {preferences
                .filter((p) => p.score > 0.1) // Only show relevant preferences
                .sort((a, b) => b.score - a.score) // Sort by score desc
                .slice(0, 10) // Show top 10
                .map((pref) => {
                  const categoryName =
                    categoryNameMap[pref.category] || pref.category;
                  return (
                    <li
                      key={pref.category}
                      className="rounded-md border border-gray-200 p-3 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {categoryName}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            pref.score > 0.65
                              ? "bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100"
                              : pref.score > 0.35
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100"
                              : "bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100"
                          }`}
                        >
                          Score: {(pref.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      {pref.attributes &&
                        Object.keys(pref.attributes).length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              Attribute Preferences:
                            </p>
                            <ul className="ml-4 list-disc space-y-1 text-xs text-gray-500 dark:text-gray-400">
                              {Object.entries(pref.attributes).map(
                                ([attrKey, attrValueObj]) => (
                                  <li key={attrKey}>
                                    {attrKey}:{" "}
                                    {Object.entries(attrValueObj)
                                      .map(
                                        ([val, score]) =>
                                          `${val} (${(score * 100).toFixed(
                                            0
                                          )}%)`
                                      )
                                      .join(", ")}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </li>
                  );
                })}
            </ul>
          </div>
        )}

        {/* Product List Area */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Products"}
            {isLoadingPrefs &&
              apiKey &&
              userEmail && ( // Only show loading if API key and email are set
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  (Loading preferences...)
                </span>
              )}
          </h2>
          <SearchBar onSearch={handleSearch} initialQuery={searchQuery} />
          <ProductList
            products={displayedProducts}
            onProductClick={handleProductClick}
            onPurchaseClick={handlePurchaseClick}
            recommendationLevels={recommendedProductIds} // Pass the map here
            categoryNameMap={categoryNameMap}
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
