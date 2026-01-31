import React, { useState, useRef, useEffect } from 'react';
import type { GameFilters as GameFiltersType, Household, PlayTimeFilter } from '../types';

interface GameFiltersProps {
  filters: GameFiltersType;
  onFiltersChange: (filters: GameFiltersType) => void;
  households: Household[];
  availableCategories: string[];
  totalGames: number;
  filteredGamesCount: number;
  actionButton?: React.ReactNode;
}

const PLAY_TIME_OPTIONS: { value: PlayTimeFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'short', label: '< 30 min' },
  { value: 'medium', label: '30-60 min' },
  { value: 'long', label: '60+ min' },
];

export const GameFilters: React.FC<GameFiltersProps> = ({
  filters,
  onFiltersChange,
  households,
  availableCategories,
  totalGames,
  filteredGamesCount,
  actionButton,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isHouseholdOpen, setIsHouseholdOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [householdSearch, setHouseholdSearch] = useState('');

  // Pending filter state (not applied until "Apply" is clicked)
  const [pendingFilters, setPendingFilters] = useState<GameFiltersType>(filters);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const categorySearchRef = useRef<HTMLInputElement>(null);
  const householdSearchRef = useRef<HTMLInputElement>(null);

  // Sync pending filters when filters prop changes
  useEffect(() => {
    setPendingFilters(filters);
  }, [filters]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setIsCategoryOpen(false);
        setIsHouseholdOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Focus search inputs when opening multi-selects
  useEffect(() => {
    if (isCategoryOpen && categorySearchRef.current) {
      categorySearchRef.current.focus();
    }
  }, [isCategoryOpen]);

  useEffect(() => {
    if (isHouseholdOpen && householdSearchRef.current) {
      householdSearchRef.current.focus();
    }
  }, [isHouseholdOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, searchQuery: e.target.value });
  };

  const handlePlayerMinus = () => {
    const current = pendingFilters.playerCount || 1;
    if (current > 1) {
      setPendingFilters({ ...pendingFilters, playerCount: current - 1 });
    }
  };

  const handlePlayerPlus = () => {
    const current = pendingFilters.playerCount || 0;
    if (current < 20) {
      setPendingFilters({ ...pendingFilters, playerCount: current + 1 });
    }
  };

  const handlePlayerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 20) {
      setPendingFilters({ ...pendingFilters, playerCount: val });
    } else if (e.target.value === '') {
      setPendingFilters({ ...pendingFilters, playerCount: undefined });
    }
  };

  const handlePlayerAny = () => {
    setPendingFilters({ ...pendingFilters, playerCount: undefined });
  };

  const handlePlayTimeChange = (value: PlayTimeFilter) => {
    setPendingFilters({
      ...pendingFilters,
      playTime: value === 'any' ? undefined : value
    });
  };

  const handleCategoryToggle = (category: string) => {
    const current = pendingFilters.categories || [];
    const newCategories = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    setPendingFilters({
      ...pendingFilters,
      categories: newCategories.length > 0 ? newCategories : undefined
    });
  };

  const handleHouseholdToggle = (householdId: string) => {
    const current = pendingFilters.householdIds || [];
    const newHouseholds = current.includes(householdId)
      ? current.filter(h => h !== householdId)
      : [...current, householdId];
    setPendingFilters({
      ...pendingFilters,
      householdIds: newHouseholds.length > 0 ? newHouseholds : undefined
    });
  };

  const handleApplyFilters = () => {
    onFiltersChange(pendingFilters);
    setIsDropdownOpen(false);
    setIsCategoryOpen(false);
    setIsHouseholdOpen(false);
  };

  const handleCancelFilters = () => {
    setPendingFilters(filters);
    setIsDropdownOpen(false);
    setIsCategoryOpen(false);
    setIsHouseholdOpen(false);
  };

  const handleClearAll = () => {
    const cleared: GameFiltersType = {
      searchQuery: filters.searchQuery,
      playerCount: undefined,
      householdIds: undefined,
      categories: undefined,
      playTime: undefined,
    };
    setPendingFilters(cleared);
  };

  const removeFilterChip = (type: string, value?: string) => {
    const newFilters = { ...filters };
    switch (type) {
      case 'players':
        newFilters.playerCount = undefined;
        break;
      case 'playTime':
        newFilters.playTime = undefined;
        break;
      case 'category':
        newFilters.categories = filters.categories?.filter(c => c !== value);
        if (newFilters.categories?.length === 0) newFilters.categories = undefined;
        break;
      case 'household':
        newFilters.householdIds = filters.householdIds?.filter(h => h !== value);
        if (newFilters.householdIds?.length === 0) newFilters.householdIds = undefined;
        break;
    }
    onFiltersChange(newFilters);
  };

  // Count active filters
  const activeFilterCount = [
    filters.playerCount,
    filters.playTime,
    ...(filters.categories || []),
    ...(filters.householdIds || []),
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  // Filter categories by search
  const filteredCategories = availableCategories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Filter households by search
  const filteredHouseholds = households.filter(h =>
    h.name.toLowerCase().includes(householdSearch.toLowerCase())
  );

  // Get play time label
  const getPlayTimeLabel = (value: PlayTimeFilter | undefined): string => {
    const option = PLAY_TIME_OPTIONS.find(o => o.value === value);
    return option?.label || 'Any';
  };

  // Get household name by ID
  const getHouseholdName = (id: string): string => {
    return households.find(h => h.id === id)?.name || id;
  };

  return (
    <div className="game-filters">
      {/* Search Row */}
      <div className="search-row">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search games..."
            value={filters.searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="filter-btn-wrapper" ref={dropdownRef}>
          <button
            className={`filter-btn ${isDropdownOpen ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
              setIsCategoryOpen(false);
              setIsHouseholdOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="filter-count">{activeFilterCount}</span>
            )}
          </button>

          {/* Filter Dropdown */}
          <div className={`filter-dropdown ${isDropdownOpen ? 'show' : ''}`}>
            <div className="filter-dropdown-header">
              <span className="filter-dropdown-title">Filters</span>
              <button className="clear-filters-btn" onClick={handleClearAll}>
                Clear all
              </button>
            </div>

            <div className="filter-dropdown-content">
              {/* Player Count */}
              <div className="filter-section">
                <div className="filter-section-label">Number of Players</div>
                <div className="player-count-row">
                  <div className="player-stepper">
                    <button onClick={handlePlayerMinus}>
                      <svg viewBox="0 0 24 24">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                    <input
                      type="number"
                      value={pendingFilters.playerCount || ''}
                      onChange={handlePlayerInputChange}
                      min={1}
                      max={20}
                      placeholder="-"
                    />
                    <button onClick={handlePlayerPlus}>
                      <svg viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  </div>
                  <span className="player-count-label">players</span>
                  <button
                    className={`player-any-btn ${!pendingFilters.playerCount ? 'active' : ''}`}
                    onClick={handlePlayerAny}
                  >
                    Any
                  </button>
                </div>
              </div>

              {/* Play Time */}
              <div className="filter-section">
                <div className="filter-section-label">Play Time</div>
                <div className="time-options">
                  {PLAY_TIME_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      className={`time-option ${
                        (pendingFilters.playTime === option.value) ||
                        (!pendingFilters.playTime && option.value === 'any')
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() => handlePlayTimeChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="filter-section">
                <div className="filter-section-label">Categories</div>
                <div className="multi-select-wrapper">
                  <div
                    className={`multi-select-trigger ${isCategoryOpen ? 'open' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCategoryOpen(!isCategoryOpen);
                      setIsHouseholdOpen(false);
                    }}
                  >
                    <div className="trigger-content">
                      {(!pendingFilters.categories || pendingFilters.categories.length === 0) ? (
                        <span className="trigger-placeholder">Select categories...</span>
                      ) : (
                        <>
                          {pendingFilters.categories.slice(0, 2).map(cat => (
                            <span key={cat} className="trigger-chip">
                              {cat}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCategoryToggle(cat);
                                }}
                              >
                                <svg viewBox="0 0 24 24">
                                  <line x1="18" y1="6" x2="6" y2="18"/>
                                  <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </span>
                          ))}
                          {pendingFilters.categories.length > 2 && (
                            <span className="trigger-more">
                              +{pendingFilters.categories.length - 2} more
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <svg className="trigger-arrow" viewBox="0 0 24 24">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  <div className={`multi-select-dropdown ${isCategoryOpen ? 'show' : ''}`}>
                    <div className="multi-select-search">
                      <input
                        ref={categorySearchRef}
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="multi-select-list">
                      {filteredCategories.map(cat => (
                        <div
                          key={cat}
                          className={`multi-select-option ${
                            pendingFilters.categories?.includes(cat) ? 'selected' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCategoryToggle(cat);
                          }}
                        >
                          <div className="option-checkbox">
                            <svg viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                          <span className="option-name">{cat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Households */}
              <div className="filter-section">
                <div className="filter-section-label">Households</div>
                <div className="multi-select-wrapper">
                  <div
                    className={`multi-select-trigger ${isHouseholdOpen ? 'open' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHouseholdOpen(!isHouseholdOpen);
                      setIsCategoryOpen(false);
                    }}
                  >
                    <div className="trigger-content">
                      {(!pendingFilters.householdIds || pendingFilters.householdIds.length === 0) ? (
                        <span className="trigger-placeholder">Select households...</span>
                      ) : (
                        <>
                          {pendingFilters.householdIds.slice(0, 2).map(id => (
                            <span key={id} className="trigger-chip">
                              {getHouseholdName(id)}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleHouseholdToggle(id);
                                }}
                              >
                                <svg viewBox="0 0 24 24">
                                  <line x1="18" y1="6" x2="6" y2="18"/>
                                  <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </span>
                          ))}
                          {pendingFilters.householdIds.length > 2 && (
                            <span className="trigger-more">
                              +{pendingFilters.householdIds.length - 2} more
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <svg className="trigger-arrow" viewBox="0 0 24 24">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  <div className={`multi-select-dropdown ${isHouseholdOpen ? 'show' : ''}`}>
                    <div className="multi-select-search">
                      <input
                        ref={householdSearchRef}
                        type="text"
                        placeholder="Search households..."
                        value={householdSearch}
                        onChange={(e) => setHouseholdSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="multi-select-list">
                      {filteredHouseholds.map(household => (
                        <div
                          key={household.id}
                          className={`multi-select-option ${
                            pendingFilters.householdIds?.includes(household.id) ? 'selected' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHouseholdToggle(household.id);
                          }}
                        >
                          <div className="option-checkbox">
                            <svg viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                          <span className="option-name">{household.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="filter-dropdown-footer">
              <button className="filter-footer-btn cancel-btn" onClick={handleCancelFilters}>
                Cancel
              </button>
              <button className="filter-footer-btn apply-btn" onClick={handleApplyFilters}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {actionButton}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="active-filters">
          {filters.playerCount && (
            <div className="filter-chip">
              {filters.playerCount} players
              <button
                className="filter-chip-remove"
                onClick={() => removeFilterChip('players')}
              >
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}
          {filters.playTime && (
            <div className="filter-chip">
              {getPlayTimeLabel(filters.playTime)}
              <button
                className="filter-chip-remove"
                onClick={() => removeFilterChip('playTime')}
              >
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}
          {filters.categories?.map(cat => (
            <div key={cat} className="filter-chip">
              {cat}
              <button
                className="filter-chip-remove"
                onClick={() => removeFilterChip('category', cat)}
              >
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
          {filters.householdIds?.map(id => (
            <div key={id} className="filter-chip">
              {getHouseholdName(id)}
              <button
                className="filter-chip-remove"
                onClick={() => removeFilterChip('household', id)}
              >
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Results Info */}
      {(hasActiveFilters || filters.searchQuery) && (
        <div className="results-info">
          <span className="results-count">
            Showing <strong>{filteredGamesCount}</strong> of {totalGames} games
          </span>
        </div>
      )}
    </div>
  );
};
