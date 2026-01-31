import React from 'react';
import { Card, Tag, Icon } from '@blueprintjs/core';
import type { OwnedGame } from '../types';

interface GameCardProps {
  game: OwnedGame;
  onClick?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const playerRange =
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}`
      : `${game.minPlayers}-${game.maxPlayers}`;

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
      </div>
    </Card>
  );
};
