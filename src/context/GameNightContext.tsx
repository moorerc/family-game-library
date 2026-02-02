import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { OwnedGame } from '../types';

// Guest color options matching the design
export type GuestColor = 'purple' | 'blue' | 'green' | 'yellow' | 'pink' | 'orange';

export const GUEST_COLORS: { id: GuestColor; hex: string; label: string }[] = [
  { id: 'purple', hex: '#8b5cf6', label: 'Purple' },
  { id: 'blue', hex: '#1e3a5f', label: 'Blue' },
  { id: 'green', hex: '#16a34a', label: 'Green' },
  { id: 'yellow', hex: '#ffcc00', label: 'Yellow' },
  { id: 'pink', hex: '#db2777', label: 'Pink' },
  { id: 'orange', hex: '#ea580c', label: 'Orange' },
];

export const getGuestColorHex = (colorId: GuestColor): string => {
  const color = GUEST_COLORS.find(c => c.id === colorId);
  return color?.hex || GUEST_COLORS[0].hex;
};

export interface SelectedPlayer {
  id: string;
  displayName: string;
  email: string;
  householdId?: string;
  householdName?: string;
}

export interface Guest {
  id: string;
  name: string;
  color: GuestColor;
}

export interface BroughtGame {
  game: OwnedGame;
  fromHouseholdId: string;
  fromHouseholdName: string;
}

export interface GameNightSession {
  hostId: string;
  hostHouseholdId: string;
  hostHouseholdName: string;
  players: SelectedPlayer[];
  guests: Guest[];
  broughtGames: BroughtGame[];
  currentlyPlaying: OwnedGame | null;
}

interface GameNightContextType {
  // Session state
  session: GameNightSession | null;
  isActive: boolean;

  // Draft state (before session is started)
  selectedPlayers: SelectedPlayer[];
  guests: Guest[];
  hostHouseholdId: string | null;
  hostHouseholdName: string | null;
  broughtGames: BroughtGame[];

  // Player actions
  addPlayer: (player: SelectedPlayer) => void;
  removePlayer: (playerId: string) => void;
  togglePlayer: (player: SelectedPlayer) => void;
  isPlayerSelected: (playerId: string) => boolean;

  // Guest actions
  addGuest: (name: string, color: GuestColor) => void;
  removeGuest: (guestId: string) => void;

  // Household actions
  setHostHousehold: (householdId: string, householdName: string) => void;

  // Brought games actions
  addBroughtGame: (broughtGame: BroughtGame) => void;
  removeBroughtGame: (gameId: string) => void;

  // Session actions
  startSession: (hostId: string) => void;
  setCurrentlyPlaying: (game: OwnedGame | null) => void;
  endSession: () => void;
  resetDraft: () => void;

  // Computed
  totalPlayerCount: number;
}

const GameNightContext = createContext<GameNightContextType | undefined>(undefined);

export const useGameNight = (): GameNightContextType => {
  const context = useContext(GameNightContext);
  if (!context) {
    throw new Error('useGameNight must be used within a GameNightProvider');
  }
  return context;
};

interface GameNightProviderProps {
  children: React.ReactNode;
}

export const GameNightProvider: React.FC<GameNightProviderProps> = ({ children }) => {
  // Active session state
  const [session, setSession] = useState<GameNightSession | null>(null);

  // Draft state (used during setup flow)
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [hostHouseholdId, setHostHouseholdId] = useState<string | null>(null);
  const [hostHouseholdName, setHostHouseholdName] = useState<string | null>(null);
  const [broughtGames, setBroughtGames] = useState<BroughtGame[]>([]);

  // Player actions
  const addPlayer = useCallback((player: SelectedPlayer) => {
    setSelectedPlayers(prev => {
      if (prev.some(p => p.id === player.id)) return prev;
      return [...prev, player];
    });
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  }, []);

  const togglePlayer = useCallback((player: SelectedPlayer) => {
    setSelectedPlayers(prev => {
      const exists = prev.some(p => p.id === player.id);
      if (exists) {
        return prev.filter(p => p.id !== player.id);
      }
      return [...prev, player];
    });
  }, []);

  const isPlayerSelected = useCallback((playerId: string) => {
    return selectedPlayers.some(p => p.id === playerId);
  }, [selectedPlayers]);

  // Guest actions
  const addGuest = useCallback((name: string, color: GuestColor) => {
    const newGuest: Guest = {
      id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name,
      color,
    };
    setGuests(prev => [...prev, newGuest]);
  }, []);

  const removeGuest = useCallback((guestId: string) => {
    setGuests(prev => prev.filter(g => g.id !== guestId));
  }, []);

  // Household actions
  const setHostHousehold = useCallback((householdId: string, householdName: string) => {
    setHostHouseholdId(householdId);
    setHostHouseholdName(householdName);
    // Remove any brought games from this household since it's now the host
    setBroughtGames(prev => prev.filter(bg => bg.fromHouseholdId !== householdId));
  }, []);

  // Brought games actions
  const addBroughtGame = useCallback((broughtGame: BroughtGame) => {
    setBroughtGames(prev => {
      if (prev.some(bg => bg.game.id === broughtGame.game.id)) return prev;
      return [...prev, broughtGame];
    });
  }, []);

  const removeBroughtGame = useCallback((gameId: string) => {
    setBroughtGames(prev => prev.filter(bg => bg.game.id !== gameId));
  }, []);

  // Session actions
  const startSession = useCallback((hostId: string) => {
    if (!hostHouseholdId || !hostHouseholdName) {
      console.error('Cannot start session without a host household');
      return;
    }

    setSession({
      hostId,
      hostHouseholdId,
      hostHouseholdName,
      players: [...selectedPlayers],
      guests: [...guests],
      broughtGames: [...broughtGames],
      currentlyPlaying: null,
    });
  }, [hostHouseholdId, hostHouseholdName, selectedPlayers, guests, broughtGames]);

  const setCurrentlyPlaying = useCallback((game: OwnedGame | null) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, currentlyPlaying: game };
    });
  }, []);

  const endSession = useCallback(() => {
    setSession(null);
    // Reset draft state too
    setSelectedPlayers([]);
    setGuests([]);
    setHostHouseholdId(null);
    setHostHouseholdName(null);
    setBroughtGames([]);
  }, []);

  const resetDraft = useCallback(() => {
    setSelectedPlayers([]);
    setGuests([]);
    setHostHouseholdId(null);
    setHostHouseholdName(null);
    setBroughtGames([]);
  }, []);

  // Computed values
  const isActive = session !== null;

  const totalPlayerCount = useMemo(() => {
    if (session) {
      return session.players.length + session.guests.length;
    }
    return selectedPlayers.length + guests.length;
  }, [session, selectedPlayers, guests]);

  const value: GameNightContextType = {
    session,
    isActive,
    selectedPlayers,
    guests,
    hostHouseholdId,
    hostHouseholdName,
    broughtGames,
    addPlayer,
    removePlayer,
    togglePlayer,
    isPlayerSelected,
    addGuest,
    removeGuest,
    setHostHousehold,
    addBroughtGame,
    removeBroughtGame,
    startSession,
    setCurrentlyPlaying,
    endSession,
    resetDraft,
    totalPlayerCount,
  };

  return (
    <GameNightContext.Provider value={value}>
      {children}
    </GameNightContext.Provider>
  );
};
