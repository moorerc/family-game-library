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

export const SignUpPage: React.FC = () => {
  const { currentUser, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

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
      await signUp(email, password, displayName);
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
      await signInWithGoogle();
      navigate('/household');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sign up with Google'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">🎲</span>
          <h1>Join the Family</h1>
          <p>Create an account to start tracking your board games</p>
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

        <Divider className="auth-divider" />

        <Button
          icon="globe"
          large
          fill
          onClick={handleGoogleSignUp}
          loading={loading}
        >
          Continue with Google
        </Button>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
};
