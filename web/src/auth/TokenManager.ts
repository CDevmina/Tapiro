import { Auth0Client } from "@auth0/auth0-spa-js";

class TokenManager {
  private auth0Client: Auth0Client | null = null;
  private currentToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private initializationPromise: Promise<void> | null = null;
  private isInitializing: boolean = false;

  setAuth0Client(client: Auth0Client) {
    this.auth0Client = client;
  }

  setToken(token: string) {
    this.currentToken = token;
  }

  // New method to track initialization status
  setInitializing(promise: Promise<void>) {
    this.isInitializing = true;
    this.initializationPromise = promise;

    // Clear initializing flag when promise resolves or rejects
    promise.finally(() => {
      this.isInitializing = false;
      this.initializationPromise = null;
    });
  }

  async getToken(): Promise<string> {
    try {
      // If there's an ongoing refresh, wait for it
      if (this.refreshPromise) {
        return await this.refreshPromise;
      }

      // If token is being initialized, wait for it (with timeout)
      if (this.isInitializing && this.initializationPromise) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Token initialization timeout")),
            5000
          );
        });

        try {
          await Promise.race([this.initializationPromise, timeoutPromise]);
          // If initialization succeeded and we have a token now, return it
          if (this.currentToken) {
            return this.currentToken;
          }
        } catch (err) {
          console.warn("Waiting for token initialization failed:", err);
          // Continue with regular flow after timeout
        }
      }

      if (this.currentToken) {
        return this.currentToken;
      }

      // Use the Auth0 client as a fallback if available
      if (this.auth0Client) {
        try {
          this.refreshPromise = this.auth0Client.getTokenSilently();
          const token = await this.refreshPromise;
          this.currentToken = token;
          this.refreshPromise = null;
          return token;
        } catch (refreshError) {
          this.refreshPromise = null;
          console.error("Auth0 client token retrieval failed:", refreshError);
          throw refreshError;
        }
      }

      // If no token available at all, throw an error
      throw new Error("No token available");
    } catch (error) {
      console.error("Failed to get token:", error);
      throw error;
    }
  }

  clearToken() {
    this.currentToken = null;
  }
}

// Singleton instance
export const tokenManager = new TokenManager();
