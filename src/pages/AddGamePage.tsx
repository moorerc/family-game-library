import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Card, NonIdealState, Button, Spinner } from '@blueprintjs/core';
import { AddGameForm } from '../components';
import { useAuth } from '../context/AuthContext';
import { useGames } from '../hooks/useGames';
import { householdsService } from '../services/households';
import type { Household } from '../types';

export const AddGamePage: React.FC = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { addGame } = useGames();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHousehold = async () => {
      if (!userProfile?.householdId) {
        setLoading(false);
        return;
      }

      try {
        const data = await householdsService.getHousehold(userProfile.householdId);
        setHousehold(data);
      } catch (err) {
        console.error('Failed to fetch household:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchHousehold();
    }
  }, [userProfile, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="page-loading">
        <Spinner size={50} />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!household) {
    return (
      <div className="add-game-page">
        <NonIdealState
          icon="home"
          title="Join a Household First"
          description="You need to create or join a household before you can add games to the library."
          action={
            <Link to="/household">
              <Button intent="primary" icon="home">
                Set Up Household
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="add-game-page">
      <header className="page-header">
        <h1>Add a Game</h1>
        <p className="subtitle">
          Adding to <strong>{household.name}</strong>'s collection
        </p>
      </header>

      <Card className="add-game-card">
        <AddGameForm
          onSubmit={addGame}
          householdId={household.id}
          householdName={household.name}
        />
      </Card>
    </div>
  );
};
