import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { NonIdealState, Spinner, Button } from '@blueprintjs/core';
import { Link, useSearchParams } from 'react-router-dom';
import { GameCard, GameFilters, GameDetailDialog, AddGameDialog } from '../components';
import { useGames } from '../hooks/useGames';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { householdsService } from '../services/households';
import { guildsService } from '../services/guilds';
import { gamesService } from '../services/games';
import { useAuth } from '../context/AuthContext';
import type { OwnedGame, Household } from '../types';

export const HomePage: React.FC = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { games, filteredGames, loading, error, filters, setFilters, getOwnershipsByGame, refreshGames } = useGames();
  const {
    preferences,
    getPreference,
    likeGame,
    dislikeGame,
    toggleFavorite,
  } = useUserPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdsLoading, setHouseholdsLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<OwnedGame | null>(null);
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = useState(false);

  // Check URL params for favorites filter on mount
  useEffect(() => {
    const favoritesParam = searchParams.get('favorites');
    if (favoritesParam === 'true' && !filters.favoritesOnly) {
      setFilters({ ...filters, favoritesOnly: true });
    }
  }, [searchParams]);

  // Update URL when favorites filter changes
  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    if (newFilters.favoritesOnly) {
      setSearchParams({ favorites: 'true' });
    } else {
      searchParams.delete('favorites');
      setSearchParams(searchParams);
    }
  }, [setFilters, searchParams, setSearchParams]);

  // Get favorite game IDs for filtering
  const favoriteGameIds = useMemo(() => {
    const ids: string[] = [];
    preferences.forEach((pref, gameId) => {
      if (pref.isFavorite) {
        ids.push(gameId);
      }
    });
    return new Set(ids);
  }, [preferences]);

  // Filter games by guild households first
  const guildFilteredGames = useMemo(() => {
    // Wait for households to load before filtering to avoid flash of unfiltered data
    if (userProfile?.activeGuildId && householdsLoading) return [];
    if (userProfile?.activeGuildId && households.length > 0) {
      const householdIds = new Set(households.map(h => h.id));
      return filteredGames.filter(game => householdIds.has(game.ownership.householdId));
    }
    return filteredGames;
  }, [filteredGames, households, householdsLoading, userProfile?.activeGuildId]);

  // Apply favorites filter on top of other filters
  const displayedGames = useMemo(() => {
    if (!filters.favoritesOnly) return guildFilteredGames;
    return guildFilteredGames.filter(game => favoriteGameIds.has(game.id));
  }, [guildFilteredGames, filters.favoritesOnly, favoriteGameIds]);

  const handleGameAdded = useCallback(() => {
    refreshGames();
  }, [refreshGames]);

  const availableCategories = useMemo(
    () => gamesService.getUniqueCategories(guildFilteredGames),
    [guildFilteredGames]
  );

  useEffect(() => {
    if (!currentUser) return;

    const fetchHouseholds = async () => {
      setHouseholdsLoading(true);
      try {
        // If user has an active guild, only show that guild's households
        if (userProfile?.activeGuildId) {
          const guildHouseholds = await guildsService.getGuildHouseholds(userProfile.activeGuildId);
          setHouseholds(guildHouseholds);
        } else {
          // Fallback to all households if no active guild
          const data = await householdsService.getAllHouseholds();
          setHouseholds(data);
        }
      } catch (err) {
        console.error('Failed to fetch households:', err);
      } finally {
        setHouseholdsLoading(false);
      }
    };
    fetchHouseholds();
  }, [currentUser, userProfile?.activeGuildId]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="page-loading">
        <Spinner size={50} />
      </div>
    );
  }

  // Show welcome screen for unauthenticated users
  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="welcome-screen">
          <NonIdealState
            icon="home"
            title="Welcome to Game Night HQ"
            description="Your family's board game command center. Log in to discover, track, and pick your next game night adventure."
            action={
              <div className="welcome-actions">
                <Link to="/login">
                  <Button intent="primary" large icon="log-in">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button large icon="new-person">
                    Sign Up
                  </Button>
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Spinner size={50} />
        <p>Loading your game collection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <NonIdealState
          icon="error"
          title="Something went wrong"
          description={error}
          action={
            <Button icon="refresh" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-page-filters">
        <GameFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          households={households}
          availableCategories={availableCategories}
          totalGames={games.length}
          filteredGamesCount={displayedGames.length}
          actionButton={
            <button
              className="add-game-btn"
              onClick={() => setIsAddGameDialogOpen(true)}
            >
              <svg viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span className="btn-label">Add Game</span>
            </button>
          }
        />
      </div>

      <div className="home-page-content">
        {displayedGames.length === 0 ? (
          <div className="library-empty-state">
            <div className="empty-shelf">
              <div className="shelf-container">
                <div className="shelf-games">
                  <div className="shelf-game" />
                  <div className="shelf-game" />
                  <div className="shelf-game" />
                  <div className="shelf-game" />
                  <div className="shelf-game" />
                </div>
                <div className="floating-shelf" />
                <div className="shelf-brackets">
                  <div className="bracket" />
                  <div className="bracket" />
                </div>
              </div>
            </div>
            <h3 className="empty-title">No games found</h3>
            <p className="empty-desc">
              Try adjusting your search or filters, or add a new game to your library.
            </p>
            {currentUser && (
              <button className="empty-btn" onClick={() => setIsAddGameDialogOpen(true)}>
                <svg viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Game
              </button>
            )}
          </div>
        ) : (
          <div className="games-grid">
            {displayedGames.map((game) => (
              <GameCard
                key={`${game.id}-${game.ownership.id}`}
                game={game}
                onClick={() => setSelectedGame(game)}
                preference={getPreference(game.id)}
                onLike={currentUser ? likeGame : undefined}
                onDislike={currentUser ? dislikeGame : undefined}
                onToggleFavorite={currentUser ? toggleFavorite : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <GameDetailDialog
        game={selectedGame}
        isOpen={selectedGame !== null}
        onClose={() => setSelectedGame(null)}
        onFetchOwnerships={getOwnershipsByGame}
        preference={selectedGame ? getPreference(selectedGame.id) : null}
        onLike={currentUser ? likeGame : undefined}
        onDislike={currentUser ? dislikeGame : undefined}
        onToggleFavorite={currentUser ? toggleFavorite : undefined}
      />

      <AddGameDialog
        isOpen={isAddGameDialogOpen}
        onClose={() => setIsAddGameDialogOpen(false)}
        onGameAdded={handleGameAdded}
        households={households}
        userHouseholdId={userProfile?.householdId}
      />
    </div>
  );
};
