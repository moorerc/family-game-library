import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { NonIdealState, Spinner, Button, Card } from '@blueprintjs/core';
import { Link } from 'react-router-dom';
import {
  GameNightFilters,
  GameWheelSpinner,
  GameNightResultDialog,
} from '../components';
import type { GameNightFilterState } from '../components/GameNightFilters';
import { useGames } from '../hooks/useGames';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { householdsService } from '../services/households';
import { useAuth } from '../context/AuthContext';
import type { OwnedGame, Household } from '../types';

export const GameNightPage: React.FC = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { games, loading } = useGames();
  const { getPreference } = useUserPreferences();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [filters, setFilters] = useState<GameNightFilterState>({
    playerCount: undefined,
    hostHouseholdId: undefined,
    additionalHouseholdIds: [],
    preferencesFilter: 'all',
  });
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedGame, setSelectedGame] = useState<OwnedGame | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Fetch households on mount
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

  // Set default host household to user's household when loaded
  useEffect(() => {
    if (userProfile?.householdId && !filters.hostHouseholdId) {
      setFilters(prev => ({
        ...prev,
        hostHouseholdId: userProfile.householdId,
      }));
    }
  }, [userProfile?.householdId, filters.hostHouseholdId]);

  // Filter games based on filters
  const filteredGames = useMemo(() => {
    // Deduplicate games by game ID (keep first occurrence)
    const uniqueGamesMap = new Map<string, OwnedGame>();
    games.forEach(game => {
      if (!uniqueGamesMap.has(game.id)) {
        uniqueGamesMap.set(game.id, game);
      }
    });

    let result = Array.from(uniqueGamesMap.values());

    // Filter by player count
    if (filters.playerCount) {
      result = result.filter(
        game =>
          filters.playerCount! >= game.minPlayers &&
          filters.playerCount! <= game.maxPlayers
      );
    }

    // Filter by household
    if (filters.hostHouseholdId) {
      const allowedHouseholds = [
        filters.hostHouseholdId,
        ...filters.additionalHouseholdIds,
      ];
      result = result.filter(game =>
        allowedHouseholds.includes(game.ownership.householdId)
      );
    }

    // Filter by preferences
    if (filters.preferencesFilter !== 'all') {
      result = result.filter(game => {
        const pref = getPreference(game.id);
        if (filters.preferencesFilter === 'liked') {
          return pref?.reaction === 'like';
        }
        if (filters.preferencesFilter === 'favorites') {
          return pref?.isFavorite === true;
        }
        return true;
      });
    }

    return result;
  }, [games, filters, getPreference]);

  // Quick pick - instant random selection
  const handleQuickPick = useCallback(() => {
    if (filteredGames.length === 0) return;

    const randomIndex = Math.floor(Math.random() * filteredGames.length);
    setSelectedGame(filteredGames[randomIndex]);
    setShowResult(true);
  }, [filteredGames]);

  // Start wheel spin
  const handleSpin = useCallback(() => {
    if (filteredGames.length === 0 || isSpinning) return;
    setIsSpinning(true);
  }, [filteredGames.length, isSpinning]);

  // Handle wheel spin complete
  const handleSpinComplete = useCallback((game: OwnedGame) => {
    setIsSpinning(false);
    setSelectedGame(game);
    setShowResult(true);
  }, []);

  // Close result dialog
  const handleCloseResult = useCallback(() => {
    setShowResult(false);
    setSelectedGame(null);
  }, []);

  // Spin again from result dialog
  const handleSpinAgain = useCallback(() => {
    handleSpin();
  }, [handleSpin]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="page-loading">
        <Spinner size={50} />
      </div>
    );
  }

  // Show login prompt for unauthenticated users
  if (!currentUser) {
    return (
      <div className="game-night-page">
        <div className="welcome-screen">
          <NonIdealState
            icon="random"
            title="Game Night Picker"
            description="Log in to pick a random game from your family's library!"
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
        <p>Loading games...</p>
      </div>
    );
  }

  return (
    <div className="game-night-page">
      <div className="page-header">
        <h1>Game Night</h1>
        <p className="page-subtitle">
          Can't decide what to play? Let us pick for you!
        </p>
      </div>

      <GameNightFilters
        filters={filters}
        onFiltersChange={setFilters}
        households={households}
        userHouseholdId={userProfile?.householdId}
      />

      {/* Quick Pick Section */}
      <Card className="quick-pick-section">
        <h3>Quick Pick</h3>
        <p>Get an instant random game recommendation</p>
        <Button
          large
          intent="primary"
          icon="random"
          onClick={handleQuickPick}
          disabled={filteredGames.length === 0}
        >
          Pick a Random Game
        </Button>
        {filteredGames.length > 0 && (
          <span className="games-count">{filteredGames.length} games available</span>
        )}
      </Card>

      {/* Spin the Wheel Section */}
      <Card className="spin-wheel-section">
        <h3>Spin the Wheel</h3>
        <p>Watch the wheel spin and see where it lands!</p>

        <GameWheelSpinner
          games={filteredGames}
          isSpinning={isSpinning}
          onSpinComplete={handleSpinComplete}
        />

        <Button
          large
          intent="success"
          icon="refresh"
          onClick={handleSpin}
          disabled={filteredGames.length === 0 || isSpinning}
          loading={isSpinning}
        >
          {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
        </Button>
      </Card>

      {filteredGames.length === 0 && (
        <NonIdealState
          icon="search"
          title="No games match your filters"
          description="Try adjusting your filters or add more games to your library."
          action={
            <Link to="/add">
              <Button intent="primary" icon="add">
                Add a Game
              </Button>
            </Link>
          }
        />
      )}

      <GameNightResultDialog
        game={selectedGame}
        isOpen={showResult}
        onClose={handleCloseResult}
        onSpinAgain={handleSpinAgain}
      />
    </div>
  );
};
