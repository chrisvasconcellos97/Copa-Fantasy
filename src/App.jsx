import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import HomeView from './views/HomeView';
import LobbyView from './views/LobbyView';
import DraftView from './views/DraftView';
import MatchCenterView from './views/MatchCenterView';
import LeaderboardView from './views/LeaderboardView';
import CombinedLeaderboardView from './views/CombinedLeaderboardView';
import StatsView from './views/StatsView';
import PointsModal from './components/PointsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { getSession, clearSession } from './lib/session';

function Nav() {
  const [session, setSession] = useState(() => getSession());
  const [showPoints, setShowPoints] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onStorage() { setSession(getSession()); }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function handleLeave() {
    if (!confirm('Leave this game? You can rejoin later using the game code and your name.')) return;
    clearSession();
    localStorage.removeItem('cf_game_id');
    setSession(null);
    navigate('/');
  }

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
          <NavLink
            to="/stats"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            Stats
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
          {session?.gameId && (
            <button
              onClick={handleLeave}
              className="nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 600 }}
            >
              Leave
            </button>
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
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/lobby/:gameId" element={<LobbyView />} />
            <Route path="/draft/:gameId" element={<DraftView />} />
            <Route path="/matches" element={<MatchCenterView />} />
            <Route path="/leaderboard/:gameId" element={<LeaderboardView />} />
            <Route path="/combined/:gameId" element={<CombinedLeaderboardView />} />
            <Route path="/stats" element={<StatsView />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}
