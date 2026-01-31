import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogBody,
  Tag,
  Icon,
  Button,
  Intent,
  Spinner,
} from '@blueprintjs/core';
import type { OwnedGame, Ownership } from '../types';

interface GameDetailDialogProps {
  game: OwnedGame | null;
  isOpen: boolean;
  onClose: () => void;
  onFetchOwnerships?: (gameId: string) => Promise<Ownership[]>;
}

export const GameDetailDialog: React.FC<GameDetailDialogProps> = ({
  game,
  isOpen,
  onClose,
  onFetchOwnerships,
}) => {
  const [allOwnerships, setAllOwnerships] = useState<Ownership[]>([]);
  const [loadingOwnerships, setLoadingOwnerships] = useState(false);

  // Fetch all ownerships when dialog opens
  useEffect(() => {
    if (isOpen && game && onFetchOwnerships) {
      setLoadingOwnerships(true);
      onFetchOwnerships(game.id)
        .then(setAllOwnerships)
        .catch(console.error)
        .finally(() => setLoadingOwnerships(false));
    } else {
      setAllOwnerships([]);
    }
  }, [isOpen, game, onFetchOwnerships]);

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

            <div className="game-detail-section">
              <h4>Owned By</h4>
              {loadingOwnerships ? (
                <Spinner size={20} />
              ) : allOwnerships.length > 0 ? (
                <div className="ownership-list">
                  {allOwnerships.map((ownership) => (
                    <div key={ownership.id} className="ownership-item">
                      <Tag intent={Intent.PRIMARY} large>
                        {ownership.householdName}
                      </Tag>
                      {ownership.notes && (
                        <p className="ownership-notes">{ownership.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Tag intent={Intent.PRIMARY} large>
                  {game.ownership.householdName}
                </Tag>
              )}
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
