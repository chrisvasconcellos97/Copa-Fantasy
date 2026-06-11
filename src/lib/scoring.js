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
 * Compute total score for a player given an array of match_events.
 * Each event: { type, detail }
 * Returns { total, breakdown }
 */
export function computePlayerScore(events) {
  const breakdown = {};
  let total = 0;

  for (const event of events) {
    const type = event.type ? event.type.toLowerCase() : '';
    const detail = event.detail ? event.detail.toLowerCase() : '';

    let key = null;

    if (type === 'goal' && detail !== 'own goal' && detail !== 'penalty missed') {
      key = 'goal';
    } else if (type === 'card') {
      if (detail === 'yellow card') key = 'yellow_card';
      else if (detail === 'red card') key = 'red_card';
    } else if (type === 'assist') {
      key = 'assist';
    } else if (type === 'clean_sheet') {
      if (detail === 'gk') key = 'clean_sheet_gk';
      else key = 'clean_sheet_def';
    } else if (type === 'motm') {
      key = 'motm';
    } else if (type === 'top_scorer') {
      key = 'top_scorer';
    } else if (type === 'golden_boot') {
      key = 'golden_boot';
    }

    if (key && PLAYER_POINTS[key] !== undefined) {
      breakdown[key] = (breakdown[key] || 0) + 1;
      total += PLAYER_POINTS[key];
    }
  }

  return { total, breakdown };
}
