import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { NonIdealState, Spinner, Button } from '@blueprintjs/core';
import { Link } from 'react-router-dom';
import { GameCard, GameFilters, GameDetailDialog, AddGameDialog } from '../components';
import { useGames } from '../hooks/useGames';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { householdsService } from '../services/households';
import { gamesService } from '../services/games';
import { useAuth } from '../context/AuthContext';
import type { OwnedGame, Household } from '../types';

export const HomePage: React.FC = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { games, filteredGames, loading, error, filters, setFilters, getOwnershipsByGame, refreshGames } = useGames();
  const {
    getPreference,
    likeGame,
    dislikeGame,
    toggleFavorite,
    getPreferenceStats,
  } = useUserPreferences();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedGame, setSelectedGame] = useState<OwnedGame | null>(null);
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = useState(false);

  const handleGameAdded = useCallback(() => {
    refreshGames();
  }, [refreshGames]);

  const availableCategories = useMemo(
    () => gamesService.getUniqueCategories(games),
    [games]
  );

  useEffect(() => {
    if (!currentUser) return;

    const fetchHouseholds = async () => {
      try {
        const data = await householdsService.getAllHouseholds();
        setHouseholds(data);
      } catch (err) {
        console.error('Failed to fetch households:', err);
      }
    };
    fetchHouseholds();
  }, [currentUser]);

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
          onFiltersChange={setFilters}
          households={households}
          availableCategories={availableCategories}
          totalGames={games.length}
          filteredGamesCount={filteredGames.length}
          actionButton={
            <button
              className="add-game-btn"
              onClick={() => setIsAddGameDialogOpen(true)}
            >
              <svg viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Game
            </button>
          }
        />
      </div>

      <div className="home-page-content">
        {filteredGames.length === 0 ? (
          <NonIdealState
            icon="search"
            title="No games found"
            description={
              filters.searchQuery || filters.playerCount || filters.householdIds || filters.categories || filters.playTime
                ? "Try adjusting your filters"
                : "Be the first to add a game to the library!"
            }
            action={
              currentUser ? (
                <Button
                  intent="primary"
                  icon="add"
                  onClick={() => setIsAddGameDialogOpen(true)}
                >
                  Add a Game
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="games-grid">
            {filteredGames.map((game) => (
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
        onFetchStats={getPreferenceStats}
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
