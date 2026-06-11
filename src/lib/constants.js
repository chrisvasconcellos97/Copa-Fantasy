export const SCORING = {
  // Team results
  group_win: 3,
  group_draw: 1,
  group_loss: 0,
  r32_win: 5,
  qf_win: 8,
  sf_win: 13,
  final_win: 21,
  champion: 34,
  // Player events
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

export const RESULT_TYPES = [
  { value: 'group_win', label: 'Group Stage Win (+3)' },
  { value: 'group_draw', label: 'Group Stage Draw (+1)' },
  { value: 'group_loss', label: 'Group Stage Loss (+0)' },
  { value: 'r32_win', label: 'Round of 32 Win (+5)' },
  { value: 'qf_win', label: 'Quarter-Final Win (+8)' },
  { value: 'sf_win', label: 'Semi-Final Win (+13)' },
  { value: 'final_win', label: 'Final Win (+21)' },
  { value: 'champion', label: 'Champion (+34)' },
];

export const BONUS_TYPES = [
  { value: 'motm', label: 'Man of the Match (+5)' },
  { value: 'top_scorer', label: 'Top Scorer Bonus (+15)' },
  { value: 'golden_boot', label: 'Golden Boot (+20)' },
  { value: 'custom', label: 'Custom Bonus' },
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
  return p.slice(0, 3);
}
