import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import HomeView from './views/HomeView';
import LobbyView from './views/LobbyView';
import DraftView from './views/DraftView';
import MatchCenterView from './views/MatchCenterView';
import LeaderboardView from './views/LeaderboardView';

function Nav() {
  return (
    <nav className="nav">
      <NavLink to="/" className="nav-brand" style={{ textDecoration: 'none' }}>
        ⚽ Copa Fantasy
      </NavLink>
      <div className="nav-links">
        <NavLink
          to="/matches"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
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
