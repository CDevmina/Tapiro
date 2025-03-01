import { useEffect, useState } from "react";
import { useNavigation, Outlet } from "react-router-dom";
import { LoadingSpinner } from "./LoadingSpinner";

export const NavigationLoader = () => {
  const navigation = useNavigation();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    // Add slight delay to prevent flashing for fast transitions
    let timer: NodeJS.Timeout;

    if (navigation.state !== "idle") {
      timer = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }

    return () => clearTimeout(timer);
  }, [navigation.state]);

  return (
    <>
      {showLoader && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <LoadingSpinner size="large" message="Loading page..." />
        </div>
      )}
      <Outlet />
    </>
  );
};
