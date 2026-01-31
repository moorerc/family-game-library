import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserGamePreference, GamePreferenceStats } from '../types';

const PREFERENCES_COLLECTION = 'userGamePreferences';

// Generate a composite ID for the preference document
const getPreferenceId = (userId: string, gameId: string): string => {
  return `${userId}_${gameId}`;
};

export const userPreferencesService = {
  // Get all preferences for a user
  async getPreferencesByUser(userId: string): Promise<UserGamePreference[]> {
    const prefsRef = collection(db, PREFERENCES_COLLECTION);
    const q = query(prefsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as UserGamePreference[];
  },

  // Get a single preference for a user and game
  async getPreference(userId: string, gameId: string): Promise<UserGamePreference | null> {
    const prefId = getPreferenceId(userId, gameId);
    const prefRef = doc(db, PREFERENCES_COLLECTION, prefId);
    const snapshot = await getDoc(prefRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
      updatedAt: snapshot.data().updatedAt?.toDate() || new Date(),
    } as UserGamePreference;
  },

  // Set reaction (like/dislike/null) for a game
  async setReaction(
    userId: string,
    gameId: string,
    reaction: 'like' | 'dislike' | null
  ): Promise<UserGamePreference> {
    const prefId = getPreferenceId(userId, gameId);
    const prefRef = doc(db, PREFERENCES_COLLECTION, prefId);

    // Get existing preference to preserve favorite status
    const existing = await getDoc(prefRef);
    let isFavorite = false;

    if (existing.exists()) {
      isFavorite = existing.data().isFavorite || false;
      // If disliking, remove favorite status
      if (reaction === 'dislike') {
        isFavorite = false;
      }
    }

    const prefData = {
      userId,
      gameId,
      reaction,
      isFavorite,
      updatedAt: Timestamp.now(),
    };

    // If reaction is null and not a favorite, delete the document
    if (reaction === null && !isFavorite) {
      if (existing.exists()) {
        await deleteDoc(prefRef);
      }
      return {
        id: prefId,
        userId,
        gameId,
        reaction: null,
        isFavorite: false,
        updatedAt: new Date(),
      };
    }

    await setDoc(prefRef, prefData);

    return {
      id: prefId,
      ...prefData,
      updatedAt: new Date(),
    };
  },

  // Toggle favorite status for a game
  async toggleFavorite(userId: string, gameId: string): Promise<UserGamePreference> {
    const prefId = getPreferenceId(userId, gameId);
    const prefRef = doc(db, PREFERENCES_COLLECTION, prefId);

    const existing = await getDoc(prefRef);
    let reaction: 'like' | 'dislike' | null = null;
    let isFavorite = false;

    if (existing.exists()) {
      reaction = existing.data().reaction;
      isFavorite = existing.data().isFavorite || false;
    }

    // Toggle favorite
    isFavorite = !isFavorite;

    // If unfavoriting and no reaction, delete the document
    if (!isFavorite && reaction === null) {
      if (existing.exists()) {
        await deleteDoc(prefRef);
      }
      return {
        id: prefId,
        userId,
        gameId,
        reaction: null,
        isFavorite: false,
        updatedAt: new Date(),
      };
    }

    const prefData = {
      userId,
      gameId,
      reaction,
      isFavorite,
      updatedAt: Timestamp.now(),
    };

    await setDoc(prefRef, prefData);

    return {
      id: prefId,
      ...prefData,
      updatedAt: new Date(),
    };
  },

  // Get preference stats for a game (counts of likes/dislikes/favorites)
  async getPreferenceStats(gameId: string): Promise<GamePreferenceStats> {
    const prefsRef = collection(db, PREFERENCES_COLLECTION);
    const q = query(prefsRef, where('gameId', '==', gameId));
    const snapshot = await getDocs(q);

    let likes = 0;
    let dislikes = 0;
    let favorites = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.reaction === 'like') likes++;
      if (data.reaction === 'dislike') dislikes++;
      if (data.isFavorite) favorites++;
    });

    return { likes, dislikes, favorites };
  },
};
