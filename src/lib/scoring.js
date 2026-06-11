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
 * Compute a player's score from their match events.
 * events: array of match_event rows with { type, detail }
 * Returns total points number.
 */
export function computePlayerScore(events) {
  if (!events || events.length === 0) return 0;
  let total = 0;
  for (const event of events) {
    const type = (event.type || '').toLowerCase();
    const detail = (event.detail || '').toLowerCase();

    if (type === 'goal' && detail !== 'own goal') {
      total += PLAYER_POINTS.goal;
    } else if (type === 'assist') {
      total += PLAYER_POINTS.assist;
    } else if (type === 'card') {
      if (detail === 'yellow card') total += PLAYER_POINTS.yellow_card;
      else if (detail === 'red card' || detail === 'second yellow card') total += PLAYER_POINTS.red_card;
    } else if (type === 'clean_sheet_gk') {
      total += PLAYER_POINTS.clean_sheet_gk;
    } else if (type === 'clean_sheet_def') {
      total += PLAYER_POINTS.clean_sheet_def;
    } else if (type === 'motm') {
      total += PLAYER_POINTS.motm;
    } else if (type === 'top_scorer') {
      total += PLAYER_POINTS.top_scorer;
    } else if (type === 'golden_boot') {
      total += PLAYER_POINTS.golden_boot;
    }
  }
  return total;
}
