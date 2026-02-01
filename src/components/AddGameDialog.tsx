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
import type { BGGSearchResult, BGGGameDetails, Game, Household, Ownership } from '../types';
import { stripHtml } from '../utils/text';

type StepId = 'search' | 'details' | 'household';

interface Step {
  id: StepId;
  title: string;
  number: number;
}

const STEPS: Step[] = [
  { id: 'search', title: 'Search', number: 1 },
  { id: 'details', title: 'Game Details', number: 2 },
  { id: 'household', title: 'Add to Collection', number: 3 },
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
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setVisitedSteps(new Set(['search']));
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
        setExistingGame(existing);
        setExistingOwnerships(ownerships);
        setIsExistingGame(true);
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
        const gameData: Omit<Game, 'id'> = {
          name: name.trim(),
          minPlayers,
          maxPlayers,
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
        notes.trim() || undefined
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
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
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
                    src={result.thumbnail || 'https://placehold.co/48x48/e2e6ec/4a5568?text=?'}
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

          {!isExistingGame && bggId && (
            <div className="wizard-prefill-banner">
              <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Pre-filled from BoardGameGeek</span>
            </div>
          )}

          <div className="wizard-game-preview">
            <img
              src={imageUrl || 'https://placehold.co/80x80/e2e6ec/4a5568?text=?'}
              className="game-preview-image"
              alt=""
            />
            <div className="game-preview-info">
              <div className="game-preview-name">{name}</div>
              {yearPublished && <div className="game-preview-year">{yearPublished}</div>}
              <div className="game-preview-meta">
                <span className="meta-chip">
                  <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  {minPlayers}-{maxPlayers} players
                </span>
                {playTimeMinutes && (
                  <span className="meta-chip">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {playTimeMinutes} min
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isExistingGame && (
            <div className="wizard-form-fields">
              <div className="wizard-form-group">
                <label className="wizard-form-label">Game Name</label>
                <input
                  type="text"
                  className="wizard-form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Settlers of Catan"
                />
              </div>

              <div className="wizard-form-group">
                <label className="wizard-form-label">Description <span className="optional">(optional)</span></label>
                <textarea
                  className="wizard-form-input wizard-form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={3}
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

              <div className="wizard-form-group">
                <label className="wizard-form-label">Categories</label>
                <div className="wizard-category-tags">
                  {categories.map((category, index) => (
                    <span key={index} className="category-tag">
                      {category}
                      <button onClick={() => setCategories(categories.filter((_, i) => i !== index))}>
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </span>
                  ))}
                  {categories.length === 0 && (
                    <span className="category-placeholder">No categories</span>
                  )}
                </div>
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
        </>
      )}
    </div>
  );

  // Household step
  const renderHouseholdStep = () => (
    <div className="wizard-step-content">
      {error && (
        <Callout intent={Intent.DANGER} className="wizard-callout">
          {error}
        </Callout>
      )}

      <div className="wizard-collection-game-summary">
        <img
          src={imageUrl || 'https://placehold.co/56x56/e2e6ec/4a5568?text=?'}
          className="collection-game-image"
          alt=""
        />
        <div className="collection-game-name">{name}</div>
      </div>

      <div className="wizard-form-group">
        <label className="wizard-form-label">Which household owns this game?</label>
        <select
          className="wizard-form-select"
          value={selectedHouseholdId}
          onChange={(e) => setSelectedHouseholdId(e.target.value)}
        >
          <option value="">Select a household...</option>
          {availableHouseholds.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} {h.id === userHouseholdId ? '(yours)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="wizard-form-group">
        <label className="wizard-form-label">Notes about your copy <span className="optional">(optional)</span></label>
        <textarea
          className="wizard-form-input wizard-form-textarea"
          placeholder="Condition, expansions included, missing pieces, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </div>
    </div>
  );

  // Footer
  const renderFooter = () => {
    const isFirstStep = currentStep === 'search';
    const isLastStep = currentStep === 'household';

    return (
      <div className="wizard-footer">
        <button className="wizard-footer-btn btn-secondary" onClick={onClose}>Close</button>
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
