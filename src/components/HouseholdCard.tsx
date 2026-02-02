import React from 'react';
import { Icon } from '@blueprintjs/core';

interface HouseholdCardProps {
  name: string;
  gamesCount: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export const HouseholdCard: React.FC<HouseholdCardProps> = ({
  name,
  gamesCount,
  isSelected = false,
  onClick,
}) => {
  return (
    <div
      className={`household-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="hh-icon">
        <Icon icon="home" size={22} />
        {isSelected && (
          <div className="check-badge">
            <Icon icon="tick" size={12} />
          </div>
        )}
      </div>
      <div className="info">
        <div className="hh-name">{name}</div>
        <div className="games-count">{gamesCount} games</div>
      </div>
    </div>
  );
};
