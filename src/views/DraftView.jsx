import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { useNotifications } from '../hooks/useNotifications';
import { getCurrentPicker, getRoundFromPickNumber } from '../lib/draft';
import { getOrCreateToken } from '../lib/session';
import { FALLBACK_POTS } from '../lib/constants';
import TeamCard from '../components/TeamCard';
import ConfirmBar from '../components/ConfirmBar';
import SnakeOrderBar from '../components/SnakeOrderBar';
import HostDashboard from '../components/HostDashboard';
import PokeToast from '../components/PokeToast';
import CaptainGrid from '../components/CaptainGrid';
import PlayerCard from '../components/PlayerCard';

const TOTAL_ROUNDS = 4; // 4 pots

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players } = usePlayers(gameId);
  const { picks } = useDraft(gameId);
  const myToken = getOrCreateToken();

  const me = players.find((p) => p.player_token === myToken);
  const isHost = me?.is_host || false;

  const { toast, markRead } = useNotifications(me?.id);

  // Teams state
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Player selection state
  const [allPlayers, setAllPlayers] = useState([]);
  const [playerPicks, setPlayerPicks] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [currentSlot, setCurrentSlot] = useState(null); // { teamId, position }
  const [captainPickId, setCaptainPickId] = useState(null);
  const [captainSaved, setCaptainSaved] = useState(false);

  const [potFilter, setPotFilter] = useState(1);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Load teams
  useEffect(() => {
    async function fetchTeams() {
      setLoadingTeams(true);
      const { data } = await supabase.from('teams').select('*').order('name');
      if (data && data.length > 0) {
        setTeams(data);
      } else {
        // Use fallback pot data
        const fallback = Object.entries(FALLBACK_POTS).map(([name, pot], idx) => ({
          id: `fallback-${idx}`,
          name,
          pot,
          logo_url: null,
        }));
        setTeams(fallback);
      }
      setLoadingTeams(false);
    }
    fetchTeams();
  }, []);

  // Load players for player selection
  useEffect(() => {
    if (game?.status !== 'selecting_players') return;
    async function fetchPlayers() {
      const { data } = await supabase.from('players').select('*').order('name');
      if (data) setAllPlayers(data);
    }
    fetchPlayers();
  }, [game?.status]);

  // Load player picks
  useEffect(() => {
    if (!gameId) return;
    async function fetchPlayerPicks() {
      const { data } = await supabase
        .from('player_picks')
        .select('*')
        .eq('game_id', gameId);
      if (data) setPlayerPicks(data);
    }
    fetchPlayerPicks();

    const channel = supabase
      .channel(`pp-${gameId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_picks', filter: `game_id=eq.${gameId}` }, (p) => {
        setPlayerPicks((prev) => [...prev, p.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [gameId]);

  // Load captain pick
  useEffect(() => {
    if (!me?.id) return;
    async function fetchCaptain() {
      const { data } = await supabase
        .from('captain_picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('player_id', me.id)
        .maybeSingle();
      if (data) { setCaptainPickId(data.player_pick_id); setCaptainSaved(true); }
    }
    fetchCaptain();
  }, [gameId, me?.id]);

  // Navigate on status change
  useEffect(() => {
    if (!game) return;
    if (game.status === 'lobby') navigate(`/lobby/${gameId}`);
    if (game.status === 'tournament' || game.status === 'complete') navigate(`/leaderboard/${gameId}`);
  }, [game?.status]);

  // Draft picks state
  const currentPickNumber = picks.length;
  const totalPicks = players.length * TOTAL_ROUNDS;
  const draftComplete = currentPickNumber >= totalPicks;

  const currentPicker = useMemo(
    () => getCurrentPicker(players, currentPickNumber),
    [players, currentPickNumber]
  );
  const currentPickerIndex = players.findIndex((p) => p.id === currentPicker?.id);
  const isMyTurn = currentPicker?.player_token === myToken;
  const currentRound = getRoundFromPickNumber(currentPickNumber, players.length || 1);
  const currentPot = (currentRound % 4) + 1;

  // Teams already picked
  const pickedTeamIds = new Set(picks.map((p) => p.team_id));
  const pickedByPlayer = {};
  for (const pick of picks) {
    pickedByPlayer[pick.team_id] = players.find((pl) => pl.id === pick.player_id)?.name || '?';
  }

  // My team picks
  const myTeamPicks = picks.filter((p) => p.player_id === me?.id);

  async function handleConfirmTeamPick() {
    if (!selectedTeam || !me || confirming) return;
    setConfirming(true);
    try {
      await supabase.from('draft_picks').insert({
        game_id: gameId,
        player_id: me.id,
        team_id: selectedTeam.id,
        pick_number: currentPickNumber,
      });
      setSelectedTeam(null);
    } catch (e) {
      console.error(e);
    } finally {
      setConfirming(false);
    }
  }

  async function handleAdvanceToPlayerSelection() {
    await supabase.from('games').update({ status: 'selecting_players' }).eq('id', gameId);
  }

  async function handleAdvanceToCaptain() {
    await supabase.from('games').update({ status: 'selecting_captain' }).eq('id', gameId);
  }

  async function handleAdvanceToTournament() {
    await supabase.from('games').update({ status: 'tournament' }).eq('id', gameId);
  }

  // Player selection logic
  const myTeams = myTeamPicks.map((tp) => teams.find((t) => t.id === tp.team_id)).filter(Boolean);
  const POSITIONS = ['FWD', 'MID', 'DEF'];

  function getMyPlayerPick(teamId, position) {
    return playerPicks.find((pp) => pp.game_id === gameId && pp.player_id === me?.id && pp.team_id === teamId && pp.position === position);
  }

  const myFilledSlots = playerPicks.filter((pp) => pp.player_id === me?.id).length;
  const myTotalSlots = myTeams.length * 3;
  const allMyPlayersDone = myFilledSlots >= myTotalSlots && myTotalSlots > 0;

  const allPlayersDone = players.every((pl) => {
    const plTeams = picks.filter((p) => p.player_id === pl.id);
    const needed = plTeams.length * 3;
    const filled = playerPicks.filter((pp) => pp.player_id === pl.id).length;
    return filled >= needed;
  });

  async function handlePlayerPick(player) {
    if (!currentSlot || !me) return;
    const { teamId, position } = currentSlot;
    const team = teams.find((t) => t.id === teamId);
    await supabase.from('player_picks').insert({
      game_id: gameId,
      player_id: me.id,
      team_id: teamId,
      player_api_id: player.api_id,
      player_name: player.name,
      team_name: team?.name || '',
      position,
      photo_url: player.photo_url || null,
    });
    setCurrentSlot(null);
    setSelectedPlayer(null);
  }

  async function handleCaptainSelect(pick) {
    if (!me) return;
    setCaptainPickId(pick.id);
    await supabase.from('captain_picks').upsert({
      game_id: gameId,
      player_id: me.id,
      player_pick_id: pick.id,
    }, { onConflict: 'game_id,player_id' });
    setCaptainSaved(true);
  }

  async function handlePoke(targetPlayer) {
    await supabase.from('notifications').insert({
      player_id: targetPlayer.id,
      game_id: gameId,
      message: `${me?.name || 'Host'} says: it's your turn to pick! 👀`,
      read: false,
    });
  }

  if (gameLoading || loadingTeams) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page-center">
        <h2>Game not found</h2>
      </div>
    );
  }

  // --- Captain selection phase ---
  if (game.status === 'selecting_captain') {
    const myPP = playerPicks.filter((pp) => pp.player_id === me?.id);
    return (
      <div className="page" style={{ maxWidth: 800, margin: '0 auto' }}>
        <PokeToast message={toast?.message} onDismiss={() => toast && markRead(toast.id)} />
        <div className="flex justify-between items-center mb-4 mt-2">
          <h2>👑 Pick Your Captain</h2>
        </div>
        <CaptainGrid
          playerPicks={myPP}
          captainPickId={captainPickId}
          onSelectCaptain={handleCaptainSelect}
        />
        {captainSaved && (
          <div className="card mt-4 text-center">
            <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>✓ Captain Saved!</div>
            <p className="text-muted mt-2">Waiting for others…</p>
          </div>
        )}
        {isHost && (
          <div className="mt-4">
            <button className="btn btn-primary btn-lg btn-full" onClick={handleAdvanceToTournament}>
              🚀 Start Tournament →
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Player selection phase ---
  if (game.status === 'selecting_players') {
    const playersForTeam = currentSlot
      ? allPlayers.filter((pl) => pl.team_api_id === teams.find((t) => t.id === currentSlot.teamId)?.api_id ||
          pl.team_name === teams.find((t) => t.id === currentSlot.teamId)?.name)
        .filter((pl) => {
          // Filter by position roughly
          const { normalizePosition } = require('../lib/constants');
          return normalizePosition(pl.position) === currentSlot.position || allPlayers.length < 20;
        })
      : [];

    return (
      <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
        <PokeToast message={toast?.message} onDismiss={() => toast && markRead(toast.id)} />
        <div className="flex justify-between items-center mb-2 mt-2">
          <h2>🎯 Select Players</h2>
          <span className="text-muted text-sm">{myFilledSlots}/{myTotalSlots} filled</span>
        </div>
        <div className="squad-progress mb-4">
          <div className="squad-progress-fill" style={{ width: `${myTotalSlots ? (myFilledSlots / myTotalSlots) * 100 : 0}%` }} />
        </div>

        <div className="grid-2 mb-4">
          {myTeams.map((team) => (
            <div key={team.id} className="card">
              <div className="flex items-center gap-2 mb-3">
                {team.logo_url && <img src={team.logo_url} alt={team.name} style={{ width: 28, height: 28, objectFit: 'contain' }} />}
                <span style={{ fontWeight: 700 }}>{team.name}</span>
              </div>
              <div className="flex flex-col gap-2">
                {POSITIONS.map((pos) => {
                  const existing = getMyPlayerPick(team.id, pos);
                  const isActive = currentSlot?.teamId === team.id && currentSlot?.position === pos;
                  return (
                    <div
                      key={pos}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: isActive ? 'var(--gold-dim)' : 'var(--navy-3)',
                        borderRadius: 'var(--radius-sm)',
                        border: isActive ? '1px solid var(--gold)' : '1px solid var(--line)',
                        cursor: existing ? 'default' : 'pointer',
                      }}
                      onClick={() => !existing && setCurrentSlot({ teamId: team.id, position: pos })}
                    >
                      <span className={`position-badge ${pos.toLowerCase()}`}>{pos}</span>
                      {existing ? (
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{existing.player_name}</span>
                      ) : (
                        <span className="text-muted text-xs">{isActive ? 'Selecting…' : 'Pick player'}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {currentSlot && (
          <div className="card">
            <div className="section-title mb-3">
              Select {currentSlot.position} for {teams.find((t) => t.id === currentSlot.teamId)?.name}
            </div>
            {allPlayers.length === 0 ? (
              <div className="text-center text-muted py-4">No players loaded. Using name entry instead.</div>
            ) : (
              <div className="grid-4">
                {allPlayers
                  .filter((pl) => {
                    const team = teams.find((t) => t.id === currentSlot.teamId);
                    return pl.team_name === team?.name || pl.team_api_id === team?.api_id;
                  })
                  .map((pl) => (
                    <PlayerCard
                      key={pl.id}
                      player={pl}
                      selected={selectedPlayer?.id === pl.id}
                      onClick={setSelectedPlayer}
                    />
                  ))}
              </div>
            )}
            {selectedPlayer && (
              <div className="flex gap-2 mt-3">
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPlayer(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handlePlayerPick(selectedPlayer)}>
                  Pick {selectedPlayer.name}
                </button>
              </div>
            )}
            {allPlayers.filter((pl) => {
              const team = teams.find((t) => t.id === currentSlot.teamId);
              return pl.team_name === team?.name || pl.team_api_id === team?.api_id;
            }).length === 0 && (
              <div>
                <p className="text-muted text-sm mb-2">No players found for this team. Enter manually:</p>
                <ManualPlayerEntry
                  onConfirm={(name) => handlePlayerPick({ id: 'manual', name, api_id: null })}
                />
              </div>
            )}
          </div>
        )}

        {allMyPlayersDone && (
          <div className="card mt-4 text-center">
            <div style={{ color: 'var(--success)', fontWeight: 700 }}>✓ Your squad is complete!</div>
          </div>
        )}

        {isHost && allPlayersDone && (
          <div className="mt-4">
            <button className="btn btn-primary btn-lg btn-full" onClick={handleAdvanceToCaptain}>
              👑 Pick Captains →
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Team Draft phase (default) ---
  const teamsByPot = {};
  for (const team of teams) {
    const pot = team.pot || FALLBACK_POTS[team.name] || 1;
    if (!teamsByPot[pot]) teamsByPot[pot] = [];
    teamsByPot[pot].push({ ...team, pot });
  }
  const displayTeams = (teamsByPot[potFilter] || []).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
      <PokeToast message={toast?.message} onDismiss={() => toast && markRead(toast.id)} />

      <div className="mt-2 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2>🏆 Team Draft</h2>
          <span className="text-muted text-sm">Pick {currentPickNumber + 1} of {totalPicks}</span>
        </div>

        <SnakeOrderBar
          players={players}
          currentPickerIndex={currentPickerIndex}
          myPlayerId={myToken}
        />
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            {isMyTurn ? (
              <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 16 }}>
                ⭐ It's your turn! (Pot {currentPot})
              </div>
            ) : (
              <div className="text-muted">
                Waiting for <strong style={{ color: 'var(--text)' }}>{currentPicker?.name}</strong> to pick…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((pot) => (
              <button
                key={pot}
                className={`btn btn-sm ${potFilter === pot ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPotFilter(pot)}
              >
                Pot {pot}
              </button>
            ))}
          </div>
        </div>

        {draftComplete ? (
          <div className="text-center">
            <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>✓ All teams drafted!</div>
            {isHost && (
              <button className="btn btn-primary btn-lg mt-4" onClick={handleAdvanceToPlayerSelection}>
                🎯 Pick Players →
              </button>
            )}
          </div>
        ) : (
          <div className="grid-4">
            {displayTeams.map((team) => {
              const taken = pickedTeamIds.has(team.id);
              const isSelected = selectedTeam?.id === team.id;
              return (
                <TeamCard
                  key={team.id}
                  team={team}
                  selected={isSelected}
                  taken={taken}
                  takenBy={taken ? pickedByPlayer[team.id] : null}
                  onClick={isMyTurn && !taken ? setSelectedTeam : null}
                  disabled={!isMyTurn}
                />
              );
            })}
            {displayTeams.length === 0 && (
              <div className="text-muted text-sm" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>
                No teams in Pot {potFilter}
              </div>
            )}
          </div>
        )}
      </div>

      {isHost && (
        <HostDashboard
          players={players}
          picks={picks}
          currentPicker={currentPicker}
          onPoke={handlePoke}
          teams={teams}
        />
      )}

      <ConfirmBar
        selectedTeam={selectedTeam}
        onConfirm={handleConfirmTeamPick}
        onCancel={() => setSelectedTeam(null)}
      />
    </div>
  );
}

function ManualPlayerEntry({ onConfirm }) {
  const [name, setName] = useState('');
  return (
    <div className="flex gap-2">
      <input
        className="input"
        placeholder="Player name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onConfirm(name.trim())}
      />
      <button
        className="btn btn-primary"
        onClick={() => name.trim() && onConfirm(name.trim())}
        disabled={!name.trim()}
      >
        Add
      </button>
    </div>
  );
}
