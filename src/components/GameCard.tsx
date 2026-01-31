import React from 'react';
import { Card, Tag, Icon, Button, Tooltip } from '@blueprintjs/core';
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
    <Card className="game-card" interactive onClick={onClick}>
      <div className="game-card-image">
        {game.imageUrl ? (
          <img src={game.imageUrl} alt={game.name} />
        ) : (
          <div className="game-card-placeholder">
            <Icon icon="cube" size={48} />
          </div>
        )}
        {game.ownerCount && game.ownerCount > 1 && (
          <Tag className="owner-count-badge" intent="success" round>
            {game.ownerCount} households
          </Tag>
        )}
      </div>

      <div className="game-card-content">
        <h3 className="game-card-title">{game.name}</h3>

        <div className="game-card-meta">
          <span className="meta-item">
            <Icon icon="people" size={14} />
            {playerRange} players
          </span>
          {game.playTimeMinutes && (
            <span className="meta-item">
              <Icon icon="time" size={14} />
              {game.playTimeMinutes} min
            </span>
          )}
        </div>

        <div className="game-card-household">
          <Tag minimal intent="primary">
            {game.ownership.householdName}
          </Tag>
        </div>

        {game.categories && game.categories.length > 0 && (
          <div className="game-card-categories">
            {game.categories.slice(0, 3).map((category) => (
              <Tag key={category} minimal className="category-tag">
                {category}
              </Tag>
            ))}
          </div>
        )}

        {(onLike || onDislike || onToggleFavorite) && (
          <div className="game-card-preferences">
            {onLike && (
              <Tooltip content={isLiked ? 'Remove like' : 'Like'} minimal>
                <Button
                  minimal
                  small
                  icon={<Icon icon="thumbs-up" intent={isLiked ? 'success' : 'none'} />}
                  className={`preference-btn ${isLiked ? 'active' : ''}`}
                  onClick={(e) => handlePreferenceClick(e, onLike)}
                />
              </Tooltip>
            )}
            {onDislike && (
              <Tooltip content={isDisliked ? 'Remove dislike' : 'Dislike'} minimal>
                <Button
                  minimal
                  small
                  icon={<Icon icon="thumbs-down" intent={isDisliked ? 'danger' : 'none'} />}
                  className={`preference-btn ${isDisliked ? 'active' : ''}`}
                  onClick={(e) => handlePreferenceClick(e, onDislike)}
                />
              </Tooltip>
            )}
            {onToggleFavorite && (
              <Tooltip content={isFavorite ? 'Remove from favorites' : 'Add to favorites'} minimal>
                <Button
                  minimal
                  small
                  icon={<Icon icon={isFavorite ? 'star' : 'star-empty'} intent={isFavorite ? 'warning' : 'none'} />}
                  className={`preference-btn ${isFavorite ? 'active' : ''}`}
                  onClick={(e) => handlePreferenceClick(e, onToggleFavorite)}
                />
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
