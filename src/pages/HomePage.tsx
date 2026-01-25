import React, { useEffect, useState } from 'react';
import { NonIdealState, Spinner, Button } from '@blueprintjs/core';
import { Link } from 'react-router-dom';
import { GameCard, GameFilters } from '../components';
import { useGames } from '../hooks/useGames';
import { householdsService } from '../services/households';
import { useAuth } from '../context/AuthContext';
import type { Household } from '../types';

export const HomePage: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { filteredGames, loading, error, filters, setFilters } = useGames();
  const [households, setHouseholds] = useState<Household[]>([]);

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
            title="Welcome to Family Game Library"
            description="Track and share board games across your family's households. Log in to view your collection and add new games."
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
        <p>Loading your family's game library...</p>
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
      <header className="page-header">
        <div className="header-content">
          <h1>Family Game Library</h1>
          <p className="subtitle">
            {filteredGames.length} games across {households.length} households
          </p>
        </div>
        {currentUser && (
          <Link to="/add">
            <Button intent="primary" icon="add" large>
              Add Game
            </Button>
          </Link>
        )}
      </header>

      <GameFilters
        filters={filters}
        onFiltersChange={setFilters}
        households={households}
      />

      {filteredGames.length === 0 ? (
        <NonIdealState
          icon="search"
          title="No games found"
          description={
            filters.searchQuery || filters.playerCount || filters.householdId
              ? "Try adjusting your filters"
              : "Be the first to add a game to the library!"
          }
          action={
            currentUser ? (
              <Link to="/add">
                <Button intent="primary" icon="add">
                  Add a Game
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="games-grid">
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};
