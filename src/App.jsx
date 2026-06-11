import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomeView from './views/HomeView.jsx'
import LobbyView from './views/LobbyView.jsx'
import DraftView from './views/DraftView.jsx'
import LeaderboardView from './views/LeaderboardView.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/lobby/:gameId" element={<LobbyView />} />
        <Route path="/draft/:gameId" element={<DraftView />} />
        <Route path="/leaderboard/:gameId" element={<LeaderboardView />} />
      </Routes>
    </BrowserRouter>
  )
}
