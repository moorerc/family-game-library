import { useState, useCallback, useRef } from 'react';
import { bggService } from '../services/bgg';
import type { BGGSearchResult, BGGGameDetails } from '../types';

interface UseBGGSearchReturn {
  searchResults: BGGSearchResult[];
  selectedGame: BGGGameDetails | null;
  searching: boolean;
  loadingDetails: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  selectGame: (bggId: string) => Promise<void>;
  clearSelection: () => void;
  clearResults: () => void;
}

export const useBGGSearch = (): UseBGGSearchReturn => {
  const [searchResults, setSearchResults] = useState<BGGSearchResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<BGGGameDetails | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest search request to ignore stale responses
  const latestSearchIdRef = useRef(0);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setError(null);
      return;
    }

    // Increment the search ID for this request
    const searchId = ++latestSearchIdRef.current;

    setSearching(true);
    setError(null);

    try {
      const results = await bggService.searchGames(query);

      // Only update results if this is still the latest search
      if (searchId === latestSearchIdRef.current) {
        setSearchResults(results);
      }
    } catch (err) {
      // Only update error if this is still the latest search
      if (searchId === latestSearchIdRef.current) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
      }
    } finally {
      // Only clear searching if this is still the latest search
      if (searchId === latestSearchIdRef.current) {
        setSearching(false);
      }
    }
  }, []);

  const selectGame = useCallback(async (bggId: string) => {
    setLoadingDetails(true);
    setError(null);

    try {
      const details = await bggService.getGameDetails(bggId);
      setSelectedGame(details);
      setSearchResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game details');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedGame(null);
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    searchResults,
    selectedGame,
    searching,
    loadingDetails,
    error,
    search,
    selectGame,
    clearSelection,
    clearResults,
  };
};
