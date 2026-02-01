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
import type { Ownership, OwnedGame, EntityColorId } from '../types';

const OWNERSHIP_COLLECTION = 'ownership';

interface HouseholdInfo {
  name: string;
  color?: EntityColorId;
}

export const ownershipService = {
  // Helper to fetch household info (name and color) for a set of household IDs
  async getHouseholdInfo(householdIds: string[]): Promise<Map<string, HouseholdInfo>> {
    const infoMap = new Map<string, HouseholdInfo>();
    const uniqueIds = [...new Set(householdIds)];

    for (const id of uniqueIds) {
      const householdRef = doc(db, 'households', id);
      const snapshot = await getDoc(householdRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        infoMap.set(id, {
          name: data.name || 'Unknown',
          color: data.color,
        });
      } else {
        infoMap.set(id, { name: 'Unknown' });
      }
    }

    return infoMap;
  },

  // Add ownership record linking a game to a household
  async addOwnership(
    gameId: string,
    householdId: string,
    addedBy: string,
    notes?: string,
    userId?: string
  ): Promise<string> {
    const ownershipRef = collection(db, OWNERSHIP_COLLECTION);

    const ownershipData: Record<string, any> = {
      gameId,
      householdId,
      addedBy,
      addedAt: Timestamp.now(),
    };

    if (notes) {
      ownershipData.notes = notes;
    }

    if (userId) {
      ownershipData.userId = userId;
    }

    const docRef = await addDoc(ownershipRef, ownershipData);

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

    const ownerships = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    })) as Ownership[];

    // Look up household info
    const householdInfo = await this.getHouseholdInfo([householdId]);
    const info = householdInfo.get(householdId) || { name: 'Unknown' };

    // Add household info to each ownership
    return ownerships.map((o) => ({
      ...o,
      householdName: info.name,
      householdColor: info.color,
    }));
  },

  // Get all ownerships for a specific game (all households that own it)
  async getOwnershipsByGame(gameId: string): Promise<Ownership[]> {
    const ownershipRef = collection(db, OWNERSHIP_COLLECTION);
    const q = query(ownershipRef, where('gameId', '==', gameId));
    const snapshot = await getDocs(q);

    const ownerships = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    })) as Ownership[];

    // Look up household info
    const householdIds = [...new Set(ownerships.map((o) => o.householdId))];
    const householdInfo = await this.getHouseholdInfo(householdIds);

    // Add household info to each ownership
    return ownerships.map((o) => {
      const info = householdInfo.get(o.householdId) || { name: 'Unknown' };
      return {
        ...o,
        householdName: info.name,
        householdColor: info.color,
      };
    });
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

    // Get unique game IDs and household IDs
    const gameIds = [...new Set(ownerships.map((o) => o.gameId))];
    const householdIds = [...new Set(ownerships.map((o) => o.householdId))];

    // Fetch all referenced games and household info
    const [games, householdInfo] = await Promise.all([
      gamesService.getGamesByIds(gameIds),
      this.getHouseholdInfo(householdIds),
    ]);
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
        // Add household info from lookup
        const info = householdInfo.get(ownership.householdId) || { name: 'Unknown' };
        const ownershipWithInfo = {
          ...ownership,
          householdName: info.name,
          householdColor: info.color,
        };
        ownedGames.push({
          ...game,
          ownership: ownershipWithInfo,
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
    // Fetch ownership records for this household (already includes household info)
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

    // Join data - ownerships already have household info from getOwnershipsByHousehold
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
