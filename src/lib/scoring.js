export const TEAM_POINTS = {
  group_win: 3,
  group_draw: 1,
  group_loss: 0,
  r32_win: 5,
  qf_win: 8,
  sf_win: 13,
  final_win: 21,
  champion: 34,
};

export const PLAYER_POINTS = {
  goal: 6,
  assist: 4,
  clean_sheet_gk: 10,
  clean_sheet_def: 6,
  yellow_card: -1,
  red_card: -3,
  motm: 5,
  top_scorer: 15,
  golden_boot: 20,
};

/**
 * Computes a player's total score from an array of match events.
 * Each event should have a `type` field matching keys in PLAYER_POINTS.
 */
export function computePlayerScore(events) {
  if (!events || events.length === 0) return 0;
  return events.reduce((total, event) => {
    const pts = PLAYER_POINTS[event.type];
    if (pts !== undefined) return total + pts;
    // Handle detail-based scoring
    if (event.type === 'Goal') return total + PLAYER_POINTS.goal;
    if (event.type === 'Assist') return total + PLAYER_POINTS.assist;
    if (event.type === 'Card') {
      if (event.detail === 'Yellow Card') return total + PLAYER_POINTS.yellow_card;
      if (event.detail === 'Red Card') return total + PLAYER_POINTS.red_card;
    }
    return total;
  }, 0);
}
