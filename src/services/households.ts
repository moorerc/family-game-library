import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Household, EntityColorId } from '../types';
import { ENTITY_COLORS } from '../types';

// Get a random color from the brand colors
const getRandomColor = (): EntityColorId => {
  const randomIndex = Math.floor(Math.random() * ENTITY_COLORS.length);
  return ENTITY_COLORS[randomIndex].id;
};

const HOUSEHOLDS_COLLECTION = 'households';

// Generate a simple invite code
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const householdsService = {
  // Get a household by ID
  async getHousehold(householdId: string): Promise<Household | null> {
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdId);
    const snapshot = await getDoc(householdRef);
    
    if (!snapshot.exists()) return null;
    
    return {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate() || new Date(),
    } as Household;
  },

  // Get all households (for the family library view)
  async getAllHouseholds(): Promise<Household[]> {
    const householdsRef = collection(db, HOUSEHOLDS_COLLECTION);
    const snapshot = await getDocs(householdsRef);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Household[];
  },

  // Create a new household
  async createHousehold(name: string, userId: string): Promise<string> {
    const householdsRef = collection(db, HOUSEHOLDS_COLLECTION);
    const docRef = await addDoc(householdsRef, {
      name,
      members: [userId],
      owner: userId,
      createdBy: userId,
      createdAt: Timestamp.now(),
      inviteCode: generateInviteCode(),
      color: getRandomColor(),
    });
    return docRef.id;
  },

  // Join a household using invite code
  async joinHouseholdByCode(inviteCode: string, userId: string): Promise<string | null> {
    const householdsRef = collection(db, HOUSEHOLDS_COLLECTION);
    const q = query(householdsRef, where('inviteCode', '==', inviteCode.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const householdDoc = snapshot.docs[0];
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdDoc.id);
    
    await updateDoc(householdRef, {
      members: arrayUnion(userId),
    });
    
    return householdDoc.id;
  },

  // Add a member to a household
  async addMember(householdId: string, userId: string): Promise<void> {
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdId);
    await updateDoc(householdRef, {
      members: arrayUnion(userId),
    });
  },

  // Regenerate invite code
  async regenerateInviteCode(householdId: string): Promise<string> {
    const newCode = generateInviteCode();
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdId);
    await updateDoc(householdRef, {
      inviteCode: newCode,
    });
    return newCode;
  },

  // Get all households for a specific user
  async getUserHouseholds(userId: string): Promise<Household[]> {
    const householdsRef = collection(db, HOUSEHOLDS_COLLECTION);
    const q = query(householdsRef, where('members', 'array-contains', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Household[];
  },

  // Leave a household (remove user from members array)
  async leaveHousehold(householdId: string, userId: string): Promise<void> {
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      throw new Error('Household not found');
    }

    const household = householdSnap.data();

    // Prevent owner from leaving
    if ((household.owner || household.createdBy) === userId) {
      throw new Error('Owner cannot leave the household');
    }

    // Remove user from members array
    const updatedMembers = household.members.filter((id: string) => id !== userId);
    await updateDoc(householdRef, {
      members: updatedMembers,
    });
  },

  // Remove a member from household (owner only)
  async removeMember(householdId: string, memberUserId: string, requestingUserId: string): Promise<void> {
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      throw new Error('Household not found');
    }

    const household = householdSnap.data();
    const ownerId = household.owner || household.createdBy;

    // Only owner can remove members
    if (ownerId !== requestingUserId) {
      throw new Error('Only the owner can remove members');
    }

    // Cannot remove the owner
    if (memberUserId === ownerId) {
      throw new Error('Cannot remove the owner');
    }

    const updatedMembers = household.members.filter((id: string) => id !== memberUserId);
    await updateDoc(householdRef, {
      members: updatedMembers,
    });
  },

  // Rename a household (owner only)
  async renameHousehold(householdId: string, newName: string, requestingUserId: string): Promise<void> {
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      throw new Error('Household not found');
    }

    const household = householdSnap.data();
    const ownerId = household.owner || household.createdBy;

    // Only owner can rename
    if (ownerId !== requestingUserId) {
      throw new Error('Only the owner can rename the household');
    }

    await updateDoc(householdRef, {
      name: newName.trim(),
    });
  },

  // Update household color (owner only)
  async updateHouseholdColor(householdId: string, color: EntityColorId, requestingUserId: string): Promise<void> {
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      throw new Error('Household not found');
    }

    const household = householdSnap.data();
    const ownerId = household.owner || household.createdBy;

    // Only owner can update color
    if (ownerId !== requestingUserId) {
      throw new Error('Only the owner can update the household color');
    }

    await updateDoc(householdRef, {
      color,
    });
  },

  // Get count of games in a household
  async getHouseholdGameCount(householdId: string): Promise<number> {
    const ownershipRef = collection(db, 'ownership');
    const q = query(ownershipRef, where('householdId', '==', householdId));
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  // Get member details for a household
  async getHouseholdMembers(householdId: string): Promise<{ id: string; displayName: string; email: string }[]> {
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      return [];
    }

    const household = householdSnap.data() as Household;
    const memberIds = household.members;

    // Fetch user details for each member
    const members: { id: string; displayName: string; email: string }[] = [];
    for (const memberId of memberIds) {
      const userRef = doc(db, 'users', memberId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        members.push({
          id: userSnap.id,
          displayName: userData.displayName || 'Unknown',
          email: userData.email || '',
        });
      }
    }

    return members;
  },

  // Get game count for a specific member in a household
  async getMemberGameCount(householdId: string, userId: string): Promise<number> {
    const ownershipRef = collection(db, 'ownership');
    const q = query(
      ownershipRef,
      where('householdId', '==', householdId),
      where('addedBy', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  // Get member details with game counts for a household
  async getHouseholdMembersWithGameCounts(householdId: string): Promise<{
    id: string;
    displayName: string;
    email: string;
    gameCount: number;
  }[]> {
    const householdRef = doc(db, HOUSEHOLDS_COLLECTION, householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      return [];
    }

    const household = householdSnap.data();
    const memberIds = household.members;

    const members: { id: string; displayName: string; email: string; gameCount: number }[] = [];
    for (const memberId of memberIds) {
      const userRef = doc(db, 'users', memberId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const gameCount = await this.getMemberGameCount(householdId, memberId);
        members.push({
          id: userSnap.id,
          displayName: userData.displayName || 'Unknown',
          email: userData.email || '',
          gameCount,
        });
      }
    }

    return members;
  },
};
