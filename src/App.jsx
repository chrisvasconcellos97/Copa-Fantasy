import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomeView from './views/HomeView';
import LobbyView from './views/LobbyView';
import DraftView from './views/DraftView';
import MatchCenterView from './views/MatchCenterView';
import LeaderboardView from './views/LeaderboardView';

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <span className="nav-logo">⚽ Copa Fantasy 2026</span>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/matches" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Matches
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/lobby/:gameId" element={<LobbyView />} />
        <Route path="/draft/:gameId" element={<DraftView />} />
        <Route path="/matches" element={<MatchCenterView />} />
        <Route path="/leaderboard/:gameId" element={<LeaderboardView />} />
      </Routes>
    </BrowserRouter>
  );
}
