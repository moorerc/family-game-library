import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Navbar as BPNavbar,
  NavbarGroup,
  NavbarHeading,
  Alignment,
  Icon,
} from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { UserPopover } from './UserPopover';

const HQLogo: React.FC = () => (
  <div className="logo-icon">HQ</div>
);

export const Navbar: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const isAuthFlow = ['/login', '/signup', '/profile-setup', '/onboarding'].includes(location.pathname);

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
        {currentUser && !isAuthFlow ? (
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
            <UserPopover />
          </>
        ) : null}
      </NavbarGroup>
    </BPNavbar>
  );
};
