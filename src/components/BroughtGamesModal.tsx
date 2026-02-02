import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, Button, InputGroup, Icon, Checkbox } from '@blueprintjs/core';
import type { OwnedGame, Household } from '../types';
import type { BroughtGame } from '../context/GameNightContext';

interface BroughtGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: OwnedGame[];
  households: Household[];
  hostHouseholdId: string;
  existingBroughtGames: BroughtGame[];
  onAddGames: (games: BroughtGame[]) => void;
}

export const BroughtGamesModal: React.FC<BroughtGamesModalProps> = ({
  isOpen,
  onClose,
  games,
  households,
  hostHouseholdId,
  existingBroughtGames,
  onAddGames,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());

  // Filter games to only show those from non-host households
  const availableGames = useMemo(() => {
    const existingIds = new Set(existingBroughtGames.map(bg => bg.game.id));

    return games.filter((game) => {
      // Exclude games from host household
      if (game.ownership.householdId === hostHouseholdId) return false;
      // Exclude already added games
      if (existingIds.has(game.id)) return false;
      // Filter by search query
      if (searchQuery) {
        return game.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [games, hostHouseholdId, existingBroughtGames, searchQuery]);

  // Group games by household
  const gamesByHousehold = useMemo(() => {
    const grouped = new Map<string, OwnedGame[]>();

    availableGames.forEach((game) => {
      const householdId = game.ownership.householdId;
      if (!grouped.has(householdId)) {
        grouped.set(householdId, []);
      }
      grouped.get(householdId)!.push(game);
    });

    return grouped;
  }, [availableGames]);

  const getHouseholdName = useCallback((householdId: string): string => {
    const household = households.find(h => h.id === householdId);
    return household?.name || 'Unknown Household';
  }, [households]);

  const handleToggleGame = useCallback((gameId: string) => {
    setSelectedGameIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  }, []);

  const handleAddSelected = useCallback(() => {
    const selectedGames: BroughtGame[] = [];

    selectedGameIds.forEach((gameId) => {
      const game = games.find(g => g.id === gameId);
      if (game) {
        selectedGames.push({
          game,
          fromHouseholdId: game.ownership.householdId,
          fromHouseholdName: game.ownership.householdName || getHouseholdName(game.ownership.householdId),
        });
      }
    });

    if (selectedGames.length > 0) {
      onAddGames(selectedGames);
    }

    setSelectedGameIds(new Set());
    setSearchQuery('');
    onClose();
  }, [selectedGameIds, games, getHouseholdName, onAddGames, onClose]);

  const handleClose = useCallback(() => {
    setSelectedGameIds(new Set());
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const getPlayerRange = (game: OwnedGame): string => {
    return game.minPlayers === game.maxPlayers
      ? `${game.minPlayers} players`
      : `${game.minPlayers}-${game.maxPlayers} players`;
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      className="brought-games-modal"
      canOutsideClickClose
    >
      <div className="modal-header">
        <h2>Add Brought Games</h2>
        <button className="modal-close" onClick={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="modal-body">
        <div className="game-search">
          <Icon icon="search" />
          <InputGroup
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="brought-games-list-modal">
          {Array.from(gamesByHousehold.entries()).map(([householdId, householdGames]) => (
            <div key={householdId} className="household-game-group">
              <div className="household-group-header">
                <Icon icon="home" size={14} />
                <span>{getHouseholdName(householdId)}</span>
              </div>
              <div className="household-games">
                {householdGames.map((game) => (
                  <div
                    key={game.id}
                    className={`game-select-row ${selectedGameIds.has(game.id) ? 'selected' : ''}`}
                    onClick={() => handleToggleGame(game.id)}
                  >
                    <Checkbox
                      checked={selectedGameIds.has(game.id)}
                      onChange={() => handleToggleGame(game.id)}
                    />
                    <div className="game-info">
                      <span className="game-name">{game.name}</span>
                      <span className="game-meta">{getPlayerRange(game)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {gamesByHousehold.size === 0 && (
            <div className="no-games-message">
              {searchQuery
                ? 'No games match your search'
                : 'No games available from other households'}
            </div>
          )}
        </div>
      </div>

      <div className="modal-footer">
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          intent="warning"
          onClick={handleAddSelected}
          disabled={selectedGameIds.size === 0}
        >
          Add {selectedGameIds.size > 0 ? `${selectedGameIds.size} ` : ''}Game{selectedGameIds.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </Dialog>
  );
};
