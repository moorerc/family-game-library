import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components';
import {
  HomePage,
  AddGamePage,
  LoginPage,
  SignUpPage,
  HouseholdPage,
} from './pages';

const App: React.FC = () => {
  return (
    <div className="app bp5-dark">
      <Navbar />
      <main className="app-main">
        <div className="app-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
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
