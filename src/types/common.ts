/**
 * Options for initializing the NutrientClient.
 */
export interface NutrientClientOptions {
  /**
   * The API key for authentication.
   *
   * - For server-side (Node.js) use, this can be your long-lived API key string.
   * - For client-side (browser) use, this MUST be an async function that
   * returns a short-lived access token to avoid exposing your secret key.
   *
   * @example
   * // Server-side
   * const apiKey = 'your-secret-api-key';
   *
   * // Client-side (recommended)
   * const apiKey = async () => {
   *   const response = await fetch('/api/get-nutrient-token');
   *   const { token } = await response.json();
   *   return token;
   * };
   */
  apiKey: string | (() => Promise<string>);
  
  /**
   * The base URL for the Nutrient DWS API.
   * @default 'https://api.nutrient.io'
   */
  baseUrl?: string;
}