import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Icon, Spinner } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { householdsService } from '../services/households';
import { guildsService } from '../services/guilds';
import { gamesService } from '../services/games';
import { useUserPreferences } from '../hooks/useUserPreferences';
import type { Household, Game, Guild } from '../types';
import { getEntityColorHex } from '../types';

interface MemberInfo {
  id: string;
  displayName: string;
  email: string;
}

interface HouseholdWithDetails extends Household {
  gameCount: number;
  memberUsers: MemberInfo[];
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

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, loading: authLoading, updateActiveGuild } = useAuth();
  const { preferences, loading: prefsLoading } = useUserPreferences();
  const [households, setHouseholds] = useState<HouseholdWithDetails[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);

  // Guild management state
  const [showCreateGuild, setShowCreateGuild] = useState(false);
  const [showJoinGuild, setShowJoinGuild] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [guildInviteCode, setGuildInviteCode] = useState('');
  const [guildLoading, setGuildLoading] = useState(false);
  const [guildError, setGuildError] = useState<string | null>(null);

  // Fetch user's guilds
  const fetchGuilds = useCallback(async () => {
    if (!currentUser) return;
    try {
      const userGuilds = await guildsService.getUserGuilds(currentUser.uid);
      setGuilds(userGuilds);
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchGuilds();
  }, [fetchGuilds]);

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newGuildName.trim()) return;

    setGuildLoading(true);
    setGuildError(null);

    try {
      const guildId = await guildsService.createGuild(newGuildName.trim(), currentUser.uid);
      await updateActiveGuild(guildId);
      await fetchGuilds();
      setNewGuildName('');
      setShowCreateGuild(false);
    } catch (error) {
      setGuildError(error instanceof Error ? error.message : 'Failed to create guild');
    } finally {
      setGuildLoading(false);
    }
  };

  const handleJoinGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !guildInviteCode.trim()) return;

    setGuildLoading(true);
    setGuildError(null);

    try {
      const guildId = await guildsService.joinGuildByCode(guildInviteCode.trim().toUpperCase(), currentUser.uid);
      if (!guildId) {
        setGuildError('Invalid invite code. Please check and try again.');
        return;
      }
      await updateActiveGuild(guildId);
      await fetchGuilds();
      setGuildInviteCode('');
      setShowJoinGuild(false);
    } catch (error) {
      setGuildError(error instanceof Error ? error.message : 'Failed to join guild');
    } finally {
      setGuildLoading(false);
    }
  };

  // Fetch user's households with details
  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    const fetchHouseholds = async () => {
      try {
        const allHouseholds = await householdsService.getAllHouseholds();

        if (cancelled) return;

        const userHouseholds = allHouseholds.filter(h => h.members.includes(currentUser.uid));

        if (userHouseholds.length === 0) {
          setHouseholds([]);
          return;
        }

        // Get additional details for each household
        const householdsWithDetails = await Promise.all(
          userHouseholds.map(async (household) => {
            const gameCount = await householdsService.getHouseholdGameCount(household.id);
            const memberUsers = await householdsService.getHouseholdMembers(household.id);

            return {
              ...household,
              gameCount,
              memberUsers,
              isOwner: household.createdBy === currentUser.uid,
            };
          })
        );

        if (!cancelled) {
          setHouseholds(householdsWithDetails);
        }
      } catch (error) {
        console.error('Failed to fetch households:', error);
      }
    };

    fetchHouseholds();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Fetch favorite games
  useEffect(() => {
    if (!currentUser || prefsLoading) return;

    const fetchFavoriteGames = async () => {
      try {
        const favoriteGameIds: string[] = [];
        preferences.forEach((pref, gameId) => {
          if (pref.isFavorite) {
            favoriteGameIds.push(gameId);
          }
        });

        if (favoriteGameIds.length > 0) {
          const games = await gamesService.getGamesByIds(favoriteGameIds.slice(0, 6));
          setFavoriteGames(games);
        } else {
          setFavoriteGames([]);
        }
      } catch (error) {
        console.error('Failed to fetch favorite games:', error);
      }
    };

    fetchFavoriteGames();
  }, [currentUser, preferences, prefsLoading]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="profile-page">
        <div className="empty-state">
          <Spinner size={40} />
        </div>
      </div>
    );
  }

  const memberSince = userProfile?.createdAt
    ? formatDate(userProfile.createdAt)
    : 'Unknown';

  // Get total favorite count for display
  const totalFavorites = Array.from(preferences.values()).filter(p => p.isFavorite).length;
  // Show 3 thumbnails, so remaining is total minus 3
  const remainingFavorites = Math.max(0, totalFavorites - 3);

  // Get display names for favorites text (first 3 games)
  const favoriteNames = favoriteGames.slice(0, 3).map(g => g.name);

  return (
    <div className="profile-page-wrapper">
    <div className="profile-page">
      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="avatar-large">
          {getInitials(userProfile?.displayName)}
        </div>
        <div className="profile-header-info">
          <div className="profile-header-name">{userProfile?.displayName}</div>
          <div className="profile-header-email">{userProfile?.email}</div>
          <div className="profile-header-meta">
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Member since {memberSince}
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              {households.length} household{households.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="profile-header-actions">
          <Link to="/profile/edit" className="profile-edit-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Guilds Section */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h2 className="section-title-with-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Guilds
          </h2>
        </div>
        <div className="profile-section-content">
          {guildError && (
            <div className="form-error-message" style={{ marginBottom: '16px' }}>
              {guildError}
            </div>
          )}

          {guilds.length === 0 && !showCreateGuild && !showJoinGuild ? (
            <div className="empty-state">
              <Icon icon="shield" size={32} />
              <p>You haven't joined any guilds yet.</p>
              <div className="empty-state-actions">
                <button
                  className="btn-primary"
                  onClick={() => { setShowCreateGuild(true); setShowJoinGuild(false); setGuildError(null); }}
                >
                  Create a Guild
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => { setShowJoinGuild(true); setShowCreateGuild(false); setGuildError(null); }}
                >
                  Join with Invite Code
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="guilds-list">
                {guilds.map(guild => (
                  <Link key={guild.id} to={`/guild/${guild.id}`} className="guild-row">
                    <div className="guild-row-info">
                      <div
                        className="guild-row-avatar"
                        style={{ backgroundColor: getEntityColorHex(guild.color) }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="guild-row-name">{guild.name}</div>
                        <div className="guild-row-meta">
                          <span>{guild.members.length} member{guild.members.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="guild-row-right">
                      {userProfile?.activeGuildId === guild.id && (
                        <span className="active-badge">Active</span>
                      )}
                      <div className={`role-badge ${guild.createdBy === currentUser?.uid ? 'owner' : 'member'}`}>
                        {guild.createdBy === currentUser?.uid ? 'Owner' : 'Member'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Create/Join buttons when guilds exist */}
              {!showCreateGuild && !showJoinGuild && (
                <div className="guild-actions">
                  <button
                    className="btn-text"
                    onClick={() => { setShowCreateGuild(true); setShowJoinGuild(false); setGuildError(null); }}
                  >
                    + Create new guild
                  </button>
                  <button
                    className="btn-text"
                    onClick={() => { setShowJoinGuild(true); setShowCreateGuild(false); setGuildError(null); }}
                  >
                    Join with code
                  </button>
                </div>
              )}
            </>
          )}

          {/* Create Guild Form */}
          {showCreateGuild && (
            <form onSubmit={handleCreateGuild} className="guild-form">
              <div className="form-group">
                <label htmlFor="guildName" className="form-label">Guild Name</label>
                <input
                  id="guildName"
                  type="text"
                  className="form-input"
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value)}
                  placeholder="e.g., Friday Night Games"
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => { setShowCreateGuild(false); setNewGuildName(''); setGuildError(null); }}
                  disabled={guildLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guildLoading || !newGuildName.trim()}
                >
                  {guildLoading ? 'Creating...' : 'Create Guild'}
                </button>
              </div>
            </form>
          )}

          {/* Join Guild Form */}
          {showJoinGuild && (
            <form onSubmit={handleJoinGuild} className="guild-form">
              <div className="form-group">
                <label htmlFor="inviteCode" className="form-label">Invite Code</label>
                <input
                  id="inviteCode"
                  type="text"
                  className="form-input"
                  value={guildInviteCode}
                  onChange={(e) => setGuildInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => { setShowJoinGuild(false); setGuildInviteCode(''); setGuildError(null); }}
                  disabled={guildLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guildLoading || !guildInviteCode.trim()}
                >
                  {guildLoading ? 'Joining...' : 'Join Guild'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Households Section */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h2 className="section-title-with-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Households
          </h2>
        </div>
        <div className="profile-section-content">
          {households.length === 0 ? (
            <div className="empty-state">
              <Icon icon="home" size={32} />
              <p>You haven't joined any households yet.</p>
            </div>
          ) : (
            <div className="households-list">
              {households.map(household => (
                <Link key={household.id} to={`/household/${household.id}`} className="household-row clickable">
                  <div className="household-row-info">
                    <div
                      className="household-row-avatar"
                      style={{ backgroundColor: getEntityColorHex(household.color) }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <rect x="9" y="12" width="6" height="10" fill="currentColor" opacity="0.3"/>
                      </svg>
                    </div>
                    <div>
                      <div className="household-row-name">{household.name}</div>
                      <div className="household-row-meta">
                        <span>{household.gameCount} game{household.gameCount !== 1 ? 's' : ''}</span>
                        <span className="meta-separator">·</span>
                        <div className="avatar-stack">
                          {household.memberUsers.slice(0, 4).map((member, idx) => (
                            <div
                              key={member.id}
                              className={`stack-avatar ${idx === 0 ? 'yellow' : idx === 2 ? 'navy' : ''}`}
                              title={member.displayName}
                            >
                              {getInitials(member.displayName)}
                            </div>
                          ))}
                          {household.memberUsers.length > 4 && (
                            <div className="stack-avatar stack-more">
                              +{household.memberUsers.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`role-badge ${household.isOwner ? 'owner' : 'member'}`}>
                    {household.isOwner ? 'Owner' : 'Member'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Game Preferences Section */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h2 className="section-title-with-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Game Preferences
          </h2>
        </div>
        <div className="profile-section-content">
          {/* Favorite Games Subsection */}
          <div className="pref-group">
            <div className="pref-label">Favorite Games</div>
            {favoriteGames.length === 0 ? (
              <div className="empty-state-inline">
                <p>You haven't favorited any games yet.</p>
              </div>
            ) : (
              <div className="favorites-collapsed">
                <div className="favorites-preview-stack">
                  {favoriteGames.slice(0, 3).map(game => (
                    <div key={game.id} className="preview-thumb">
                      {game.imageUrl ? (
                        <img src={game.imageUrl} alt={game.name} />
                      ) : (
                        <div className="preview-thumb-placeholder" />
                      )}
                    </div>
                  ))}
                  {remainingFavorites > 0 && (
                    <div className="preview-more">+{remainingFavorites}</div>
                  )}
                </div>
                <span className="favorites-text">
                  <strong>{favoriteNames[0]}</strong>
                  {favoriteNames.length > 1 && `, ${favoriteNames.slice(1).join(', ')}`}
                  {remainingFavorites > 0 && `, and ${remainingFavorites} others`}
                </span>
                <Link to="/?favorites=true" className="btn-view-all">View all</Link>
              </div>
            )}
          </div>

          {/* Preferred Player Counts - Coming Soon */}
          <div className="pref-group coming-soon-inline">
            <div className="pref-label">
              Preferred Player Counts
              <span className="coming-soon-tag">Coming Soon</span>
            </div>
            <div className="pref-tags">
              <span className="pref-tag muted">—</span>
            </div>
          </div>

          {/* Favorite Game Types - Coming Soon */}
          <div className="pref-group coming-soon-inline">
            <div className="pref-label">
              Favorite Game Types
              <span className="coming-soon-tag">Coming Soon</span>
            </div>
            <div className="pref-tags">
              <span className="pref-tag muted">—</span>
            </div>
          </div>
        </div>
      </div>

      {/* Play Statistics Section - Coming Soon */}
      <div className="profile-section coming-soon-section">
        <div className="profile-section-header">
          <h2 className="section-title-with-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Play Statistics
          </h2>
          <span className="coming-soon-badge">Coming Soon</span>
        </div>
        <div className="profile-section-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">—</div>
              <div className="stat-label">Games Played</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">—</div>
              <div className="stat-label">Wins</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">—</div>
              <div className="stat-label">Win Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">—</div>
              <div className="stat-label">Unique Games</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
