import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Card,
  FormGroup,
  InputGroup,
  Button,
  Intent,
  Callout,
} from '@blueprintjs/core';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export const ProfileSetupPage: React.FC = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If user already has a complete profile, skip to household setup
  if (userProfile?.profileComplete) {
    return <Navigate to="/household" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        displayName: displayName.trim(),
        profileComplete: true,
      }, { merge: true });

      navigate('/household');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save profile'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon"><span className="logo-text">HQ</span></div>
          </div>
          <h1>Welcome!</h1>
          <p>What should we call you?</p>
        </div>

        {error && (
          <Callout intent={Intent.DANGER} className="auth-error">
            {error}
          </Callout>
        )}

        <form onSubmit={handleSubmit}>
          <FormGroup label="Your Name" labelFor="displayName">
            <InputGroup
              id="displayName"
              large
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              required
            />
          </FormGroup>

          <Button
            type="submit"
            intent={Intent.PRIMARY}
            large
            fill
            loading={loading}
          >
            Continue
          </Button>
        </form>
      </Card>
    </div>
  );
};
