import React from 'react';
import {
  InputGroup,
  Button,
  HTMLSelect,
  NumericInput,
} from '@blueprintjs/core';
import type { GameFilters as GameFiltersType, Household } from '../types';

interface GameFiltersProps {
  filters: GameFiltersType;
  onFiltersChange: (filters: GameFiltersType) => void;
  households: Household[];
  availableCategories: string[];
  actionButton?: React.ReactNode;
}

const PLAY_TIME_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '30', label: '30 min or less' },
  { value: '60', label: '1 hour or less' },
  { value: '90', label: '1.5 hours or less' },
  { value: '120', label: '2 hours or less' },
  { value: '180', label: '3 hours or less' },
];

export const GameFilters: React.FC<GameFiltersProps> = ({
  filters,
  onFiltersChange,
  households,
  availableCategories,
  actionButton,
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

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      categories: value ? [value] : undefined,
    });
  };

  const handlePlayTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      maxPlayTime: value ? parseInt(value, 10) : undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      playerCount: undefined,
      householdId: undefined,
      categories: undefined,
      maxPlayTime: undefined,
    });
  };

  const hasActiveFilters =
    filters.playerCount ||
    filters.householdId ||
    (filters.categories && filters.categories.length > 0) ||
    filters.maxPlayTime;

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
        {actionButton}
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
          <label className="filter-label">Play Time</label>
          <HTMLSelect
            value={filters.maxPlayTime?.toString() || ''}
            onChange={handlePlayTimeChange}
            className="playtime-select"
          >
            {PLAY_TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </HTMLSelect>
        </div>

        <div className="filter-group">
          <label className="filter-label">Category</label>
          <HTMLSelect
            value={filters.categories?.[0] || ''}
            onChange={handleCategoryChange}
            className="category-select"
          >
            <option value="">All</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </HTMLSelect>
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
            text="Clear"
            onClick={clearFilters}
            className="clear-filters-btn"
          />
        )}
      </div>
    </div>
  );
};
