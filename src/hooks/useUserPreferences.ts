import { useState, useEffect, useCallback } from 'react';
import { userPreferencesService } from '../services/userPreferences';
import { useAuth } from '../context/AuthContext';
import type { UserGamePreference, GamePreferenceStats } from '../types';

interface UseUserPreferencesResult {
  preferences: Map<string, UserGamePreference>;
  loading: boolean;
  error: string | null;
  likeGame: (gameId: string) => Promise<void>;
  dislikeGame: (gameId: string) => Promise<void>;
  clearReaction: (gameId: string) => Promise<void>;
  toggleFavorite: (gameId: string) => Promise<void>;
  getPreference: (gameId: string) => UserGamePreference | null;
  getPreferenceStats: (gameId: string) => Promise<GamePreferenceStats>;
}

export const useUserPreferences = (): UseUserPreferencesResult => {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState<Map<string, UserGamePreference>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all preferences for the current user
  const fetchPreferences = useCallback(async () => {
    if (!currentUser) {
      setPreferences(new Map());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const prefs = await userPreferencesService.getPreferencesByUser(currentUser.uid);
      const prefMap = new Map<string, UserGamePreference>();
      prefs.forEach((pref) => prefMap.set(pref.gameId, pref));
      setPreferences(prefMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Like a game (or toggle off if already liked)
  const likeGame = useCallback(async (gameId: string) => {
    if (!currentUser) return;

    try {
      // Use functional update to get current preferences
      let currentReaction: 'like' | 'dislike' | null = null;
      setPreferences((prev) => {
        currentReaction = prev.get(gameId)?.reaction || null;
        return prev;
      });

      const newReaction = currentReaction === 'like' ? null : 'like';
      const updatedPref = await userPreferencesService.setReaction(
        currentUser.uid,
        gameId,
        newReaction
      );

      setPreferences((prev) => {
        const next = new Map(prev);
        if (updatedPref.reaction === null && !updatedPref.isFavorite) {
          next.delete(gameId);
        } else {
          next.set(gameId, updatedPref);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to like game');
    }
  }, [currentUser]);

  // Dislike a game (or toggle off if already disliked)
  const dislikeGame = useCallback(async (gameId: string) => {
    if (!currentUser) return;

    try {
      // Use functional update to get current preferences
      let currentReaction: 'like' | 'dislike' | null = null;
      setPreferences((prev) => {
        currentReaction = prev.get(gameId)?.reaction || null;
        return prev;
      });

      const newReaction = currentReaction === 'dislike' ? null : 'dislike';
      const updatedPref = await userPreferencesService.setReaction(
        currentUser.uid,
        gameId,
        newReaction
      );

      setPreferences((prev) => {
        const next = new Map(prev);
        if (updatedPref.reaction === null && !updatedPref.isFavorite) {
          next.delete(gameId);
        } else {
          next.set(gameId, updatedPref);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dislike game');
    }
  }, [currentUser]);

  // Clear reaction (set to null)
  const clearReaction = useCallback(async (gameId: string) => {
    if (!currentUser) return;

    try {
      const updatedPref = await userPreferencesService.setReaction(
        currentUser.uid,
        gameId,
        null
      );

      setPreferences((prev) => {
        const next = new Map(prev);
        if (updatedPref.reaction === null && !updatedPref.isFavorite) {
          next.delete(gameId);
        } else {
          next.set(gameId, updatedPref);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear reaction');
    }
  }, [currentUser]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (gameId: string) => {
    if (!currentUser) return;

    try {
      const updatedPref = await userPreferencesService.toggleFavorite(
        currentUser.uid,
        gameId
      );

      setPreferences((prev) => {
        const next = new Map(prev);
        if (updatedPref.reaction === null && !updatedPref.isFavorite) {
          next.delete(gameId);
        } else {
          next.set(gameId, updatedPref);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
    }
  }, [currentUser]);

  // Get preference for a specific game
  const getPreference = useCallback((gameId: string): UserGamePreference | null => {
    return preferences.get(gameId) || null;
  }, [preferences]);

  // Get preference stats for a game
  const getPreferenceStats = useCallback(async (gameId: string): Promise<GamePreferenceStats> => {
    return userPreferencesService.getPreferenceStats(gameId);
  }, []);

  return {
    preferences,
    loading,
    error,
    likeGame,
    dislikeGame,
    clearReaction,
    toggleFavorite,
    getPreference,
    getPreferenceStats,
  };
};
