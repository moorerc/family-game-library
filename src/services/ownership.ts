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
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { gamesService } from './games';
import type { Ownership, OwnedGame } from '../types';

const OWNERSHIP_COLLECTION = 'ownership';

export const ownershipService = {
  // Add ownership record linking a game to a household
  async addOwnership(
    gameId: string,
    householdId: string,
    householdName: string,
    addedBy: string,
    notes?: string
  ): Promise<string> {
    const ownershipRef = collection(db, OWNERSHIP_COLLECTION);

    const ownershipData: Omit<Ownership, 'id'> = {
      gameId,
      householdId,
      householdName,
      addedBy,
      addedAt: new Date(),
    };

    if (notes) {
      ownershipData.notes = notes;
    }

    const docRef = await addDoc(ownershipRef, {
      ...ownershipData,
      addedAt: Timestamp.now(),
    });

    return docRef.id;
  },

  // Get a single ownership record by ID
  async getOwnershipById(ownershipId: string): Promise<Ownership | null> {
    const ownershipRef = doc(db, OWNERSHIP_COLLECTION, ownershipId);
    const snapshot = await getDoc(ownershipRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
      addedAt: snapshot.data().addedAt?.toDate() || new Date(),
    } as Ownership;
  },

  // Get all ownerships for a specific household
  async getOwnershipsByHousehold(householdId: string): Promise<Ownership[]> {
    const ownershipRef = collection(db, OWNERSHIP_COLLECTION);
    const q = query(ownershipRef, where('householdId', '==', householdId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    })) as Ownership[];
  },

  // Get all ownerships for a specific game (all households that own it)
  async getOwnershipsByGame(gameId: string): Promise<Ownership[]> {
    const ownershipRef = collection(db, OWNERSHIP_COLLECTION);
    const q = query(ownershipRef, where('gameId', '==', gameId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    })) as Ownership[];
  },

  // Get all ownership records
  async getAllOwnerships(): Promise<Ownership[]> {
    const ownershipRef = collection(db, OWNERSHIP_COLLECTION);
    const snapshot = await getDocs(ownershipRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    })) as Ownership[];
  },

  // Update an ownership record
  async updateOwnership(
    ownershipId: string,
    updates: Partial<Pick<Ownership, 'notes' | 'householdName'>>
  ): Promise<void> {
    const ownershipRef = doc(db, OWNERSHIP_COLLECTION, ownershipId);
    await updateDoc(ownershipRef, updates);
  },

  // Delete an ownership record
  async deleteOwnership(ownershipId: string): Promise<void> {
    const ownershipRef = doc(db, OWNERSHIP_COLLECTION, ownershipId);
    await deleteDoc(ownershipRef);
  },

  // Check if a household already owns a specific game
  async householdOwnsGame(gameId: string, householdId: string): Promise<Ownership | null> {
    const ownershipRef = collection(db, OWNERSHIP_COLLECTION);
    const q = query(
      ownershipRef,
      where('gameId', '==', gameId),
      where('householdId', '==', householdId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    } as Ownership;
  },

  // Get owned games for display - joins games with their ownership records
  // Returns OwnedGame[] with game data + ownership info + owner count
  async getOwnedGames(): Promise<OwnedGame[]> {
    const ownerships = await this.getAllOwnerships();

    if (ownerships.length === 0) {
      return [];
    }

    // Get unique game IDs
    const gameIds = [...new Set(ownerships.map((o) => o.gameId))];

    // Fetch all referenced games
    const games = await gamesService.getGamesByIds(gameIds);
    const gamesMap = new Map(games.map((g) => [g.id, g]));

    // Count ownerships per game
    const ownerCountMap = new Map<string, number>();
    ownerships.forEach((o) => {
      ownerCountMap.set(o.gameId, (ownerCountMap.get(o.gameId) || 0) + 1);
    });

    // Join data - create one OwnedGame per ownership record
    const ownedGames: OwnedGame[] = [];
    for (const ownership of ownerships) {
      const game = gamesMap.get(ownership.gameId);
      if (game) {
        ownedGames.push({
          ...game,
          ownership,
          ownerCount: ownerCountMap.get(ownership.gameId) || 1,
        });
      }
    }

    // Sort by game name
    ownedGames.sort((a, b) => a.name.localeCompare(b.name));

    return ownedGames;
  },

  // Get owned games for a specific household
  async getOwnedGamesByHousehold(householdId: string): Promise<OwnedGame[]> {
    // Fetch ownership records for this household
    const ownerships = await this.getOwnershipsByHousehold(householdId);

    if (ownerships.length === 0) {
      return [];
    }

    // Get unique game IDs
    const gameIds = [...new Set(ownerships.map((o) => o.gameId))];

    // Fetch all referenced games
    const games = await gamesService.getGamesByIds(gameIds);
    const gamesMap = new Map(games.map((g) => [g.id, g]));

    // Get owner counts for these games (need all ownerships)
    const allOwnerships = await this.getAllOwnerships();
    const ownerCountMap = new Map<string, number>();
    allOwnerships.forEach((o) => {
      if (gameIds.includes(o.gameId)) {
        ownerCountMap.set(o.gameId, (ownerCountMap.get(o.gameId) || 0) + 1);
      }
    });

    // Join data
    const ownedGames: OwnedGame[] = [];
    for (const ownership of ownerships) {
      const game = gamesMap.get(ownership.gameId);
      if (game) {
        ownedGames.push({
          ...game,
          ownership,
          ownerCount: ownerCountMap.get(ownership.gameId) || 1,
        });
      }
    }

    // Sort by game name
    ownedGames.sort((a, b) => a.name.localeCompare(b.name));

    return ownedGames;
  },
};
