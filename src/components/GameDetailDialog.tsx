import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogBody,
  Tag,
  Icon,
  Button,
  Intent,
  Spinner,
  ButtonGroup,
  Tooltip,
} from '@blueprintjs/core';
import type { OwnedGame, Ownership, UserGamePreference, GamePreferenceStats } from '../types';

interface GameDetailDialogProps {
  game: OwnedGame | null;
  isOpen: boolean;
  onClose: () => void;
  onFetchOwnerships?: (gameId: string) => Promise<Ownership[]>;
  preference?: UserGamePreference | null;
  onLike?: (gameId: string) => void;
  onDislike?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
  onFetchStats?: (gameId: string) => Promise<GamePreferenceStats>;
}

export const GameDetailDialog: React.FC<GameDetailDialogProps> = ({
  game,
  isOpen,
  onClose,
  onFetchOwnerships,
  preference,
  onLike,
  onDislike,
  onToggleFavorite,
  onFetchStats,
}) => {
  const [allOwnerships, setAllOwnerships] = useState<Ownership[]>([]);
  const [loadingOwnerships, setLoadingOwnerships] = useState(false);
  const [stats, setStats] = useState<GamePreferenceStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Fetch all ownerships and stats when dialog opens
  useEffect(() => {
    if (isOpen && game) {
      if (onFetchOwnerships) {
        setLoadingOwnerships(true);
        onFetchOwnerships(game.id)
          .then(setAllOwnerships)
          .catch(console.error)
          .finally(() => setLoadingOwnerships(false));
      }
      if (onFetchStats) {
        setLoadingStats(true);
        onFetchStats(game.id)
          .then(setStats)
          .catch(console.error)
          .finally(() => setLoadingStats(false));
      }
    } else {
      setAllOwnerships([]);
      setStats(null);
    }
  }, [isOpen, game, onFetchOwnerships, onFetchStats]);

  // Refresh stats when preference changes
  useEffect(() => {
    if (isOpen && game && onFetchStats && preference) {
      onFetchStats(game.id)
        .then(setStats)
        .catch(console.error);
    }
  }, [preference, isOpen, game, onFetchStats]);

  if (!game) return null;

  const playerRange =
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}`
      : `${game.minPlayers}-${game.maxPlayers}`;

  const isLiked = preference?.reaction === 'like';
  const isDisliked = preference?.reaction === 'dislike';
  const isFavorite = preference?.isFavorite || false;

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

            {(onLike || onDislike || onToggleFavorite) && (
              <div className="game-detail-preferences">
                <ButtonGroup>
                  {onLike && (
                    <Tooltip content={isLiked ? 'Remove like' : 'Like this game'} minimal>
                      <Button
                        icon={<Icon icon="thumbs-up" intent={isLiked ? 'success' : 'none'} />}
                        intent={isLiked ? Intent.SUCCESS : Intent.NONE}
                        outlined={!isLiked}
                        onClick={() => onLike(game.id)}
                      >
                        {isLiked ? 'Liked' : 'Like'}
                      </Button>
                    </Tooltip>
                  )}
                  {onDislike && (
                    <Tooltip content={isDisliked ? 'Remove dislike' : 'Dislike this game'} minimal>
                      <Button
                        icon={<Icon icon="thumbs-down" intent={isDisliked ? 'danger' : 'none'} />}
                        intent={isDisliked ? Intent.DANGER : Intent.NONE}
                        outlined={!isDisliked}
                        onClick={() => onDislike(game.id)}
                      >
                        {isDisliked ? 'Disliked' : 'Dislike'}
                      </Button>
                    </Tooltip>
                  )}
                  {onToggleFavorite && (
                    <Tooltip content={isFavorite ? 'Remove from favorites' : 'Add to favorites'} minimal>
                      <Button
                        icon={<Icon icon={isFavorite ? 'star' : 'star-empty'} intent={isFavorite ? 'warning' : 'none'} />}
                        intent={isFavorite ? Intent.WARNING : Intent.NONE}
                        outlined={!isFavorite}
                        onClick={() => onToggleFavorite(game.id)}
                      >
                        {isFavorite ? 'Favorited' : 'Favorite'}
                      </Button>
                    </Tooltip>
                  )}
                </ButtonGroup>
                {stats && !loadingStats && (stats.likes > 0 || stats.favorites > 0) && (
                  <div className="preference-stats">
                    {stats.likes > 0 && (
                      <span className="stat-item">
                        <Icon icon="thumbs-up" size={12} /> {stats.likes} {stats.likes === 1 ? 'like' : 'likes'}
                      </span>
                    )}
                    {stats.favorites > 0 && (
                      <span className="stat-item">
                        <Icon icon="star" size={12} /> {stats.favorites} {stats.favorites === 1 ? 'favorite' : 'favorites'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

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
