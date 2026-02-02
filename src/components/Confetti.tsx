import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#ffcc00', // yellow
  '#1e3a5f', // blue
  '#8b5cf6', // purple
  '#16a34a', // green
  '#db2777', // pink
  '#ea580c', // orange
];

export const Confetti: React.FC<ConfettiProps> = ({
  isActive,
  duration = 2000,
  colors = DEFAULT_COLORS,
}) => {
  const [pieces, setPieces] = useState<Array<{
    id: number;
    left: number;
    color: string;
    delay: number;
    size: number;
  }>>([]);

  useEffect(() => {
    if (isActive) {
      // Generate confetti pieces
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        size: 8 + Math.random() * 6,
      }));
      setPieces(newPieces);

      // Clear after animation
      const timeout = setTimeout(() => {
        setPieces([]);
      }, duration + 500);

      return () => clearTimeout(timeout);
    } else {
      setPieces([]);
    }
  }, [isActive, duration, colors]);

  if (pieces.length === 0) return null;

  return (
    <div className="confetti-container">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            background: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${1.5 + Math.random()}s`,
          }}
        />
      ))}
    </div>
  );
};
