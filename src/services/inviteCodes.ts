import {
  collection,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

export interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  createdAt: Date;
  usedBy?: string;
  usedAt?: Date;
  maxUses: number;
  useCount: number;
}

const COLLECTION = 'inviteCodes';

// Generate a random invite code
const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, 1, I
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const inviteCodesService = {
  // Validate an invite code
  async validateCode(code: string): Promise<{ valid: boolean; error?: string }> {
    const normalizedCode = code.toUpperCase().trim();

    const q = query(
      collection(db, COLLECTION),
      where('code', '==', normalizedCode)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { valid: false, error: 'Invalid invite code' };
    }

    const inviteDoc = snapshot.docs[0];
    const invite = inviteDoc.data();

    // Check if code has reached max uses
    if (invite.useCount >= invite.maxUses) {
      return { valid: false, error: 'This invite code has already been used' };
    }

    return { valid: true };
  },

  // Use an invite code (mark it as used)
  async useCode(code: string, userId: string): Promise<void> {
    const normalizedCode = code.toUpperCase().trim();

    const q = query(
      collection(db, COLLECTION),
      where('code', '==', normalizedCode)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Invalid invite code');
    }

    const inviteDoc = snapshot.docs[0];
    const invite = inviteDoc.data();

    await updateDoc(doc(db, COLLECTION, inviteDoc.id), {
      useCount: invite.useCount + 1,
      lastUsedBy: userId,
      lastUsedAt: Timestamp.now(),
    });
  },

  // Create a new invite code (for admins/existing users)
  async createCode(createdBy: string, maxUses: number = 1): Promise<string> {
    const code = generateCode();
    const docRef = doc(collection(db, COLLECTION));

    await setDoc(docRef, {
      code,
      createdBy,
      createdAt: Timestamp.now(),
      maxUses,
      useCount: 0,
    });

    return code;
  },

  // Get all invite codes created by a user
  async getCodesByUser(userId: string): Promise<InviteCode[]> {
    const q = query(
      collection(db, COLLECTION),
      where('createdBy', '==', userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      usedAt: doc.data().usedAt?.toDate(),
    })) as InviteCode[];
  },
};
