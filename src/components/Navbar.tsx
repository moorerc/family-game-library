import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Navbar as BPNavbar,
  NavbarGroup,
  NavbarHeading,
  NavbarDivider,
  Alignment,
  Menu,
  MenuItem,
  Popover,
  Icon,
} from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';

const HQLogo: React.FC = () => (
  <div className="logo-icon">HQ</div>
);

const getInitials = (name: string | undefined): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const Navbar: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const userMenu = (
    <Menu>
      <MenuItem icon="home" text="My Household" />
      <MenuItem icon="cog" text="Settings" />
      <NavbarDivider />
      <MenuItem icon="log-out" text="Sign Out" onClick={handleLogout} />
    </Menu>
  );

  return (
    <BPNavbar className="app-navbar" fixedToTop>
      <NavbarGroup align={Alignment.LEFT}>
        <NavbarHeading>
          <Link to="/" className="navbar-brand">
            <HQLogo />
            <div className="logo-text">
              GAME<br /><span className="night">NIGHT</span>
            </div>
          </Link>
        </NavbarHeading>
      </NavbarGroup>

      <NavbarGroup align={Alignment.RIGHT}>
        {currentUser ? (
          <>
            <nav className="nav">
              <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                <Icon icon="grid-view" size={18} />
                Library
              </Link>
              <Link to="/game-night" className={`nav-item ${isActive('/game-night') ? 'active' : ''}`}>
                <Icon icon="layers" size={18} />
                Game Night
              </Link>
            </nav>
            <Popover content={userMenu} placement="bottom-end">
              <button className="user-menu">
                <div className="user-avatar">{getInitials(userProfile?.displayName)}</div>
                <span className="user-name">{userProfile?.displayName || 'Account'}</span>
                <Icon icon="chevron-down" size={16} />
              </button>
            </Popover>
          </>
        ) : (
          <>
            <Link to="/login" className={`nav-item ${isActive('/login') ? 'active' : ''}`}>
              Sign In
            </Link>
            <Link to="/signup">
              <button className="add-game-btn">Get Started</button>
            </Link>
          </>
        )}
      </NavbarGroup>
    </BPNavbar>
  );
};
