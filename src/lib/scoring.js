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
 * Compute total score for a player from their match events array.
 * Each event: { type, detail }
 * type: 'Goal', 'Card', 'subst', etc.
 * detail: 'Normal Goal', 'Yellow Card', 'Red Card', etc.
 */
export function computePlayerScore(events) {
  if (!events || events.length === 0) return 0;
  let score = 0;
  for (const event of events) {
    const type = (event.type || '').toLowerCase();
    const detail = (event.detail || '').toLowerCase();

    if (type === 'goal') {
      if (!detail.includes('own')) {
        score += PLAYER_POINTS.goal;
      }
    } else if (type === 'assist') {
      score += PLAYER_POINTS.assist;
    } else if (type === 'card') {
      if (detail.includes('yellow') && !detail.includes('red')) {
        score += PLAYER_POINTS.yellow_card;
      } else if (detail.includes('red')) {
        score += PLAYER_POINTS.red_card;
      }
    } else if (type === 'clean_sheet') {
      if (detail === 'gk') {
        score += PLAYER_POINTS.clean_sheet_gk;
      } else {
        score += PLAYER_POINTS.clean_sheet_def;
      }
    } else if (type === 'motm') {
      score += PLAYER_POINTS.motm;
    } else if (type === 'top_scorer') {
      score += PLAYER_POINTS.top_scorer;
    } else if (type === 'golden_boot') {
      score += PLAYER_POINTS.golden_boot;
    }
  }
  return score;
}
