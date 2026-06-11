import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomeView from './views/HomeView';
import LobbyView from './views/LobbyView';
import DraftView from './views/DraftView';
import MatchCenterView from './views/MatchCenterView';
import LeaderboardView from './views/LeaderboardView';

function Nav() {
  return (
    <nav className="nav">
      <NavLink to="/" className="nav-logo">
        ⚽ Copa Fantasy
      </NavLink>
      <div className="nav-links">
        <NavLink
          to="/matches"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
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
