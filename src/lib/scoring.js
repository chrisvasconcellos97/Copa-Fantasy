export const TEAM_POINTS = {
  group_win: 3, group_draw: 1, group_loss: 0,
  r32: 5, r16: 8, qf: 13, sf: 21, final: 34, champion: 55,
};
export const PLAYER_POINTS = {
  goal: 6, assist: 4, clean_sheet: 3,
  yellow_card: -1, red_card: -3, motm: 5,
};
export function computePlayerScore(events = []) {
  return events.reduce((total, ev) => total + (PLAYER_POINTS[ev.type] || 0), 0);
}

/**
 * Computes the total fantasy score for a player's draft data.
 * playerData = {
 *   teamApiIds: string[],
 *   teamResults: { team_api_id, result_type }[],
 *   playerApiIds: string[],
 *   playerResults: { player_api_id, event_type, count }[],
 *   captainPlayerApiId: string | null,
 * }
 */
export function computeScoreForPlayer(playerData) {
  const {
    teamApiIds = [],
    teamResults = [],
    playerApiIds = [],
    playerResults = [],
    captainPlayerApiId = null,
  } = playerData;

  let total = 0;

  for (const result of teamResults) {
    if (teamApiIds.includes(String(result.team_api_id))) {
      const pts = TEAM_POINTS[result.result_type] ?? 0;
      total += pts;
    }
  }

  for (const result of playerResults) {
    if (playerApiIds.includes(String(result.player_api_id))) {
      const pts = (PLAYER_POINTS[result.event_type] ?? 0) * (result.count ?? 1);
      let playerPts = pts;
      if (captainPlayerApiId && String(result.player_api_id) === String(captainPlayerApiId)) {
        playerPts *= 2;
      }
      total += playerPts;
    }
  }

  return total;
}
