import { useState, useEffect, useCallback } from 'react';
import { gamesService } from '../services/games';
import { ownershipService } from '../services/ownership';
import type { Game, OwnedGame, GameFilters, Ownership } from '../types';

interface UseGamesResult {
  games: OwnedGame[];
  filteredGames: OwnedGame[];
  loading: boolean;
  error: string | null;
  filters: GameFilters;
  setFilters: (filters: GameFilters) => void;
  addGameWithOwnership: (
    gameData: Omit<Game, 'id'>,
    householdId: string,
    householdName: string,
    notes?: string
  ) => Promise<void>;
  updateOwnership: (ownershipId: string, updates: Partial<Pick<Ownership, 'notes'>>) => Promise<void>;
  deleteOwnership: (ownershipId: string) => Promise<void>;
  refreshGames: () => Promise<void>;
  getOwnershipsByGame: (gameId: string) => Promise<Ownership[]>;
}

export const useGames = (): UseGamesResult => {
  const [games, setGames] = useState<OwnedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GameFilters>({
    searchQuery: '',
  });

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all owned games (games + ownership data joined)
      const fetchedGames = await ownershipService.getOwnedGames();
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

  // Add a game with ownership - creates/finds game then creates ownership
  const addGameWithOwnership = async (
    gameData: Omit<Game, 'id'>,
    householdId: string,
    householdName: string,
    notes?: string
  ): Promise<void> => {
    try {
      // Get or create the game (deduplicates by bggId)
      const { game } = await gamesService.getOrCreateGame(gameData);

      // Check if this household already owns this game
      const existingOwnership = await ownershipService.householdOwnsGame(game.id, householdId);
      if (existingOwnership) {
        throw new Error('Your household already owns this game');
      }

      // Create ownership record
      await ownershipService.addOwnership(
        game.id,
        householdId,
        householdName,
        gameData.createdBy,
        notes
      );

      await fetchGames(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add game');
      throw err;
    }
  };

  // Update an ownership record (e.g., notes)
  const updateOwnership = async (
    ownershipId: string,
    updates: Partial<Pick<Ownership, 'notes'>>
  ): Promise<void> => {
    try {
      await ownershipService.updateOwnership(ownershipId, updates);
      await fetchGames(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ownership');
      throw err;
    }
  };

  // Delete an ownership record (removes game from household's collection)
  const deleteOwnership = async (ownershipId: string): Promise<void> => {
    try {
      await ownershipService.deleteOwnership(ownershipId);
      await fetchGames(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove game');
      throw err;
    }
  };

  // Get all ownerships for a specific game (to show who owns it)
  const getOwnershipsByGame = async (gameId: string): Promise<Ownership[]> => {
    return ownershipService.getOwnershipsByGame(gameId);
  };

  return {
    games,
    filteredGames,
    loading,
    error,
    filters,
    setFilters,
    addGameWithOwnership,
    updateOwnership,
    deleteOwnership,
    refreshGames: fetchGames,
    getOwnershipsByGame,
  };
};
