import React, { useState, useCallback } from 'react';

const RANK_COLORS = {
  1: 'var(--gold)',
  2: '#C0C0C0',
  3: '#CD7F32',
};

export default function LeaderboardRow({
  rank,
  player,
  score,
  picks,
  playerPicks,
  captainPickId,
  teams,
  fixtures,
  players,
  isExpanded,
  onToggle,
  isHost,
  onOverride,
  onRename,
}) {
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideDesc, setOverrideDesc] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(player.player_name);
  const [expandedFixtures, setExpandedFixtures] = useState(new Set());

  const toggleFixture = useCallback((fixId) => {
    setExpandedFixtures(prev => {
      const next = new Set(prev);
      next.has(fixId) ? next.delete(fixId) : next.add(fixId);
      return next;
    });
  }, []);

  const rankColor = RANK_COLORS[rank] || 'var(--text-muted)';
  const totalPoints = score?.total_points ?? 0;

  // Get my drafted teams
  const myTeamIds = (picks || [])
    .filter((p) => p.game_player_id === player.id)
    .map((p) => p.team_api_id);
  const myTeams = myTeamIds.map((id) => teams?.find((t) => t.api_id === id)).filter(Boolean);

  // Get captain player
  const captainPlayer = captainPickId
    ? players?.find((p) => String(p.api_id) === String(captainPickId))
    : null;

  // Breakdown from score
  const breakdown = score?.breakdown || {};

  const playerName = (id) => players?.find(p => String(p.api_id) === String(id))?.name || `#${id}`;
  const teamByApiId = (id) => teams?.find(t => String(t.api_id) === String(id));

  function getFixtureId(key) {
    let m;
    if ((m = key.match(/^fix_(\d+)$/))) return m[1];
    if ((m = key.match(/fix(\d+)$/))) return m[1];
    if ((m = key.match(/^(?:brace|hattrick|dbl_assist)_\d+_(\d+)$/))) return m[1];
    if ((m = key.match(/^upset_(\d+)$/))) return m[1];
    return null;
  }

  function formatEntry(key, val) {
    let m;
    if (key === 'override') return '✏️ Manual adjustment';
    if (/^fix_\d+$/.test(key)) return val === 3 ? 'Match Win' : val === 1 ? 'Match Draw' : 'Match Result';
    if ((m = key.match(/^golden_boot_(\d+)$/))) return `🥾 Golden Boot — ${playerName(m[1])}`;
    if ((m = key.match(/^brace_(\d+)_/))) return `⚡ Brace bonus — ${playerName(m[1])}`;
    if ((m = key.match(/^hattrick_(\d+)_/))) return `🎩 Hat trick bonus — ${playerName(m[1])}`;
    if ((m = key.match(/^dbl_assist_(\d+)_/))) return `🔑 Double assist bonus — ${playerName(m[1])}`;
    if ((m = key.match(/^cs_(\d+)_/))) return `🧤 Clean sheet — ${playerName(m[1])}`;
    if (/^upset_/.test(key)) return '💥 Upset bonus';
    if ((m = key.match(/^group_finish_(\d+)_r(\d+)$/))) {
      const t = teamByApiId(m[1]);
      const rank = m[2];
      const label = rank === '1' ? '🏆 Won group' : rank === '2' ? '✅ Qualified (2nd)' : '✅ Qualified (3rd)';
      return `${label} — ${t?.name || m[1]}`;
    }
    if ((m = key.match(/^player_(\d+)_(goal|assist|yellow_card|red_card|own_goal|penalty_save)_/))) {
      const labels = { goal: '⚽ Goal', assist: '🎯 Assist', yellow_card: '🟨 Yellow card', red_card: '🟥 Red card', own_goal: '😬 Own goal', penalty_save: '🧤 Penalty save' };
      return `${labels[m[2]]} — ${playerName(m[1])}`;
    }
    return key.replace(/_/g, ' ');
  }

  // Group breakdown entries by fixture, with non-fixture items separate
  function groupedBreakdown() {
    const fixtureMap = new Map(); // fixtureId -> { fixture, entries: [{key, val, label}] }
    const other = [];

    for (const [key, val] of Object.entries(breakdown)) {
      const fixId = getFixtureId(key);
      if (fixId) {
        if (!fixtureMap.has(fixId)) {
          const fix = fixtures?.find(f => String(f.api_id) === fixId);
          fixtureMap.set(fixId, { fix, entries: [] });
        }
        fixtureMap.get(fixId).entries.push({ key, val, label: formatEntry(key, val) });
      } else {
        other.push({ key, val, label: formatEntry(key, val) });
      }
    }
    // Sort fixtures chronologically by api_id (which increments with kickoff order)
    const sorted = [...fixtureMap.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
    return { byFixture: sorted, other };
  }

  function handleOverride(e) {
    e.stopPropagation();
    if (onOverride && overrideValue !== '') {
      onOverride(player.id, parseFloat(overrideValue), overrideDesc);
      setOverrideValue('');
      setOverrideDesc('');
    }
  }

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${rank <= 3 ? rankColor + '44' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Collapsed row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Rank */}
        <span
          style={{
            minWidth: 28,
            fontWeight: 800,
            fontSize: '1.1rem',
            color: rankColor,
            textAlign: 'center',
          }}
        >
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
        </span>

        {/* Name */}
        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          {editingName ? (
            <>
              <input
                autoFocus
                className="input"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.stopPropagation(); onRename(player.id, nameValue); setEditingName(false); }
                  if (e.key === 'Escape') { setEditingName(false); setNameValue(player.player_name); }
                }}
                onClick={e => e.stopPropagation()}
                style={{ width: 140, padding: '2px 8px', fontSize: '0.88rem' }}
              />
              <button
                onClick={e => { e.stopPropagation(); onRename(player.id, nameValue); setEditingName(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', fontSize: '1rem', padding: 0 }}
              >✓</button>
              <button
                onClick={e => { e.stopPropagation(); setEditingName(false); setNameValue(player.player_name); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '1rem', padding: 0 }}
              >✕</button>
            </>
          ) : (
            <>
              {player.player_name}
              {player.is_host && (
                <span className="badge badge-gold" style={{ marginLeft: 4, fontSize: '0.65rem' }}>HOST</span>
              )}
              {isHost && onRename && (
                <button
                  onClick={e => { e.stopPropagation(); setEditingName(true); setNameValue(player.player_name); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 4px', lineHeight: 1, opacity: 0.6 }}
                >✏️</button>
              )}
            </>
          )}
        </span>

        {/* Teams count */}
        <span className="text-muted text-sm" style={{ marginRight: 4 }}>
          {myTeams.length}/8 🏳️
        </span>

        {/* Points */}
        <span
          style={{
            fontWeight: 800,
            fontSize: '1.2rem',
            color: rank <= 3 ? rankColor : 'var(--text)',
            minWidth: 50,
            textAlign: 'right',
          }}
        >
          {totalPoints}
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}> pts</span>
        </span>

        {/* Expand toggle */}
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            marginLeft: 4,
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
          }}
        >
          ▾
        </span>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Teams */}
          {myTeams.length > 0 && (
            <div>
              <div className="text-muted text-xs" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Draft Teams
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {myTeams.map((team) => (
                  <div
                    key={team.api_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 100,
                      background: 'rgba(42,42,58,0.5)',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {team.logo_url && (
                      <img
                        src={team.logo_url}
                        alt=""
                        style={{ width: 16, height: 16, objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    {team.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Captain */}
          {captainPlayer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Captain:
              </span>
              <span style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '0.9rem' }}>
                👑 {captainPlayer.name}
              </span>
            </div>
          )}

          {/* Score breakdown grouped by fixture — collapsed by default */}
          {Object.keys(breakdown).length > 0 && (() => {
            const { byFixture, other } = groupedBreakdown();
            return (
              <div>
                <div className="text-muted text-xs" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Points Breakdown
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {byFixture.map(([fixId, { fix, entries }]) => {
                    const homeTeam = fix ? teamByApiId(fix.home_team_api_id) : null;
                    const awayTeam = fix ? teamByApiId(fix.away_team_api_id) : null;
                    const fixTotal = entries.reduce((s, e) => s + e.val, 0);
                    const header = homeTeam && awayTeam
                      ? `${homeTeam.name} ${fix.home_goals}–${fix.away_goals} ${awayTeam.name}`
                      : `Match #${fixId}`;
                    const open = expandedFixtures.has(fixId);
                    const playerEntries = entries.filter(({ key }) => /^player_|^cs_|^brace_|^hattrick_|^dbl_assist_/.test(key));
                    const otherEntries = entries.filter(({ key }) => !/^player_|^cs_|^brace_|^hattrick_|^dbl_assist_/.test(key));
                    return (
                      <div key={fixId} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        {/* Fixture header row — always visible, click to expand */}
                        <div
                          onClick={() => toggleFixture(fixId)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', cursor: 'pointer', background: open ? 'rgba(255,255,255,0.04)' : 'transparent', userSelect: 'none' }}
                        >
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{header}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: fixTotal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {fixTotal >= 0 ? '+' : ''}{fixTotal}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
                          </div>
                        </div>
                        {/* Player events always visible (goals, assists, clean sheets, bonuses) */}
                        {!open && playerEntries.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {playerEntries.map(({ key, val, label }) => (
                              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                <span style={{ color: val >= 0 ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}>
                                  {val >= 0 ? '+' : ''}{val}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Expanded detail — all entries */}
                        {open && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {entries.map(({ key, val, label }) => (
                              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                <span style={{ color: val >= 0 ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}>
                                  {val >= 0 ? '+' : ''}{val}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {other.length > 0 && (() => {
                    const otherId = '__other__';
                    const otherTotal = other.reduce((s, e) => s + e.val, 0);
                    const open = expandedFixtures.has(otherId);
                    return (
                      <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div
                          onClick={() => toggleFixture(otherId)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', cursor: 'pointer', background: open ? 'rgba(255,255,255,0.04)' : 'transparent', userSelect: 'none' }}
                        >
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>Tournament Bonuses</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: otherTotal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {otherTotal >= 0 ? '+' : ''}{otherTotal}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
                          </div>
                        </div>
                        {open && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {other.map(({ key, val, label }) => (
                              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', gap: 8 }}>
                                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                <span style={{ color: val >= 0 ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}>
                                  {val >= 0 ? '+' : ''}{val}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          {/* Host override */}
          {isHost && onOverride && (
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: 12,
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <input
                type="number"
                className="input"
                placeholder="Points"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                style={{ width: 90, flexShrink: 0 }}
                onClick={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                className="input"
                placeholder="Reason (optional)"
                value={overrideDesc}
                onChange={(e) => setOverrideDesc(e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="btn btn-sm"
                style={{
                  background: 'rgba(255,215,0,0.15)',
                  color: 'var(--gold)',
                  border: '1px solid var(--gold)',
                }}
                onClick={handleOverride}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
