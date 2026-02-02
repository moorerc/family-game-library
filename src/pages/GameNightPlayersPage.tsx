import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { useGameNight, type SelectedPlayer } from '../context/GameNightContext';
import { guildsService } from '../services/guilds';
import { PlayerCard, AddPlayerCard, getInitials } from '../components/PlayerCard';
import { AddGuestModal } from '../components/AddGuestModal';

interface GuildMember {
  id: string;
  displayName: string;
  email: string;
  householdId?: string;
  householdName?: string;
}

export const GameNightPlayersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const {
    selectedPlayers,
    guests,
    addPlayer,
    togglePlayer,
    isPlayerSelected,
    addGuest,
    removeGuest,
  } = useGameNight();

  const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);

  // Fetch guild members on mount
  useEffect(() => {
    const fetchMembers = async () => {
      if (!userProfile?.activeGuildId) {
        setLoading(false);
        return;
      }

      try {
        const members = await guildsService.getGuildMembersWithHouseholds(
          userProfile.activeGuildId
        );
        setGuildMembers(members);
      } catch (err) {
        console.error('Failed to fetch guild members:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && currentUser) {
      fetchMembers();
    }
  }, [authLoading, currentUser, userProfile?.activeGuildId]);

  // Auto-select current user on initial load
  useEffect(() => {
    if (currentUser && guildMembers.length > 0 && selectedPlayers.length === 0) {
      const currentMember = guildMembers.find(m => m.id === currentUser.uid);
      if (currentMember) {
        addPlayer({
          id: currentMember.id,
          displayName: currentMember.displayName,
          email: currentMember.email,
          householdId: currentMember.householdId,
          householdName: currentMember.householdName,
        });
      }
    }
  }, [currentUser, guildMembers, selectedPlayers.length, addPlayer]);

  const handlePlayerClick = useCallback((member: GuildMember) => {
    const player: SelectedPlayer = {
      id: member.id,
      displayName: member.displayName,
      email: member.email,
      householdId: member.householdId,
      householdName: member.householdName,
    };
    togglePlayer(player);
  }, [togglePlayer]);

  const handleCancel = useCallback(() => {
    navigate('/game-night');
  }, [navigate]);

  const handleNext = useCallback(() => {
    if (selectedPlayers.length === 0 && guests.length === 0) return;
    navigate('/game-night/new/location');
  }, [navigate, selectedPlayers.length, guests.length]);

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="page-loading">
        <Spinner size={50} />
        <p>Loading players...</p>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    navigate('/game-night');
    return null;
  }

  if (!userProfile.activeGuildId) {
    return (
      <div className="game-night-step-page">
        <div className="step-container">
          <div className="step-header">
            <h1 className="step-title">No Guild Selected</h1>
            <p className="step-subtitle">
              Join or create a guild to start a game night with friends.
            </p>
          </div>
          <div className="step-actions">
            <button className="btn btn-back" onClick={() => navigate('/game-night')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalSelected = selectedPlayers.length + guests.length;

  return (
    <div className="game-night-step-page">
      {/* Step Indicator */}
      <div className="steps-indicator">
        <div className="step-dot active" />
        <div className="step-line" />
        <div className="step-dot" />
      </div>

      <div className="step-container">
        <div className="step-header">
          <div className="step-number">1</div>
          <h1 className="step-title">Who's Playing?</h1>
          <p className="step-subtitle">Select everyone joining tonight's game night</p>
        </div>

        <div className="players-grid">
          {/* Guild Members */}
          {guildMembers.map((member) => (
            <PlayerCard
              key={member.id}
              name={member.displayName}
              initials={getInitials(member.displayName)}
              householdName={member.householdName}
              isSelected={isPlayerSelected(member.id)}
              onClick={() => handlePlayerClick(member)}
            />
          ))}

          {/* Guest Players */}
          {guests.map((guest) => (
            <PlayerCard
              key={guest.id}
              name={guest.name}
              initials={getInitials(guest.name)}
              isSelected={true}
              isGuest={true}
              guestColor={guest.color}
              onClick={() => removeGuest(guest.id)}
            />
          ))}

          {/* Add Guest Card */}
          <AddPlayerCard onClick={() => setShowAddGuestModal(true)} />
        </div>

        <div className="step-actions">
          <button className="btn btn-back" onClick={handleCancel}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Cancel
          </button>
          <button
            className="btn btn-next"
            onClick={handleNext}
            disabled={totalSelected === 0}
          >
            Next
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add Guest Modal */}
      <AddGuestModal
        isOpen={showAddGuestModal}
        onClose={() => setShowAddGuestModal(false)}
        onAddGuest={addGuest}
      />
    </div>
  );
};
