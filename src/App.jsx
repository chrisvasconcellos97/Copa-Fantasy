import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import HomeView from './views/HomeView';
import LobbyView from './views/LobbyView';
import DraftView from './views/DraftView';
import MatchCenterView from './views/MatchCenterView';
import LeaderboardView from './views/LeaderboardView';
import { getGameId } from './lib/session';
import './index.css';

function NavBar() {
  const gameId = getGameId();
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
        Home
      </NavLink>
      <NavLink to="/matches">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
        Matches
      </NavLink>
      {gameId && (
        <NavLink to={`/leaderboard/${gameId}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
          </svg>
          Scores
        </NavLink>
      )}
      {gameId && (
        <NavLink to={`/draft/${gameId}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Draft
        </NavLink>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/lobby/:gameId" element={<LobbyView />} />
          <Route path="/draft/:gameId" element={<DraftView />} />
          <Route path="/matches" element={<MatchCenterView />} />
          <Route path="/leaderboard/:gameId" element={<LeaderboardView />} />
        </Routes>
        <NavBar />
      </div>
    </BrowserRouter>
  );
}
