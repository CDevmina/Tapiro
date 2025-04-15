import { AxiosError } from "axios";
import { Error as ApiError } from "../types/data-contracts";

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined;

    if (apiError?.message) {
      return apiError.message;
    }

    if (error.response?.status === 401) {
      return "Authentication required. Please log in.";
    }

    if (error.response?.status === 403) {
      return "You don't have permission to access this resource.";
    }

    if (error.response?.status === 404) {
      return "The requested resource was not found.";
    }
  }

  return "An unexpected error occurred. Please try again.";
}
