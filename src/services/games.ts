import {
  collection,
  doc,
  getDoc,
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
import type { Game, GameFilters, OwnedGame } from '../types';

const GAMES_COLLECTION = 'games';

export const gamesService = {
  // Get all canonical games
  async getAllGames(): Promise<Game[]> {
    const gamesRef = collection(db, GAMES_COLLECTION);
    const q = query(gamesRef, orderBy('name'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Game[];
  },

  // Get a single game by ID
  async getGameById(gameId: string): Promise<Game | null> {
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    const snapshot = await getDoc(gameRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate() || new Date(),
    } as Game;
  },

  // Get multiple games by IDs
  async getGamesByIds(gameIds: string[]): Promise<Game[]> {
    if (gameIds.length === 0) return [];

    const games: Game[] = [];
    // Firestore 'in' query supports max 30 items, so batch if needed
    const batches = [];
    for (let i = 0; i < gameIds.length; i += 30) {
      batches.push(gameIds.slice(i, i + 30));
    }

    for (const batch of batches) {
      const gamesRef = collection(db, GAMES_COLLECTION);
      const q = query(gamesRef, where('__name__', 'in', batch));
      const snapshot = await getDocs(q);

      snapshot.docs.forEach((doc) => {
        games.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as Game);
      });
    }

    return games;
  },

  // Find game by BGG ID (for deduplication)
  async findGameByBggId(bggId: string): Promise<Game | null> {
    const gamesRef = collection(db, GAMES_COLLECTION);
    const q = query(gamesRef, where('bggId', '==', bggId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Game;
  },

  // Get or create a game - returns existing game if bggId matches, otherwise creates new
  async getOrCreateGame(gameData: Omit<Game, 'id'>): Promise<{ game: Game; created: boolean }> {
    // If bggId provided, check for existing game
    if (gameData.bggId) {
      const existing = await this.findGameByBggId(gameData.bggId);
      if (existing) {
        return { game: existing, created: false };
      }
    }

    // Create new game
    const gamesRef = collection(db, GAMES_COLLECTION);
    const docRef = await addDoc(gamesRef, {
      ...gameData,
      createdAt: Timestamp.now(),
    });

    return {
      game: {
        ...gameData,
        id: docRef.id,
        createdAt: new Date(),
      },
      created: true,
    };
  },

  // Add a new game (direct creation without dedup check)
  async addGame(game: Omit<Game, 'id'>): Promise<string> {
    const gamesRef = collection(db, GAMES_COLLECTION);
    const docRef = await addDoc(gamesRef, {
      ...game,
      createdAt: Timestamp.now(),
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

  // Filter owned games locally (for client-side filtering)
  filterGames(games: OwnedGame[], filters: GameFilters): OwnedGame[] {
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
      if (filters.householdId && game.ownership.householdId !== filters.householdId) {
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
