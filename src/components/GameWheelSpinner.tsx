import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icon } from '@blueprintjs/core';
import type { OwnedGame } from '../types';

interface GameWheelSpinnerProps {
  games: OwnedGame[];
  isSpinning: boolean;
  onSpinComplete: (game: OwnedGame) => void;
}

const CARD_WIDTH = 160;
const CARD_GAP = 12;
const CARD_TOTAL = CARD_WIDTH + CARD_GAP;
const SPIN_DURATION = 4000; // 4 seconds
const POST_SPIN_DELAY = 500; // 500ms pause before showing result
const EXTRA_CYCLES = 4; // Number of full rotations before landing
const DEFAULT_VIEWPORT_WIDTH = 800;

export const GameWheelSpinner: React.FC<GameWheelSpinnerProps> = ({
  games,
  isSpinning,
  onSpinComplete,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [containerWidth, setContainerWidth] = useState(DEFAULT_VIEWPORT_WIDTH);

  // Measure container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate how many times to duplicate games based on viewport and spin distance
  const duplicateCount = useMemo(() => {
    if (games.length === 0) return 1;

    // Cards visible in viewport (plus buffer on each side)
    const visibleCards = Math.ceil(containerWidth / CARD_TOTAL) + 2;

    // Cards we travel through during the spin
    const spinCards = EXTRA_CYCLES * games.length;

    // Total cards needed: visible + spin distance + one more set for landing variation
    const totalCardsNeeded = visibleCards + spinCards + games.length;

    // Calculate sets needed, minimum 3 (for start buffer, spin, end buffer)
    const setsNeeded = Math.ceil(totalCardsNeeded / games.length);

    // We need double this because we start in the middle
    return Math.max(3, setsNeeded * 2);
  }, [games.length, containerWidth]);

  // Duplicate games for seamless spinning
  const extendedGames = useMemo(() => {
    const result: OwnedGame[] = [];
    for (let i = 0; i < duplicateCount; i++) {
      result.push(...games);
    }
    return result;
  }, [games, duplicateCount]);

  const singleSetWidth = CARD_TOTAL * games.length;

  // Calculate the center position offset (to center a card in the viewport)
  const getCenterOffset = useCallback(() => {
    return containerWidth / 2 - CARD_WIDTH / 2;
  }, [containerWidth]);

  // Reset position when games change or spin ends
  useEffect(() => {
    if (!isSpinning && games.length > 0) {
      // Position at the middle of our duplicated array
      const startSetIndex = Math.floor(duplicateCount / 2);
      const initialPosition = getCenterOffset() - (startSetIndex * singleSetWidth);
      setTranslateX(initialPosition);
      setIsAnimating(false);
    }
  }, [games.length, getCenterOffset, singleSetWidth, isSpinning, duplicateCount]);

  // Handle spinning animation
  useEffect(() => {
    if (!isSpinning || games.length === 0) return;

    // Pick a random winning game index
    const winningIndex = Math.floor(Math.random() * games.length);

    // Calculate positions
    const centerOffset = getCenterOffset();
    const startSetIndex = Math.floor(duplicateCount / 2);

    // Start position: centered on first card of the middle set
    const startX = centerOffset - (startSetIndex * singleSetWidth);

    // Target position: spin through EXTRA_CYCLES full sets, then land on winning card
    // We go forward (more negative translateX) through the array
    const targetSetIndex = startSetIndex + EXTRA_CYCLES;
    const targetX = centerOffset - (targetSetIndex * singleSetWidth) - (winningIndex * CARD_TOTAL);

    // Set starting position immediately (no animation)
    setTranslateX(startX);
    setIsAnimating(false);

    // Start animation after a brief delay
    const startTimeout = setTimeout(() => {
      setIsAnimating(true);
      setTranslateX(targetX);
    }, 50);

    // Handle spin completion
    const spinTimeout = setTimeout(() => {
      setIsAnimating(false);

      // Wait a bit then notify completion
      setTimeout(() => {
        onSpinComplete(games[winningIndex]);
      }, POST_SPIN_DELAY);
    }, SPIN_DURATION + 50);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(spinTimeout);
    };
  }, [isSpinning, games, getCenterOffset, singleSetWidth, onSpinComplete, duplicateCount]);

  if (games.length === 0) {
    return (
      <div className="game-wheel-container empty">
        <p>No games match your filters</p>
      </div>
    );
  }

  return (
    <div className="game-wheel-container" ref={containerRef}>
      <div className="selection-zone">
        <div className="selection-indicator" />
      </div>

      <div className="game-wheel-viewport">
        <div
          ref={trackRef}
          className={`game-wheel-track ${isAnimating ? 'animating' : ''}`}
          style={{
            transform: `translateX(${translateX}px)`,
          }}
        >
          {extendedGames.map((game, index) => (
            <div key={`${game.id}-${index}`} className="wheel-game-card">
              {game.imageUrl ? (
                <img src={game.imageUrl} alt={game.name} />
              ) : (
                <div className="wheel-card-placeholder">
                  <Icon icon="cube" size={32} />
                </div>
              )}
              <div className="wheel-card-name">{game.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
