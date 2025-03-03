import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BackButton } from "@/components/common/BackButton";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

// Define types for our preferences structure
interface PreferenceSubclass {
  id: string;
  name: string;
  icon?: string;
}

interface PreferenceClass {
  id: string;
  name: string;
  icon: string;
  subclasses: PreferenceSubclass[];
}

const RegisterUserPreferences = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form fields - preferences with the new structure
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(
    []
  );
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basicInfo, setBasicInfo] = useState<{
    username: string;
    name: string;
  } | null>(null);

  // Pinterest-style preference categories with subcategories
  const preferenceClasses: PreferenceClass[] = [
    {
      id: "electronics",
      name: "Electronics",
      icon: "💻",
      subclasses: [
        { id: "electronics_smartphones", name: "Smartphones" },
        { id: "electronics_laptops", name: "Laptops" },
        { id: "electronics_headphones", name: "Headphones" },
        { id: "electronics_smartwatches", name: "Smartwatches" },
        { id: "electronics_cameras", name: "Cameras" },
      ],
    },
    {
      id: "fashion",
      name: "Fashion",
      icon: "👔",
      subclasses: [
        { id: "fashion_menswear", name: "Menswear" },
        { id: "fashion_womenswear", name: "Womenswear" },
        { id: "fashion_accessories", name: "Accessories" },
        { id: "fashion_footwear", name: "Footwear" },
        { id: "fashion_jewelry", name: "Jewelry" },
      ],
    },
    {
      id: "health",
      name: "Health & Wellness",
      icon: "💪",
      subclasses: [
        { id: "health_fitness", name: "Fitness" },
        { id: "health_supplements", name: "Supplements" },
        { id: "health_organic", name: "Organic" },
        { id: "health_meditation", name: "Meditation" },
        { id: "health_sleep", name: "Sleep" },
      ],
    },
    {
      id: "home",
      name: "Home & Living",
      icon: "🏠",
      subclasses: [
        { id: "home_furniture", name: "Furniture" },
        { id: "home_decor", name: "Decor" },
        { id: "home_kitchen", name: "Kitchen" },
        { id: "home_garden", name: "Garden" },
        { id: "home_smart", name: "Smart Home" },
      ],
    },
    {
      id: "food",
      name: "Food & Drinks",
      icon: "🍽️",
      subclasses: [
        { id: "food_gourmet", name: "Gourmet" },
        { id: "food_baking", name: "Baking" },
        { id: "food_coffee", name: "Coffee & Tea" },
        { id: "food_drinks", name: "Drinks & Cocktails" },
        { id: "food_restaurants", name: "Restaurants" },
      ],
    },
    {
      id: "entertainment",
      name: "Entertainment",
      icon: "🎬",
      subclasses: [
        { id: "entertainment_movies", name: "Movies" },
        { id: "entertainment_music", name: "Music" },
        { id: "entertainment_games", name: "Games" },
        { id: "entertainment_books", name: "Books" },
        { id: "entertainment_streaming", name: "Streaming" },
      ],
    },
  ];

  useEffect(() => {
    // Check if user completed the first step
    const registrationDataStr = sessionStorage.getItem("registration_data");
    if (!registrationDataStr) {
      navigate("/register/user");
      return;
    }

    try {
      const savedData = JSON.parse(registrationDataStr);
      if (!savedData.username) {
        navigate("/register/user");
        return;
      }

      setBasicInfo({
        username: savedData.username,
        name: savedData.name || "",
      });

      // If we have previously saved preferences, load them
      if (savedData.preferences) {
        // Split previously saved preferences into categories and subcategories
        const categories: string[] = [];
        const subcategories: string[] = [];

        savedData.preferences.forEach((pref: string) => {
          if (preferenceClasses.some((pc) => pc.id === pref)) {
            categories.push(pref);
          } else {
            subcategories.push(pref);
          }
        });

        setSelectedCategories(categories);
        setSelectedSubcategories(subcategories);
      }

      setDataSharingConsent(savedData.dataSharingConsent || false);
    } catch (e) {
      console.error("Error parsing saved registration data:", e);
      navigate("/register/user");
    }
  }, [navigate]);

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      // Remove category and all its subcategories
      setSelectedCategories(
        selectedCategories.filter((id) => id !== categoryId)
      );

      const category = preferenceClasses.find((pc) => pc.id === categoryId);
      if (category) {
        setSelectedSubcategories(
          selectedSubcategories.filter(
            (id) => !category.subclasses.some((sc) => sc.id === id)
          )
        );
      }
    } else {
      // Add category and all its subcategories
      setSelectedCategories([...selectedCategories, categoryId]);

      const category = preferenceClasses.find((pc) => pc.id === categoryId);
      if (category) {
        const subcategoryIds = category.subclasses.map((sc) => sc.id);
        setSelectedSubcategories([...selectedSubcategories, ...subcategoryIds]);
      }
    }
  };

  const handleSubcategoryToggle = (
    subcategoryId: string,
    categoryId: string
  ) => {
    if (selectedSubcategories.includes(subcategoryId)) {
      // Remove subcategory
      setSelectedSubcategories(
        selectedSubcategories.filter((id) => id !== subcategoryId)
      );

      // Check if we need to remove the parent category
      const category = preferenceClasses.find((pc) => pc.id === categoryId);
      if (category) {
        const remainingSubcategories = selectedSubcategories.filter(
          (id) =>
            id !== subcategoryId &&
            category.subclasses.some((sc) => sc.id === id)
        );

        if (
          remainingSubcategories.length === 0 &&
          selectedCategories.includes(categoryId)
        ) {
          setSelectedCategories(
            selectedCategories.filter((id) => id !== categoryId)
          );
        }
      }
    } else {
      // Add subcategory
      setSelectedSubcategories([...selectedSubcategories, subcategoryId]);

      // Also add parent category if not already selected
      if (!selectedCategories.includes(categoryId)) {
        setSelectedCategories([...selectedCategories, categoryId]);
      }
    }
  };

  const toggleExpandCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dataSharingConsent) {
      setError("You must consent to data sharing to register");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Get existing registration data
      const registrationDataStr = sessionStorage.getItem("registration_data");
      if (!registrationDataStr) {
        throw new Error("Registration data not found");
      }

      const registrationData = JSON.parse(registrationDataStr);

      // Combine all preferences for the API
      const allPreferences = [...selectedCategories, ...selectedSubcategories];

      // Update with preferences and consent
      const updatedData = {
        ...registrationData,
        preferences: allPreferences,
        dataSharingConsent,
      };

      // Save complete registration data
      sessionStorage.setItem("registration_data", JSON.stringify(updatedData));

      // Redirect to Auth0 for authentication
      await login();
    } catch (err) {
      console.error("Registration failed:", err);
      setError("Registration process failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!basicInfo) {
    return <LoadingSpinner fullHeight message="Loading..." />;
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <BackButton to="/register/user" />
      <h1 className="text-3xl font-bold mb-8">Your Preferences</h1>

      <div className="flex mb-6">
        <div className="flex-1">
          <div className="bg-gray-200 text-gray-700 text-center py-2 px-4 rounded-l">
            ✓ Basic Info
          </div>
        </div>
        <div className="flex-1">
          <div className="bg-blue-500 text-white text-center py-2 px-4 rounded-r">
            2. Preferences
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-lg font-medium mb-2">
            Select Your Interests
          </label>
          <p className="text-gray-500 text-sm mb-4">
            Choose categories and specific topics that interest you for
            personalized recommendations.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {preferenceClasses.map((category) => (
              <div
                key={category.id}
                className={`
                  rounded-lg p-4 cursor-pointer border-2 transition-all
                  ${
                    selectedCategories.includes(category.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }
                `}
                onClick={() => toggleExpandCategory(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{category.icon}</span>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleCategoryToggle(category.id);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {expandedCategory && (
            <div className="border rounded-lg p-4 mb-4">
              <h3 className="font-medium text-lg mb-3">
                {
                  preferenceClasses.find((cat) => cat.id === expandedCategory)
                    ?.name
                }{" "}
                Topics
              </h3>
              <div className="space-y-2">
                {preferenceClasses
                  .find((cat) => cat.id === expandedCategory)
                  ?.subclasses.map((subclass) => (
                    <div key={subclass.id} className="flex items-center">
                      <input
                        id={`subclass-${subclass.id}`}
                        type="checkbox"
                        checked={selectedSubcategories.includes(subclass.id)}
                        onChange={() =>
                          handleSubcategoryToggle(subclass.id, expandedCategory)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`subclass-${subclass.id}`}
                        className="ml-2"
                      >
                        {subclass.name}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {selectedCategories.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Selected Interests:</h3>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((catId) => {
                  const category = preferenceClasses.find(
                    (pc) => pc.id === catId
                  );
                  if (!category) return null;

                  return (
                    <span
                      key={catId}
                      className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center"
                    >
                      {category.icon} {category.name}
                      <button
                        type="button"
                        onClick={() => handleCategoryToggle(catId)}
                        className="ml-1.5 text-blue-800 hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center">
          <input
            id="dataSharingConsent"
            type="checkbox"
            checked={dataSharingConsent}
            onChange={(e) => setDataSharingConsent(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            required
          />
          <label htmlFor="dataSharingConsent" className="ml-2 block text-sm">
            I consent to share my data for personalized advertising{" "}
            <span className="text-red-500">*</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <LoadingSpinner size="small" className="mr-2" /> Signing Up...
            </span>
          ) : (
            "Continue to Sign Up"
          )}
        </button>
      </form>
    </div>
  );
};

export default RegisterUserPreferences;
