import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomeView from './views/HomeView';
import LobbyView from './views/LobbyView';
import DraftView from './views/DraftView';
import MatchCenterView from './views/MatchCenterView';
import LeaderboardView from './views/LeaderboardView';

function Header() {
  return (
    <header className="header">
      <div className="header-logo">⚽ Copa Fantasy</div>
      <nav className="nav">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/matches">Matches</NavLink>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
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
