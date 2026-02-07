import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../components/PlayerCard';
import { getEntityColorHex, type EntityColorId } from '../types';
import { guildsService } from '../services/guilds';
import { householdsService } from '../services/households';

type Step =
  | 'profile'
  | 'guild'
  | 'guild-code'
  | 'guild-create'
  | 'household'
  | 'household-code'
  | 'household-create'
  | 'complete';

// Map steps to numbered wizard positions (1-based, 3 steps total)
const stepToPosition = (step: Step): number => {
  if (step === 'profile') return 1;
  if (step.startsWith('guild')) return 2;
  if (step.startsWith('household')) return 3;
  return 3; // complete = all 3 completed
};

export const OnboardingPage: React.FC = () => {
  const {
    currentUser,
    userProfile,
    loading,
    updateDisplayName,
    updateActiveGuild,
    updateUserHousehold,
    markOnboardingComplete,
  } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('profile');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Profile step — prefill from Google auth if available
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');

  // Guild step
  const [guildChoice, setGuildChoice] = useState<'join' | 'create' | null>(null);
  const [guildCode, setGuildCode] = useState('');
  const [guildName, setGuildName] = useState('');
  const [joinedGuildName, setJoinedGuildName] = useState('');
  const [joinedGuildColor, setJoinedGuildColor] = useState<EntityColorId | undefined>();

  // Household step
  const [householdChoice, setHouseholdChoice] = useState<'join' | 'create' | null>(null);
  const [householdCode, setHouseholdCode] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [joinedHouseholdName, setJoinedHouseholdName] = useState('');
  const [joinedHouseholdColor, setJoinedHouseholdColor] = useState<EntityColorId | undefined>();

  // Auth guards
  if (!loading && !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!loading && userProfile?.onboardingComplete) {
    return <Navigate to="/" replace />;
  }

  if (!loading && userProfile?.profileComplete && userProfile?.onboardingComplete === undefined) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return null;
  }

  const currentPosition = stepToPosition(step);
  const isComplete = step === 'complete';

  const handleProfileContinue = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await updateDisplayName(displayName.trim());
      setStep('guild');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuildContinue = () => {
    if (!guildChoice) return;
    setError(null);
    if (guildChoice === 'join') setStep('guild-code');
    if (guildChoice === 'create') setStep('guild-create');
  };

  const handleJoinGuild = async () => {
    if (!guildCode.trim() || !currentUser) return;

    setSubmitting(true);
    setError(null);

    try {
      const guildId = await guildsService.joinGuildByCode(guildCode.trim(), currentUser.uid);
      if (!guildId) {
        setError('Invalid invite code. Please try again.');
        setSubmitting(false);
        return;
      }
      await updateActiveGuild(guildId);
      const guild = await guildsService.getGuild(guildId);
      setJoinedGuildName(guild?.name || 'Guild');
      setJoinedGuildColor(guild?.color);
      setStep('household');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join guild');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGuild = async () => {
    if (!guildName.trim() || !currentUser) return;

    setSubmitting(true);
    setError(null);

    try {
      const guildId = await guildsService.createGuild(guildName.trim(), currentUser.uid);
      await updateActiveGuild(guildId);
      const guild = await guildsService.getGuild(guildId);
      setJoinedGuildName(guildName.trim());
      setJoinedGuildColor(guild?.color);
      setStep('household');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create guild');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHouseholdContinue = () => {
    if (!householdChoice) return;
    setError(null);
    if (householdChoice === 'join') setStep('household-code');
    if (householdChoice === 'create') setStep('household-create');
  };

  const handleJoinHousehold = async () => {
    if (!householdCode.trim() || !currentUser) return;

    setSubmitting(true);
    setError(null);

    try {
      const householdId = await householdsService.joinHouseholdByCode(householdCode.trim(), currentUser.uid);
      if (!householdId) {
        setError('Invalid invite code. Please try again.');
        setSubmitting(false);
        return;
      }
      await updateUserHousehold(householdId);
      const household = await householdsService.getHousehold(householdId);
      setJoinedHouseholdName(household?.name || 'Household');
      setJoinedHouseholdColor(household?.color);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join household');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim() || !currentUser) return;

    setSubmitting(true);
    setError(null);

    try {
      const householdId = await householdsService.createHousehold(householdName.trim(), currentUser.uid);
      await updateUserHousehold(householdId);
      const household = await householdsService.getHousehold(householdId);
      setJoinedHouseholdName(householdName.trim());
      setJoinedHouseholdColor(household?.color);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await markOnboardingComplete();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Steps indicator — 3 dots
  const renderSteps = () => (
    <div className="steps-indicator">
      {[1, 2, 3].map((num, i) => (
        <React.Fragment key={num}>
          {i > 0 && (
            <div className={`step-line${(isComplete || num <= currentPosition) ? ' completed' : ''}`} />
          )}
          <div
            className={`step-dot${!isComplete && num === currentPosition ? ' active' : ''}${(isComplete || num < currentPosition) ? ' completed' : ''}`}
          >
            {(isComplete || num < currentPosition) ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              num
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  // ─── Step: Profile ───
  if (step === 'profile') {
    return (
      <div className="onboarding-page">
        <div className="wizard-card">
          {renderSteps()}
          <div className="wizard-content">
            <div className="wizard-header">
              <h2 className="wizard-title">Set Up Your Profile</h2>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="avatar-preview">
              <div className={`avatar-bubble${displayName.trim() ? ' has-name' : ''}`}>
                {displayName.trim() ? getInitials(displayName) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                className="form-input"
                placeholder="What should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="wizard-buttons">
              <button
                className="btn-continue"
                onClick={handleProfileContinue}
                disabled={submitting || !displayName.trim()}
                style={{ flex: 1 }}
              >
                {submitting ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: Guild choice ───
  if (step === 'guild') {
    return (
      <div className="onboarding-page">
        <div className="wizard-card">
          {renderSteps()}
          <div className="wizard-content">
            <div className="wizard-header">
              <div className="wizard-title-row">
                <div className="header-icon guild">
                  <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2 className="wizard-title">Join a Guild</h2>
              </div>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="info-box">
              <div className="info-visual">
                <div className="guild-avatars">
                  <div className="guild-avatar">JD</div>
                  <div className="guild-avatar">MK</div>
                  <div className="guild-avatar">AS</div>
                  <div className="guild-avatar">BL</div>
                  <div className="guild-avatar">+3</div>
                </div>
              </div>
              <div className="info-text">
                <div className="info-title">Your Gaming Circle</div>
                <p className="info-desc">The people you play board games with.</p>
              </div>
            </div>

            <div className="action-cards">
              <div
                className={`action-card${guildChoice === 'join' ? ' selected' : ''}`}
                onClick={() => setGuildChoice('join')}
              >
                <div className="action-icon">
                  <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </div>
                <div className="action-content">
                  <div className="action-title">Join with Invite Code</div>
                  <div className="action-desc">I have a code</div>
                </div>
                <div className="action-radio" />
              </div>
              <div
                className={`action-card${guildChoice === 'create' ? ' selected' : ''}`}
                onClick={() => setGuildChoice('create')}
              >
                <div className="action-icon">
                  <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <div className="action-content">
                  <div className="action-title">Create a New Guild</div>
                  <div className="action-desc">Start my own</div>
                </div>
                <div className="action-radio" />
              </div>
            </div>

            <div className="wizard-buttons">
              <button className="btn-back" onClick={() => { setError(null); setStep('profile'); }}>
                Back
              </button>
              <button
                className="btn-continue"
                onClick={handleGuildContinue}
                disabled={!guildChoice}
              >
                Continue
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ─── Step: Guild code ───
  if (step === 'guild-code') {
    return (
      <div className="onboarding-page">
        <div className="wizard-card">
          {renderSteps()}
          <div className="wizard-content">
            <div className="wizard-header">
              <div className="wizard-title-row">
                <div className="header-icon guild">
                  <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2 className="wizard-title">Join a Guild</h2>
              </div>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Enter your invite code</label>
              <input
                type="text"
                className="form-input invite-input"
                placeholder="INVITE CODE"
                value={guildCode}
                onChange={(e) => setGuildCode(e.target.value.toUpperCase())}
                autoFocus
              />
              <p className="form-hint">Invite codes are 6-8 characters and case-insensitive</p>
            </div>

            <div className="wizard-buttons">
              <button className="btn-back" onClick={() => { setError(null); setStep('guild'); }}>
                Back
              </button>
              <button
                className="btn-continue"
                onClick={handleJoinGuild}
                disabled={submitting || !guildCode.trim()}
              >
                {submitting ? 'Joining...' : 'Join Guild'}
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ─── Step: Guild create ───
  if (step === 'guild-create') {
    return (
      <div className="onboarding-page">
        <div className="wizard-card">
          {renderSteps()}
          <div className="wizard-content">
            <div className="wizard-header">
              <div className="wizard-title-row">
                <div className="header-icon guild">
                  <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2 className="wizard-title">Create a Guild</h2>
              </div>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="guildName">Guild Name</label>
              <input
                id="guildName"
                type="text"
                className="form-input"
                placeholder="e.g. Friday Night Gamers"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="wizard-buttons">
              <button className="btn-back" onClick={() => { setError(null); setStep('guild'); }}>
                Back
              </button>
              <button
                className="btn-continue"
                onClick={handleCreateGuild}
                disabled={submitting || !guildName.trim()}
              >
                {submitting ? 'Creating...' : 'Create Guild'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: Household choice ───
  if (step === 'household') {
    return (
      <div className="onboarding-page">
        <div className="wizard-card">
          {renderSteps()}
          <div className="wizard-content">
            <div className="wizard-header">
              <div className="wizard-title-row">
                <div className="header-icon household">
                  <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <h2 className="wizard-title">Set Up Your Household</h2>
              </div>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="info-box">
              <div className="info-visual">
                <div className="household-visual">
                  <div className="floating-shelf-container">
                    <div className="shelf-games">
                      <div className="shelf-game" />
                      <div className="shelf-game" />
                      <div className="shelf-game" />
                      <div className="shelf-game" />
                      <div className="shelf-game" />
                      <div className="shelf-game" />
                      <div className="shelf-game" />
                    </div>
                    <div className="floating-shelf" />
                    <div className="shelf-brackets">
                      <div className="bracket" />
                      <div className="bracket" />
                    </div>
                  </div>
                  <div className="location-tag">
                    <svg className="location-icon" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>Your home</span>
                  </div>
                </div>
              </div>
              <div className="info-text">
                <div className="info-title">Where Your Games Live</div>
                <p className="info-desc">Your primary residence and game library.</p>
              </div>
            </div>

            <div className="action-cards">
              <div
                className={`action-card${householdChoice === 'join' ? ' selected' : ''}`}
                onClick={() => setHouseholdChoice('join')}
              >
                <div className="action-icon">
                  <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div className="action-content">
                  <div className="action-title">Join Existing Household</div>
                  <div className="action-desc">I have an invite code</div>
                </div>
                <div className="action-radio" />
              </div>
              <div
                className={`action-card${householdChoice === 'create' ? ' selected' : ''}`}
                onClick={() => setHouseholdChoice('create')}
              >
                <div className="action-icon">
                  <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <div className="action-content">
                  <div className="action-title">Create My Household</div>
                  <div className="action-desc">Add my games</div>
                </div>
                <div className="action-radio" />
              </div>
            </div>

            <div className="wizard-buttons">
              <button className="btn-back" onClick={() => { setError(null); setStep('guild'); }}>
                Back
              </button>
              <button
                className="btn-continue"
                onClick={handleHouseholdContinue}
                disabled={!householdChoice}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: Household code ───
  if (step === 'household-code') {
    return (
      <div className="onboarding-page">
        <div className="wizard-card">
          {renderSteps()}
          <div className="wizard-content">
            <div className="wizard-header">
              <div className="wizard-title-row">
                <div className="header-icon household">
                  <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <h2 className="wizard-title">Join a Household</h2>
              </div>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Enter your invite code</label>
              <input
                type="text"
                className="form-input invite-input"
                placeholder="INVITE CODE"
                value={householdCode}
                onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
                autoFocus
              />
              <p className="form-hint">Invite codes are 6-8 characters and case-insensitive</p>
            </div>

            <div className="wizard-buttons">
              <button className="btn-back" onClick={() => { setError(null); setStep('household'); }}>
                Back
              </button>
              <button
                className="btn-continue"
                onClick={handleJoinHousehold}
                disabled={submitting || !householdCode.trim()}
              >
                {submitting ? 'Joining...' : 'Join Household'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: Household create ───
  if (step === 'household-create') {
    return (
      <div className="onboarding-page">
        <div className="wizard-card">
          {renderSteps()}
          <div className="wizard-content">
            <div className="wizard-header">
              <div className="wizard-title-row">
                <div className="header-icon household">
                  <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <h2 className="wizard-title">Create a Household</h2>
              </div>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="householdName">Household Name</label>
              <input
                id="householdName"
                type="text"
                className="form-input"
                placeholder="e.g. The Smiths"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="wizard-buttons">
              <button className="btn-back" onClick={() => { setError(null); setStep('household'); }}>
                Back
              </button>
              <button
                className="btn-continue"
                onClick={handleCreateHousehold}
                disabled={submitting || !householdName.trim()}
              >
                {submitting ? 'Creating...' : 'Create Household'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: Complete ───
  if (step === 'complete') {
    return (
      <div className="onboarding-page">
        <div className="wizard-card">
          {renderSteps()}
          <div className="wizard-content">
            <div className="complete-content">
              <div className="confetti-container">
                <div className="confetti-piece" />
                <div className="confetti-piece" />
                <div className="confetti-piece" />
                <div className="confetti-piece" />
                <div className="confetti-piece" />
                <div className="confetti-piece" />
                <div className="confetti-piece" />
                <div className="confetti-piece" />
              </div>
              <div className="complete-icon">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="complete-title">You're All Set!</h2>
              <p className="complete-desc">Welcome to Game Night HQ</p>

              {error && <div className="wizard-error">{error}</div>}

              <div className="setup-summary">
                {joinedGuildName && (
                  <div className="summary-item">
                    <div
                      className="summary-icon"
                      style={{ backgroundColor: getEntityColorHex(joinedGuildColor) }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div className="summary-label">Guild</div>
                    <div className="summary-value">{joinedGuildName}</div>
                  </div>
                )}
                {joinedHouseholdName && (
                  <div className="summary-item">
                    <div
                      className="summary-icon"
                      style={{ backgroundColor: getEntityColorHex(joinedHouseholdColor) }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    </div>
                    <div className="summary-label">Household</div>
                    <div className="summary-value">{joinedHouseholdName}</div>
                  </div>
                )}
              </div>

              <button
                className="btn-enter"
                onClick={handleComplete}
                disabled={submitting}
              >
                {submitting ? 'Loading...' : 'Enter Game Night HQ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
