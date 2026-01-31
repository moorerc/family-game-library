import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Navbar as BPNavbar,
  NavbarGroup,
  NavbarHeading,
  NavbarDivider,
  Button,
  Alignment,
  Menu,
  MenuItem,
  Popover,
} from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';

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
            <span className="brand-icon">🎲</span>
            <span className="brand-text">Family Game Library</span>
          </Link>
        </NavbarHeading>
      </NavbarGroup>

      <NavbarGroup align={Alignment.RIGHT}>
        {currentUser ? (
          <>
            <Link to="/">
              <Button
                minimal
                icon="grid-view"
                text="Library"
                active={isActive('/')}
              />
            </Link>
            <Link to="/game-night">
              <Button
                minimal
                icon="random"
                text="Game Night"
                active={isActive('/game-night')}
              />
            </Link>
            <NavbarDivider />
            <Popover content={userMenu} placement="bottom-end">
              <Button
                minimal
                icon="user"
                text={userProfile?.displayName || 'Account'}
                rightIcon="caret-down"
              />
            </Popover>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button minimal text="Sign In" active={isActive('/login')} />
            </Link>
            <Link to="/signup">
              <Button intent="primary" text="Get Started" />
            </Link>
          </>
        )}
      </NavbarGroup>
    </BPNavbar>
  );
};
