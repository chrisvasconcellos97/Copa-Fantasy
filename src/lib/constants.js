export const SCORING = {
  // Team results
  GROUP_WIN: 3,
  GROUP_DRAW: 1,
  GROUP_LOSS: 0,
  R32_WIN: 5,
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
  { value: 'qf_win', label: 'Quarter-Final Win', points: 8 },
  { value: 'sf_win', label: 'Semi-Final Win', points: 13 },
  { value: 'final_win', label: 'Final Win', points: 21 },
  { value: 'champion', label: 'Champion Bonus', points: 34 },
];

export const BONUS_TYPES = [
  { value: 'motm', label: 'Man of the Match', points: 5 },
  { value: 'top_scorer', label: 'Tournament Top Scorer', points: 15 },
  { value: 'golden_boot', label: 'Golden Boot', points: 20 },
  { value: 'custom', label: 'Custom Bonus', points: 0 },
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
  if (p.includes('GOAL') || p === 'GK' || p === 'G') return 'GK';
  if (p.includes('DEF') || p === 'D' || p === 'CB' || p === 'LB' || p === 'RB') return 'DEF';
  if (p.includes('MID') || p === 'M' || p === 'CM' || p === 'DM' || p === 'AM') return 'MID';
  if (p.includes('FOR') || p.includes('ATT') || p === 'F' || p === 'ST' || p === 'LW' || p === 'RW') return 'FWD';
  return 'MID';
}
