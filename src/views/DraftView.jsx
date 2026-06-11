import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame.js';
import { usePlayers } from '../hooks/usePlayers.js';
import { useDraft } from '../hooks/useDraft.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { getSession } from '../lib/session.js';
import { supabase } from '../lib/supabase.js';
import { getCurrentPicker, getSnakeOrder } from '../lib/draft.js';
import { FALLBACK_POTS } from '../lib/constants.js';
import TeamCard from '../components/TeamCard.jsx';
import ConfirmBar from '../components/ConfirmBar.jsx';
import SnakeOrderBar from '../components/SnakeOrderBar.jsx';
import HostDashboard from '../components/HostDashboard.jsx';
import SquadBuilder from '../components/SquadBuilder.jsx';
import PokeToast from '../components/PokeToast.jsx';
import PlayerCard from '../components/PlayerCard.jsx';
import CaptainGrid from '../components/CaptainGrid.jsx';

const TOTAL_ROUNDS = 8;

function buildFallbackTeams() {
  const teams = [];
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    for (const name of names) {
      teams.push({ api_id: name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''), name, logo_url: null, pot: Number(pot) });
    }
  }
  return teams;
}

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks, loading: picksLoading } = useDraft(gameId);
  const session = getSession();
  const myPlayerId = session?.playerId;
  const isHost = Boolean(session?.hostToken);

  const { showPoke, dismissPoke, pokeMessage } = useNotifications(myPlayerId);

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Player picks phase
  const [dbPlayers, setDbPlayers] = useState([]);
  const [myPlayerPicks, setMyPlayerPicks] = useState([]);
  const [activeTeamTab, setActiveTeamTab] = useState(0);
  const [playerPicksLoading, setPlayerPicksLoading] = useState(false);

  // Captain phase
  const [captainPickId, setCaptainPickId] = useState(null);
  const [captainSubmitting, setCaptainSubmitting] = useState(false);

  // Load teams from DB or fallback
  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase.from('teams').select('*');
      if (data && data.length > 0) {
        setTeams(data);
      } else {
        setTeams(buildFallbackTeams());
      }
    }
    loadTeams();
  }, []);

  // Load player picks for my teams
  useEffect(() => {
    if (game?.status !== 'selecting_players' && game?.status !== 'selecting_captain') return;
    async function loadPlayerPicks() {
      const { data } = await supabase
        .from('player_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId);
      setMyPlayerPicks(data || []);
    }
    loadPlayerPicks();
  }, [game?.status, gameId, myPlayerId]);

  // Load captain pick
  useEffect(() => {
    if (game?.status !== 'selecting_captain') return;
    async function loadCaptainPick() {
      const { data } = await supabase
        .from('captain_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId)
        .single();
      if (data) setCaptainPickId(data.player_api_id);
    }
    loadCaptainPick();
  }, [game?.status, gameId, myPlayerId]);

  // Redirect when tournament starts
  useEffect(() => {
    if (game?.status === 'tournament' || game?.status === 'complete') {
      navigate(`/leaderboard/${gameId}`, { replace: true });
    }
  }, [game?.status, gameId, navigate]);

  // Load squad for active team tab (selecting_players phase)
  useEffect(() => {
    if (game?.status !== 'selecting_players') return;
    const myTeams = getMyDraftTeams();
    if (!myTeams[activeTeamTab]) return;
    const teamApiId = myTeams[activeTeamTab].api_id;

    setPlayerPicksLoading(true);
    supabase.from('players').select('*').eq('team_api_id', teamApiId).then(({ data }) => {
      setDbPlayers(prev => {
        const filtered = (prev || []).filter(p => p.team_api_id !== teamApiId);
        return [...filtered, ...(data || [])];
      });
      setPlayerPicksLoading(false);
    });
  }, [activeTeamTab, game?.status]);

  const currentPickerIndex = getCurrentPicker(picks, players, TOTAL_ROUNDS);
  const snakeOrder = getSnakeOrder(players, TOTAL_ROUNDS);
  const isMyTurn = players[currentPickerIndex]?.id === myPlayerId;
  const draftComplete = picks.length >= players.length * TOTAL_ROUNDS;

  function getMyDraftTeams() {
    const myPicks = picks.filter(p => p.game_player_id === myPlayerId);
    return myPicks.map(p => teams.find(t => t.api_id === p.team_api_id)).filter(Boolean);
  }

  function getTakenByName(teamApiId) {
    const pick = picks.find(p => p.team_api_id === teamApiId);
    if (!pick) return null;
    const player = players.find(p => p.id === pick.game_player_id);
    return player?.player_name || 'Someone';
  }

  async function handleConfirmPick() {
    if (!selectedTeam || !isMyTurn || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from('draft_picks').insert({
        game_id: gameId,
        game_player_id: myPlayerId,
        pick_number: picks.length + 1,
        team_api_id: selectedTeam.api_id,
      });
      setSelectedTeam(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePoke(player) {
    await supabase.from('notifications').insert({
      game_player_id: player.id,
      type: 'poke',
      message: "It's your turn to pick! ⚡",
      read: false,
    });
  }

  async function advancePhase() {
    const phases = {
      drafting_teams: 'selecting_players',
      selecting_players: 'selecting_captain',
      selecting_captain: 'tournament',
    };
    const next = phases[game?.status];
    if (next) {
      await supabase.from('games').update({ status: next }).eq('id', gameId);
    }
  }

  async function handlePlayerPick(player) {
    const myTeams = getMyDraftTeams();
    const currentTeam = myTeams[activeTeamTab];
    if (!currentTeam) return;

    const alreadyPicked = myPlayerPicks.some(p => p.player_api_id === player.api_id);
    if (alreadyPicked) {
      // Deselect
      await supabase.from('player_picks')
        .delete()
        .eq('game_id', gameId)
        .eq('game_player_id', myPlayerId)
        .eq('player_api_id', player.api_id);
      setMyPlayerPicks(prev => prev.filter(p => p.player_api_id !== player.api_id));
      return;
    }

    const teamPicks = myPlayerPicks.filter(p => p.team_api_id === currentTeam.api_id);
    if (teamPicks.length >= 3) return; // max 3 per team

    const { data } = await supabase.from('player_picks').insert({
      game_id: gameId,
      game_player_id: myPlayerId,
      player_api_id: player.api_id,
      team_api_id: currentTeam.api_id,
    }).select().single();

    if (data) setMyPlayerPicks(prev => [...prev, data]);
  }

  async function handleSelectCaptain(player) {
    setCaptainSubmitting(true);
    try {
      // Upsert captain pick
      await supabase.from('captain_picks')
        .upsert({ game_id: gameId, game_player_id: myPlayerId, player_api_id: player.api_id }, { onConflict: 'game_id,game_player_id' });
      setCaptainPickId(player.api_id);
    } finally {
      setCaptainSubmitting(false);
    }
  }

  if (gameLoading || playersLoading || picksLoading) {
    return (
      <div className="page">
        <div className="loading"><div className="spinner" /></div>
      </div>
    );
  }

  const status = game?.status;

  // ===== DRAFTING TEAMS PHASE =====
  if (status === 'drafting_teams') {
    const takenTeamIds = new Set(picks.map(p => p.team_api_id));

    return (
      <div className="page-wide">
        <PokeToast message={showPoke ? pokeMessage : ''} onDismiss={dismissPoke} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)' }}>Team Draft</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isMyTurn && <span className="badge badge-gold" style={{ animation: 'pulse-gold 1.5s infinite' }}>Your Turn!</span>}
            {!isMyTurn && currentPickerIndex >= 0 && (
              <span className="badge badge-muted">
                {players[currentPickerIndex]?.player_name}'s turn
              </span>
            )}
            {isHost && draftComplete && (
              <button className="btn btn-primary btn-sm" onClick={advancePhase}>
                Next Phase →
              </button>
            )}
          </div>
        </div>

        <SnakeOrderBar players={players} currentPickerIndex={currentPickerIndex} myPlayerId={myPlayerId} />

        <div style={{ display: 'grid', gridTemplateColumns: isHost ? '1fr 280px' : '1fr', gap: 20, marginTop: 16 }}>
          <div>
            <SquadBuilder picks={picks} teams={teams} myPlayerId={myPlayerId} />
            <div className="team-grid mt-16">
              {teams.map(team => {
                const taken = takenTeamIds.has(team.api_id);
                const takenBy = taken ? getTakenByName(team.api_id) : null;
                const isSelected = selectedTeam?.api_id === team.api_id;
                return (
                  <TeamCard
                    key={team.api_id}
                    team={team}
                    selected={isSelected}
                    taken={taken}
                    takenBy={takenBy}
                    onClick={isMyTurn ? setSelectedTeam : null}
                    disabled={!isMyTurn}
                  />
                );
              })}
            </div>
          </div>

          {isHost && (
            <div>
              <HostDashboard
                players={players}
                picks={picks}
                currentPickerIndex={currentPickerIndex}
                onPoke={handlePoke}
                teams={teams}
              />
            </div>
          )}
        </div>

        <ConfirmBar
          selectedTeam={selectedTeam}
          onConfirm={handleConfirmPick}
          onCancel={() => setSelectedTeam(null)}
        />
      </div>
    );
  }

  // ===== SELECTING PLAYERS PHASE =====
  if (status === 'selecting_players') {
    const myTeams = getMyDraftTeams();
    const currentTeam = myTeams[activeTeamTab];
    const teamPlayers = currentTeam
      ? dbPlayers.filter(p => p.team_api_id === currentTeam.api_id)
      : [];
    const teamPickIds = currentTeam
      ? myPlayerPicks.filter(p => p.team_api_id === currentTeam.api_id).map(p => p.player_api_id)
      : [];
    const totalPlayerPicks = myPlayerPicks.length;

    return (
      <div className="page-wide">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)' }}>Pick Your Players</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-muted">{totalPlayerPicks}/{myTeams.length * 3} picked</span>
            {isHost && (
              <button className="btn btn-primary btn-sm" onClick={advancePhase}>
                Next Phase →
              </button>
            )}
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
          Pick 3 players from each of your 8 teams
        </p>

        <div className="tabs">
          {myTeams.map((team, i) => {
            const count = myPlayerPicks.filter(p => p.team_api_id === team.api_id).length;
            return (
              <button
                key={team.api_id}
                className={`tab${activeTeamTab === i ? ' tab--active' : ''}`}
                onClick={() => setActiveTeamTab(i)}
              >
                {team.name} ({count}/3)
              </button>
            );
          })}
        </div>

        {playerPicksLoading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : teamPlayers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">👥</div>
            <div className="empty-state__text">No players found for {currentTeam?.name}</div>
          </div>
        ) : (
          <div className="player-grid">
            {teamPlayers.map(player => (
              <PlayerCard
                key={player.api_id}
                player={player}
                selected={teamPickIds.includes(player.api_id)}
                onClick={handlePlayerPick}
                showPosition
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== SELECTING CAPTAIN PHASE =====
  if (status === 'selecting_captain') {
    const myPlayerObjs = myPlayerPicks
      .map(pp => dbPlayers.find(p => p.api_id === pp.player_api_id))
      .filter(Boolean);

    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)' }}>Choose Your Captain</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {captainPickId && <span className="badge badge-gold">Captain selected ✓</span>}
            {isHost && (
              <button className="btn btn-primary btn-sm" onClick={advancePhase}>
                Start Tournament →
              </button>
            )}
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
          Your captain earns double points during the tournament
        </p>

        <CaptainGrid
          playerPicks={myPlayerObjs}
          captainPickId={captainPickId}
          onSelectCaptain={handleSelectCaptain}
        />

        {myPlayerObjs.length === 0 && (
          <div className="empty-state mt-24">
            <div className="empty-state__icon">👥</div>
            <div className="empty-state__text">No players selected yet</div>
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className="page">
      <div className="loading"><div className="spinner" /></div>
    </div>
  );
}
