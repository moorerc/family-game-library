import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Card,
  FormGroup,
  InputGroup,
  Button,
  Intent,
  Callout,
  Divider,
} from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { inviteCodesService } from '../services/inviteCodes';

export const SignUpPage: React.FC = () => {
  const { currentUser, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [inviteCode, setInviteCode] = useState('');
  const [inviteValidated, setInviteValidated] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      setError('Invite code is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validation = await inviteCodesService.validateCode(inviteCode);
      if (!validation.valid) {
        setError(validation.error || 'Invalid invite code');
        setLoading(false);
        return;
      }

      setInviteValidated(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to validate invite code'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create the account
      const userId = await signUp(email, password, displayName);

      // Mark the invite code as used
      await inviteCodesService.useCode(inviteCode, userId);

      navigate('/household');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create account'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);

    try {
      // Sign up with Google
      const userId = await signInWithGoogle();

      // userId is null if user already exists (they're signing in, not up)
      // In that case, just redirect them - no invite code needed
      if (userId) {
        // New user - mark the invite code as used
        await inviteCodesService.useCode(inviteCode, userId);
        navigate('/household');
      } else {
        // Existing user - just redirect to home
        navigate('/');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sign up with Google'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Validate invite code
  if (!inviteValidated) {
    return (
      <div className="auth-page">
        <Card className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="logo-icon"><span className="logo-text">HQ</span></div>
            </div>
            <h1>Join the Fun</h1>
            <p>Enter your invite code to get started</p>
          </div>

          {error && (
            <Callout intent={Intent.DANGER} className="auth-error">
              {error}
            </Callout>
          )}

          <form onSubmit={handleValidateCode}>
            <FormGroup label="Invite Code" labelFor="inviteCode">
              <InputGroup
                id="inviteCode"
                large
                placeholder="Enter your invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                autoFocus
                style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}
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

          <p className="auth-footer">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </Card>
      </div>
    );
  }

  // Step 2: Create account
  return (
    <div className="auth-page">
      <Card className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon"><span className="logo-text">HQ</span></div>
          </div>
          <h1>Create Account</h1>
          <p>You're in! Now set up your account.</p>
        </div>

        {error && (
          <Callout intent={Intent.DANGER} className="auth-error">
            {error}
          </Callout>
        )}

        <Button
          icon="globe"
          large
          fill
          onClick={handleGoogleSignUp}
          loading={loading}
          className="google-signup-btn"
        >
          Continue with Google
        </Button>

        <Divider className="auth-divider" />

        <form onSubmit={handleSubmit}>
          <FormGroup label="Your Name" labelFor="displayName">
            <InputGroup
              id="displayName"
              large
              placeholder="What should we call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup label="Email" labelFor="email">
            <InputGroup
              id="email"
              type="email"
              large
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup label="Password" labelFor="password">
            <InputGroup
              id="password"
              type="password"
              large
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup label="Confirm Password" labelFor="confirmPassword">
            <InputGroup
              id="confirmPassword"
              type="password"
              large
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            Create Account
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
};
