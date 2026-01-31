import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Button,
  InputGroup,
  Spinner,
  Callout,
  Intent,
  FormGroup,
  TextArea,
  NumericInput,
  TagInput,
  HTMLSelect,
  Icon,
  Tag,
  Classes,
} from '@blueprintjs/core';
import { useBGGSearch } from '../hooks/useBGGSearch';
import { useAuth } from '../context/AuthContext';
import { gamesService } from '../services/games';
import { ownershipService } from '../services/ownership';
import type { BGGSearchResult, BGGGameDetails, Game, Household, Ownership } from '../types';

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

// Strip HTML tags from BGG descriptions
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#10;/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .trim();
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

  const goToStep = (step: StepId) => {
    setError(null);
    setCurrentStep(step);
    setVisitedSteps(prev => new Set([...prev, step]));
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
        household.name,
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
    <div className="dialog-left-panel">
      {STEPS.map((step) => {
        const status = getStepStatus(step);
        const canNavigate = canNavigateToStep(step);

        return (
          <div
            key={step.id}
            className={`dialog-step ${status} ${canNavigate ? 'clickable' : ''}`}
            onClick={() => canNavigate && goToStep(step.id)}
            role={canNavigate ? 'button' : undefined}
            tabIndex={canNavigate ? 0 : undefined}
            onKeyDown={(e) => canNavigate && e.key === 'Enter' && goToStep(step.id)}
          >
            <div className="dialog-step-icon">
              {status === 'complete' && step.id !== currentStep ? (
                <Icon icon="tick" />
              ) : (
                step.number
              )}
            </div>
            <div className="dialog-step-title">{step.title}</div>
          </div>
        );
      })}
    </div>
  );

  // Search step
  const renderSearchStep = () => {
    // Show selected game state
    if (selectedResult && !checkingExisting) {
      return (
        <div className="step-panel search-step">
          <div className="selected-game-card">
            <div className="selected-game-image">
              {selectedResult.thumbnail ? (
                <img src={selectedResult.thumbnail} alt={selectedResult.name} />
              ) : (
                <div className="image-placeholder">
                  <Icon icon="cube" size={40} />
                </div>
              )}
            </div>
            <div className="selected-game-info">
              <h3>{selectedResult.name}</h3>
              {selectedResult.yearPublished && (
                <span className="year">({selectedResult.yearPublished})</span>
              )}
              <div className="selected-badge">
                <Icon icon="tick-circle" intent={Intent.SUCCESS} />
                <span>Selected</span>
              </div>
            </div>
            <Button
              minimal
              icon="cross"
              className="clear-selection-btn"
              onClick={handleClearSearch}
              title="Search for a different game"
            />
          </div>

          {error && (
            <Callout intent={Intent.DANGER} className="step-callout">
              {error}
            </Callout>
          )}
        </div>
      );
    }

    // Show search state
    return (
      <div className="step-panel search-step">
        <InputGroup
          large
          leftIcon="search"
          placeholder="Type a game name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          rightElement={
            bggSearch.searching ? (
              <Spinner size={16} className="search-spinner" />
            ) : searchQuery ? (
              <Button minimal icon="cross" onClick={handleClearSearch} />
            ) : undefined
          }
        />

        {bggSearch.error && (
          <Callout intent={Intent.WARNING} className="step-callout">
            {bggSearch.error}
          </Callout>
        )}

        {checkingExisting && (
          <div className="loading-state">
            <Spinner size={20} />
            <span>Loading game details...</span>
          </div>
        )}

        <div className="search-results-container">
          {bggSearch.searchResults.length > 0 && !checkingExisting && (
            <div className="search-results-list">
              {bggSearch.searchResults.map((result) => (
                <div
                  key={result.bggId}
                  className="search-result-item"
                  onClick={() => handleSelectResult(result)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectResult(result)}
                >
                  <div className="result-thumbnail">
                    {result.thumbnail ? (
                      <img src={result.thumbnail} alt="" />
                    ) : (
                      <div className="result-placeholder">
                        <Icon icon="cube" />
                      </div>
                    )}
                  </div>
                  <div className="result-info">
                    <span className="result-name">{result.name}</span>
                    {result.yearPublished && (
                      <span className="result-year">({result.yearPublished})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !bggSearch.searching && !checkingExisting && bggSearch.searchResults.length === 0 && (
            <div className="empty-state">
              <Icon icon="search" size={32} />
              <p>No games found. Try a different search term.</p>
            </div>
          )}

          {!searchQuery && !checkingExisting && (
            <div className="empty-state">
              <Icon icon="cube" size={32} />
              <p>Search for a board game to get started</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Details step
  const renderDetailsStep = () => (
    <div className="step-panel details-step">
      {bggSearch.loadingDetails ? (
        <div className="loading-state large">
          <Spinner size={40} />
          <span>Loading game details...</span>
        </div>
      ) : (
        <>
          {error && (
            <Callout intent={Intent.DANGER} className="step-callout">
              {error}
            </Callout>
          )}

          {isExistingGame && (
            <Callout intent={Intent.PRIMARY} icon="info-sign" className="step-callout">
              This game is already in your family's library, owned by:{' '}
              <strong>{existingOwnerships.map(o => o.householdName).join(', ')}</strong>
            </Callout>
          )}

          {!isExistingGame && bggId && (
            <Callout intent={Intent.SUCCESS} icon="tick-circle" className="step-callout">
              Pre-filled from BoardGameGeek
            </Callout>
          )}

          <div className="game-preview-header">
            <div className="game-image">
              {imageUrl ? (
                <img src={imageUrl} alt={name} />
              ) : (
                <div className="image-placeholder">
                  <Icon icon="cube" size={40} />
                </div>
              )}
            </div>
            <div className="game-title-info">
              <h3>{name}</h3>
              {yearPublished && <span className="year">({yearPublished})</span>}
              <div className="game-tags">
                <Tag minimal icon="people">
                  {minPlayers}-{maxPlayers} players
                </Tag>
                {playTimeMinutes && (
                  <Tag minimal icon="time">
                    {playTimeMinutes} min
                  </Tag>
                )}
              </div>
            </div>
          </div>

          {!isExistingGame && (
            <div className="editable-fields">
              <FormGroup label="Game Name" labelInfo="(required)">
                <InputGroup
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Settlers of Catan"
                />
              </FormGroup>

              <FormGroup label="Description">
                <TextArea
                  fill
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={3}
                />
              </FormGroup>

              <div className="form-row">
                <FormGroup label="Min Players">
                  <NumericInput min={1} max={99} value={minPlayers} onValueChange={setMinPlayers} fill />
                </FormGroup>
                <FormGroup label="Max Players">
                  <NumericInput min={1} max={99} value={maxPlayers} onValueChange={setMaxPlayers} fill />
                </FormGroup>
                <FormGroup label="Play Time (min)">
                  <NumericInput
                    min={1}
                    value={playTimeMinutes ?? ''}
                    onValueChange={(val) => setPlayTimeMinutes(val > 0 ? val : undefined)}
                    fill
                  />
                </FormGroup>
              </div>

              <FormGroup label="Categories">
                <TagInput
                  values={categories}
                  onChange={(values) => setCategories(values as string[])}
                  placeholder="Add categories..."
                  addOnBlur
                  addOnPaste
                />
              </FormGroup>
            </div>
          )}

          {isExistingGame && availableHouseholds.length === 0 && (
            <Callout intent={Intent.WARNING} className="step-callout">
              All households already own this game.
            </Callout>
          )}
        </>
      )}
    </div>
  );

  // Household step
  const renderHouseholdStep = () => (
    <div className="step-panel household-step">
      {error && (
        <Callout intent={Intent.DANGER} className="step-callout">
          {error}
        </Callout>
      )}

      <div className="game-summary">
        <div className="game-image small">
          {imageUrl ? (
            <img src={imageUrl} alt={name} />
          ) : (
            <div className="image-placeholder">
              <Icon icon="cube" size={24} />
            </div>
          )}
        </div>
        <div className="game-name">{name}</div>
      </div>

      <FormGroup label="Which household owns this game?" labelInfo="(required)">
        <HTMLSelect
          value={selectedHouseholdId}
          onChange={(e) => setSelectedHouseholdId(e.target.value)}
          fill
          large
        >
          <option value="">Select a household...</option>
          {availableHouseholds.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} {h.id === userHouseholdId ? '(yours)' : ''}
            </option>
          ))}
        </HTMLSelect>
      </FormGroup>

      <FormGroup label="Notes about your copy (optional)">
        <TextArea
          fill
          placeholder="Condition, expansions included, missing pieces, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </FormGroup>
    </div>
  );

  // Footer
  const renderFooter = () => {
    const isFirstStep = currentStep === 'search';
    const isLastStep = currentStep === 'household';

    return (
      <div className="dialog-custom-footer">
        <div className="footer-left-spacer" />
        <div className="footer-content">
          <Button onClick={onClose}>Close</Button>
          <div className="footer-right">
            {!isFirstStep && (
              <Button
                onClick={() => {
                  if (currentStep === 'details') goToStep('search');
                  else if (currentStep === 'household') goToStep('details');
                }}
              >
                Back
              </Button>
            )}
            {currentStep === 'search' && (
              <Button
                intent={Intent.PRIMARY}
                disabled={!canProceedFromSearch}
                onClick={() => goToStep('details')}
              >
                Continue
              </Button>
            )}
            {currentStep === 'details' && (
              <Button
                intent={Intent.PRIMARY}
                disabled={!canProceedFromDetails}
                onClick={() => goToStep('household')}
              >
                Continue
              </Button>
            )}
            {isLastStep && (
              <Button
                intent={Intent.PRIMARY}
                icon="add"
                loading={submitting}
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                Add to Library
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Game"
      className="add-game-dialog"
    >
      <div className={Classes.DIALOG_BODY}>
        <div className="dialog-panels">
          {renderStepNav()}
          <div className="dialog-right-panel">
            {currentStep === 'search' && renderSearchStep()}
            {currentStep === 'details' && renderDetailsStep()}
            {currentStep === 'household' && renderHouseholdStep()}
          </div>
        </div>
      </div>
      {renderFooter()}
    </Dialog>
  );
};
