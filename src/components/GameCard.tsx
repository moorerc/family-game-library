import React from 'react';
import { Card, Icon } from '@blueprintjs/core';
import type { OwnedGame, UserGamePreference } from '../types';

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
          <span className="game-owner">{game.ownership.householdName}</span>
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
            {game.categories.slice(0, 3).map((category) => (
              <span key={category} className="game-tag">
                {category}
              </span>
            ))}
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
                <Icon icon="thumbs-up" size={18} />
              </button>
            )}
            {onDislike && (
              <button
                className={`action-btn dislike ${isDisliked ? 'active' : ''}`}
                onClick={(e) => handlePreferenceClick(e, onDislike)}
                title={isDisliked ? 'Remove dislike' : 'Dislike'}
              >
                <Icon icon="thumbs-down" size={18} />
              </button>
            )}
            {onToggleFavorite && (
              <button
                className={`action-btn favorite ${isFavorite ? 'active' : ''}`}
                onClick={(e) => handlePreferenceClick(e, onToggleFavorite)}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Icon icon={isFavorite ? 'star' : 'star-empty'} size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
