import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Game, GameFilters } from '../types';

const GAMES_COLLECTION = 'games';

export const gamesService = {
  // Get all games (for the shared family library)
  async getAllGames(): Promise<Game[]> {
    const gamesRef = collection(db, GAMES_COLLECTION);
    const q = query(gamesRef, orderBy('name'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    })) as Game[];
  },

  // Get games by household
  async getGamesByHousehold(householdId: string): Promise<Game[]> {
    const gamesRef = collection(db, GAMES_COLLECTION);
    const q = query(
      gamesRef,
      where('householdId', '==', householdId),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    })) as Game[];
  },

  // Add a new game
  async addGame(game: Omit<Game, 'id'>): Promise<string> {
    const gamesRef = collection(db, GAMES_COLLECTION);
    const docRef = await addDoc(gamesRef, {
      ...game,
      addedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // Update a game
  async updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    await updateDoc(gameRef, updates);
  },

  // Delete a game
  async deleteGame(gameId: string): Promise<void> {
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    await deleteDoc(gameRef);
  },

  // Filter games locally (for client-side filtering)
  filterGames(games: Game[], filters: GameFilters): Game[] {
    return games.filter((game) => {
      // Search query filter
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase();
        const matchesName = game.name.toLowerCase().includes(search);
        const matchesDescription = game.description?.toLowerCase().includes(search);
        if (!matchesName && !matchesDescription) return false;
      }

      // Player count filter
      if (filters.playerCount) {
        if (
          filters.playerCount < game.minPlayers ||
          filters.playerCount > game.maxPlayers
        ) {
          return false;
        }
      }

      // Household filter
      if (filters.householdId && game.householdId !== filters.householdId) {
        return false;
      }

      // Categories filter
      if (filters.categories && filters.categories.length > 0) {
        const hasCategory = filters.categories.some((cat) =>
          game.categories?.includes(cat)
        );
        if (!hasCategory) return false;
      }

      // Play time filter
      if (filters.maxPlayTime && game.playTimeMinutes) {
        if (game.playTimeMinutes > filters.maxPlayTime) {
          return false;
        }
      }

      return true;
    });
  },

  // Get all unique categories from games
  getUniqueCategories(games: Game[]): string[] {
    const categories = new Set<string>();
    games.forEach((game) => {
      game.categories?.forEach((cat) => categories.add(cat));
    });
    return Array.from(categories).sort();
  },
};
