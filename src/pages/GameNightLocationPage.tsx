import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Icon } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { useGameNight, type BroughtGame } from '../context/GameNightContext';
import { useGames } from '../hooks/useGames';
import { householdsService } from '../services/households';
import { HouseholdCard } from '../components/HouseholdCard';
import { BroughtGamesModal } from '../components/BroughtGamesModal';
import type { Household } from '../types';

interface HouseholdWithCount extends Household {
  gamesCount: number;
}

export const GameNightLocationPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const {
    selectedPlayers,
    guests,
    hostHouseholdId,
    broughtGames,
    setHostHousehold,
    addBroughtGame,
    removeBroughtGame,
    startSession,
  } = useGameNight();
  const { games } = useGames();

  const [households, setHouseholds] = useState<HouseholdWithCount[]>([]);
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBroughtGamesModal, setShowBroughtGamesModal] = useState(false);

  // Redirect if no players selected
  useEffect(() => {
    if (!authLoading && selectedPlayers.length === 0 && guests.length === 0) {
      navigate('/game-night/new/players');
    }
  }, [authLoading, selectedPlayers.length, guests.length, navigate]);

  // Fetch households of selected players
  useEffect(() => {
    const fetchHouseholds = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Get all households
        const allHouseholdsData = await householdsService.getAllHouseholds();
        setAllHouseholds(allHouseholdsData);

        // Get unique household IDs from selected players
        const playerHouseholdIds = new Set(
          selectedPlayers
            .filter(p => p.householdId)
            .map(p => p.householdId!)
        );

        // Count games per household
        const gameCountMap = new Map<string, number>();
        games.forEach((game) => {
          const hhId = game.ownership.householdId;
          gameCountMap.set(hhId, (gameCountMap.get(hhId) || 0) + 1);
        });

        // Filter to only households of selected players
        const relevantHouseholds = allHouseholdsData
          .filter(h => playerHouseholdIds.has(h.id))
          .map(h => ({
            ...h,
            gamesCount: gameCountMap.get(h.id) || 0,
          }));

        setHouseholds(relevantHouseholds);

        // Auto-select user's household if not already selected
        if (!hostHouseholdId && userProfile?.householdId) {
          const userHousehold = relevantHouseholds.find(
            h => h.id === userProfile.householdId
          );
          if (userHousehold) {
            setHostHousehold(userHousehold.id, userHousehold.name);
          } else if (relevantHouseholds.length > 0) {
            // Select first available household
            setHostHousehold(relevantHouseholds[0].id, relevantHouseholds[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch households:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchHouseholds();
    }
  }, [authLoading, currentUser, selectedPlayers, games, hostHouseholdId, userProfile?.householdId, setHostHousehold]);

  const handleHouseholdClick = useCallback((household: HouseholdWithCount) => {
    setHostHousehold(household.id, household.name);
  }, [setHostHousehold]);

  const handleBack = useCallback(() => {
    navigate('/game-night/new/players');
  }, [navigate]);

  const handleStartGameNight = useCallback(() => {
    if (!currentUser || !hostHouseholdId) return;

    startSession(currentUser.uid);
    navigate('/game-night/session');
  }, [currentUser, hostHouseholdId, startSession, navigate]);

  const handleAddBroughtGames = useCallback((games: BroughtGame[]) => {
    games.forEach(game => addBroughtGame(game));
  }, [addBroughtGame]);

  const getPlayerRange = (game: { minPlayers: number; maxPlayers: number }): string => {
    return game.minPlayers === game.maxPlayers
      ? `${game.minPlayers} players`
      : `${game.minPlayers}-${game.maxPlayers} players`;
  };

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="page-loading">
        <Spinner size={50} />
        <p>Loading households...</p>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    navigate('/game-night');
    return null;
  }

  return (
    <div className="game-night-step-page">
      {/* Step Indicator */}
      <div className="steps-indicator">
        <div className="step-dot completed" />
        <div className="step-line completed" />
        <div className="step-dot active" />
      </div>

      <div className="step-container">
        <div className="step-header">
          <div className="step-number">2</div>
          <h1 className="step-title">Where's Game Night?</h1>
          <p className="step-subtitle">We'll pick from games at this household</p>
        </div>

        <div className="household-grid">
          {households.map((household) => (
            <HouseholdCard
              key={household.id}
              name={household.name}
              gamesCount={household.gamesCount}
              isSelected={hostHouseholdId === household.id}
              onClick={() => handleHouseholdClick(household)}
            />
          ))}
        </div>

        {/* Brought Games Section */}
        <div className="brought-games-section">
          <div className="brought-games-header">
            <div className="brought-games-title">
              <Icon icon="briefcase" size={18} />
              <span>Did anyone bring games?</span>
            </div>
            <p className="brought-games-subtitle">
              Add games guests brought from other households
            </p>
          </div>

          {broughtGames.length > 0 && (
            <div className="brought-games-list">
              {broughtGames.map((bg) => (
                <div key={bg.game.id} className="brought-game-item">
                  <div className="brought-game-info">
                    <span className="brought-game-name">{bg.game.name}</span>
                    <span className="brought-game-meta">
                      from {bg.fromHouseholdName} · {getPlayerRange(bg.game)}
                    </span>
                  </div>
                  <button
                    className="remove-brought-game"
                    onClick={() => removeBroughtGame(bg.game.id)}
                    aria-label="Remove game"
                  >
                    <Icon icon="cross" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            className="add-brought-game-btn"
            onClick={() => setShowBroughtGamesModal(true)}
          >
            <Icon icon="plus" size={18} />
            Add a game someone brought
          </button>
        </div>

        <div className="step-actions">
          <button className="btn btn-back" onClick={handleBack}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <button
            className="btn btn-next"
            onClick={handleStartGameNight}
            disabled={!hostHouseholdId}
          >
            Start Game Night
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Brought Games Modal */}
      {hostHouseholdId && (
        <BroughtGamesModal
          isOpen={showBroughtGamesModal}
          onClose={() => setShowBroughtGamesModal(false)}
          games={games}
          households={allHouseholds}
          hostHouseholdId={hostHouseholdId}
          existingBroughtGames={broughtGames}
          onAddGames={handleAddBroughtGames}
        />
      )}
    </div>
  );
};
