import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { getSession, setSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { generateUniqueJoinCode } from '../lib/gameCode';
import CopyCode from '../components/CopyCode';
import MascotHint from '../components/MascotHint';

export default function LobbyView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const session = getSession();
  const isHost = session?.hostToken && game?.host_token === session.hostToken;

  const [showSplit, setShowSplit] = useState(false);
  const [groupAssignment, setGroupAssignment] = useState({}); // playerId -> 'A' | 'B'
  const [splitting, setSplitting] = useState(false);

  // Navigate when game status changes from lobby
  useEffect(() => {
    if (game && game.status !== 'lobby') {
      navigate(`/draft/${gameId}`, { replace: true });
    }
  }, [game, gameId, navigate]);

  // Init group assignment when split panel opens
  useEffect(() => {
    if (!showSplit || players.length === 0) return;
    handleRandomSplit();
  }, [showSplit]);

  function handleRandomSplit() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    const assignment = {};
    shuffled.forEach((p, i) => {
      assignment[p.id] = i < half ? 'A' : 'B';
    });
    setGroupAssignment(assignment);
  }

  function togglePlayerGroup(playerId) {
    setGroupAssignment(prev => ({
      ...prev,
      [playerId]: prev[playerId] === 'A' ? 'B' : 'A',
    }));
  }

  async function handleConfirmSplit() {
    const groupA = players.filter(p => groupAssignment[p.id] === 'A');
    const groupB = players.filter(p => groupAssignment[p.id] === 'B');

    if (groupA.length === 0 || groupB.length === 0) {
      alert('Each group needs at least 1 player.');
      return;
    }

    // Host must be in Group A (their game)
    const hostInB = groupB.find(p => p.is_host);
    if (hostInB) {
      alert('You (the host) must stay in Group A. Move yourself to Group A first.');
      return;
    }

    setSplitting(true);
    try {
      // Create Game B with same host_token and settings
      const { data: gameB, error: gameBErr } = await supabase
        .from('games')
        .insert({
          status: 'lobby',
          host_token: game.host_token,
          join_code: await generateUniqueJoinCode(),
          teams_per_player: game.teams_per_player ?? 8,
          players_per_team: game.players_per_team ?? 3,
          linked_game_id: gameId,
        })
        .select()
        .single();
      if (gameBErr) throw gameBErr;

      // Link Game A back to Game B
      const { error: linkErr } = await supabase
        .from('games')
        .update({ linked_game_id: gameB.id })
        .eq('id', gameId);
      if (linkErr) throw linkErr;

      // Move Group B players to Game B by re-pointing their existing row.
      // Re-using the row (rather than insert-then-delete) preserves each
      // player's id and token, so their saved session and rejoin link keep
      // working — and a mid-loop failure can't drop a player entirely.
      for (const player of groupB) {
        const { error: moveErr } = await supabase
          .from('game_players')
          .update({ game_id: gameB.id, is_host: false })
          .eq('id', player.id);
        if (moveErr) throw moveErr;
      }

      // Update session with linked game id
      setSession({ ...session, linkedGameId: gameB.id });

      setShowSplit(false);
      setSplitting(false);
      alert(`Groups split! Group B has its own game. Share the Group B code with them: ${gameB.join_code}`);
    } catch (err) {
      alert('Failed to split groups: ' + err.message);
      setSplitting(false);
    }
  }

  async function handleBootPlayer(playerId) {
    if (!confirm('Remove this player from the lobby?')) return;
    await supabase.from('game_players').delete().eq('id', playerId);
  }

  async function handleStartDraft() {
    if (players.length < 1) {
      alert('Need at least 1 player to start the draft.');
      return;
    }
    const { error } = await supabase
      .from('games')
      .update({ status: 'drafting_teams' })
      .eq('id', gameId);
    if (error) alert('Failed to start draft: ' + error.message);
  }

  if (gameLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading lobby...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page page-narrow">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <p>Game not found.</p>
        </div>
      </div>
    );
  }

  const groupACnt = Object.values(groupAssignment).filter(g => g === 'A').length;
  const groupBCnt = Object.values(groupAssignment).filter(g => g === 'B').length;

  return (
    <div className="page page-narrow">
      <h1 className="page-title">Game Lobby</h1>

      {/* Group switcher if already split */}
      {isHost && game.linked_game_id && (
        <div className="card mb-16" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Groups are split</span>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(255,215,0,0.1)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.3)' }}
            onClick={() => navigate(`/lobby/${game.linked_game_id}`)}
          >
            View Group B →
          </button>
        </div>
      )}

      {/* Join code */}
      <CopyCode code={game.join_code} />

      {/* Players list */}
      <div className="card mt-24">
        <div className="flex items-center justify-between mb-16">
          <span className="section-title" style={{ margin: 0 }}>
            Players ({players.length})
          </span>
          <span className="badge badge-muted">
            Waiting for host...
          </span>
        </div>

        {playersLoading ? (
          <div className="loading" style={{ padding: 24 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((player) => (
              <div
                key={player.id}
                onClick={showSplit && !player.is_host ? () => togglePlayerGroup(player.id) : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(42,42,58,0.3)',
                  border: `1px solid ${player.id === session?.playerId ? 'rgba(255,215,0,0.3)' : 'var(--border)'}`,
                  cursor: showSplit && !player.is_host ? 'pointer' : 'default',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: player.is_host ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {player.is_host ? '👑' : '👤'}
                </div>
                <span style={{ flex: 1, fontWeight: 600, color: player.id === session?.playerId ? 'var(--gold)' : 'var(--text)' }}>
                  {player.player_name}
                  {player.id === session?.playerId && (
                    <span className="text-muted text-xs" style={{ marginLeft: 8 }}>(you)</span>
                  )}
                </span>
                {showSplit && (
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '3px 10px',
                      borderRadius: 100,
                      background: groupAssignment[player.id] === 'A' ? 'rgba(255,215,0,0.15)' : 'rgba(59,130,246,0.15)',
                      color: groupAssignment[player.id] === 'A' ? 'var(--gold)' : 'var(--info)',
                      border: `1px solid ${groupAssignment[player.id] === 'A' ? 'rgba(255,215,0,0.3)' : 'rgba(59,130,246,0.3)'}`,
                    }}
                  >
                    Group {groupAssignment[player.id] || 'A'}
                  </span>
                )}
                {!showSplit && player.is_host && (
                  <span className="badge badge-gold">HOST</span>
                )}
                {isHost && !player.is_host && !showSplit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBootPlayer(player.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem', padding: '2px 6px', opacity: 0.6 }}
                    title="Remove player"
                    aria-label={`Remove ${player.player_name}`}
                  >✕</button>
                )}
              </div>
            ))}

            {players.length === 0 && (
              <div className="empty-state" style={{ padding: 24 }}>
                <p>No players yet</p>
              </div>
            )}
          </div>
        )}

        {/* Split controls */}
        {showSplit && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Group A: {groupACnt} players · Group B: {groupBCnt} players
              </span>
              <button className="btn btn-sm" onClick={handleRandomSplit} style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                🔀 Randomize
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Tap a player to move them between groups. You stay in Group A.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={() => setShowSplit(false)} style={{ flex: 1, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 2 }}
                onClick={handleConfirmSplit}
                disabled={splitting}
              >
                {splitting ? 'Splitting...' : `✂️ Confirm Split`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mascot hint */}
      <MascotHint
        pose={isHost ? 'idle' : 'waiting'}
        message={
          isHost
            ? `Share the code above with your friends. Once everyone's in, hit Start Draft — you'll pick teams in a snake order across all 4 pots.`
            : `You're in! Waiting for the host to start the draft. In the draft you'll take turns picking national teams across 4 pots — strongest nations first.`
        }
        style={{ marginTop: 20 }}
      />

      {/* Host actions */}
      {isHost ? (
        <div className="mt-16" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {players.length > 6 && !showSplit && !game.linked_game_id && (
            <button
              className="btn btn-full"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              onClick={() => setShowSplit(true)}
            >
              ✂️ Split into Groups ({players.length} players)
            </button>
          )}
          {!showSplit && (
            <>
              <button
                className="btn btn-primary btn-full btn-lg"
                onClick={handleStartDraft}
                disabled={players.length < 1}
              >
                🚀 Start Draft ({players.length} player{players.length !== 1 ? 's' : ''})
              </button>
              <p className="text-muted text-sm text-center">
                All players should join before starting the draft
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="card mt-16" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
          <p style={{ fontWeight: 600 }}>Waiting for host to start the draft...</p>
        </div>
      )}
    </div>
  );
}
