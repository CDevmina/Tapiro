import React, { useState, useMemo } from "react";
import {
  Card,
  List,
  ListItem,
  Button,
  Spinner,
  Alert,
  TextInput, // For search
} from "flowbite-react";
import { HiInformationCircle, HiOutlineSearch } from "react-icons/hi";
import {
  useStoreConsentLists,
  useOptInToStore,
  useOptOutFromStore,
} from "../api/hooks/useUserHooks";
// Import the new search hook
import { useLookupStores, useSearchStores } from "../api/hooks/useStoreHooks";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { StoreBasicInfo } from "../api/types/data-contracts";

const UserDataSharingPage: React.FC = () => {
  const {
    data: consentLists,
    isLoading: consentLoading,
    error: consentError,
  } = useStoreConsentLists();
  const {
    mutate: optIn,
    isPending: isOptingIn,
    variables: optInVariables, // Get variables for optIn
  } = useOptInToStore();
  const {
    mutate: optOut,
    isPending: isOptingOut,
    variables: optOutVariables, // Get variables for optOut
  } = useOptOutFromStore();

  // Combine IDs from both lists for lookup
  const storeIdsToLookup = useMemo(() => {
    const ids = new Set<string>();
    (consentLists?.optInStores || []).forEach((id) => ids.add(id));
    (consentLists?.optOutStores || []).forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [consentLists]);

  const {
    data: storeDetails,
    isLoading: storesLoading,
    error: storesError,
  } = useLookupStores(storeIdsToLookup);

  // Map store IDs to names for easy display
  const storeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    storeDetails?.forEach((store: StoreBasicInfo) => {
      map.set(store.storeId, store.name || `Store ID: ${store.storeId}`);
    });
    return map;
  }, [storeDetails]);

  // --- State and Hook for Search ---
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError, // Add error handling for search
  } = useSearchStores(searchTerm); // Use the search hook

  // --- Move useMemo hook here, before early returns ---
  const filteredSearchResults = useMemo(() => {
    // Ensure searchResults and consentLists are defined before accessing them
    const existingIds = new Set([
      ...(consentLists?.optInStores || []),
      ...(consentLists?.optOutStores || []),
    ]);
    // Only filter if searchResults is available
    return searchResults?.filter((store) => !existingIds.has(store.storeId));
  }, [searchResults, consentLists]); // Dependencies remain the same

  const handleOptIn = (storeId: string) => {
    optIn(storeId);
  };

  const handleOptOut = (storeId: string) => {
    optOut(storeId);
  };

  // --- Loading and Error Checks (Now after the useMemo) ---
  const isLoadingInitial = consentLoading || storesLoading;
  const initialError = consentError || storesError;

  if (isLoadingInitial) {
    return <LoadingSpinner message="Loading sharing settings..." />;
  }

  if (initialError) {
    return (
      <ErrorDisplay
        title="Error Loading Settings"
        message="Could not load data sharing settings."
        error={initialError}
      />
    );
  }

  const isMutating = isOptingIn || isOptingOut;

  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        Control Data Sharing
      </h2>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Opt-In List (Existing) */}
        <Card>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Stores You Share Data With (Opt-In)
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            These stores can access your anonymized preference data based on
            your profile settings.
          </p>
          {consentLists?.optInStores && consentLists.optInStores.length > 0 ? (
            <List unstyled className="space-y-2">
              {consentLists.optInStores.map((storeId) => (
                <ListItem
                  key={storeId}
                  className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700"
                >
                  <span className="text-gray-800 dark:text-gray-200">
                    {storeNameMap.get(storeId) || `Store ID: ${storeId}`}
                  </span>
                  <Button
                    size="xs"
                    color="red" // Changed from warning to red
                    outline // Added outline prop
                    onClick={() => handleOptOut(storeId)}
                    disabled={isMutating}
                  >
                    {/* Conditional Rendering for Spinner */}
                    {isOptingOut && optOutVariables === storeId ? (
                      <>
                        <Spinner size="xs" className="mr-2" />
                        Opting Out...
                      </>
                    ) : (
                      "Opt-Out"
                    )}
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              You are not currently sharing data with any stores.
            </p>
          )}
        </Card>

        {/* Opt-Out List (Existing) */}
        <Card>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Stores You Don't Share Data With (Opt-Out)
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            These stores cannot access your preference data.
          </p>
          {consentLists?.optOutStores &&
          consentLists.optOutStores.length > 0 ? (
            <List unstyled className="space-y-2">
              {consentLists.optOutStores.map((storeId) => (
                <ListItem
                  key={storeId}
                  className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700"
                >
                  <span className="text-gray-800 dark:text-gray-200">
                    {storeNameMap.get(storeId) || `Store ID: ${storeId}`}
                  </span>
                  <Button
                    size="xs"
                    color="green" // Changed from success to green
                    outline // Added outline prop
                    onClick={() => handleOptIn(storeId)}
                    disabled={isMutating}
                  >
                    {/* Conditional Rendering for Spinner */}
                    {isOptingIn && optInVariables === storeId ? (
                      <>
                        <Spinner size="xs" className="mr-2" />
                        Opting In...
                      </>
                    ) : (
                      "Opt-In"
                    )}
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              You haven't opted out of any specific stores yet.
            </p>
          )}
        </Card>
      </div>

      {/* --- Search Stores Section (Uncommented and Implemented) --- */}
      <Card className="mt-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Find Other Stores
        </h3>
        <div className="my-4">
          <TextInput
            icon={HiOutlineSearch}
            placeholder="Search for a store name (min 2 chars)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} // Update search term state
          />
        </div>

        {/* Search Loading State */}
        {searchLoading && (
          <div className="flex justify-center py-4">
            <Spinner size="md" />
          </div>
        )}

        {/* Search Error State */}
        {searchError && (
          <Alert color="failure" icon={HiInformationCircle} className="my-4">
            Error searching stores: {searchError.message}
          </Alert>
        )}

        {/* Search Results */}
        {!searchLoading &&
          !searchError &&
          searchTerm.length >= 2 && // Only show results/message if search term is long enough
          filteredSearchResults &&
          filteredSearchResults.length > 0 && (
            <List unstyled className="max-h-60 space-y-2 overflow-y-auto">
              {" "}
              {/* Added max-height and scroll */}
              {filteredSearchResults.map((store) => (
                <ListItem
                  key={store.storeId}
                  className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700"
                >
                  <span className="text-gray-800 dark:text-gray-200">
                    {store.name}
                  </span>
                  {/* Only show Opt-In button for search results */}
                  <Button
                    size="xs"
                    color="green" // Changed from success to green
                    outline // Added outline prop
                    onClick={() => handleOptIn(store.storeId)}
                    disabled={isMutating} // Disable if any mutation is happening
                  >
                    {/* Conditional Rendering for Spinner */}
                    {isOptingIn && optInVariables === store.storeId ? (
                      <>
                        <Spinner size="xs" className="mr-2" />
                        Opting In...
                      </>
                    ) : (
                      "Opt-In"
                    )}
                  </Button>
                </ListItem>
              ))}
            </List>
          )}

        {/* No Results Message */}
        {!searchLoading &&
          !searchError &&
          searchTerm.length >= 2 && // Only show message if search term is long enough
          (!filteredSearchResults || filteredSearchResults.length === 0) && (
            <p className="py-4 text-center text-gray-500 dark:text-gray-400">
              No new stores found matching "{searchTerm}".
            </p>
          )}
      </Card>
    </div>
  );
};

export default UserDataSharingPage;
