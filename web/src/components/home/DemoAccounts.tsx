import { Button, Card } from "flowbite-react";
import { useAuth } from "../../hooks/useAuth";

// Shared demo accounts, created by tapiro-api-internal/scripts/seedDemo.js.
// The box only shows when the build sets these variables.
const accounts = [
  {
    label: "Demo user",
    hint: "See the preferences Tapiro built from a month of shopping.",
    email: import.meta.env.VITE_DEMO_USER_EMAIL,
    password: import.meta.env.VITE_DEMO_USER_PASSWORD,
  },
  {
    label: "Demo store",
    hint: "See API keys and usage from the store side.",
    email: import.meta.env.VITE_DEMO_STORE_EMAIL,
    password: import.meta.env.VITE_DEMO_STORE_PASSWORD,
  },
].filter((a) => a.email && a.password);

const DemoAccounts = () => {
  const { login } = useAuth();
  if (accounts.length === 0) return null;

  return (
    <Card className="mx-auto mt-10 max-w-2xl text-left">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Try the demo
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Log in with one of these shared accounts. Demo data resets every night.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((a) => (
          <div
            key={a.label}
            className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <p className="font-medium text-gray-900 dark:text-white">{a.label}</p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{a.hint}</p>
            <p className="font-mono text-sm text-gray-800 dark:text-gray-200">{a.email}</p>
            <p className="mb-3 font-mono text-sm text-gray-800 dark:text-gray-200">
              {a.password}
            </p>
            <Button
              size="sm"
              color="blue"
              onClick={() =>
                login({ authorizationParams: { login_hint: a.email } })
              }
            >
              Log in as {a.label.toLowerCase()}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default DemoAccounts;
