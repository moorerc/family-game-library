import type { BGGSearchResult, BGGGameDetails } from '../types';

// Get the functions base URL from environment or use default
// For local dev with emulators: http://127.0.0.1:5001/PROJECT_ID/us-central1
// For production: https://us-central1-PROJECT_ID.cloudfunctions.net
const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

export const bggService = {
  async searchGames(query: string): Promise<BGGSearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const url = `${FUNCTIONS_BASE_URL}/bggSearch?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Search failed');
    }

    const data = await response.json();
    return data.results || [];
  },

  async getGameDetails(bggId: string): Promise<BGGGameDetails> {
    const url = `${FUNCTIONS_BASE_URL}/bggGameDetails?id=${encodeURIComponent(bggId)}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch game details');
    }

    return response.json();
  },
};
