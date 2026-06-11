export const TEAM_POINTS = {
  group_win: 3,
  group_draw: 1,
  group_loss: 0,
  r32_win: 5,
  r16_win: 8,
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
 * Computes total points for a player from their match events.
 * events: array of match_events rows { type, detail }
 */
export function computePlayerScore(events) {
  if (!events || events.length === 0) return 0;
  let total = 0;
  for (const ev of events) {
    const t = (ev.type || '').toLowerCase();
    const d = (ev.detail || '').toLowerCase();
    if (t === 'goal') {
      // Exclude own goals
      if (!d.includes('own')) total += PLAYER_POINTS.goal;
    } else if (t === 'assist') {
      total += PLAYER_POINTS.assist;
    } else if (t === 'card') {
      if (d.includes('yellow')) total += PLAYER_POINTS.yellow_card;
      else if (d.includes('red')) total += PLAYER_POINTS.red_card;
    } else if (t === 'clean_sheet') {
      if (d === 'gk') total += PLAYER_POINTS.clean_sheet_gk;
      else total += PLAYER_POINTS.clean_sheet_def;
    } else if (t === 'motm') {
      total += PLAYER_POINTS.motm;
    } else if (t === 'top_scorer') {
      total += PLAYER_POINTS.top_scorer;
    } else if (t === 'golden_boot') {
      total += PLAYER_POINTS.golden_boot;
    }
  }
  return total;
}
