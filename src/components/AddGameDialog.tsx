import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Spinner,
  Callout,
  Intent,
} from '@blueprintjs/core';
import { useBGGSearch } from '../hooks/useBGGSearch';
import { useAuth } from '../context/AuthContext';
import { gamesService } from '../services/games';
import { ownershipService } from '../services/ownership';
import { householdsService } from '../services/households';
import type { BGGSearchResult, BGGGameDetails, Game, Household, Ownership } from '../types';
import { getEntityColorHex } from '../types';
import { stripHtml } from '../utils/text';
import poweredByBgg from '../assets/powered-by-bgg.png';

type StepId = 'search' | 'details' | 'household';

interface Step {
  id: StepId;
  title: string;
  number: number;
}

const STEPS: Step[] = [
  { id: 'search', title: 'Search', number: 1 },
  { id: 'details', title: 'Game Details', number: 2 },
  { id: 'household', title: 'Your Copy', number: 3 },
];

interface AddGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGameAdded: () => void;
  households: Household[];
  userHouseholdId?: string;
}

const DEBOUNCE_MS = 300;

export const AddGameDialog: React.FC<AddGameDialogProps> = ({
  isOpen,
  onClose,
  onGameAdded,
  households,
  userHouseholdId,
}) => {
  const { currentUser } = useAuth();
  const bggSearch = useBGGSearch();

  // Dialog state
  const [currentStep, setCurrentStep] = useState<StepId>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<BGGSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Existing game state
  const [existingGame, setExistingGame] = useState<Game | null>(null);
  const [existingOwnerships, setExistingOwnerships] = useState<Ownership[]>([]);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [isExistingGame, setIsExistingGame] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [playTimeMinutes, setPlayTimeMinutes] = useState<number | undefined>();
  const [yearPublished, setYearPublished] = useState<number | undefined>();
  const [imageUrl, setImageUrl] = useState('');
  const [bggId, setBggId] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // Household form state
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(userHouseholdId || '');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [householdMembers, setHouseholdMembers] = useState<{ id: string; displayName: string; email: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [householdDropdownOpen, setHouseholdDropdownOpen] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const householdDropdownRef = useRef<HTMLDivElement>(null);
  const ownerDropdownRef = useRef<HTMLDivElement>(null);

  // Track visited steps
  const [visitedSteps, setVisitedSteps] = useState<Set<StepId>>(new Set(['search']));

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('search');
      setSearchQuery('');
      setSelectedResult(null);
      setExistingGame(null);
      setExistingOwnerships([]);
      setIsExistingGame(false);
      setError(null);
      setNotes('');
      setSelectedHouseholdId(userHouseholdId || '');
      setSelectedOwnerId('');
      setHouseholdMembers([]);
      setHouseholdDropdownOpen(false);
      setOwnerDropdownOpen(false);
      setVisitedSteps(new Set(['search']));
      setShowCategoryInput(false);
      bggSearch.clearResults();
      bggSearch.clearSelection();
      resetForm();
    }
  }, [isOpen, userHouseholdId]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim()) {
      debounceRef.current = setTimeout(() => {
        bggSearch.search(searchQuery);
      }, DEBOUNCE_MS);
    } else {
      bggSearch.clearResults();
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setMinPlayers(2);
    setMaxPlayers(4);
    setPlayTimeMinutes(undefined);
    setYearPublished(undefined);
    setImageUrl('');
    setBggId('');
    setCategories([]);
  };

  const populateFormFromBGG = (game: BGGGameDetails) => {
    setName(game.name);
    setDescription(stripHtml(game.description));
    if (game.minPlayers) setMinPlayers(game.minPlayers);
    if (game.maxPlayers) setMaxPlayers(game.maxPlayers);
    setPlayTimeMinutes(game.playTimeMinutes);
    setYearPublished(game.yearPublished);
    setImageUrl(game.imageUrl || '');
    setBggId(game.bggId);
    setCategories(game.categories);
  };

  const populateFormFromExisting = (game: Game) => {
    setName(game.name);
    setDescription(game.description || '');
    setMinPlayers(game.minPlayers);
    setMaxPlayers(game.maxPlayers);
    setPlayTimeMinutes(game.playTimeMinutes);
    setYearPublished(game.yearPublished);
    setImageUrl(game.imageUrl || '');
    setBggId(game.bggId || '');
    setCategories(game.categories || []);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedResult(null);
    bggSearch.clearResults();
    bggSearch.clearSelection();
    resetForm();
  };

  const getStepNumber = (stepId: StepId): number => {
    const step = STEPS.find(s => s.id === stepId);
    return step?.number || 0;
  };

  const goToStep = (step: StepId) => {
    setError(null);
    const targetStepNumber = getStepNumber(step);
    const currentStepNumber = getStepNumber(currentStep);

    // If going backwards, clear future steps from visited
    if (targetStepNumber < currentStepNumber) {
      setVisitedSteps(prev => {
        const newSet = new Set<StepId>();
        prev.forEach(visitedStep => {
          if (getStepNumber(visitedStep) <= targetStepNumber) {
            newSet.add(visitedStep);
          }
        });
        return newSet;
      });
    } else {
      setVisitedSteps(prev => new Set([...prev, step]));
    }

    setCurrentStep(step);
  };

  const handleSelectResult = async (result: BGGSearchResult) => {
    setSelectedResult(result);
    setCheckingExisting(true);
    setError(null);

    try {
      await bggSearch.selectGame(result.bggId);
      const existing = await gamesService.findGameByBggId(result.bggId);

      if (existing) {
        const ownerships = await ownershipService.getOwnershipsByGame(existing.id);
        // Filter to only ownerships within the user's guild households
        const guildHouseholdIds = new Set(households.map(h => h.id));
        const guildOwnerships = ownerships.filter(o => guildHouseholdIds.has(o.householdId));
        setExistingGame(existing);
        setExistingOwnerships(guildOwnerships);
        setIsExistingGame(guildOwnerships.length > 0);
        populateFormFromExisting(existing);
      } else {
        setIsExistingGame(false);
        setExistingGame(null);
        setExistingOwnerships([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game details');
    } finally {
      setCheckingExisting(false);
    }
  };

  useEffect(() => {
    if (bggSearch.selectedGame && !isExistingGame) {
      populateFormFromBGG(bggSearch.selectedGame);
    }
  }, [bggSearch.selectedGame, isExistingGame]);

  // Fetch household members when selection changes
  useEffect(() => {
    if (selectedHouseholdId) {
      householdsService.getHouseholdMembers(selectedHouseholdId)
        .then(members => {
          setHouseholdMembers(members);
          setSelectedOwnerId('');
        })
        .catch(() => {
          setHouseholdMembers([]);
          setSelectedOwnerId('');
        });
    } else {
      setHouseholdMembers([]);
      setSelectedOwnerId('');
    }
  }, [selectedHouseholdId, isOpen]);

  const availableHouseholds = isExistingGame
    ? households.filter(h => !existingOwnerships.some(o => o.householdId === h.id))
    : households;

  const handleSubmit = async () => {
    if (!currentUser || !selectedHouseholdId) return;

    const household = households.find(h => h.id === selectedHouseholdId);
    if (!household) return;

    setSubmitting(true);
    setError(null);

    try {
      let gameId: string;

      if (isExistingGame && existingGame) {
        gameId = existingGame.id;
        const alreadyOwns = existingOwnerships.some(o => o.householdId === selectedHouseholdId);
        if (alreadyOwns) {
          setError('This household already owns this game');
          setSubmitting(false);
          return;
        }
      } else {
        const finalMin = Math.min(minPlayers, maxPlayers);
        const finalMax = Math.max(minPlayers, maxPlayers);
        const gameData: Omit<Game, 'id'> = {
          name: name.trim(),
          minPlayers: finalMin,
          maxPlayers: finalMax,
          createdBy: currentUser.uid,
          createdAt: new Date(),
        };

        if (description.trim()) gameData.description = description.trim();
        if (playTimeMinutes) gameData.playTimeMinutes = playTimeMinutes;
        if (yearPublished) gameData.yearPublished = yearPublished;
        if (imageUrl.trim()) gameData.imageUrl = imageUrl.trim();
        if (bggId.trim()) gameData.bggId = bggId.trim();
        if (categories.length > 0) gameData.categories = categories;

        const { game } = await gamesService.getOrCreateGame(gameData);
        gameId = game.id;

        const existingOwnership = await ownershipService.householdOwnsGame(gameId, selectedHouseholdId);
        if (existingOwnership) {
          setError('Your household already owns this game');
          setSubmitting(false);
          return;
        }
      }

      await ownershipService.addOwnership(
        gameId,
        selectedHouseholdId,
        currentUser.uid,
        notes.trim() || undefined,
        selectedOwnerId || undefined
      );

      onGameAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add game');
    } finally {
      setSubmitting(false);
    }
  };

  // Validation
  const canProceedFromSearch = selectedResult !== null && !checkingExisting;
  const canProceedFromDetails = name.trim() !== '' && !(isExistingGame && availableHouseholds.length === 0);
  const canSubmit = selectedHouseholdId !== '';

  const getStepStatus = (step: Step): 'current' | 'complete' | 'incomplete' => {
    if (step.id === currentStep) return 'current';
    if (visitedSteps.has(step.id)) return 'complete';
    return 'incomplete';
  };

  const canNavigateToStep = (step: Step): boolean => {
    if (step.id === 'household' && isExistingGame && availableHouseholds.length === 0) return false;
    return visitedSteps.has(step.id);
  };

  // Render step navigation
  const renderStepNav = () => (
    <div className="wizard-sidebar">
      <div className="step-list">
        {STEPS.map((step) => {
          const status = getStepStatus(step);
          const canNavigate = canNavigateToStep(step);

          return (
            <div
              key={step.id}
              className={`step-item ${status === 'current' ? 'active' : ''} ${status === 'complete' && step.id !== currentStep ? 'completed' : ''} ${status === 'incomplete' ? 'pending' : ''}`}
              onClick={() => canNavigate && goToStep(step.id)}
              role={canNavigate ? 'button' : undefined}
              tabIndex={canNavigate ? 0 : undefined}
              onKeyDown={(e) => canNavigate && e.key === 'Enter' && goToStep(step.id)}
            >
              <div className="step-number">
                {status === 'complete' && step.id !== currentStep ? (
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  step.number
                )}
              </div>
              <span className="step-label">{step.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Search step
  const renderSearchStep = () => {
    return (
      <div className="wizard-step-content">
        <div className="wizard-search-input-wrapper">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            className="wizard-search-input"
            placeholder="Type a game name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {bggSearch.searching && (
            <div className="wizard-search-spinner">
              <Spinner size={18} />
            </div>
          )}
          {searchQuery && !bggSearch.searching && (
            <button className="wizard-search-clear-btn" onClick={handleClearSearch}>
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {(error || bggSearch.error) && (
          <div className="error-state">
            <div className="error-state-icon">
              <svg viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="error-state-title">Something went wrong</h3>
            <p className="error-state-description">
              We couldn't connect to the game database. Please check your connection and try again.
            </p>
            <button className="retry-btn" onClick={() => searchQuery && bggSearch.search(searchQuery)}>
              <svg viewBox="0 0 24 24">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Try again
            </button>
          </div>
        )}

        {!error && !bggSearch.error && bggSearch.searchResults.length > 0 && (
          <div className="wizard-search-results-container">
            <div className="wizard-search-results">
              {bggSearch.searchResults.map((result) => {
                const isSelected = selectedResult?.bggId === result.bggId;
                const isLoading = isSelected && checkingExisting;
                return (
                  <div
                    key={result.bggId}
                    className={`search-result-item ${isSelected ? 'selected' : ''} ${isLoading ? 'loading' : ''}`}
                    onClick={() => !checkingExisting && handleSelectResult(result)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && !checkingExisting && handleSelectResult(result)}
                  >
                    <img
                      src={result.thumbnail || 'https://placehold.co/56x56/e2e6ec/4a5568?text=?'}
                      className="result-image"
                      alt=""
                    />
                    <div className="result-info">
                      <div className="result-name">{result.name}</div>
                      {result.yearPublished && (
                        <div className="result-year">{result.yearPublished}</div>
                      )}
                    </div>
                    {isLoading ? (
                      <div className="result-spinner">
                        <Spinner size={18} />
                      </div>
                    ) : (
                      <div className="result-check">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="bgg-powered-by">
              <img src={poweredByBgg} alt="Powered by BGG" className="bgg-logo-img" />
            </div>
          </div>
        )}

        {searchQuery && !bggSearch.searching && !bggSearch.error && bggSearch.searchResults.length === 0 && (
          <div className="no-results-state">
            <div className="no-results-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="8" x2="14" y2="14"/>
                <line x1="14" y1="8" x2="8" y2="14"/>
              </svg>
            </div>
            <h3 className="no-results-title">No games found</h3>
            <p className="no-results-description">We couldn't find any games matching your search.</p>
            <div className="no-results-hint">
              <strong>Tip:</strong> Try a shorter or different spelling
            </div>
          </div>
        )}

        {!searchQuery && !bggSearch.error && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <h3 className="empty-state-title">Search for a game</h3>
            <p className="empty-state-description">Type a game name above to search the BoardGameGeek database</p>
          </div>
        )}
      </div>
    );
  };

  // Details step
  const renderDetailsStep = () => (
    <div className="wizard-step-content">
      {bggSearch.loadingDetails ? (
        <div className="wizard-loading-state large">
          <Spinner size={40} />
          <span>Loading game details...</span>
        </div>
      ) : (
        <>
          {error && (
            <Callout intent={Intent.DANGER} className="wizard-callout">
              {error}
            </Callout>
          )}

          {isExistingGame && (
            <div className="info-banner">
              <div className="info-banner-icon">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <div className="info-banner-content">
                <div className="info-banner-title">Already in your family's library</div>
                <div className="info-banner-description">
                  This game is owned by <span className="info-banner-owner">{existingOwnerships.map(o => o.householdName).join(', ')}</span>.
                  You can still add another copy.
                </div>
              </div>
            </div>
          )}

          <div className="wizard-form-scroll">
            <div className="wizard-game-preview">
              <img
                src={imageUrl || 'https://placehold.co/100x100/e2e6ec/4a5568?text=?'}
                className="game-preview-image"
                alt=""
              />
              <div className="game-preview-info">
                <div className="game-preview-name">{name}</div>
                {yearPublished && <div className="game-preview-year">{yearPublished}</div>}
                <div className="game-preview-meta">
                  <span className="meta-chip">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    {minPlayers === maxPlayers ? `${minPlayers} players` : `${minPlayers}-${maxPlayers} players`}
                  </span>
                  {playTimeMinutes != null && playTimeMinutes > 0 && (
                    <span className="meta-chip">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {playTimeMinutes} min
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isExistingGame && bggId && (
              <div className="wizard-bgg-banner">
                <img src={poweredByBgg} alt="Powered by BGG" className="bgg-logo-img bgg-logo-img--small" />
                <div className="bgg-banner-divider" />
                <span className="bgg-banner-text">Edit any fields as desired</span>
              </div>
            )}

          {!isExistingGame && (
              <div className="wizard-form-fields">
                <div className="wizard-form-group">
                  <label className="wizard-form-label">Name</label>
                  <input
                    type="text"
                    className="wizard-form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Settlers of Catan"
                  />
                </div>

                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label className="wizard-form-label">Min Players</label>
                    <input
                      type="number"
                      className="wizard-form-input"
                      value={minPlayers}
                      onChange={(e) => setMinPlayers(parseInt(e.target.value) || 1)}
                      min={1}
                      max={99}
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-form-label">Max Players</label>
                    <input
                      type="number"
                      className="wizard-form-input"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 1)}
                      min={1}
                      max={99}
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-form-label">Play Time (min)</label>
                    <input
                      type="number"
                      className="wizard-form-input"
                      value={playTimeMinutes ?? ''}
                      onChange={(e) => setPlayTimeMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                      min={1}
                    />
                  </div>
                </div>

                <h4 className="form-section-header">Description</h4>
                <div className="wizard-form-group">
                  <textarea
                    className="wizard-form-input wizard-form-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description..."
                    rows={3}
                  />
                </div>

                <h4 className="form-section-header">Categories</h4>
                <div className="wizard-form-group">
                  <div className="wizard-category-tags">
                    {categories.map((category, index) => (
                      <span key={index} className="category-tag">
                        {category}
                        <button onClick={() => setCategories(categories.filter((_, i) => i !== index))}>
                          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </span>
                    ))}
                    {!showCategoryInput && (
                      <button
                        className="add-category-btn"
                        onClick={() => setShowCategoryInput(true)}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  {showCategoryInput && (
                    <input
                      type="text"
                      className="wizard-form-input"
                      placeholder="Type a category and press Enter"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            if (!categories.includes(value)) {
                              setCategories([...categories, value]);
                            }
                            (e.target as HTMLInputElement).value = '';
                          }
                        } else if (e.key === 'Escape') {
                          setShowCategoryInput(false);
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && !categories.includes(value)) {
                          setCategories([...categories, value]);
                        }
                        setShowCategoryInput(false);
                      }}
                    />
                  )}
                </div>
              </div>
          )}

            {isExistingGame && availableHouseholds.length === 0 && (
              <div className="warning-banner">
                <div className="warning-banner-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div className="warning-banner-content">
                  <div className="warning-banner-title">All households already own this game</div>
                  <div className="warning-banner-description">
                    Every household in your family has a copy. You can still add another if someone has a second copy.
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  // Helper to get initials from display name
  const getInitials = (displayName: string) => {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (householdDropdownRef.current && !householdDropdownRef.current.contains(e.target as Node)) {
        setHouseholdDropdownOpen(false);
      }
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(e.target as Node)) {
        setOwnerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Household step ("Your Copy")
  const renderHouseholdStep = () => {
    const selectedHousehold = availableHouseholds.find(h => h.id === selectedHouseholdId);
    const householdColor = selectedHousehold ? getEntityColorHex(selectedHousehold.color) : '#1e3a5f';
    const selectedOwner = householdMembers.find(m => m.id === selectedOwnerId);

    return (
      <div className="wizard-step-content">
        {error && (
          <Callout intent={Intent.DANGER} className="wizard-callout">
            {error}
          </Callout>
        )}

        <div className="wizard-form-scroll">
        <div className="wizard-collection-game-summary">
          <img
            src={imageUrl || 'https://placehold.co/64x64/e2e6ec/4a5568?text=?'}
            className="collection-game-image"
            alt=""
          />
          <div className="collection-game-info">
            <div className="collection-game-name">{name}</div>
            <div className="collection-game-subtitle">Adding to your library</div>
          </div>
        </div>

        <div className="wizard-form-group">
          <label className="wizard-form-label">
            <svg className="label-icon" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Household
          </label>
          <div className="custom-dropdown" ref={householdDropdownRef}>
            <button
              type="button"
              className="custom-dropdown-trigger"
              onClick={() => { setHouseholdDropdownOpen(!householdDropdownOpen); setOwnerDropdownOpen(false); }}
            >
              {selectedHousehold ? (
                <>
                  <div className="dropdown-avatar" style={{ background: householdColor }}>
                    {selectedHousehold.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="dropdown-trigger-text">{selectedHousehold.name}</span>
                  {selectedHousehold.id === userHouseholdId && (
                    <span className="dropdown-trigger-tag">(yours)</span>
                  )}
                </>
              ) : (
                <span className="dropdown-trigger-placeholder">Select a household...</span>
              )}
              <svg className="dropdown-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {householdDropdownOpen && (
              <div className="custom-dropdown-menu">
                {availableHouseholds.map((h) => {
                  const color = getEntityColorHex(h.color);
                  const isSelected = h.id === selectedHouseholdId;
                  return (
                    <div
                      key={h.id}
                      className={`custom-dropdown-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => { setSelectedHouseholdId(h.id); setHouseholdDropdownOpen(false); }}
                    >
                      <div className="dropdown-avatar" style={{ background: color }}>
                        {h.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="dropdown-option-text">{h.name}</span>
                      {h.id === userHouseholdId && (
                        <span className="dropdown-option-tag">(yours)</span>
                      )}
                      {isSelected && (
                        <svg className="dropdown-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {selectedHouseholdId && householdMembers.length > 0 && (
          <div className="wizard-form-group">
            <label className="wizard-form-label">
              <svg className="label-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Owner
            </label>
            <div className="custom-dropdown" ref={ownerDropdownRef}>
              <button
                type="button"
                className="custom-dropdown-trigger"
                onClick={() => { setOwnerDropdownOpen(!ownerDropdownOpen); setHouseholdDropdownOpen(false); }}
              >
                {selectedOwner ? (
                  <>
                    <div className="dropdown-avatar dropdown-avatar--user" style={{ background: householdColor }}>
                      {getInitials(selectedOwner.displayName)}
                    </div>
                    <span className="dropdown-trigger-text">{selectedOwner.displayName}</span>
                    {selectedOwner.id === currentUser?.uid && (
                      <span className="dropdown-trigger-tag">(you)</span>
                    )}
                  </>
                ) : (
                  <>
                    <div className="dropdown-avatar" style={{ background: householdColor }}>
                      {selectedHousehold ? selectedHousehold.name.slice(0, 1).toUpperCase() : '?'}
                    </div>
                    <span className="dropdown-trigger-text">Household (shared)</span>
                  </>
                )}
                <svg className="dropdown-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {ownerDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div
                    className={`custom-dropdown-option ${selectedOwnerId === '' ? 'selected' : ''}`}
                    onClick={() => { setSelectedOwnerId(''); setOwnerDropdownOpen(false); }}
                  >
                    <div className="dropdown-avatar" style={{ background: householdColor }}>
                      {selectedHousehold ? selectedHousehold.name.slice(0, 1).toUpperCase() : '?'}
                    </div>
                    <span className="dropdown-option-text">Household (shared)</span>
                    {selectedOwnerId === '' && (
                      <svg className="dropdown-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  {householdMembers.map((m) => {
                    const isSelected = m.id === selectedOwnerId;
                    return (
                      <div
                        key={m.id}
                        className={`custom-dropdown-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => { setSelectedOwnerId(m.id); setOwnerDropdownOpen(false); }}
                      >
                        <div className="dropdown-avatar dropdown-avatar--user" style={{ background: householdColor }}>
                          {getInitials(m.displayName)}
                        </div>
                        <span className="dropdown-option-text">{m.displayName}</span>
                        {m.id === currentUser?.uid && (
                          <span className="dropdown-option-tag">(you)</span>
                        )}
                        {isSelected && (
                          <svg className="dropdown-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="wizard-form-group">
          <label className="wizard-form-label">Notes <span className="optional">(optional)</span></label>
          <textarea
            className="wizard-form-input wizard-form-textarea wizard-form-textarea--short"
            placeholder="Condition, expansions included, missing pieces, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        </div>
      </div>
    );
  };

  // Footer
  const renderFooter = () => {
    const isFirstStep = currentStep === 'search';
    const isLastStep = currentStep === 'household';

    return (
      <div className="wizard-footer">
        <button className="wizard-footer-btn btn-ghost" onClick={onClose}>Close</button>
        <div className="wizard-footer-actions">
          {!isFirstStep && (
            <button
              className="wizard-footer-btn btn-secondary"
              onClick={() => {
                if (currentStep === 'details') goToStep('search');
                else if (currentStep === 'household') goToStep('details');
              }}
            >
              Back
            </button>
          )}
          {currentStep === 'search' && (
            <button
              className="wizard-footer-btn btn-primary"
              disabled={!canProceedFromSearch}
              onClick={() => goToStep('details')}
            >
              Continue
            </button>
          )}
          {currentStep === 'details' && (
            <button
              className="wizard-footer-btn btn-primary"
              disabled={!canProceedFromDetails}
              onClick={() => goToStep('household')}
            >
              Continue
            </button>
          )}
          {isLastStep && (
            <button
              className={`wizard-footer-btn btn-success ${submitting ? 'loading' : ''}`}
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Spinner size={16} />
              ) : (
                <>
                  <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add to Library
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      className="add-game-wizard-dialog"
    >
      <div className="wizard-modal">
        <div className="wizard-header">
          <h2 className="wizard-title">Add Game</h2>
          <button className="wizard-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="wizard-body">
          {renderStepNav()}
          <div className="wizard-content">
            {currentStep === 'search' && renderSearchStep()}
            {currentStep === 'details' && renderDetailsStep()}
            {currentStep === 'household' && renderHouseholdStep()}
          </div>
        </div>

        {renderFooter()}
      </div>
    </Dialog>
  );
};
