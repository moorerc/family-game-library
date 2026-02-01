import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Spinner } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { householdsService } from '../services/households';
import type { Household } from '../types';
import { getEntityColorHex } from '../types';

interface MemberInfo {
  id: string;
  displayName: string;
  email: string;
  gameCount: number;
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

export const HouseholdDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [totalGameCount, setTotalGameCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Handle both old (createdBy) and new (owner) field
  const ownerId = household ? ((household as any).owner || (household as any).createdBy) : null;
  const isOwner = ownerId === currentUser?.uid;

  useEffect(() => {
    if (!id) return;

    const fetchHousehold = async () => {
      try {
        setLoading(true);
        const householdData = await householdsService.getHousehold(id);
        setHousehold(householdData);

        if (householdData) {
          const memberData = await householdsService.getHouseholdMembersWithGameCounts(id);
          setMembers(memberData);

          const gameCount = await householdsService.getHouseholdGameCount(id);
          setTotalGameCount(gameCount);
        }
      } catch (error) {
        console.error('Failed to fetch household:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHousehold();
  }, [id]);

  const handleCopyCode = async () => {
    if (!household?.inviteCode) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setTimeout(() => setCopying(false), 1500);
    } catch {
      setCopying(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!id) return;
    setRegenerating(true);
    try {
      const newCode = await householdsService.regenerateInviteCode(id);
      setHousehold(prev => prev ? { ...prev, inviteCode: newCode } : null);
    } catch (error) {
      console.error('Failed to regenerate code:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!id || !currentUser) return;
    if (!window.confirm('Are you sure you want to remove this member from the household?')) return;

    setRemovingMember(memberId);
    try {
      await householdsService.removeMember(id, memberId, currentUser.uid);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!id || !currentUser) return;
    if (!window.confirm('Are you sure you want to leave this household? Your games will be removed from the shared library.')) return;

    setLeaving(true);
    try {
      await householdsService.leaveHousehold(id, currentUser.uid);
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to leave household:', error);
      alert('Failed to leave household');
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="household-detail-page">
        <div className="empty-state">
          <Spinner size={40} />
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="household-detail-page">
        <div className="empty-state">
          <p>Household not found</p>
          <Link to="/">Back to Library</Link>
        </div>
      </div>
    );
  }

  // Get current user's game count
  const currentUserMember = members.find(m => m.id === currentUser?.uid);
  const currentUserGameCount = currentUserMember?.gameCount || 0;

  return (
    <div className="household-detail-page-wrapper">
      <div className="household-detail-page">
        {/* Hero Section */}
        <div className="page-hero">
          <div
            className="hero-avatar"
            style={{ backgroundColor: getEntityColorHex(household.color) }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <rect x="9" y="12" width="6" height="10" fill="currentColor" opacity="0.3"/>
            </svg>
          </div>
          <div className="hero-info">
            <h1>{household.name}</h1>
            <div className="hero-meta">
              <span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
              <span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/>
                </svg>
                {totalGameCount} game{totalGameCount !== 1 ? 's' : ''}
              </span>
              <span className={`hero-badge ${isOwner ? 'owner' : 'member'}`}>
                {isOwner ? 'Owner' : 'Member'}
              </span>
            </div>
          </div>
          {isOwner && (
            <Link to={`/household/${id}/edit`} className="edit-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Household
            </Link>
          )}
        </div>

        {/* Members Section */}
        <div className="section-card">
          <div className="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h2>Members</h2>
          </div>
          <div className="section-content">
            {members.map((member, index) => {
              const memberIsOwner = member.id === ownerId;
              const isCurrentUser = member.id === currentUser?.uid;

              return (
                <div key={member.id} className="member-row">
                  <div className={`member-avatar ${isCurrentUser ? 'blue' : index === 0 ? 'yellow' : 'gray'}`}>
                    {getInitials(member.displayName)}
                  </div>
                  <div className="member-info">
                    <div className="member-name">
                      {member.displayName}
                      {isCurrentUser && <span className="you"> · You</span>}
                    </div>
                    <div className="member-role">
                      {memberIsOwner ? 'Owner' : 'Member'} · {member.gameCount} game{member.gameCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isOwner && !memberIsOwner && (
                    <div className="member-actions">
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMember === member.id}
                      >
                        {removingMember === member.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite Code Section (Owner Only) */}
        {isOwner && (
          <div className="section-card">
            <div className="section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <h2>Invite Code</h2>
            </div>
            <div className="section-content">
              <div className="invite-row">
                <span className="invite-code-display">{household.inviteCode}</span>
                <button
                  className="btn btn-small btn-icon"
                  onClick={handleCopyCode}
                  title="Copy code"
                  disabled={copying}
                >
                  {copying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                </button>
                <button
                  className="btn btn-small btn-icon"
                  onClick={handleRegenerateCode}
                  title="Generate new code"
                  disabled={regenerating}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={regenerating ? 'spinning' : ''}>
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
                  </svg>
                </button>
              </div>
              <p className="invite-meta">Share this code to invite new members</p>
            </div>
          </div>
        )}

        {/* Your Games Section (Non-Owner Only) */}
        {!isOwner && (
          <div className="section-card">
            <div className="section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/>
              </svg>
              <h2>Your Games</h2>
            </div>
            <div className="section-content">
              {currentUserGameCount === 0 ? (
                <div className="empty-state-inline">
                  <p>You haven't added any games to this household yet.</p>
                </div>
              ) : (
                <div className="your-games-summary">
                  <p>You've added <strong>{currentUserGameCount}</strong> game{currentUserGameCount !== 1 ? 's' : ''} to this household.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leave Household Section (Non-Owner Only) */}
        {!isOwner && (
          <div className="danger-card">
            <div className="section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <h2>Leave Household</h2>
            </div>
            <div className="section-content">
              <div className="danger-row">
                <div className="danger-info">
                  <h4>Leave this household</h4>
                  <p>Your games will be removed from the shared library.</p>
                </div>
                <button
                  className="btn btn-small btn-danger"
                  onClick={handleLeaveHousehold}
                  disabled={leaving}
                >
                  {leaving ? 'Leaving...' : 'Leave'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
