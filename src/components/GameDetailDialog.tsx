import React from 'react';
import {
  Dialog,
  DialogBody,
  Tag,
  Icon,
  Button,
  Intent,
} from '@blueprintjs/core';
import type { Game } from '../types';

interface GameDetailDialogProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GameDetailDialog: React.FC<GameDetailDialogProps> = ({
  game,
  isOpen,
  onClose,
}) => {
  if (!game) return null;

  const playerRange =
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}`
      : `${game.minPlayers}-${game.maxPlayers}`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={game.name}
      className="game-detail-dialog"
    >
      <DialogBody>
        <div className="game-detail-content">
          {game.imageUrl && (
            <div className="game-detail-image">
              <img src={game.imageUrl} alt={game.name} />
            </div>
          )}

          <div className="game-detail-info">
            <div className="game-detail-meta">
              <div className="meta-item">
                <Icon icon="people" size={16} />
                <span>{playerRange} players</span>
              </div>
              {game.playTimeMinutes && (
                <div className="meta-item">
                  <Icon icon="time" size={16} />
                  <span>{game.playTimeMinutes} min</span>
                </div>
              )}
              {game.yearPublished && (
                <div className="meta-item">
                  <Icon icon="calendar" size={16} />
                  <span>{game.yearPublished}</span>
                </div>
              )}
            </div>

            <div className="game-detail-owner">
              <Tag intent={Intent.PRIMARY} large>
                {game.householdName}
              </Tag>
            </div>

            {game.description && (
              <div className="game-detail-description">
                <p>{game.description}</p>
              </div>
            )}

            {game.categories && game.categories.length > 0 && (
              <div className="game-detail-section">
                <h4>Categories</h4>
                <div className="tag-list">
                  {game.categories.map((category) => (
                    <Tag key={category} minimal>
                      {category}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {game.mechanics && game.mechanics.length > 0 && (
              <div className="game-detail-section">
                <h4>Mechanics</h4>
                <div className="tag-list">
                  {game.mechanics.map((mechanic) => (
                    <Tag key={mechanic} minimal intent={Intent.SUCCESS}>
                      {mechanic}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {game.notes && (
              <div className="game-detail-section">
                <h4>Notes</h4>
                <p className="game-notes">{game.notes}</p>
              </div>
            )}

            {game.bggId && (
              <div className="game-detail-links">
                <Button
                  minimal
                  intent={Intent.PRIMARY}
                  icon="share"
                  onClick={() =>
                    window.open(
                      `https://boardgamegeek.com/boardgame/${game.bggId}`,
                      '_blank'
                    )
                  }
                >
                  View on BoardGameGeek
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogBody>
    </Dialog>
  );
};
