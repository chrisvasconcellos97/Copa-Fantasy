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
 * Each event should have { type, detail } where type is e.g. 'Goal', 'Card', 'subst'
 */
export function computePlayerScore(events) {
  let total = 0;
  const breakdown = {};

  const add = (key, points) => {
    total += points;
    breakdown[key] = (breakdown[key] || 0) + points;
  };

  for (const event of events) {
    const type = (event.type || '').toLowerCase();
    const detail = (event.detail || '').toLowerCase();

    if (type === 'goal') {
      if (detail !== 'own goal') {
        add('goal', PLAYER_POINTS.goal);
      }
    } else if (type === 'card') {
      if (detail === 'yellow card') {
        add('yellow_card', PLAYER_POINTS.yellow_card);
      } else if (detail === 'red card' || detail === 'second yellow card') {
        add('red_card', PLAYER_POINTS.red_card);
      }
    } else if (type === 'assist') {
      add('assist', PLAYER_POINTS.assist);
    }
  }

  return { total, breakdown };
}
