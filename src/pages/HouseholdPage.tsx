import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Card,
  FormGroup,
  InputGroup,
  Button,
  Intent,
  Callout,
  Tabs,
  Tab,
} from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { householdsService } from '../services/households';

export const HouseholdPage: React.FC = () => {
  const { currentUser, userProfile, updateUserHousehold, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<string>('create');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If user already has a household, redirect to home
  if (userProfile?.householdId) {
    return <Navigate to="/" replace />;
  }

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!householdName.trim()) {
      setError('Please enter a household name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const householdId = await householdsService.createHousehold(
        householdName.trim(),
        currentUser.uid
      );
      await updateUserHousehold(householdId);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create household'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const householdId = await householdsService.joinHouseholdByCode(
        inviteCode.trim(),
        currentUser.uid
      );
      
      if (!householdId) {
        setError('Invalid invite code. Please check and try again.');
        setLoading(false);
        return;
      }
      
      await updateUserHousehold(householdId);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to join household'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card household-card">
        <div className="auth-header">
          <span className="auth-icon">🏠</span>
          <h1>Set Up Your Household</h1>
          <p>Create a new household or join an existing one</p>
        </div>

        {error && (
          <Callout intent={Intent.DANGER} className="auth-error">
            {error}
          </Callout>
        )}

        <Tabs
          id="household-tabs"
          selectedTabId={activeTab}
          onChange={(newTab) => {
            setActiveTab(newTab as string);
            setError(null);
          }}
          large
        >
          <Tab
            id="create"
            title="Create New"
            panel={
              <form onSubmit={handleCreateHousehold} className="household-form">
                <FormGroup
                  label="Household Name"
                  labelFor="household-name"
                  helperText="e.g., The Smiths, Grandma's House, etc."
                >
                  <InputGroup
                    id="household-name"
                    large
                    placeholder="Enter a name for your household"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                  />
                </FormGroup>

                <Button
                  type="submit"
                  intent={Intent.PRIMARY}
                  large
                  fill
                  loading={loading}
                  icon="home"
                >
                  Create Household
                </Button>
              </form>
            }
          />
          <Tab
            id="join"
            title="Join Existing"
            panel={
              <form onSubmit={handleJoinHousehold} className="household-form">
                <FormGroup
                  label="Invite Code"
                  labelFor="invite-code"
                  helperText="Ask a family member for their household's invite code"
                >
                  <InputGroup
                    id="invite-code"
                    large
                    placeholder="e.g., ABC123"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                  />
                </FormGroup>

                <Button
                  type="submit"
                  intent={Intent.PRIMARY}
                  large
                  fill
                  loading={loading}
                  icon="new-person"
                >
                  Join Household
                </Button>
              </form>
            }
          />
        </Tabs>
      </Card>
    </div>
  );
};
