export const SCORING = {
  // Team results
  GROUP_WIN: 3,
  GROUP_DRAW: 1,
  GROUP_LOSS: 0,
  R32_WIN: 5,
  R16_WIN: 8,
  QF_WIN: 8,
  SF_WIN: 13,
  FINAL_WIN: 21,
  CHAMPION: 34,
  // Player events
  GOAL: 6,
  ASSIST: 4,
  CLEAN_SHEET_GK: 10,
  CLEAN_SHEET_DEF: 6,
  YELLOW_CARD: -1,
  RED_CARD: -3,
  MOTM: 5,
  TOP_SCORER: 15,
  GOLDEN_BOOT: 20,
};

export const RESULT_TYPES = [
  { value: 'group_win', label: 'Group Stage Win', points: 3 },
  { value: 'group_draw', label: 'Group Stage Draw', points: 1 },
  { value: 'group_loss', label: 'Group Stage Loss', points: 0 },
  { value: 'r32_win', label: 'Round of 32 Win', points: 5 },
  { value: 'r16_win', label: 'Round of 16 Win', points: 8 },
  { value: 'qf_win', label: 'Quarter-Final Win', points: 8 },
  { value: 'sf_win', label: 'Semi-Final Win', points: 13 },
  { value: 'final_win', label: 'Final Win', points: 21 },
  { value: 'champion', label: 'Champions!', points: 34 },
];

export const BONUS_TYPES = [
  { value: 'goal', label: 'Goal', points: 6 },
  { value: 'assist', label: 'Assist', points: 4 },
  { value: 'clean_sheet_gk', label: 'Clean Sheet (GK)', points: 10 },
  { value: 'clean_sheet_def', label: 'Clean Sheet (DEF)', points: 6 },
  { value: 'yellow_card', label: 'Yellow Card', points: -1 },
  { value: 'red_card', label: 'Red Card', points: -3 },
  { value: 'motm', label: 'Man of the Match', points: 5 },
  { value: 'top_scorer', label: 'Top Scorer Bonus', points: 15 },
  { value: 'golden_boot', label: 'Golden Boot', points: 20 },
];

export const FALLBACK_POTS = {
  1: [
    'Mexico', 'Canada', 'USA', 'Argentina', 'Brazil', 'France',
    'England', 'Germany', 'Portugal', 'Netherlands', 'Spain', 'Belgium',
  ],
  2: [
    'Croatia', 'Morocco', 'Colombia', 'Uruguay', 'Switzerland', 'Japan',
    'Senegal', 'Iran', 'South Korea', 'Ecuador', 'Austria', 'Australia',
  ],
  3: [
    'Norway', 'Panama', 'Egypt', 'Algeria', 'Scotland', 'Paraguay',
    'Tunisia', 'Ivory Coast', 'Uzbekistan', 'Qatar', 'Saudi Arabia', 'South Africa',
  ],
  4: [
    'Jordan', 'Cape Verde', 'Ghana', 'Curaçao', 'Haiti', 'New Zealand',
    'Bosnia & Herzegovina', 'Sweden', 'Türkiye', 'Czechia', 'DR Congo', 'Iraq',
  ],
};

export function normalizePosition(pos) {
  if (!pos) return 'MID';
  const p = pos.toUpperCase();
  if (p === 'G' || p === 'GK' || p === 'GOALKEEPER') return 'GK';
  if (p === 'D' || p === 'DEF' || p === 'DEFENDER') return 'DEF';
  if (p === 'M' || p === 'MID' || p === 'MIDFIELDER') return 'MID';
  if (p === 'F' || p === 'FWD' || p === 'FORWARD' || p === 'ATTACKER') return 'FWD';
  return pos.slice(0, 3).toUpperCase();
}
