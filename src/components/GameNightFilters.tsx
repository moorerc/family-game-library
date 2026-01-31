import React, { useState } from 'react';
import {
  NumericInput,
  HTMLSelect,
  Button,
  Collapse,
  Checkbox,
  Tag,
} from '@blueprintjs/core';
import type { Household } from '../types';

export interface GameNightFilterState {
  playerCount: number | undefined;
  hostHouseholdId: string | undefined;
  additionalHouseholdIds: string[];
  preferencesFilter: 'all' | 'liked' | 'favorites';
}

interface GameNightFiltersProps {
  filters: GameNightFilterState;
  onFiltersChange: (filters: GameNightFilterState) => void;
  households: Household[];
  userHouseholdId?: string;
}

export const GameNightFilters: React.FC<GameNightFiltersProps> = ({
  filters,
  onFiltersChange,
  households,
  userHouseholdId,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePlayerCountChange = (value: number) => {
    onFiltersChange({
      ...filters,
      playerCount: value > 0 ? value : undefined,
    });
  };

  const handleHostHouseholdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hostId = e.target.value || undefined;
    onFiltersChange({
      ...filters,
      hostHouseholdId: hostId,
      // Remove host from additional households if selected
      additionalHouseholdIds: filters.additionalHouseholdIds.filter(id => id !== hostId),
    });
  };

  const handleAdditionalHouseholdToggle = (householdId: string) => {
    const isSelected = filters.additionalHouseholdIds.includes(householdId);
    onFiltersChange({
      ...filters,
      additionalHouseholdIds: isSelected
        ? filters.additionalHouseholdIds.filter(id => id !== householdId)
        : [...filters.additionalHouseholdIds, householdId],
    });
  };

  const handlePreferencesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      preferencesFilter: e.target.value as 'all' | 'liked' | 'favorites',
    });
  };

  const hasActiveFilters =
    filters.playerCount ||
    filters.hostHouseholdId ||
    filters.additionalHouseholdIds.length > 0 ||
    filters.preferencesFilter !== 'all';

  // Get households available for "additional" selection (excluding host)
  const availableAdditionalHouseholds = households.filter(
    h => h.id !== filters.hostHouseholdId
  );

  return (
    <div className="game-night-filters">
      <div className="filters-header">
        <Button
          minimal
          icon={isOpen ? 'chevron-up' : 'chevron-down'}
          rightIcon="filter"
          onClick={() => setIsOpen(!isOpen)}
        >
          Advanced Filters
          {hasActiveFilters && (
            <Tag minimal intent="primary" className="active-filters-badge">
              Active
            </Tag>
          )}
        </Button>
      </div>

      <Collapse isOpen={isOpen}>
        <div className="filters-content">
          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">How many players?</label>
              <NumericInput
                min={1}
                max={20}
                value={filters.playerCount || ''}
                onValueChange={handlePlayerCountChange}
                placeholder="Any"
                className="player-count-input"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Show games from</label>
              <HTMLSelect
                value={filters.preferencesFilter}
                onChange={handlePreferencesChange}
                className="preferences-select"
              >
                <option value="all">All games</option>
                <option value="liked">Liked games only</option>
                <option value="favorites">Favorites only</option>
              </HTMLSelect>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">Host household</label>
              <HTMLSelect
                value={filters.hostHouseholdId || ''}
                onChange={handleHostHouseholdChange}
                className="household-select"
              >
                <option value="">All households</option>
                {households.map((household) => (
                  <option key={household.id} value={household.id}>
                    {household.name}
                    {household.id === userHouseholdId ? ' (yours)' : ''}
                  </option>
                ))}
              </HTMLSelect>
            </div>
          </div>

          {filters.hostHouseholdId && availableAdditionalHouseholds.length > 0 && (
            <div className="filter-row">
              <div className="filter-group additional-households">
                <label className="filter-label">Include games from visitors</label>
                <div className="checkbox-list">
                  {availableAdditionalHouseholds.map((household) => (
                    <Checkbox
                      key={household.id}
                      label={household.name}
                      checked={filters.additionalHouseholdIds.includes(household.id)}
                      onChange={() => handleAdditionalHouseholdToggle(household.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
};
