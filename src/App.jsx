import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomeView from './views/HomeView';
import LobbyView from './views/LobbyView';
import DraftView from './views/DraftView';
import MatchCenterView from './views/MatchCenterView';
import LeaderboardView from './views/LeaderboardView';
import { getGameId } from './lib/session';

function Nav() {
  const gameId = getGameId();
  return (
    <nav className="nav">
      <div className="nav-inner">
        <span className="nav-logo">⚽ Copa Fantasy 2026</span>
        <ul className="nav-links">
          <li><NavLink to="/">Home</NavLink></li>
          <li><NavLink to="/matches">Matches</NavLink></li>
          {gameId && <li><NavLink to={`/leaderboard/${gameId}`}>Leaderboard</NavLink></li>}
        </ul>
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
