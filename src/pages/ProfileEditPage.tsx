import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, Spinner } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { householdsService } from '../services/households';
import type { Household } from '../types';

interface HouseholdWithRole extends Household {
  isOwner: boolean;
}

const getInitials = (name: string | undefined): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const ProfileEditPage: React.FC = () => {
  const { currentUser, userProfile, updateDisplayName, updateUserHousehold } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [households, setHouseholds] = useState<HouseholdWithRole[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joiningHousehold, setJoiningHousehold] = useState(false);
  const [leavingHouseholdId, setLeavingHouseholdId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Fetch user's households
  const fetchHouseholds = useCallback(async () => {
    if (!currentUser) return;

    try {
      const allHouseholds = await householdsService.getAllHouseholds();
      const userHouseholds = allHouseholds
        .filter(h => h.members.includes(currentUser.uid))
        .map(h => ({
          ...h,
          isOwner: h.createdBy === currentUser.uid,
        }));

      setHouseholds(userHouseholds);
    } catch (err) {
      console.error('Failed to fetch households:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchHouseholds();
      setLoading(false);
    };

    loadData();
  }, [fetchHouseholds]);

  // Update display name when profile changes
  useEffect(() => {
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    }
  }, [userProfile?.displayName]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateDisplayName(displayName.trim());
      navigate('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile');
  };

  const handleLeaveHousehold = async (householdId: string) => {
    if (!currentUser) return;

    const household = households.find(h => h.id === householdId);
    if (household?.isOwner) {
      setError('You cannot leave a household you own. Transfer ownership first.');
      return;
    }

    setLeavingHouseholdId(householdId);
    setError(null);

    try {
      await householdsService.leaveHousehold(householdId, currentUser.uid);

      // If this was the active household, clear it
      if (userProfile?.householdId === householdId) {
        // Find another household to set as active, or clear it
        const remainingHouseholds = households.filter(h => h.id !== householdId);
        if (remainingHouseholds.length > 0) {
          await updateUserHousehold(remainingHouseholds[0].id);
        }
      }

      // Refresh the list
      await fetchHouseholds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave household');
    } finally {
      setLeavingHouseholdId(null);
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim() || !currentUser) return;

    setJoiningHousehold(true);
    setJoinError(null);

    try {
      const householdId = await householdsService.joinHouseholdByCode(
        inviteCode.trim().toUpperCase(),
        currentUser.uid
      );

      if (!householdId) {
        setJoinError('Invalid invite code. Please check and try again.');
        return;
      }

      // Set as active household
      await updateUserHousehold(householdId);

      // Refresh the list and clear the input
      await fetchHouseholds();
      setInviteCode('');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join household');
    } finally {
      setJoiningHousehold(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-edit-page">
        <div className="empty-state">
          <Spinner size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-edit-page">
      <Link to="/profile" className="profile-edit-back">
        <Icon icon="chevron-left" size={16} />
        Back to Profile
      </Link>

      <div className="profile-edit-header">
        <h1>Edit Profile</h1>
      </div>

      {error && (
        <div className="profile-edit-section" style={{ borderColor: '#dc2626', background: 'rgba(220, 38, 38, 0.05)' }}>
          <p style={{ color: '#dc2626', margin: 0, fontSize: '0.9rem' }}>{error}</p>
        </div>
      )}

      {/* Avatar Section */}
      <div className="profile-edit-section">
        <div className="profile-edit-section-title">Avatar</div>
        <div className="avatar-edit-section">
          <div className="avatar-edit-display">
            {getInitials(displayName || userProfile?.displayName)}
          </div>
          <div className="avatar-edit-actions">
            <p>Profile photo uploads coming soon.</p>
            <button className="avatar-upload-btn" disabled>
              <Icon icon="upload" size={14} />
              Upload Photo
            </button>
          </div>
        </div>
      </div>

      {/* Personal Info Section */}
      <div className="profile-edit-section">
        <div className="profile-edit-section-title">Personal Information</div>

        <div className="form-group">
          <label htmlFor="displayName" className="form-label">Display Name</label>
          <input
            id="displayName"
            type="text"
            className="form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            type="email"
            className="form-input"
            value={userProfile?.email || ''}
            disabled
          />
          <p className="form-help">Email cannot be changed.</p>
        </div>
      </div>

      {/* Households Section */}
      <div className="profile-edit-section">
        <div className="profile-edit-section-title">Households</div>

        {households.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px' }}>
            <p>You haven't joined any households yet.</p>
          </div>
        ) : (
          <div className="household-edit-list">
            {households.map(household => (
              <div key={household.id} className="household-edit-row">
                <div className="household-edit-info">
                  <div className="household-edit-name">{household.name}</div>
                  <div className="household-edit-role">
                    {household.isOwner ? 'Owner' : 'Member'}
                    {userProfile?.householdId === household.id && ' (Active)'}
                  </div>
                </div>
                {!household.isOwner && (
                  <button
                    className="leave-household-btn"
                    onClick={() => handleLeaveHousehold(household.id)}
                    disabled={leavingHouseholdId === household.id}
                  >
                    {leavingHouseholdId === household.id ? 'Leaving...' : 'Leave'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleJoinHousehold} className="join-household-form">
          <input
            type="text"
            className="form-input"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            maxLength={6}
          />
          <button
            type="submit"
            className="join-household-btn"
            disabled={joiningHousehold || !inviteCode.trim()}
          >
            {joiningHousehold ? 'Joining...' : 'Join'}
          </button>
        </form>
        {joinError && (
          <p className="form-help" style={{ color: '#dc2626', marginTop: '8px' }}>{joinError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="profile-edit-actions">
        <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};
