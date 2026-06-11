export const SCORING = {
  team: {
    group_win: 3,
    group_draw: 1,
    group_loss: 0,
    r32_win: 5,
    qf_win: 8,
    sf_win: 13,
    final_win: 21,
    champion: 34,
  },
  player: {
    goal: 6,
    assist: 4,
    clean_sheet_gk: 10,
    clean_sheet_def: 6,
    yellow_card: -1,
    red_card: -3,
    motm: 5,
    top_scorer: 15,
    golden_boot: 20,
  },
};

export const RESULT_TYPES = [
  'group_win',
  'group_draw',
  'group_loss',
  'r32_win',
  'qf_win',
  'sf_win',
  'final_win',
  'champion',
];

export const BONUS_TYPES = [
  'goal',
  'assist',
  'clean_sheet_gk',
  'clean_sheet_def',
  'yellow_card',
  'red_card',
  'motm',
  'top_scorer',
  'golden_boot',
];

/** Maps pot number (1-4) to array of team names */
export const FALLBACK_POTS = {
  1: ['Mexico', 'Canada', 'USA', 'Argentina', 'Brazil', 'France', 'England', 'Germany', 'Portugal', 'Netherlands', 'Spain', 'Belgium'],
  2: ['Croatia', 'Morocco', 'Colombia', 'Uruguay', 'Switzerland', 'Japan', 'Senegal', 'Iran', 'South Korea', 'Ecuador', 'Austria', 'Australia'],
  3: ['Norway', 'Panama', 'Egypt', 'Algeria', 'Scotland', 'Paraguay', 'Tunisia', 'Ivory Coast', 'Uzbekistan', 'Qatar', 'Saudi Arabia', 'South Africa'],
  4: ['Jordan', 'Cape Verde', 'Ghana', 'Curaçao', 'Haiti', 'New Zealand', 'Bosnia & Herzegovina', 'Sweden', 'Türkiye', 'Czechia', 'DR Congo', 'Iraq'],
};

export function normalizePosition(pos) {
  if (!pos) return 'MID';
  const p = pos.toUpperCase().trim();
  if (p === 'G' || p === 'GK' || p === 'GOALKEEPER') return 'GK';
  if (p === 'D' || p === 'DEF' || p === 'DEFENDER') return 'DEF';
  if (p === 'M' || p === 'MID' || p === 'MIDFIELDER') return 'MID';
  if (p === 'F' || p === 'FWD' || p === 'FORWARD' || p === 'ATTACKER' || p === 'ATT') return 'FWD';
  return 'MID';
}
