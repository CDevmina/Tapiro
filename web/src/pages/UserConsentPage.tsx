import {
  useStoreConsentLists,
  useOptInToStore,
  useOptOutFromStore,
} from "../api/hooks/useUserHooks";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { Card, List, Button, ListItem, Spinner } from "flowbite-react"; // Import Spinner
import { HiArrowRight, HiArrowLeft } from "react-icons/hi";

export default function UserConsentPage() {
  const {
    data: consentData,
    isLoading: consentLoading,
    error: consentError,
    refetch,
  } = useStoreConsentLists();

  const optInMutation = useOptInToStore();
  const optOutMutation = useOptOutFromStore();

  const handleOptOut = (storeId: string) => {
    optOutMutation.mutate(storeId, {
      onSettled: () => {
        refetch();
      },
    });
  };

  const handleOptIn = (storeId: string) => {
    optInMutation.mutate(storeId, {
      onSettled: () => {
        refetch();
      },
    });
  };

  if (consentLoading) {
    return <LoadingSpinner message="Loading consent settings..." />;
  }

  if (consentError) {
    return (
      <ErrorDisplay
        title="Failed to load consent settings"
        message="Could not retrieve your store consent information."
        error={consentError}
      />
    );
  }

  const optedInStores = consentData?.optInStores || [];
  const optedOutStores = consentData?.optOutStores || [];

  const isMutating = optInMutation.isPending || optOutMutation.isPending;

  return (
    <div className="container mx-auto space-y-6 px-4 py-12">
      <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
        Manage Data Sharing Consent
      </h2>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Control which stores are allowed to access your data for personalized
        experiences and which are blocked. Moving a store to the 'Opted Out'
        list prevents them from accessing your data via the API.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Opted-In Stores Card */}
        <Card>
          <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
            Allowed Stores (Opted In)
          </h3>
          {optedInStores.length > 0 ? (
            <List
              unstyled
              className="divide-y divide-gray-200 dark:divide-gray-700"
            >
              {optedInStores.map((store) => {
                const isProcessingThis =
                  optOutMutation.isPending &&
                  optOutMutation.variables === store.storeId;
                return (
                  <ListItem
                    key={store.storeId}
                    className="flex items-center justify-between py-3 sm:py-4"
                  >
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {store.name} ({store.storeId.slice(-6)})
                    </span>
                    <Button
                      size="xs"
                      color="warning"
                      onClick={() => handleOptOut(store.storeId)}
                      disabled={isMutating}
                      // Remove isProcessing prop, handle spinner manually
                    >
                      {isProcessingThis ? (
                        <Spinner size="xs" className="mr-2" />
                      ) : (
                        <HiArrowRight className="mr-2 h-3 w-3" />
                      )}
                      Opt Out
                    </Button>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <p className="text-sm text-gray-500 italic dark:text-gray-400">
              You haven't explicitly allowed any stores yet. Stores may be added
              here automatically when you interact with them, unless they are in
              the 'Opted Out' list.
            </p>
          )}
        </Card>

        {/* Opted-Out Stores Card */}
        <Card>
          <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
            Blocked Stores (Opted Out)
          </h3>
          {optedOutStores.length > 0 ? (
            <List
              unstyled
              className="divide-y divide-gray-200 dark:divide-gray-700"
            >
              {optedOutStores.map((store) => {
                const isProcessingThis =
                  optInMutation.isPending &&
                  optInMutation.variables === store.storeId;
                return (
                  <ListItem
                    key={store.storeId}
                    className="flex items-center justify-between py-3 sm:py-4"
                  >
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {store.name} ({store.storeId.slice(-6)})
                    </span>
                    <Button
                      size="xs"
                      color="success"
                      onClick={() => handleOptIn(store.storeId)}
                      disabled={isMutating}
                      // Remove isProcessing prop, handle spinner manually
                    >
                      {isProcessingThis ? (
                        <Spinner size="xs" className="mr-2" />
                      ) : (
                        <HiArrowLeft className="mr-2 h-3 w-3" />
                      )}
                      Opt In (Allow)
                    </Button>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <p className="text-sm text-gray-500 italic dark:text-gray-400">
              No stores are currently blocked.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
