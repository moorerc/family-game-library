import React from 'react';
import type { GuestColor } from '../context/GameNightContext';
import { getGuestColorHex } from '../context/GameNightContext';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

interface PlayerCardProps {
  name: string;
  initials: string;
  householdName?: string;
  isSelected?: boolean;
  onClick?: () => void;
  isGuest?: boolean;
  guestColor?: GuestColor;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  initials,
  householdName,
  isSelected = false,
  onClick,
  isGuest = false,
  guestColor = 'purple',
}) => {
  const avatarStyle = isGuest
    ? { backgroundColor: getGuestColorHex(guestColor) }
    : undefined;

  return (
    <div
      className={`player-card ${isSelected ? 'selected' : ''} ${isGuest ? 'guest' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="avatar" style={avatarStyle}>
        {initials}
        {isSelected && (
          <div className="check-badge">
            <CheckIcon />
          </div>
        )}
      </div>
      <span className="name">{name}</span>
      <span className="household">{isGuest ? 'Guest' : householdName || ''}</span>
    </div>
  );
};

interface AddPlayerCardProps {
  onClick: () => void;
}

export const AddPlayerCard: React.FC<AddPlayerCardProps> = ({ onClick }) => {
  return (
    <div
      className="player-card add-new"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="avatar">
        <PlusIcon />
      </div>
      <span className="name">Add Guest</span>
    </div>
  );
};

// Helper to get initials from a name
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
