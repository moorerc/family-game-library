import React, { useEffect, useState } from 'react';
import { Icon, Spinner } from '@blueprintjs/core';
import type { OwnedGame, Ownership, UserGamePreference } from '../types';
import { decodeHtmlEntities } from '../utils/text';

interface GameDetailDialogProps {
  game: OwnedGame | null;
  isOpen: boolean;
  onClose: () => void;
  onFetchOwnerships?: (gameId: string) => Promise<Ownership[]>;
  preference?: UserGamePreference | null;
  onLike?: (gameId: string) => void;
  onDislike?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
}

// Avatar colors for household chips
const AVATAR_COLORS = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];

const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const GameDetailDialog: React.FC<GameDetailDialogProps> = ({
  game,
  isOpen,
  onClose,
  onFetchOwnerships,
  preference,
  onLike,
  onDislike,
  onToggleFavorite,
}) => {
  const [allOwnerships, setAllOwnerships] = useState<Ownership[]>([]);
  const [loadingOwnerships, setLoadingOwnerships] = useState(false);

  // Fetch all ownerships when dialog opens
  useEffect(() => {
    if (isOpen && game) {
      if (onFetchOwnerships) {
        setLoadingOwnerships(true);
        onFetchOwnerships(game.id)
          .then(setAllOwnerships)
          .catch(console.error)
          .finally(() => setLoadingOwnerships(false));
      }
    } else {
      setAllOwnerships([]);
    }
  }, [isOpen, game, onFetchOwnerships]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!game || !isOpen) return null;

  const playerRange =
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}`
      : `${game.minPlayers}-${game.maxPlayers}`;

  const isLiked = preference?.reaction === 'like';
  const isDisliked = preference?.reaction === 'dislike';
  const isFavorite = preference?.isFavorite || false;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="game-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="game-dialog" role="dialog" aria-labelledby="game-dialog-title">
        {/* Close Button */}
        <button className="game-dialog-close" onClick={onClose} aria-label="Close dialog">
          <svg viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Left Panel: Image & Quick Stats */}
        <div className="game-dialog-image-section">
          <div className="game-dialog-image">
            {game.imageUrl ? (
              <img src={game.imageUrl} alt={game.name} />
            ) : (
              <div className="game-dialog-image-placeholder">
                <Icon icon="cube" size={64} />
              </div>
            )}
          </div>

          <div className="game-dialog-stats">
            <div className="game-dialog-stat">
              <div className="game-dialog-stat-icon">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="game-dialog-stat-text">
                <span className="game-dialog-stat-value">{playerRange} players</span>
                <span className="game-dialog-stat-label">Player Count</span>
              </div>
            </div>

            {game.playTimeMinutes && (
              <div className="game-dialog-stat">
                <div className="game-dialog-stat-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="game-dialog-stat-text">
                  <span className="game-dialog-stat-value">{game.playTimeMinutes} minutes</span>
                  <span className="game-dialog-stat-label">Play Time</span>
                </div>
              </div>
            )}

            {game.yearPublished && (
              <div className="game-dialog-stat">
                <div className="game-dialog-stat-icon">
                  <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div className="game-dialog-stat-text">
                  <span className="game-dialog-stat-value">{game.yearPublished}</span>
                  <span className="game-dialog-stat-label">Published</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Game Details */}
        <div className="game-dialog-details">
          <div className="game-dialog-header">
            <h2 className="game-dialog-title" id="game-dialog-title">{game.name}</h2>
          </div>

          {/* Owners & Rating Row */}
          <div className="game-dialog-owners-row">
            <div className="game-dialog-owners">
              <div className="game-dialog-owners-label">Owned by</div>
              <div className="game-dialog-household-chips">
                {loadingOwnerships ? (
                  <Spinner size={20} />
                ) : allOwnerships.length > 0 ? (
                  allOwnerships.map((ownership, index) => (
                    <div key={ownership.id} className="game-dialog-household-chip">
                      <div className={`game-dialog-chip-avatar ${getAvatarColor(index)}`}>
                        {getInitials(ownership.householdName)}
                      </div>
                      {ownership.householdName}
                    </div>
                  ))
                ) : (
                  <div className="game-dialog-household-chip">
                    <div className={`game-dialog-chip-avatar ${getAvatarColor(0)}`}>
                      {getInitials(game.ownership.householdName)}
                    </div>
                    {game.ownership.householdName}
                  </div>
                )}
              </div>
            </div>

            {(onLike || onDislike || onToggleFavorite) && (
              <div className="game-dialog-rating-actions">
                {onLike && (
                  <button
                    className={`game-dialog-rating-btn like ${isLiked ? 'active' : ''}`}
                    onClick={() => onLike(game.id)}
                    aria-label={isLiked ? 'Remove like' : 'Like'}
                  >
                    <svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  </button>
                )}
                {onDislike && (
                  <button
                    className={`game-dialog-rating-btn dislike ${isDisliked ? 'active' : ''}`}
                    onClick={() => onDislike(game.id)}
                    aria-label={isDisliked ? 'Remove dislike' : 'Dislike'}
                  >
                    <svg viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
                  </button>
                )}
                {onToggleFavorite && (
                  <button
                    className={`game-dialog-rating-btn favorite ${isFavorite ? 'active' : ''}`}
                    onClick={() => onToggleFavorite(game.id)}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* About Section */}
          {game.description && (
            <div className="game-dialog-section">
              <div className="game-dialog-section-label">About</div>
              <div className="game-dialog-description-wrapper">
                <p className="game-dialog-description">{decodeHtmlEntities(game.description)}</p>
              </div>
            </div>
          )}

          {/* Categories Section */}
          {game.categories && game.categories.length > 0 && (
            <div className="game-dialog-section">
              <div className="game-dialog-section-label">Categories</div>
              <div className="game-dialog-tags">
                {game.categories.map((category) => (
                  <span key={category} className="game-dialog-tag">{category}</span>
                ))}
              </div>
            </div>
          )}

          {/* Mechanics Section */}
          {game.mechanics && game.mechanics.length > 0 && (
            <div className="game-dialog-section">
              <div className="game-dialog-section-label">Mechanics</div>
              <div className="game-dialog-tags">
                {game.mechanics.map((mechanic) => (
                  <span key={mechanic} className="game-dialog-tag">{mechanic}</span>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="game-dialog-footer">
            {game.bggId && (
              <a
                className="game-dialog-footer-link"
                href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                View on BGG
              </a>
            )}
            <button className="game-dialog-edit-btn">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
