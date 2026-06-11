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
 * Compute a player's score from an array of match events.
 * @param {Array} events - array of match_events rows
 * @returns {{ total: number, breakdown: Object }}
 */
export function computePlayerScore(events) {
  const breakdown = {};
  let total = 0;

  for (const event of events) {
    const type = event.type?.toLowerCase();
    const detail = event.detail?.toLowerCase() || '';

    let key = null;
    let pts = 0;

    if (type === 'goal') {
      if (detail.includes('normal') || detail.includes('penalty') || detail === '') {
        key = 'goal';
        pts = PLAYER_POINTS.goal;
      }
    } else if (type === 'assist' || (type === 'goal' && detail === 'assist')) {
      key = 'assist';
      pts = PLAYER_POINTS.assist;
    } else if (type === 'card') {
      if (detail.includes('yellow') || detail === 'yellow card') {
        key = 'yellow_card';
        pts = PLAYER_POINTS.yellow_card;
      } else if (detail.includes('red') || detail === 'red card') {
        key = 'red_card';
        pts = PLAYER_POINTS.red_card;
      }
    } else if (type === 'motm' || type === 'man of the match') {
      key = 'motm';
      pts = PLAYER_POINTS.motm;
    } else if (type === 'clean_sheet_gk') {
      key = 'clean_sheet_gk';
      pts = PLAYER_POINTS.clean_sheet_gk;
    } else if (type === 'clean_sheet_def') {
      key = 'clean_sheet_def';
      pts = PLAYER_POINTS.clean_sheet_def;
    } else if (type === 'top_scorer') {
      key = 'top_scorer';
      pts = PLAYER_POINTS.top_scorer;
    } else if (type === 'golden_boot') {
      key = 'golden_boot';
      pts = PLAYER_POINTS.golden_boot;
    }

    if (key) {
      breakdown[key] = (breakdown[key] || 0) + pts;
      total += pts;
    }
  }

  return { total, breakdown };
}
