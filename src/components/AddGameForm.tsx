import React, { useState } from 'react';
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
import type { Game } from '../types';

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
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    setSuccess(false);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        minPlayers,
        maxPlayers,
        playTimeMinutes,
        yearPublished,
        imageUrl: imageUrl.trim() || undefined,
        bggId: bggId.trim() || undefined,
        householdId,
        householdName,
        addedBy: currentUser.uid,
        addedAt: new Date(),
        categories: categories.length > 0 ? categories : undefined,
        notes: notes.trim() || undefined,
      });

      setSuccess(true);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-game-form">
      {error && (
        <Callout intent={Intent.DANGER} className="form-callout">
          {error}
        </Callout>
      )}

      {success && (
        <Callout intent={Intent.SUCCESS} className="form-callout">
          Game added successfully! Add another or return to the library.
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
  );
};
