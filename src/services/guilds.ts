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
import type { Guild, Household, EntityColorId } from '../types';
import { ENTITY_COLORS } from '../types';

// Get a random color from the brand colors
const getRandomColor = (): EntityColorId => {
  const randomIndex = Math.floor(Math.random() * ENTITY_COLORS.length);
  return ENTITY_COLORS[randomIndex].id;
};

const GUILDS_COLLECTION = 'guilds';

// Generate a simple invite code
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const guildsService = {
  // Get a guild by ID
  async getGuild(guildId: string): Promise<Guild | null> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    const snapshot = await getDoc(guildRef);

    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate() || new Date(),
    } as Guild;
  },

  // Get all guilds for a specific user
  async getUserGuilds(userId: string): Promise<Guild[]> {
    const guildsRef = collection(db, GUILDS_COLLECTION);
    const q = query(guildsRef, where('members', 'array-contains', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Guild[];
  },

  // Create a new guild
  async createGuild(name: string, userId: string): Promise<string> {
    const guildsRef = collection(db, GUILDS_COLLECTION);
    const docRef = await addDoc(guildsRef, {
      name,
      members: [userId],
      createdBy: userId,
      createdAt: Timestamp.now(),
      inviteCode: generateInviteCode(),
      color: getRandomColor(),
    });
    return docRef.id;
  },

  // Join a guild using invite code
  async joinGuildByCode(inviteCode: string, userId: string): Promise<string | null> {
    const guildsRef = collection(db, GUILDS_COLLECTION);
    const q = query(guildsRef, where('inviteCode', '==', inviteCode.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const guildDoc = snapshot.docs[0];
    const guildRef = doc(db, GUILDS_COLLECTION, guildDoc.id);

    await updateDoc(guildRef, {
      members: arrayUnion(userId),
    });

    return guildDoc.id;
  },

  // Add a member to a guild
  async addMember(guildId: string, userId: string): Promise<void> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    await updateDoc(guildRef, {
      members: arrayUnion(userId),
    });
  },

  // Leave a guild (remove user from members array)
  async leaveGuild(guildId: string, userId: string): Promise<void> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    const guildSnap = await getDoc(guildRef);

    if (!guildSnap.exists()) {
      throw new Error('Guild not found');
    }

    const guild = guildSnap.data();

    // Prevent owner from leaving
    if (guild.createdBy === userId) {
      throw new Error('Owner cannot leave the guild');
    }

    // Remove user from members array
    const updatedMembers = guild.members.filter((id: string) => id !== userId);
    await updateDoc(guildRef, {
      members: updatedMembers,
    });
  },

  // Remove a member from guild (owner only)
  async removeMember(guildId: string, memberUserId: string, requestingUserId: string): Promise<void> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    const guildSnap = await getDoc(guildRef);

    if (!guildSnap.exists()) {
      throw new Error('Guild not found');
    }

    const guild = guildSnap.data();

    // Only owner can remove members
    if (guild.createdBy !== requestingUserId) {
      throw new Error('Only the owner can remove members');
    }

    // Cannot remove the owner
    if (memberUserId === guild.createdBy) {
      throw new Error('Cannot remove the owner');
    }

    const updatedMembers = guild.members.filter((id: string) => id !== memberUserId);
    await updateDoc(guildRef, {
      members: updatedMembers,
    });
  },

  // Rename a guild (owner only)
  async renameGuild(guildId: string, newName: string, requestingUserId: string): Promise<void> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    const guildSnap = await getDoc(guildRef);

    if (!guildSnap.exists()) {
      throw new Error('Guild not found');
    }

    const guild = guildSnap.data();

    // Only owner can rename
    if (guild.createdBy !== requestingUserId) {
      throw new Error('Only the owner can rename the guild');
    }

    await updateDoc(guildRef, {
      name: newName.trim(),
    });
  },

  // Update guild color (owner only)
  async updateGuildColor(guildId: string, color: EntityColorId, requestingUserId: string): Promise<void> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    const guildSnap = await getDoc(guildRef);

    if (!guildSnap.exists()) {
      throw new Error('Guild not found');
    }

    const guild = guildSnap.data();

    // Only owner can update color
    if (guild.createdBy !== requestingUserId) {
      throw new Error('Only the owner can update the guild color');
    }

    await updateDoc(guildRef, {
      color,
    });
  },

  // Regenerate invite code (owner only)
  async regenerateInviteCode(guildId: string, requestingUserId: string): Promise<string> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    const guildSnap = await getDoc(guildRef);

    if (!guildSnap.exists()) {
      throw new Error('Guild not found');
    }

    const guild = guildSnap.data();

    // Only owner can regenerate code
    if (guild.createdBy !== requestingUserId) {
      throw new Error('Only the owner can regenerate the invite code');
    }

    const newCode = generateInviteCode();
    await updateDoc(guildRef, {
      inviteCode: newCode,
    });
    return newCode;
  },

  // Get member details for a guild
  async getGuildMembers(guildId: string): Promise<{
    id: string;
    displayName: string;
    email: string;
  }[]> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    const guildSnap = await getDoc(guildRef);

    if (!guildSnap.exists()) {
      return [];
    }

    const guild = guildSnap.data();
    const memberIds = guild.members;

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

  // Get member details with household info for a guild
  async getGuildMembersWithHouseholds(guildId: string): Promise<{
    id: string;
    displayName: string;
    email: string;
    householdId?: string;
    householdName?: string;
  }[]> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    const guildSnap = await getDoc(guildRef);

    if (!guildSnap.exists()) {
      return [];
    }

    const guild = guildSnap.data();
    const memberIds: string[] = guild.members;

    // First, collect all household IDs we need to look up
    const householdIds = new Set<string>();
    const userDataMap = new Map<string, { displayName: string; email: string; householdId?: string }>();

    for (const memberId of memberIds) {
      const userRef = doc(db, 'users', memberId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        // Handle both old (householdId) and new (householdIds) format
        const primaryHouseholdId = userData.householdIds?.[0] || userData.householdId;
        if (primaryHouseholdId) {
          householdIds.add(primaryHouseholdId);
        }
        userDataMap.set(memberId, {
          displayName: userData.displayName || 'Unknown',
          email: userData.email || '',
          householdId: primaryHouseholdId,
        });
      }
    }

    // Look up household names
    const householdNameMap = new Map<string, string>();
    for (const householdId of householdIds) {
      const householdRef = doc(db, 'households', householdId);
      const householdSnap = await getDoc(householdRef);
      if (householdSnap.exists()) {
        householdNameMap.set(householdId, householdSnap.data().name || 'Unknown');
      }
    }

    // Build final member list
    const members: {
      id: string;
      displayName: string;
      email: string;
      householdId?: string;
      householdName?: string;
    }[] = [];

    for (const memberId of memberIds) {
      const userData = userDataMap.get(memberId);
      if (userData) {
        members.push({
          id: memberId,
          displayName: userData.displayName,
          email: userData.email,
          householdId: userData.householdId,
          householdName: userData.householdId
            ? householdNameMap.get(userData.householdId)
            : undefined,
        });
      }
    }

    return members;
  },

  // Get all households for a guild (computed from members' households)
  async getGuildHouseholds(guildId: string): Promise<Household[]> {
    const guildRef = doc(db, GUILDS_COLLECTION, guildId);
    const guildSnap = await getDoc(guildRef);

    if (!guildSnap.exists()) {
      return [];
    }

    const guild = guildSnap.data();
    const memberIds: string[] = guild.members;

    // Get all unique household IDs from all members
    const householdIds = new Set<string>();

    for (const memberId of memberIds) {
      const userRef = doc(db, 'users', memberId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        // Handle both old (householdId) and new (householdIds) format
        if (userData.householdIds && Array.isArray(userData.householdIds)) {
          userData.householdIds.forEach((id: string) => householdIds.add(id));
        } else if (userData.householdId) {
          householdIds.add(userData.householdId);
        }
      }
    }

    // Fetch household details
    const households: Household[] = [];
    for (const householdId of householdIds) {
      const householdRef = doc(db, 'households', householdId);
      const householdSnap = await getDoc(householdRef);
      if (householdSnap.exists()) {
        households.push({
          id: householdSnap.id,
          ...householdSnap.data(),
          createdAt: householdSnap.data().createdAt?.toDate() || new Date(),
        } as Household);
      }
    }

    return households;
  },
};
