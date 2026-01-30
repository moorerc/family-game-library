export interface Game {
  id: string;
  name: string;
  description?: string;
  minPlayers: number;
  maxPlayers: number;
  playTimeMinutes?: number;
  yearPublished?: number;
  bggId?: string; // BoardGameGeek ID for potential API integration
  imageUrl?: string;
  householdId: string;
  householdName: string;
  addedBy: string;
  addedAt: Date;
  categories?: string[];
  mechanics?: string[];
  notes?: string;
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
