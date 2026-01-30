import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FormGroup,
  InputGroup,
  TextArea,
  NumericInput,
  Button,
  Intent,
  Callout,
  TagInput,
} from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { useBGGSearch } from '../hooks/useBGGSearch';
import { BGGSearchPanel } from './BGGSearchPanel';
import type { Game, BGGGameDetails } from '../types';

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

interface AddGameFormProps {
  onSubmit: (game: Omit<Game, 'id'>) => Promise<void>;
  householdId: string;
  householdName: string;
}

export const AddGameForm: React.FC<AddGameFormProps> = ({
  onSubmit,
  householdId,
  householdName,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [populatedFromBGG, setPopulatedFromBGG] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [playTimeMinutes, setPlayTimeMinutes] = useState<number | undefined>();
  const [yearPublished, setYearPublished] = useState<number | undefined>();
  const [imageUrl, setImageUrl] = useState('');
  const [bggId, setBggId] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const bggSearch = useBGGSearch();

  // Populate form when a game is selected from BGG search
  const populateFromBGG = (game: BGGGameDetails) => {
    setName(game.name);
    setDescription(stripHtml(game.description));
    if (game.minPlayers) setMinPlayers(game.minPlayers);
    if (game.maxPlayers) setMaxPlayers(game.maxPlayers);
    setPlayTimeMinutes(game.playTimeMinutes);
    setYearPublished(game.yearPublished);
    setImageUrl(game.imageUrl || '');
    setBggId(game.bggId);
    setCategories(game.categories);
    setPopulatedFromBGG(true);
    bggSearch.clearSelection();
  };

  // Handle BGG game selection
  useEffect(() => {
    if (bggSearch.selectedGame) {
      populateFromBGG(bggSearch.selectedGame);
    }
  }, [bggSearch.selectedGame]);

  const clearBGGData = () => {
    setPopulatedFromBGG(false);
    resetForm();
  };

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
    setNotes('');
    setPopulatedFromBGG(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to add a game');
      return;
    }

    if (!name.trim()) {
      setError('Game name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build game object, omitting undefined fields (Firestore doesn't accept undefined)
      const gameData: Omit<Game, 'id'> = {
        name: name.trim(),
        minPlayers,
        maxPlayers,
        householdId,
        householdName,
        addedBy: currentUser.uid,
        addedAt: new Date(),
      };

      // Only add optional fields if they have values
      if (description.trim()) gameData.description = description.trim();
      if (playTimeMinutes) gameData.playTimeMinutes = playTimeMinutes;
      if (yearPublished) gameData.yearPublished = yearPublished;
      if (imageUrl.trim()) gameData.imageUrl = imageUrl.trim();
      if (bggId.trim()) gameData.bggId = bggId.trim();
      if (categories.length > 0) gameData.categories = categories;
      if (notes.trim()) gameData.notes = notes.trim();

      await onSubmit(gameData);

      // Navigate back to library on success
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add game');
      setLoading(false);
    }
  };

  return (
    <div className="add-game-container">
      <BGGSearchPanel
        onGameSelect={populateFromBGG}
        searchResults={bggSearch.searchResults}
        searching={bggSearch.searching}
        loadingDetails={bggSearch.loadingDetails}
        error={bggSearch.error}
        onSearch={bggSearch.search}
        onSelectResult={bggSearch.selectGame}
        onClearResults={bggSearch.clearResults}
      />

      <form onSubmit={handleSubmit} className="add-game-form">
        {error && (
          <Callout intent={Intent.DANGER} className="form-callout">
            {error}
          </Callout>
        )}

        {populatedFromBGG && (
          <Callout intent={Intent.PRIMARY} className="form-callout bgg-populated-callout">
            <div className="bgg-populated-content">
              <span>Form populated from BoardGameGeek. You can edit any field before submitting.</span>
              <Button
                minimal
                small
                icon="cross"
                onClick={clearBGGData}
                aria-label="Clear BGG data"
              />
            </div>
          </Callout>
        )}

        <FormGroup label="Game Name" labelInfo="(required)" labelFor="game-name">
          <InputGroup
            id="game-name"
            large
            placeholder="e.g., Settlers of Catan"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Description" labelFor="game-description">
          <TextArea
            id="game-description"
            fill
            placeholder="Brief description of the game..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </FormGroup>

        <div className="form-row">
          <FormGroup label="Min Players" labelFor="min-players">
            <NumericInput
              id="min-players"
              min={1}
              max={99}
              value={minPlayers}
              onValueChange={(val) => setMinPlayers(val)}
            />
          </FormGroup>

          <FormGroup label="Max Players" labelFor="max-players">
            <NumericInput
              id="max-players"
              min={1}
              max={99}
              value={maxPlayers}
              onValueChange={(val) => setMaxPlayers(val)}
            />
          </FormGroup>

          <FormGroup label="Play Time (min)" labelFor="play-time">
            <NumericInput
              id="play-time"
              min={1}
              placeholder="Optional"
              value={playTimeMinutes ?? ''}
              onValueChange={(val) =>
                setPlayTimeMinutes(val > 0 ? val : undefined)
              }
            />
          </FormGroup>

          <FormGroup label="Year Published" labelFor="year-published">
            <NumericInput
              id="year-published"
              min={1900}
              max={new Date().getFullYear()}
              placeholder="Optional"
              value={yearPublished ?? ''}
              onValueChange={(val) =>
                setYearPublished(val > 0 ? val : undefined)
              }
            />
          </FormGroup>
        </div>

        <FormGroup label="Categories">
          <TagInput
            values={categories}
            onChange={(values) => setCategories(values as string[])}
            placeholder="Add categories (press Enter)"
            addOnBlur
            addOnPaste
          />
        </FormGroup>

        <FormGroup
          label="Image URL"
          labelFor="image-url"
          helperText="Link to a game box image"
        >
          <InputGroup
            id="image-url"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </FormGroup>

        <FormGroup
          label="BoardGameGeek ID"
          labelFor="bgg-id"
          helperText="Optional - link to the game on BoardGameGeek"
        >
          <InputGroup
            id="bgg-id"
            placeholder="e.g., 13"
            value={bggId}
            onChange={(e) => setBggId(e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Notes" labelFor="notes">
          <TextArea
            id="notes"
            fill
            placeholder="Any notes about your copy (condition, expansions included, etc.)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </FormGroup>

      <div className="form-actions">
          <Button
            type="submit"
            intent={Intent.PRIMARY}
            large
            loading={loading}
            icon="add"
          >
            Add to Library
          </Button>
        </div>
      </form>
    </div>
  );
};
