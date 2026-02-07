import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components';
import {
  HomePage,
  AddGamePage,
  LoginPage,
  SignUpPage,
  ProfileSetupPage,
  HouseholdPage,
  HouseholdDetailPage,
  HouseholdEditPage,
  GuildPage,
  GuildEditPage,
  GameNightLandingPage,
  GameNightPlayersPage,
  GameNightLocationPage,
  GameNightSessionPage,
  SplashPage,
  ProfilePage,
  ProfileEditPage,
  OnboardingPage,
} from './pages';
import { useAuth } from './context/AuthContext';
import { GameNightProvider } from './context/GameNightContext';

const App: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  // Show splash page for unauthenticated users on root path
  // but allow access to login/signup/onboarding pages
  const isAuthPage = ['/login', '/signup', '/profile-setup', '/household', '/onboarding'].includes(location.pathname);

  if (!loading && !currentUser && !isAuthPage) {
    return <SplashPage />;
  }

  // Redirect new users who haven't completed onboarding
  const needsOnboarding =
    !loading &&
    currentUser &&
    userProfile &&
    !userProfile.onboardingComplete &&
    !userProfile.profileComplete &&
    location.pathname !== '/onboarding';

  return (
    <GameNightProvider>
      <div className="app">
        <Navbar />
        <main className="app-main">
          <div className="app-container">
            <Routes>
              <Route path="/" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <HomePage />} />
              <Route path="/game-night" element={<GameNightLandingPage />} />
              <Route path="/game-night/new/players" element={<GameNightPlayersPage />} />
              <Route path="/game-night/new/location" element={<GameNightLocationPage />} />
              <Route path="/game-night/session" element={<GameNightSessionPage />} />
              <Route path="/add" element={<AddGamePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/profile-setup" element={<ProfileSetupPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/household" element={<HouseholdPage />} />
              <Route path="/household/:id" element={<HouseholdDetailPage />} />
              <Route path="/household/:id/edit" element={<HouseholdEditPage />} />
              <Route path="/guild/:id" element={<GuildPage />} />
              <Route path="/guild/:id/edit" element={<GuildEditPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/edit" element={<ProfileEditPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </GameNightProvider>
  );
};

export default App;
