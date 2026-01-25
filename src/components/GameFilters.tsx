import React from 'react';
import {
  InputGroup,
  Button,
  HTMLSelect,
  NumericInput,
  Tag,
} from '@blueprintjs/core';
import type { GameFilters as GameFiltersType, Household } from '../types';

interface GameFiltersProps {
  filters: GameFiltersType;
  onFiltersChange: (filters: GameFiltersType) => void;
  households: Household[];
}

export const GameFilters: React.FC<GameFiltersProps> = ({
  filters,
  onFiltersChange,
  households,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, searchQuery: e.target.value });
  };

  const handlePlayerCountChange = (value: number) => {
    onFiltersChange({
      ...filters,
      playerCount: value > 0 ? value : undefined,
    });
  };

  const handleHouseholdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      householdId: e.target.value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      playerCount: undefined,
      householdId: undefined,
      categories: undefined,
    });
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.playerCount ||
    filters.householdId ||
    (filters.categories && filters.categories.length > 0);

  return (
    <div className="game-filters">
      <div className="search-row">
        <InputGroup
          large
          leftIcon="search"
          placeholder="Search games..."
          value={filters.searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>

      <div className="advanced-filters">
        <div className="filter-group">
          <label className="filter-label">Players</label>
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
          <label className="filter-label">Household</label>
          <HTMLSelect
            value={filters.householdId || ''}
            onChange={handleHouseholdChange}
            className="household-select"
          >
            <option value="">All</option>
            {households.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name}
              </option>
            ))}
          </HTMLSelect>
        </div>

        {hasActiveFilters && (
          <Button
            minimal
            small
            icon="cross"
            text="Clear filters"
            onClick={clearFilters}
            className="clear-filters-btn"
          />
        )}
      </div>
    </div>
  );
};
