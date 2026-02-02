import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { OwnedGame } from '../types';
import type { SelectedPlayer, Guest, GuestColor } from '../context/GameNightContext';
import { getGuestColorHex } from '../context/GameNightContext';
import { getInitials } from './PlayerCard';
import { Confetti } from './Confetti';

// Custom SVG Icons matching the mocks
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// Animation settings
const SPIN_DURATION = 2500; // 2.5 seconds
const ITEM_HEIGHT = 80; // Height of slot window

interface RouletteItem {
  id: string;
  name: string;
  meta?: string;
  initials?: string;
  isGuest?: boolean;
  guestColor?: GuestColor;
}

interface GameNightRouletteProps {
  variant: 'players' | 'games';
  title: string;
  items: RouletteItem[];
  onResult?: (item: RouletteItem) => void;
}

export const GameNightRoulette: React.FC<GameNightRouletteProps> = ({
  variant,
  title,
  items,
  onResult,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentItem, setCurrentItem] = useState<RouletteItem | null>(
    items.length > 0 ? items[0] : null
  );
  const [displayItems, setDisplayItems] = useState<RouletteItem[]>([]);
  const [translateY, setTranslateY] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Update current item when items change
  useEffect(() => {
    if (items.length > 0 && !currentItem) {
      setCurrentItem(items[0]);
    }
  }, [items, currentItem]);

  const handleSpin = useCallback(() => {
    if (isSpinning || items.length === 0) return;

    setIsSpinning(true);

    // Pick random winner
    const winnerIndex = Math.floor(Math.random() * items.length);
    const winner = items[winnerIndex];

    // Create array of items for animation (repeat items multiple times for smooth scroll)
    const repeatCount = 4; // Number of full cycles
    const spinItems: RouletteItem[] = [];
    for (let i = 0; i < repeatCount; i++) {
      spinItems.push(...items);
    }
    // Add the winner at the end
    spinItems.push(winner);

    setDisplayItems(spinItems);
    setTranslateY(0);

    // Start animation after a brief delay
    setTimeout(() => {
      // Calculate total distance to scroll
      const totalItems = spinItems.length - 1; // -1 because winner is at the end
      const targetY = -(totalItems * ITEM_HEIGHT);
      setTranslateY(targetY);
    }, 50);

    // Complete spin
    setTimeout(() => {
      setIsSpinning(false);
      setCurrentItem(winner);
      setDisplayItems([]);
      setTranslateY(0);
      setShowConfetti(true);
      onResult?.(winner);

      // Hide confetti after animation
      setTimeout(() => {
        setShowConfetti(false);
      }, 2500);
    }, SPIN_DURATION + 100);
  }, [isSpinning, items, onResult]);

  const iconClass = variant === 'players' ? 'players' : 'games';
  const RouletteIcon = variant === 'players' ? PersonIcon : BriefcaseIcon;

  const renderSlotItem = (item: RouletteItem) => {
    if (variant === 'players') {
      const avatarStyle = item.isGuest && item.guestColor
        ? { backgroundColor: getGuestColorHex(item.guestColor) }
        : undefined;

      return (
        <div className="slot-item player">
          <div
            className={`avatar ${item.isGuest ? 'guest' : ''}`}
            style={avatarStyle}
          >
            {item.initials}
          </div>
          <div className="item-name">{item.name}</div>
        </div>
      );
    }

    return (
      <div className="slot-item game">
        <div>
          <div className="item-name">{item.name}</div>
          {item.meta && <div className="item-meta">{item.meta}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="roulette-card">
      <Confetti isActive={showConfetti} />
      <div className="roulette-header">
        <div className={`roulette-icon ${iconClass}`}>
          <RouletteIcon />
        </div>
        <h3>{title}</h3>
      </div>

      <div className="roulette-body">
        <div className="slot-window">
          {isSpinning && displayItems.length > 0 ? (
            <div
              ref={trackRef}
              className="slot-track spinning"
              style={{
                transform: `translateY(${translateY}px)`,
                transition: `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0, 0.2, 1)`,
              }}
            >
              {displayItems.map((item, index) => (
                <div key={`${item.id}-${index}`} className="slot-track-item">
                  {renderSlotItem(item)}
                </div>
              ))}
            </div>
          ) : (
            currentItem && renderSlotItem(currentItem)
          )}
        </div>

        <button
          className="spin-btn"
          onClick={handleSpin}
          disabled={isSpinning || items.length === 0}
        >
          <RefreshIcon />
          Spin
        </button>
      </div>
    </div>
  );
};

// Helper to convert players to roulette items
export const playersToRouletteItems = (
  players: SelectedPlayer[],
  guests: Guest[]
): RouletteItem[] => {
  const items: RouletteItem[] = [];

  players.forEach((player) => {
    items.push({
      id: player.id,
      name: player.displayName,
      initials: getInitials(player.displayName),
      isGuest: false,
    });
  });

  guests.forEach((guest) => {
    items.push({
      id: guest.id,
      name: guest.name,
      initials: getInitials(guest.name),
      isGuest: true,
      guestColor: guest.color,
    });
  });

  return items;
};

// Helper to convert games to roulette items
export const gamesToRouletteItems = (games: OwnedGame[]): RouletteItem[] => {
  return games.map((game) => ({
    id: game.id,
    name: game.name,
    meta: `${game.minPlayers}-${game.maxPlayers} players${game.playTimeMinutes ? ` · ${game.playTimeMinutes} min` : ''}`,
  }));
};
