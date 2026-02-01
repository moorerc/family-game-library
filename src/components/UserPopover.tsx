import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { guildsService } from '../services/guilds';
import { householdsService } from '../services/households';
import type { Guild, Household } from '../types';
import { getEntityColorHex } from '../types';

interface UserPopoverProps {
  onClose?: () => void;
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

export const UserPopover: React.FC<UserPopoverProps> = ({ onClose }) => {
  const { currentUser, userProfile, logout, updateActiveGuild } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch user's guilds and households
  const fetchData = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const [userGuilds, allHouseholds] = await Promise.all([
        guildsService.getUserGuilds(currentUser.uid),
        householdsService.getAllHouseholds(),
      ]);
      setGuilds(userGuilds);
      // Filter to only households the user is a member of
      const userHouseholds = allHouseholds.filter(h => h.members.includes(currentUser.uid));
      setHouseholds(userHouseholds);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Fetch data when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSwitchGuild = async (guildId: string) => {
    try {
      await updateActiveGuild(guildId);
      setIsOpen(false);
      // Refresh the page to update the library view
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch guild:', error);
    }
  };

  const handleMenuItemClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="user-popover-container">
      <button
        ref={buttonRef}
        className="user-menu"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="user-avatar">{getInitials(userProfile?.displayName)}</div>
        <span className="user-name">{userProfile?.displayName || 'Account'}</span>
        <Icon icon="chevron-down" size={16} />
      </button>

      {isOpen && (
        <div ref={popoverRef} className="user-popover">
          {/* User Header */}
          <div className="popover-header">
            <div className="popover-avatar">
              {getInitials(userProfile?.displayName)}
            </div>
            <div className="popover-user-info">
              <div className="popover-user-name">{userProfile?.displayName}</div>
              <div className="popover-user-email">{userProfile?.email}</div>
            </div>
          </div>

          {/* Guild Switcher */}
          {guilds.length > 0 && (
            <div className="popover-section">
              <div className="popover-section-label">Your Guilds</div>
              <div className="popover-guilds">
                {loading ? (
                  <div className="popover-loading">Loading...</div>
                ) : (
                  guilds.map(guild => (
                    <button
                      key={guild.id}
                      className={`popover-guild ${
                        userProfile?.activeGuildId === guild.id ? 'active' : ''
                      }`}
                      onClick={() => handleSwitchGuild(guild.id)}
                    >
                      <div
                        className="guild-avatar"
                        style={{ backgroundColor: getEntityColorHex(guild.color) }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      </div>
                      <span className="guild-name">{guild.name}</span>
                      {userProfile?.activeGuildId === guild.id && (
                        <Icon icon="tick" size={14} className="guild-check" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Households */}
          {households.length > 0 && (
            <div className="popover-section">
              <div className="popover-section-label">Your Households</div>
              <div className="popover-households">
                {loading ? (
                  <div className="popover-loading">Loading...</div>
                ) : (
                  households.map(household => (
                    <Link
                      key={household.id}
                      to={`/household/${household.id}`}
                      className="popover-household"
                      onClick={handleMenuItemClick}
                    >
                      <div
                        className="household-avatar"
                        style={{ backgroundColor: getEntityColorHex(household.color) }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <rect x="9" y="12" width="6" height="10" fill="currentColor" opacity="0.3"/>
                        </svg>
                      </div>
                      <span className="household-name">{household.name}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="popover-menu">
            <Link
              to="/profile"
              className="popover-item"
              onClick={handleMenuItemClick}
            >
              <Icon icon="person" size={16} />
              <span>My Profile</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="popover-footer">
            <button className="popover-item danger" onClick={handleLogout}>
              <Icon icon="log-out" size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
