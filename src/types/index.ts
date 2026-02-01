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
  householdName?: string; // Looked up from household
  householdColor?: EntityColorId; // Looked up from household
  userId?: string; // Optional: specific owner within household (if omitted, household owns mutually)
  addedBy: string; // User who added to this household
  addedAt: Date;
  notes?: string; // "Missing 2 pieces", "Has expansion"
}

// Composite type for UI - game with ownership info
export interface OwnedGame extends Game {
  ownership: Ownership; // The specific ownership record
  ownerCount?: number; // How many households own this
}

// Brand colors for households and guilds
export const ENTITY_COLORS = [
  { id: 'navy', hex: '#1e3a5f', label: 'Navy' },
  { id: 'emerald', hex: '#059669', label: 'Emerald' },
  { id: 'amber', hex: '#d97706', label: 'Amber' },
  { id: 'violet', hex: '#7c3aed', label: 'Violet' },
  { id: 'rose', hex: '#e11d48', label: 'Rose' },
  { id: 'cyan', hex: '#0891b2', label: 'Cyan' },
  { id: 'slate', hex: '#475569', label: 'Slate' },
  { id: 'gold', hex: '#ca8a04', label: 'Gold' },
] as const;

export type EntityColorId = typeof ENTITY_COLORS[number]['id'];

// Helper to get hex color from color ID
export const getEntityColorHex = (colorId?: EntityColorId): string => {
  const color = ENTITY_COLORS.find(c => c.id === colorId);
  return color?.hex || ENTITY_COLORS[0].hex; // Default to navy
};

export interface Guild {
  id: string;
  name: string;
  members: string[];         // User IDs
  createdBy: string;         // Owner
  createdAt: Date;
  inviteCode: string;
  color?: EntityColorId;     // Avatar color
}

export interface Household {
  id: string;
  name: string;
  members: string[];         // User IDs
  owner?: string;            // User ID of owner (new field)
  createdBy?: string;        // User ID of owner (legacy field)
  createdAt: Date;
  inviteCode?: string;
  color?: EntityColorId;     // Avatar color
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  householdId?: string;      // Legacy: single household
  householdIds?: string[];   // New: multiple households
  activeGuildId?: string;    // Currently selected guild
  profileComplete?: boolean;
  createdAt: Date;
}

export type PlayTimeFilter = 'any' | 'short' | 'medium' | 'long';

export interface GameFilters {
  searchQuery: string;
  playerCount?: number;
  householdIds?: string[];
  categories?: string[];
  playTime?: PlayTimeFilter;
  favoritesOnly?: boolean;
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

// User preferences for games (like/dislike/favorite)
export interface UserGamePreference {
  id: string;
  userId: string;           // Firebase auth UID
  gameId: string;           // Reference to games collection
  reaction: 'like' | 'dislike' | null;  // Mutually exclusive
  isFavorite: boolean;      // Can favorite a liked game
  updatedAt: Date;
}

// Stats for a game's preferences
export interface GamePreferenceStats {
  likes: number;
  dislikes: number;
  favorites: number;
}
