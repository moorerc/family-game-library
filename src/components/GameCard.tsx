import React from 'react';
import { Card, Icon } from '@blueprintjs/core';
import type { OwnedGame, UserGamePreference } from '../types';
import { getEntityColorHex } from '../types';

interface GameCardProps {
  game: OwnedGame;
  onClick?: () => void;
  preference?: UserGamePreference | null;
  onLike?: (gameId: string) => void;
  onDislike?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onClick,
  preference,
  onLike,
  onDislike,
  onToggleFavorite,
}) => {
  const playerRange =
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}`
      : `${game.minPlayers}-${game.maxPlayers}`;

  const isLiked = preference?.reaction === 'like';
  const isDisliked = preference?.reaction === 'dislike';
  const isFavorite = preference?.isFavorite || false;

  const handlePreferenceClick = (
    e: React.MouseEvent,
    action: (gameId: string) => void
  ) => {
    e.stopPropagation();
    action(game.id);
  };

  return (
    <Card
      className={`game-card ${isFavorite ? 'favorited' : ''}`}
      interactive
      onClick={onClick}
    >
      <div className="game-image">
        {game.imageUrl ? (
          <img src={game.imageUrl} alt={game.name} />
        ) : (
          <div className="game-image-placeholder">
            <Icon icon="cube" size={48} />
          </div>
        )}
      </div>

      <div className="game-content">
        <div className="game-header">
          <h3 className="game-title">{game.name}</h3>
          <span
            className="game-owner-avatar"
            data-tooltip={game.ownership.householdName}
            style={{ backgroundColor: getEntityColorHex(game.ownership.householdColor) }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
          </span>
        </div>

        <div className="game-meta-row">
          <span className="meta-chip">
            <Icon icon="people" size={14} />
            {playerRange} players
          </span>
          {game.playTimeMinutes && (
            <span className="meta-chip">
              <Icon icon="time" size={14} />
              {game.playTimeMinutes} min
            </span>
          )}
        </div>

        {game.categories && game.categories.length > 0 && (
          <div className="game-tags">
            {game.categories.slice(0, 2).map((category) => (
              <span key={category} className="game-tag">
                {category}
              </span>
            ))}
            {game.categories.length > 2 && (
              <span className="game-tag game-tag-more">
                +{game.categories.length - 2}
              </span>
            )}
          </div>
        )}

        {(onLike || onDislike || onToggleFavorite) && (
          <div className="game-actions">
            {onLike && (
              <button
                className={`action-btn like ${isLiked ? 'active' : ''}`}
                onClick={(e) => handlePreferenceClick(e, onLike)}
                title={isLiked ? 'Remove like' : 'Like'}
              >
                <svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              </button>
            )}
            {onDislike && (
              <button
                className={`action-btn dislike ${isDisliked ? 'active' : ''}`}
                onClick={(e) => handlePreferenceClick(e, onDislike)}
                title={isDisliked ? 'Remove dislike' : 'Dislike'}
              >
                <svg viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
              </button>
            )}
            {onToggleFavorite && (
              <button
                className={`action-btn favorite ${isFavorite ? 'active' : ''}`}
                onClick={(e) => handlePreferenceClick(e, onToggleFavorite)}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
