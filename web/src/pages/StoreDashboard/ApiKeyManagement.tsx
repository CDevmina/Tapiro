import { useState, useEffect } from "react";
// Removed unused react-hook-form imports
import {
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeadCell,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TextInput,
  Label,
  Badge,
  Toast,
  ToastToggle,
  Alert,
  Tooltip,
} from "flowbite-react"; // Consolidated imports
import {
  HiPlus,
  HiTrash,
  HiClipboardCopy,
  HiCheck,
  HiX,
  HiExclamation,
  HiInformationCircle,
  HiOutlineCheck,
} from "react-icons/hi";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "../../api/hooks/useStoreHooks";
import { ApiKey } from "../../api/types/data-contracts"; // Removed unused ApiKeyCreate
import LoadingSpinner from "../../components/common/LoadingSpinner"; // Import LoadingSpinner
import ErrorDisplay from "../../components/common/ErrorDisplay"; // Import ErrorDisplay

// Define a type for the response when creating a key, which includes the raw key
interface GeneratedApiKeyResponse extends ApiKey {
  apiKey: string; // The raw API key string, only returned on creation
}

// Helper function to format date (can be moved to a utils file later)
const formatDate = (dateString: string | Date | undefined) => {
  // Add null check for dateString
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function ApiKeyManagement() {
  // --- Data Fetching ---
  const {
    data: apiKeysData,
    isLoading: keysLoading,
    error: keysError,
  } = useApiKeys();

  // --- Mutations ---
  const {
    mutate: createApiKey,
    isPending: isCreatingKey,
    error: createKeyError,
    reset: resetCreateKeyMutation,
  } = useCreateApiKey();
  const {
    mutate: revokeApiKey,
    isPending: isRevokingKey,
    error: revokeKeyError,
    reset: resetRevokeKeyMutation,
  } = useRevokeApiKey();

  // --- State ---
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  // Use the specific type for the generated key response
  const [generatedApiKey, setGeneratedApiKey] =
    useState<GeneratedApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);

  // --- Local Toast State (Consider moving to a global context later) ---
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // --- Effects for Toasts ---
  useEffect(() => {
    if (createKeyError) {
      // Error is shown inside the modal
    }
  }, [createKeyError]);

  useEffect(() => {
    if (revokeKeyError) {
      // Error is shown inside the modal
    }
  }, [revokeKeyError]);

  // --- Handlers ---
  const handleGenerateSubmit = () => {
    createApiKey(
      { name: newKeyName || undefined },
      {
        onSuccess: (data) => {
          // Cast the received data to the expected response type
          const generatedData = data as GeneratedApiKeyResponse;
          setGeneratedApiKey(generatedData); // Store the full response including the raw key
          setNewKeyName(""); // Clear input field
          // Don't show toast immediately, modal shows the key
        },
        // onError handled by modal display
      },
    );
  };

  const handleRevokeConfirm = () => {
    if (keyToRevoke?.keyId) {
      revokeApiKey(keyToRevoke.keyId, {
        onSuccess: () => {
          setShowRevokeModal(false);
          setKeyToRevoke(null); // Reset key to revoke
          setShowSuccessToast(true); // Show success toast after modal closes
          setToastMessage("API Key revoked successfully!");
          resetRevokeKeyMutation(); // Reset mutation state
          const timer = setTimeout(() => setShowSuccessToast(false), 5000);
          return () => clearTimeout(timer);
        },
        // onError handled by modal display
      });
    }
  };

  const openRevokeModal = (key: ApiKey) => {
    setKeyToRevoke(key);
    setShowRevokeModal(true);
    resetRevokeKeyMutation(); // Reset error when opening modal
  };

  const closeGenerateModal = () => {
    setShowGenerateModal(false);
    setGeneratedApiKey(null); // Clear generated key state
    setCopied(false); // Reset copied state
    setNewKeyName(""); // Clear name input
    resetCreateKeyMutation(); // Reset mutation state including error
  };

  const copyToClipboard = () => {
    // The actual API key is only available in the `generatedApiKey.apiKey` field
    // right after creation.
    if (generatedApiKey?.apiKey) {
      navigator.clipboard.writeText(generatedApiKey.apiKey).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Show "Copied" for 2 seconds
      });
    }
  };

  return (
    <div className="relative space-y-6 pt-4">
      {/* Success Toast */}
      {showSuccessToast && (
        <Toast className="fixed top-5 right-5 z-50">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200">
            <HiCheck className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">{toastMessage}</div>
          <ToastToggle onDismiss={() => setShowSuccessToast(false)} />
        </Toast>
      )}
      {/* Error Toast (Only for general fetch errors now) */}
      {showErrorToast && (
        <Toast className="fixed top-5 right-5 z-50">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200">
            <HiX className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">{toastMessage}</div>
          <ToastToggle onDismiss={() => setShowErrorToast(false)} />
        </Toast>
      )}
      <div className="flex justify-end">
        <Button onClick={() => setShowGenerateModal(true)}>
          <HiPlus className="mr-2 h-5 w-5" />
          Generate New Key
        </Button>
      </div>
      {keysLoading ? (
        // Use LoadingSpinner component
        <LoadingSpinner message="Loading API keys..." className="py-8" />
      ) : keysError ? (
        // Use ErrorDisplay component
        <ErrorDisplay
          title="Error Loading Keys"
          message="Could not load your API keys."
          error={keysError}
          className="py-4"
        />
      ) : !apiKeysData || apiKeysData.length === 0 ? (
        <p className="py-4 text-center text-gray-500 dark:text-gray-400">
          No API keys generated yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell>Name</TableHeadCell>
                <TableHeadCell>Prefix</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Created At</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {apiKeysData.map((key) => (
                <TableRow
                  key={key.keyId}
                  className="bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  {/* Key Name */}
                  <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                    {key.name || <span className="italic">Unnamed Key</span>}
                  </TableCell>
                  {/* Key Prefix */}
                  <TableCell>
                    <span className="font-mono">{key.prefix}...</span>
                  </TableCell>
                  {/* Key Status */}
                  <TableCell>
                    <Badge
                      color={key.status === "active" ? "success" : "failure"}
                      size="sm"
                    >
                      {key.status}
                    </Badge>
                  </TableCell>
                  {/* Created At */}
                  <TableCell>{formatDate(key.createdAt)}</TableCell>
                  {/* Actions */}
                  <TableCell>
                    {key.status === "active" ? (
                      <Button
                        size="xs"
                        color="red"
                        outline
                        onClick={() => openRevokeModal(key)}
                        disabled={
                          isRevokingKey && keyToRevoke?.keyId === key.keyId
                        }
                      >
                        {/* Show spinner inside button when revoking this specific key */}
                        {isRevokingKey && keyToRevoke?.keyId === key.keyId ? (
                          <Spinner size="xs" className="mr-1" />
                        ) : (
                          <HiTrash className="mr-1 h-4 w-4" />
                        )}
                        Revoke
                      </Button>
                    ) : (
                      <span className="text-sm text-red-500 dark:text-red-400">
                        Revoked
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Generate Key Modal */}
      <Modal show={showGenerateModal} onClose={closeGenerateModal} size="lg">
        <ModalHeader>
          {generatedApiKey ? "API Key Generated" : "Generate New API Key"}
        </ModalHeader>
        <ModalBody>
          {generatedApiKey ? (
            // Display generated key info
            <div className="space-y-4">
              <Alert color="success" icon={HiOutlineCheck}>
                Your new API key has been generated. Please copy it now. You
                won't be able to see it again!
              </Alert>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Key Name:{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {generatedApiKey.name || (
                      <span className="italic">Unnamed Key</span>
                    )}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Key Prefix:{" "}
                  <span className="font-mono text-gray-900 dark:text-white">
                    {generatedApiKey.prefix}...
                  </span>
                </p>
              </div>
              <div className="relative">
                <TextInput
                  id="generatedKey"
                  type="text"
                  value={generatedApiKey.apiKey} // Display the full key here
                  readOnly
                  className="pr-10" // Add padding for the button
                />
                <Tooltip content={copied ? "Copied!" : "Copy to clipboard"}>
                  <Button
                    size="sm"
                    color="gray"
                    className="absolute inset-y-0 right-0 mr-1 flex items-center px-2"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <HiOutlineCheck className="h-5 w-5 text-green-500" />
                    ) : (
                      <HiClipboardCopy className="h-5 w-5" />
                    )}
                  </Button>
                </Tooltip>
              </div>
            </div>
          ) : (
            // Form to generate key
            <form
              id="generate-key-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerateSubmit();
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="keyName">Key Name (Optional)</Label>
                <TextInput
                  id="keyName"
                  type="text"
                  placeholder="e.g., My Production Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  disabled={isCreatingKey}
                />
              </div>
              {createKeyError && ( // Show error inside modal before key is generated
                <Alert color="failure" icon={HiInformationCircle}>
                  {createKeyError.message || "Failed to generate key."}
                </Alert>
              )}
            </form>
          )}
        </ModalBody>
        <ModalFooter>
          {generatedApiKey ? (
            // Only show Close button after generation
            <Button onClick={closeGenerateModal}>Close</Button>
          ) : (
            // Show Generate/Cancel buttons before generation
            <>
              <Button
                type="submit"
                form="generate-key-form"
                disabled={isCreatingKey} // Disable based on processing state
              >
                {/* Conditionally render Spinner or Text */}
                {isCreatingKey ? (
                  <>
                    <Spinner size="sm" />
                    <span className="pl-3">Generating...</span>
                  </>
                ) : (
                  "Generate Key"
                )}
              </Button>
              <Button
                color="gray"
                onClick={closeGenerateModal}
                disabled={isCreatingKey}
              >
                Cancel
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>
      {/* Revoke Key Confirmation Modal */}
      <Modal
        show={showRevokeModal}
        size="md"
        onClose={() => !isRevokingKey && setShowRevokeModal(false)} // Prevent closing while revoking
        popup
      >
        <ModalHeader />
        <ModalBody>
          <div className="text-center">
            <HiExclamation className="mx-auto mb-4 h-14 w-14 text-red-500 dark:text-red-400" />
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Are you sure you want to revoke this API key?
            </h3>
            {/* Display key details - Improved UI */}
            {keyToRevoke && (
              <div className="my-4 rounded-md bg-gray-100 p-3 text-left sm:mx-auto sm:max-w-sm dark:bg-gray-700">
                <div className="mb-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Name:{" "}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {keyToRevoke.name || (
                      <span className="italic">Unnamed Key</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Prefix:{" "}
                  </span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {keyToRevoke.prefix}...
                  </span>
                </div>
              </div>
            )}
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              This key will immediately stop working and cannot be reactivated.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                color="red"
                outline
                onClick={handleRevokeConfirm}
                disabled={isRevokingKey}
              >
                {/* Conditionally render Spinner or Text */}
                {isRevokingKey ? (
                  <>
                    <Spinner size="sm" />
                    <span className="pl-3">Revoking...</span>
                  </>
                ) : (
                  "Yes, Revoke It"
                )}
              </Button>
              <Button
                color="blue"
                onClick={() => setShowRevokeModal(false)}
                disabled={isRevokingKey}
              >
                Cancel
              </Button>
            </div>
            {/* Show error inside modal during revoke attempt */}
            {revokeKeyError && (
              <Alert
                color="failure"
                icon={HiInformationCircle}
                className="mt-4 text-left" // Align text left for readability
              >
                {revokeKeyError.message || "Failed to revoke key."}
              </Alert>
            )}
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}
