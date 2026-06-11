import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomeView from './views/HomeView.jsx';
import LobbyView from './views/LobbyView.jsx';
import DraftView from './views/DraftView.jsx';
import MatchCenterView from './views/MatchCenterView.jsx';
import LeaderboardView from './views/LeaderboardView.jsx';

function Nav() {
  return (
    <nav className="nav">
      <NavLink to="/" className="nav__logo">⚽ Copa Fantasy</NavLink>
      <div className="nav__links">
        <NavLink to="/" className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`} end>
          Home
        </NavLink>
        <NavLink to="/matches" className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}>
          Matches
        </NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Nav />
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/lobby/:gameId" element={<LobbyView />} />
          <Route path="/draft/:gameId" element={<DraftView />} />
          <Route path="/matches" element={<MatchCenterView />} />
          <Route path="/leaderboard/:gameId" element={<LeaderboardView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
