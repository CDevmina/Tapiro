import { Progress } from "flowbite-react";

interface RegistrationProgressProps {
  step: number;
  totalSteps: number;
}

export function RegistrationProgress({
  step,
  totalSteps,
}: RegistrationProgressProps) {
  const progress = Math.floor((step / totalSteps) * 100);

  return (
    <div className="mb-6">
      <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Step {step} of {totalSteps}
      </div>
      <Progress progress={progress} size="lg" />
    </div>
  );
}
