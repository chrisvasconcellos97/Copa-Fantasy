export const SCORING = {
  group_win: 3,
  group_draw: 1,
  group_advance: 5,
  r32_win: 8,
  r16_win: 13,
  qf_win: 20,
  sf_win: 30,
  runner_up: 15,
  champion: 40,
  goal: 5,
  assist: 3,
  clean_sheet_def: 4,
  clean_sheet_mid: 2,
  motm: 3,
  red_card: -5,
  own_goal: -5,
  penalty_miss: -3,
  golden_boot: 15,
  golden_ball: 20,
};

export const RESULT_TYPES = [
  'group_win',
  'group_draw',
  'group_advance',
  'r32_win',
  'r16_win',
  'qf_win',
  'sf_win',
  'runner_up',
  'champion',
];

export const BONUS_TYPES = [
  'goal',
  'assist',
  'clean_sheet_def',
  'clean_sheet_mid',
  'motm',
  'red_card',
  'own_goal',
  'penalty_miss',
  'golden_boot',
  'golden_ball',
];

export const FALLBACK_POTS = {
  1: [
    'Mexico',
    'Canada',
    'USA',
    'Argentina',
    'Brazil',
    'France',
    'England',
    'Germany',
    'Portugal',
    'Netherlands',
    'Spain',
    'Belgium',
  ],
  2: [
    'Croatia',
    'Morocco',
    'Colombia',
    'Uruguay',
    'Switzerland',
    'Japan',
    'Senegal',
    'Iran',
    'South Korea',
    'Ecuador',
    'Austria',
    'Australia',
  ],
  3: [
    'Norway',
    'Panama',
    'Egypt',
    'Algeria',
    'Scotland',
    'Paraguay',
    'Tunisia',
    'Ivory Coast',
    'Uzbekistan',
    'Qatar',
    'Saudi Arabia',
    'South Africa',
  ],
  4: [
    'Jordan',
    'Cape Verde',
    'Ghana',
    'Curaçao',
    'Haiti',
    'New Zealand',
    'Bosnia & Herzegovina',
    'Sweden',
    'Türkiye',
    'Czechia',
    'DR Congo',
    'Iraq',
  ],
};

/**
 * Normalize a football position string to FWD | MID | DEF | GK
 */
export function normalizePosition(pos) {
  if (!pos) return 'MID';
  const p = pos.toUpperCase();
  if (p.includes('ATTACK') || p === 'F' || p === 'FW' || p === 'FWD' || p.includes('FORWARD') || p.includes('STRIKER') || p === 'ST' || p === 'CF' || p === 'LW' || p === 'RW') return 'FWD';
  if (p.includes('MIDF') || p === 'M' || p === 'MF' || p === 'MID' || p === 'CM' || p === 'AM' || p === 'DM' || p === 'CAM' || p === 'CDM' || p === 'LM' || p === 'RM') return 'MID';
  if (p.includes('DEFEND') || p === 'D' || p === 'DF' || p === 'DEF' || p === 'CB' || p === 'LB' || p === 'RB' || p === 'LWB' || p === 'RWB') return 'DEF';
  if (p.includes('GOAL') || p === 'G' || p === 'GK') return 'GK';
  return 'MID';
}
