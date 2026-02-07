import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Dialog, Button, Icon, Tag } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import { useGameNight } from '../context/GameNightContext';
import type { OwnedGame } from '../types';

export const GameNightLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { games, loading: gamesLoading } = useGames();
  const { resetDraft } = useGameNight();

  // Casual play state
  const [showCasualResult, setShowCasualResult] = useState(false);
  const [casualPickedGame, setCasualPickedGame] = useState<OwnedGame | null>(null);

  // Reset draft state when landing page mounts
  useEffect(() => {
    resetDraft();
  }, [resetDraft]);

  // Handle casual play - pick random game from all available
  const handleCasualPlay = useCallback(() => {
    if (games.length === 0) return;

    // Deduplicate games by ID
    const uniqueGames = Array.from(
      new Map(games.map(g => [g.id, g])).values()
    );

    const randomIndex = Math.floor(Math.random() * uniqueGames.length);
    setCasualPickedGame(uniqueGames[randomIndex]);
    setShowCasualResult(true);
  }, [games]);

  // Handle host game night - navigate to player selection
  const handleHostGameNight = useCallback(() => {
    resetDraft();
    navigate('/game-night/new/players');
  }, [navigate, resetDraft]);

  // Handle pick again
  const handlePickAgain = useCallback(() => {
    setShowCasualResult(false);
    setCasualPickedGame(null);
    // Small delay before picking again
    setTimeout(handleCasualPlay, 100);
  }, [handleCasualPlay]);

  // Loading states
  if (authLoading) {
    return (
      <div className="page-loading">
        <Spinner size={50} />
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return (
      <div className="game-night-landing">
        <div className="landing-hero">
          <h1>Ready to Play?</h1>
          <p>Log in to start a game night!</p>
        </div>
      </div>
    );
  }

  const playerRange = casualPickedGame
    ? casualPickedGame.minPlayers === casualPickedGame.maxPlayers
      ? `${casualPickedGame.minPlayers} players`
      : `${casualPickedGame.minPlayers}-${casualPickedGame.maxPlayers} players`
    : '';

  return (
    <div className="game-night-landing">
      <div className="landing-hero">
        <h1>Ready to Play?</h1>
        <p>Jump right in or set up a full game night</p>
      </div>

      <div className="landing-options">
        {/* Casual Play Card */}
        <div
          className="landing-card"
          onClick={handleCasualPlay}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCasualPlay()}
        >
          <div className="landing-card-icon yellow">
            <Icon icon="refresh" size={36} />
          </div>
          <h2>Casual Play</h2>
          <p>Let fate decide! We'll randomly pick a game from your library.</p>
          <span className="card-btn">
            Pick a game
          </span>
        </div>

        {/* Host Game Night Card */}
        <div
          className="landing-card"
          onClick={handleHostGameNight}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleHostGameNight()}
        >
          <div className="landing-card-icon blue">
            <Icon icon="people" size={36} />
          </div>
          <h2>Host Game Night</h2>
          <p>Set up a session with players, location, and game selection.</p>
          <span className="card-btn">Get started</span>
        </div>

        {/* Join Game Night Card */}
        <div
          className="landing-card disabled"
          role="button"
          tabIndex={0}
        >
          <div className="coming-soon-tag">Coming Soon</div>
          <div className="landing-card-icon green">
            <Icon icon="log-in" size={36} />
          </div>
          <h2>Join Game Night</h2>
          <p>Someone hosting? Enter their code to join the session.</p>
          <span className="card-btn">Enter code</span>
        </div>
      </div>

      {/* Casual Play Result Dialog */}
      <Dialog
        isOpen={showCasualResult}
        onClose={() => setShowCasualResult(false)}
        title=""
        className="casual-play-result-dialog"
        canOutsideClickClose
      >
        {casualPickedGame && (
          <div className="result-content">
            <div className="result-header">
              <span className="celebration-icon">
                <Icon icon="random" size={24} />
              </span>
              <h2>Random Pick!</h2>
            </div>

            <div className="result-game">
              <div className="result-game-image">
                {casualPickedGame.imageUrl ? (
                  <img src={casualPickedGame.imageUrl} alt={casualPickedGame.name} />
                ) : (
                  <div className="result-image-placeholder">
                    <Icon icon="cube" size={64} />
                  </div>
                )}
              </div>

              <h3 className="result-game-title">{casualPickedGame.name}</h3>

              <div className="result-game-meta">
                <Tag minimal large icon="people">
                  {playerRange}
                </Tag>
                {casualPickedGame.playTimeMinutes && (
                  <Tag minimal large icon="time">
                    {casualPickedGame.playTimeMinutes} min
                  </Tag>
                )}
              </div>

              <Tag intent="primary" large className="result-owner">
                From {casualPickedGame.ownership.householdName}
              </Tag>
            </div>

            <div className="result-actions">
              <Button
                large
                icon="refresh"
                onClick={handlePickAgain}
              >
                Pick Again
              </Button>
              <Button
                large
                intent="success"
                icon="play"
                onClick={() => setShowCasualResult(false)}
              >
                Let's Play!
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
