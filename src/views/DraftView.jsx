import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { usePlayers } from '../hooks/usePlayers';
import { useDraft } from '../hooks/useDraft';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import { getOrCreateToken } from '../lib/session';
import { getCurrentPicker, getPotFromPickNumber } from '../lib/draft';
import { FALLBACK_POTS } from '../lib/constants';
import TeamCard from '../components/TeamCard';
import ConfirmBar from '../components/ConfirmBar';
import SnakeOrderBar from '../components/SnakeOrderBar';
import HostDashboard from '../components/HostDashboard';
import PokeToast from '../components/PokeToast';
import CaptainGrid from '../components/CaptainGrid';

export default function DraftView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { game, loading: gameLoading } = useGame(gameId);
  const { players, loading: playersLoading } = usePlayers(gameId);
  const { picks, loading: picksLoading } = useDraft(gameId);
  const myToken = getOrCreateToken();

  const me = players.find(p => p.player_token === myToken);
  const isHost = me?.is_host;

  const { showPoke, pokeMessage, dismissPoke } = useNotifications(me?.id);

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [activePot, setActivePot] = useState(1);
  const [teams, setTeams] = useState([]);
  const [captainPickId, setCaptainPickId] = useState(null);
  const [savingCaptain, setSavingCaptain] = useState(false);

  // Load teams from DB or fallback
  useEffect(() => {
    supabase.from('teams').select('*').then(({ data }) => {
      if (data && data.length > 0) {
        setTeams(data);
      } else {
        setTeams(FALLBACK_POTS.map((t, i) => ({ ...t, api_id: t.api_id || `fallback-${i}`, id: `fallback-${i}` })));
      }
    });
  }, []);

  // Redirect on status change
  useEffect(() => {
    if (!game) return;
    if (game.status === 'tournament' || game.status === 'complete') {
      navigate(`/leaderboard/${gameId}`);
    }
  }, [game, gameId, navigate]);

  const currentPicker = useMemo(() => {
    if (!players.length || !game) return null;
    return getCurrentPicker(players, game.current_pick_number || 0);
  }, [players, game]);

  const currentPickerIndex = useMemo(() => {
    if (!currentPicker || !players.length || !game) return 0;
    const numPlayers = players.length;
    const pickNum = game.current_pick_number || 0;
    const round = Math.floor(pickNum / numPlayers);
    const posInRound = pickNum % numPlayers;
    const ordered = round % 2 === 0 ? [...players] : [...players].reverse();
    return players.indexOf(ordered[posInRound]);
  }, [currentPicker, players, game]);

  const isMyTurn = currentPicker?.player_token === myToken;

  const takenTeamMap = useMemo(() => {
    const map = {};
    picks.forEach(pk => {
      const player = players.find(p => p.id === pk.game_player_id);
      map[pk.team_api_id] = player?.player_name || 'Taken';
    });
    return map;
  }, [picks, players]);

  const currentPot = useMemo(() => {
    if (!game || !players.length) return 1;
    return getPotFromPickNumber(game.current_pick_number || 0, players.length);
  }, [game, players]);

  const potTeams = useMemo(() => teams.filter(t => t.pot === activePot), [teams, activePot]);

  const handleSelectTeam = (team) => {
    if (!isMyTurn) return;
    if (takenTeamMap[team.api_id]) return;
    setSelectedTeam(team);
  };

  const handleConfirm = async () => {
    if (!selectedTeam || !me) return;
    setConfirming(true);
    try {
      const pickNum = game.current_pick_number || 0;
      const { error } = await supabase.from('draft_picks').insert({
        game_id: gameId,
        game_player_id: me.id,
        team_api_id: selectedTeam.api_id,
        pick_number: pickNum,
        pot: selectedTeam.pot,
      });
      if (error) throw error;

      await supabase.from('games').update({ current_pick_number: pickNum + 1 }).eq('id', gameId);
      setSelectedTeam(null);
    } catch (err) {
      alert('Error picking team: ' + err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handlePoke = async (target) => {
    if (!target) return;
    await supabase.from('notifications').insert({
      game_player_id: target.id,
      message: `It's your turn to pick! (Pick #${(game?.current_pick_number || 0) + 1})`,
      read: false,
    });
  };

  const handleAdvancePhase = async (nextStatus) => {
    await supabase.from('games').update({ status: nextStatus }).eq('id', gameId);
  };

  const handleSaveCaptain = async () => {
    if (!captainPickId || !me) return;
    setSavingCaptain(true);
    try {
      await supabase.from('game_players').update({ captain_pick_id: captainPickId }).eq('id', me.id);
      alert('Captain saved!');
    } finally {
      setSavingCaptain(false);
    }
  };

  const myPicks = picks.filter(pk => pk.game_player_id === me?.id);
  const totalPicks = players.length * 8; // 8 teams per player

  if (gameLoading || playersLoading || picksLoading) {
    return <div className="page"><div className="spinner" /></div>;
  }

  if (!game) return <div className="page"><p className="text-center text-muted">Game not found.</p></div>;

  // Selecting captain phase
  if (game.status === 'selecting_captain') {
    return (
      <div className="page">
        <PokeToast message={showPoke ? pokeMessage : ''} onDismiss={dismissPoke} />
        <h1 className="h1 mb-2">Select Your Captain</h1>
        <p className="text-muted mb-4">Pick one player as your captain — they earn double points.</p>
        <div className="card">
          <CaptainGrid
            playerPicks={myPicks}
            captainPickId={captainPickId}
            onSelectCaptain={setCaptainPickId}
          />
          <hr className="divider" />
          <button
            className="btn btn-gold"
            onClick={handleSaveCaptain}
            disabled={!captainPickId || savingCaptain}
          >
            {savingCaptain ? 'Saving…' : 'Confirm Captain 👑'}
          </button>
        </div>
        {isHost && (
          <div className="card mt-4" style={{ textAlign: 'center' }}>
            <p className="text-muted text-sm mb-3">Once all players have selected their captain:</p>
            <button className="btn btn-gold" onClick={() => handleAdvancePhase('tournament')}>
              Start Tournament 🏆
            </button>
          </div>
        )}
      </div>
    );
  }

  // Drafting teams phase
  return (
    <div className="page">
      <PokeToast message={showPoke ? pokeMessage : ''} onDismiss={dismissPoke} />

      <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 className="h1">Team Draft</h1>
          <p className="text-muted text-sm">Pick #{(game.current_pick_number || 0) + 1} of {totalPicks || '?'}</p>
        </div>
        <div>
          {isMyTurn ? (
            <span className="badge badge-gold" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>⚡ Your Pick!</span>
          ) : (
            <span className="text-muted text-sm">Waiting for <strong>{currentPicker?.player_name || '...'}</strong></span>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="label mb-2">Draft Order</div>
        <SnakeOrderBar players={players} currentPickerIndex={currentPickerIndex} myPlayerId={myToken} />
      </div>

      <div className="card mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="label">Pot {currentPot} Active</span>
          </div>
          <span className="text-sm text-muted">{myPicks.length} picked</span>
        </div>
        <div className="pot-tabs">
          {[1, 2, 3, 4].map(pot => (
            <button
              key={pot}
              className={`pot-tab ${activePot === pot ? 'pot-tab--active' : ''}`}
              onClick={() => setActivePot(pot)}
            >
              Pot {pot}
            </button>
          ))}
        </div>
        <div className="teams-grid">
          {potTeams.map(team => (
            <TeamCard
              key={team.api_id || team.name}
              team={team}
              selected={selectedTeam?.api_id === team.api_id}
              taken={!!takenTeamMap[team.api_id]}
              takenBy={takenTeamMap[team.api_id]}
              onClick={handleSelectTeam}
              disabled={!isMyTurn || game.status !== 'drafting_teams'}
            />
          ))}
          {potTeams.length === 0 && (
            <p className="text-muted text-sm">No teams in this pot.</p>
          )}
        </div>
      </div>

      {isHost && (
        <div className="mb-4">
          <HostDashboard
            players={players}
            picks={picks}
            currentPicker={currentPicker}
            onPoke={handlePoke}
            teams={teams}
          />
        </div>
      )}

      {isHost && picks.length >= totalPicks && totalPicks > 0 && (
        <div className="card mb-4" style={{ textAlign: 'center' }}>
          <h3 className="h3 mb-2">Draft Complete!</h3>
          <p className="text-muted text-sm mb-3">All teams have been picked. Advance to player selection or captain selection.</p>
          <div className="flex gap-3 justify-center">
            <button className="btn btn-gold" onClick={() => handleAdvancePhase('selecting_captain')}>
              Select Captains 👑
            </button>
            <button className="btn btn-ghost" onClick={() => handleAdvancePhase('tournament')}>
              Skip to Tournament 🏆
            </button>
          </div>
        </div>
      )}

      <ConfirmBar
        selectedTeam={selectedTeam}
        onConfirm={handleConfirm}
        onCancel={() => setSelectedTeam(null)}
        loading={confirming}
      />
    </div>
  );
}
