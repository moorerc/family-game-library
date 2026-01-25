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

export const LoginPage: React.FC = () => {
  const { currentUser, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sign in'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sign in with Google'
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
          <h1>Welcome Back</h1>
          <p>Sign in to access your family's game library</p>
        </div>

        {error && (
          <Callout intent={Intent.DANGER} className="auth-error">
            {error}
          </Callout>
        )}

        <form onSubmit={handleSubmit}>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            Sign In
          </Button>
        </form>

        <Divider className="auth-divider" />

        <Button
          icon="globe"
          large
          fill
          onClick={handleGoogleSignIn}
          loading={loading}
        >
          Continue with Google
        </Button>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup">Create one</Link>
        </p>
      </Card>
    </div>
  );
};
