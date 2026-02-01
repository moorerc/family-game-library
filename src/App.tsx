import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components';
import {
  HomePage,
  AddGamePage,
  LoginPage,
  SignUpPage,
  HouseholdPage,
  GameNightPage,
  SplashPage,
} from './pages';
import { useAuth } from './context/AuthContext';

const App: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show splash page for unauthenticated users on root path
  // but allow access to login/signup pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  if (!loading && !currentUser && !isAuthPage) {
    return <SplashPage />;
  }

  return (
    <div className="app">
      <Navbar />
      <main className="app-main">
        <div className="app-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game-night" element={<GameNightPage />} />
            <Route path="/add" element={<AddGamePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/household" element={<HouseholdPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
