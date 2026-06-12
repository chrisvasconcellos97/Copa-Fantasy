import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomeView from './views/HomeView';
import LobbyView from './views/LobbyView';
import DraftView from './views/DraftView';
import MatchCenterView from './views/MatchCenterView';
import LeaderboardView from './views/LeaderboardView';
import PointsModal from './components/PointsModal';
import { getSession } from './lib/session';

function Nav() {
  const [session, setSession] = useState(() => getSession());
  const [showPoints, setShowPoints] = useState(false);

  useEffect(() => {
    function onStorage() { setSession(getSession()); }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <>
      <nav className="nav">
        <NavLink to="/" className="nav-brand" style={{ textDecoration: 'none' }}>
          ⚽ Copa Fantasy
        </NavLink>
        <div className="nav-links">
          <button
            onClick={() => setShowPoints(true)}
            className="nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--gold)' }}
          >
            Points
          </button>
          <NavLink
            to="/matches"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            Matches
          </NavLink>
          {session?.gameId && (
            <NavLink
              to={`/leaderboard/${session.gameId}`}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              Leaderboard
            </NavLink>
          )}
        </div>
      </nav>
      {showPoints && <PointsModal onClose={() => setShowPoints(false)} />}
    </>
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
