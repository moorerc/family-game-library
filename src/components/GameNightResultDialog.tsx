import React, { useEffect, useState } from 'react';
import { Dialog, Button, Icon, Tag } from '@blueprintjs/core';
import type { OwnedGame } from '../types';

interface GameNightResultDialogProps {
  game: OwnedGame | null;
  isOpen: boolean;
  onClose: () => void;
  onSpinAgain: () => void;
}

// Generate confetti pieces
const CONFETTI_COUNT = 50;
const CONFETTI_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#0ea5e9', // sky
  '#ec4899', // pink
  '#8b5cf6', // violet
];

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
  size: number;
}

const generateConfetti = (): ConfettiPiece[] => {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    size: 8 + Math.random() * 8,
  }));
};

export const GameNightResultDialog: React.FC<GameNightResultDialogProps> = ({
  game,
  isOpen,
  onClose,
  onSpinAgain,
}) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Generate new confetti when dialog opens
  useEffect(() => {
    if (isOpen && game) {
      setConfetti(generateConfetti());
      setShowConfetti(true);

      // Stop confetti after animation completes
      const timeout = setTimeout(() => {
        setShowConfetti(false);
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [isOpen, game]);

  if (!game) return null;

  const playerRange =
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers} players`
      : `${game.minPlayers}-${game.maxPlayers} players`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title=""
      className="game-night-result-dialog"
      canOutsideClickClose
    >
      {showConfetti && (
        <div className="confetti-container">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="confetti-piece"
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                width: `${piece.size}px`,
                height: `${piece.size}px`,
              }}
            />
          ))}
        </div>
      )}

      <div className="result-content">
        <div className="result-header">
          <span className="celebration-emoji">🎉</span>
          <h2>Tonight's Game!</h2>
        </div>

        <div className="result-game">
          <div className="result-game-image">
            {game.imageUrl ? (
              <img src={game.imageUrl} alt={game.name} />
            ) : (
              <div className="result-image-placeholder">
                <Icon icon="cube" size={64} />
              </div>
            )}
          </div>

          <h3 className="result-game-title">{game.name}</h3>

          <div className="result-game-meta">
            <Tag minimal large icon="people">
              {playerRange}
            </Tag>
            {game.playTimeMinutes && (
              <Tag minimal large icon="time">
                {game.playTimeMinutes} min
              </Tag>
            )}
          </div>

          <Tag intent="primary" large className="result-owner">
            From {game.ownership.householdName}
          </Tag>
        </div>

        <div className="result-actions">
          <Button
            large
            icon="refresh"
            onClick={() => {
              onClose();
              // Small delay before triggering new spin
              setTimeout(onSpinAgain, 100);
            }}
          >
            Spin Again
          </Button>
          <Button large intent="success" icon="play" onClick={onClose}>
            Let's Play!
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
