import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { householdsService } from '../services/households';
import type { Household } from '../types';

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
  const { currentUser, userProfile, logout, updateUserHousehold } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch user's households
  const fetchHouseholds = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const allHouseholds = await householdsService.getAllHouseholds();
      // Filter to only households where user is a member
      const userHouseholds = allHouseholds.filter(
        h => h.members.includes(currentUser.uid)
      );
      setHouseholds(userHouseholds);
    } catch (error) {
      console.error('Failed to fetch households:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Fetch households when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchHouseholds();
    }
  }, [isOpen, fetchHouseholds]);

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

  const handleSwitchHousehold = async (householdId: string) => {
    try {
      await updateUserHousehold(householdId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch household:', error);
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

          {/* Household Switcher */}
          {households.length > 0 && (
            <div className="popover-section">
              <div className="popover-section-label">Your Households</div>
              <div className="popover-households">
                {loading ? (
                  <div className="popover-loading">Loading...</div>
                ) : (
                  households.map(household => (
                    <button
                      key={household.id}
                      className={`popover-household ${
                        userProfile?.householdId === household.id ? 'active' : ''
                      }`}
                      onClick={() => handleSwitchHousehold(household.id)}
                    >
                      <div className="household-icon">
                        <Icon icon="home" size={14} />
                      </div>
                      <span className="household-name">{household.name}</span>
                      {userProfile?.householdId === household.id && (
                        <Icon icon="tick" size={14} className="household-check" />
                      )}
                    </button>
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
            <Link
              to="/household"
              className="popover-item"
              onClick={handleMenuItemClick}
            >
              <Icon icon="cog" size={16} />
              <span>Household Settings</span>
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
