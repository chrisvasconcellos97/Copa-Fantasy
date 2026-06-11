import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomeView from './views/HomeView';
import LobbyView from './views/LobbyView';
import DraftView from './views/DraftView';
import MatchCenterView from './views/MatchCenterView';
import LeaderboardView from './views/LeaderboardView';
import './index.css';

function Nav() {
  return (
    <nav className="nav">
      <NavLink to="/" className="nav-brand">⚽ Copa Fantasy 2026</NavLink>
      <div className="nav-links">
        <NavLink to="/matches" className={({ isActive }) => `btn btn-ghost btn-sm${isActive ? ' text-gold' : ''}`}>
          Matches
        </NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
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
