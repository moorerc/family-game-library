import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { User } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<string>;
  signInWithGoogle: () => Promise<string | null>;
  logout: () => Promise<void>;
  updateUserHousehold: (householdId: string) => Promise<void>;
  updateActiveGuild: (guildId: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create user profile
  const fetchUserProfile = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return {
        id: userSnap.id,
        ...userSnap.data(),
        createdAt: userSnap.data().createdAt?.toDate() || new Date(),
      } as User;
    }

    // Create new user profile
    const newUser: Omit<User, 'id'> = {
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      profileComplete: false,
      onboardingComplete: false,
      createdAt: new Date(),
    };

    await setDoc(userRef, {
      ...newUser,
      createdAt: Timestamp.now(),
    });

    return { id: firebaseUser.uid, ...newUser };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const profile = await fetchUserProfile(user);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName?: string): Promise<string> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // Create user profile - displayName defaults to email prefix
    const userRef = doc(db, 'users', credential.user.uid);
    await setDoc(userRef, {
      email,
      displayName: displayName || email.split('@')[0] || 'User',
      profileComplete: false,
      onboardingComplete: false,
      createdAt: Timestamp.now(),
    });

    return credential.user.uid;
  };

  const signInWithGoogle = async (): Promise<string | null> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Check if this is a new user
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);

    // Return user ID only if this is a new user (for invite code tracking)
    // Existing users signing in don't need an invite code
    if (!userSnap.exists()) {
      return result.user.uid;
    }

    return null; // Existing user, no invite code needed
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const updateUserHousehold = async (householdId: string): Promise<void> => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { householdId }, { merge: true });

    if (userProfile) {
      setUserProfile({ ...userProfile, householdId });
    }
  };

  const updateActiveGuild = async (guildId: string): Promise<void> => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { activeGuildId: guildId }, { merge: true });

    if (userProfile) {
      setUserProfile({ ...userProfile, activeGuildId: guildId });
    }
  };

  const updateDisplayName = async (displayName: string): Promise<void> => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { displayName }, { merge: true });

    if (userProfile) {
      setUserProfile({ ...userProfile, displayName });
    }
  };

  const markOnboardingComplete = async (): Promise<void> => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { onboardingComplete: true, profileComplete: true }, { merge: true });

    if (userProfile) {
      setUserProfile({ ...userProfile, onboardingComplete: true, profileComplete: true });
    }
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    updateUserHousehold,
    updateActiveGuild,
    updateDisplayName,
    markOnboardingComplete,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
