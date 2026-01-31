// Canonical game data - one document per unique game
export interface Game {
  id: string;
  name: string;
  description?: string;
  minPlayers: number;
  maxPlayers: number;
  playTimeMinutes?: number;
  yearPublished?: number;
  bggId?: string; // BoardGameGeek ID - used for deduplication
  imageUrl?: string;
  categories?: string[];
  mechanics?: string[];
  createdBy: string; // User who first added this game
  createdAt: Date;
}

// Links games to households with household-specific data
export interface Ownership {
  id: string;
  gameId: string; // Reference to games collection
  householdId: string;
  householdName: string; // Denormalized for display
  addedBy: string; // User who added to this household
  addedAt: Date;
  notes?: string; // "Missing 2 pieces", "Has expansion"
}

// Composite type for UI - game with ownership info
export interface OwnedGame extends Game {
  ownership: Ownership; // The specific ownership record
  ownerCount?: number; // How many households own this
}

export interface Household {
  id: string;
  name: string;
  members: string[]; // Array of user IDs
  createdBy: string;
  createdAt: Date;
  inviteCode?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  householdId?: string;
  createdAt: Date;
}

export interface GameFilters {
  searchQuery: string;
  playerCount?: number;
  householdId?: string;
  categories?: string[];
  maxPlayTime?: number;
}

export type SortOption = 'name' | 'recentlyAdded' | 'playerCount' | 'household';

// BoardGameGeek API types
export interface BGGSearchResult {
  bggId: string;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
}

export interface BGGGameDetails {
  bggId: string;
  name: string;
  description: string;
  minPlayers?: number;
  maxPlayers?: number;
  playTimeMinutes?: number;
  yearPublished?: number;
  imageUrl?: string;
  categories: string[];
}
