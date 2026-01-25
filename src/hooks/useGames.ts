import { useState, useEffect, useCallback } from 'react';
import { gamesService } from '../services/games';
import type { Game, GameFilters } from '../types';

interface UseGamesResult {
  games: Game[];
  filteredGames: Game[];
  loading: boolean;
  error: string | null;
  filters: GameFilters;
  setFilters: (filters: GameFilters) => void;
  addGame: (game: Omit<Game, 'id'>) => Promise<void>;
  updateGame: (gameId: string, updates: Partial<Game>) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  refreshGames: () => Promise<void>;
}

export const useGames = (): UseGamesResult => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GameFilters>({
    searchQuery: '',
  });

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedGames = await gamesService.getAllGames();
      setGames(fetchedGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const filteredGames = gamesService.filterGames(games, filters);

  const addGame = async (game: Omit<Game, 'id'>): Promise<void> => {
    try {
      await gamesService.addGame(game);
      await fetchGames(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add game');
      throw err;
    }
  };

  const updateGame = async (gameId: string, updates: Partial<Game>): Promise<void> => {
    try {
      await gamesService.updateGame(gameId, updates);
      await fetchGames(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update game');
      throw err;
    }
  };

  const deleteGame = async (gameId: string): Promise<void> => {
    try {
      await gamesService.deleteGame(gameId);
      await fetchGames(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete game');
      throw err;
    }
  };

  return {
    games,
    filteredGames,
    loading,
    error,
    filters,
    setFilters,
    addGame,
    updateGame,
    deleteGame,
    refreshGames: fetchGames,
  };
};
