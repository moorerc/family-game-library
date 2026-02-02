import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Button, Icon, InputGroup, Dialog, Tag } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { useGameNight, getGuestColorHex } from '../context/GameNightContext';
import { useGames } from '../hooks/useGames';
import {
  GameNightRoulette,
  playersToRouletteItems,
  gamesToRouletteItems,
} from '../components/GameNightRoulette';
import { getInitials } from '../components/PlayerCard';
import type { OwnedGame } from '../types';

// Custom SVG Icons matching the mocks
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const BookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const GameNightSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { session, isActive, setCurrentlyPlaying, endSession } = useGameNight();
  const { games } = useGames();

  const [searchQuery, setSearchQuery] = useState('');
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);

  // Redirect if no active session
  useEffect(() => {
    if (!authLoading && !isActive) {
      navigate('/game-night');
    }
  }, [authLoading, isActive, navigate]);

  // Get available games (host household + brought games)
  const availableGames = useMemo(() => {
    if (!session) return [];

    // Get games from host household
    const hostGames = games.filter(
      g => g.ownership.householdId === session.hostHouseholdId
    );

    // Add brought games
    const broughtGamesList = session.broughtGames.map(bg => bg.game);

    // Combine and deduplicate
    const allGames = [...hostGames, ...broughtGamesList];
    const uniqueGames = Array.from(
      new Map(allGames.map(g => [g.id, g])).values()
    );

    return uniqueGames;
  }, [games, session]);

  // Filter games for Random Pick roulette by player count
  const filteredGamesForRoulette = useMemo(() => {
    if (!session) return [];

    const playerCount = session.players.length + session.guests.length;

    return availableGames.filter(
      g => g.minPlayers <= playerCount && g.maxPlayers >= playerCount
    );
  }, [availableGames, session]);

  // Filter games for browse section
  const filteredGamesForBrowse = useMemo(() => {
    if (!searchQuery) return availableGames;

    return availableGames.filter(g =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableGames, searchQuery]);

  const handlePlayGame = useCallback((game: OwnedGame) => {
    setCurrentlyPlaying(game);
  }, [setCurrentlyPlaying]);

  const handleEndSession = useCallback(() => {
    endSession();
    navigate('/game-night');
  }, [endSession, navigate]);

  const getPlayerRange = (game: OwnedGame): string => {
    return game.minPlayers === game.maxPlayers
      ? `${game.minPlayers} players`
      : `${game.minPlayers}-${game.maxPlayers} players`;
  };

  // Loading states
  if (authLoading) {
    return (
      <div className="page-loading">
        <Spinner size={50} />
      </div>
    );
  }

  if (!currentUser || !session) {
    return null;
  }

  // Get host display name
  const hostPlayer = session.players.find(p => p.id === session.hostId);
  const hostName = hostPlayer?.displayName || 'Unknown';

  // Create player roulette items
  const playerItems = playersToRouletteItems(session.players, session.guests);

  // Create game roulette items
  const gameItems = gamesToRouletteItems(filteredGamesForRoulette);

  return (
    <div className="game-night-session-page">
      {/* Session Header */}
      <div className="game-night-header">
        <div className="game-night-meta">
          {/* Host */}
          <div className="meta-item">
            <div className="meta-icon">
              <PersonIcon />
            </div>
            <div className="meta-info">
              <div className="label">Host</div>
              <div className="value">{hostName}</div>
            </div>
          </div>

          {/* Players */}
          <div className="meta-item">
            <div className="meta-icon">
              <PeopleIcon />
            </div>
            <div className="meta-info">
              <div className="label">Players</div>
              <div className="meta-players">
                {session.players.slice(0, 4).map((player) => (
                  <div key={player.id} className="mini-avatar">
                    {getInitials(player.displayName)}
                  </div>
                ))}
                {session.guests.slice(0, Math.max(0, 4 - session.players.length)).map((guest) => (
                  <div
                    key={guest.id}
                    className="mini-avatar guest"
                    style={{ backgroundColor: getGuestColorHex(guest.color) }}
                  >
                    {getInitials(guest.name)}
                  </div>
                ))}
                {(session.players.length + session.guests.length) > 4 && (
                  <div className="mini-avatar more">
                    +{session.players.length + session.guests.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="meta-item">
            <div className="meta-icon">
              <HomeIcon />
            </div>
            <div className="meta-info">
              <div className="label">Location</div>
              <div className="value">{session.hostHouseholdName}</div>
            </div>
          </div>

          {/* End Button */}
          <button
            className="end-session-btn"
            onClick={() => setShowEndConfirmation(true)}
          >
            <LogoutIcon />
            End
          </button>
        </div>
      </div>

      {/* Currently Playing Section */}
      {session.currentlyPlaying && (
        <div className="currently-playing-section">
          <div className="currently-playing-header">
            <Icon icon="play" size={20} />
            <h3>Currently Playing</h3>
          </div>
          <div className="currently-playing-game">
            <div className="game-image">
              {session.currentlyPlaying.imageUrl ? (
                <img
                  src={session.currentlyPlaying.imageUrl}
                  alt={session.currentlyPlaying.name}
                />
              ) : (
                <div className="game-image-placeholder">
                  <Icon icon="cube" size={32} />
                </div>
              )}
            </div>
            <div className="game-details">
              <h4>{session.currentlyPlaying.name}</h4>
              <div className="game-tags">
                <Tag minimal icon="people">
                  {getPlayerRange(session.currentlyPlaying)}
                </Tag>
                {session.currentlyPlaying.playTimeMinutes && (
                  <Tag minimal icon="time">
                    {session.currentlyPlaying.playTimeMinutes} min
                  </Tag>
                )}
              </div>
            </div>
            <Button
              minimal
              icon="cross"
              onClick={() => setCurrentlyPlaying(null)}
              aria-label="Stop playing"
            />
          </div>
        </div>
      )}

      {/* Roulette Grid */}
      <div className="roulette-grid">
        <GameNightRoulette
          variant="players"
          title="Who Goes First?"
          items={playerItems}
        />
        <GameNightRoulette
          variant="games"
          title="Random Pick"
          items={gameItems}
          onResult={(item) => {
            const game = availableGames.find(g => g.id === item.id);
            if (game) {
              setCurrentlyPlaying(game);
            }
          }}
        />
      </div>

      {/* Browse Games Section */}
      <div className="game-selection-card">
        <div className="game-selection-header">
          <div className="header-left">
            <div className="selection-icon">
              <BookIcon />
            </div>
            <h3>Browse Games</h3>
          </div>
          <span className="game-count">{availableGames.length} available</span>
        </div>

        <div className="game-selection-body">
          <div className="game-search">
            <SearchIcon />
            <InputGroup
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="game-list">
            {filteredGamesForBrowse.map((game) => (
              <div key={game.id} className="game-row">
                <div className="game-info">
                  <span className="game-name">{game.name}</span>
                  <span className="game-meta">
                    {getPlayerRange(game)}
                    {game.playTimeMinutes ? ` · ${game.playTimeMinutes} min` : ''}
                    {game.categories?.[0] ? ` · ${game.categories[0]}` : ''}
                  </span>
                </div>
                <Button
                  className="play-btn"
                  onClick={() => handlePlayGame(game)}
                  small
                >
                  Play
                </Button>
              </div>
            ))}

            {filteredGamesForBrowse.length === 0 && (
              <div className="no-games-message">
                {searchQuery
                  ? 'No games match your search'
                  : 'No games available'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* End Session Confirmation Dialog */}
      <Dialog
        isOpen={showEndConfirmation}
        onClose={() => setShowEndConfirmation(false)}
        title="End Game Night?"
        className="end-session-dialog"
      >
        <div className="dialog-body">
          <p>Are you sure you want to end this game night session?</p>
        </div>
        <div className="dialog-footer">
          <Button onClick={() => setShowEndConfirmation(false)}>
            Cancel
          </Button>
          <Button intent="danger" onClick={handleEndSession}>
            End Session
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
