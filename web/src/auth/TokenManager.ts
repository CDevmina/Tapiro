import { Auth0Client } from "@auth0/auth0-spa-js";

class TokenManager {
  private auth0Client: Auth0Client | null = null;
  private currentToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;

  setAuth0Client(client: Auth0Client) {
    // Keep this method for backward compatibility
    this.auth0Client = client;
  }

  // New method to directly set a token
  setToken(token: string) {
    this.currentToken = token;
  }

  async getToken(): Promise<string> {
    try {
      // If there's an ongoing refresh, wait for it
      if (this.refreshPromise) {
        return await this.refreshPromise;
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
