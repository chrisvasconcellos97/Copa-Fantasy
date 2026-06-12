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
  { value: 'top_scorer', label: 'Top Scorer (Round)', points: 15 },
  { value: 'golden_boot', label: 'Golden Boot', points: 20 },
  { value: 'custom', label: 'Custom Bonus', points: 0 },
];

const L = (code) => `https://a.espncdn.com/i/teamlogos/countries/500/${code}.png`;

export const FALLBACK_POTS = {
  1: [
    { name: 'Mexico', logo: L('mex') },
    { name: 'Canada', logo: L('can') },
    { name: 'United States', logo: L('usa') },
    { name: 'Argentina', logo: L('arg') },
    { name: 'Brazil', logo: L('bra') },
    { name: 'France', logo: L('fra') },
    { name: 'England', logo: L('eng') },
    { name: 'Germany', logo: L('ger') },
    { name: 'Portugal', logo: L('por') },
    { name: 'Netherlands', logo: L('ned') },
    { name: 'Spain', logo: L('esp') },
    { name: 'Belgium', logo: L('bel') },
  ],
  2: [
    { name: 'Croatia', logo: L('cro') },
    { name: 'Morocco', logo: L('mar') },
    { name: 'Colombia', logo: L('col') },
    { name: 'Uruguay', logo: L('uru') },
    { name: 'Switzerland', logo: L('sui') },
    { name: 'Japan', logo: L('jpn') },
    { name: 'Senegal', logo: L('sen') },
    { name: 'Iran', logo: L('irn') },
    { name: 'South Korea', logo: L('kor') },
    { name: 'Ecuador', logo: L('ecu') },
    { name: 'Austria', logo: L('aut') },
    { name: 'Australia', logo: L('aus') },
  ],
  3: [
    { name: 'Norway', logo: L('nor') },
    { name: 'Panama', logo: L('pan') },
    { name: 'Egypt', logo: L('egy') },
    { name: 'Algeria', logo: L('alg') },
    { name: 'Scotland', logo: L('sco') },
    { name: 'Paraguay', logo: L('par') },
    { name: 'Tunisia', logo: L('tun') },
    { name: 'Ivory Coast', logo: L('civ') },
    { name: 'Uzbekistan', logo: L('uzb') },
    { name: 'Qatar', logo: L('qat') },
    { name: 'Saudi Arabia', logo: L('ksa') },
    { name: 'South Africa', logo: L('rsa') },
  ],
  4: [
    { name: 'Jordan', logo: L('jor') },
    { name: 'Cape Verde', logo: L('cpv') },
    { name: 'Ghana', logo: L('gha') },
    { name: 'Curaçao', logo: L('cuw') },
    { name: 'Haiti', logo: L('hai') },
    { name: 'New Zealand', logo: L('nzl') },
    { name: 'Bosnia-Herzegovina', logo: L('bih') },
    { name: 'Sweden', logo: L('swe') },
    { name: 'Türkiye', logo: L('tur') },
    { name: 'Czechia', logo: L('cze') },
    { name: 'Congo DR', logo: L('cod') },
    { name: 'Iraq', logo: L('irq') },
  ],
};

export function normalizePosition(pos) {
  if (!pos) return 'MID';
  const p = pos.toUpperCase().trim();
  if (p === 'G' || p === 'GK' || p === 'GOALKEEPER' || p === 'PORTERO') return 'GK';
  if (p === 'D' || p === 'DEF' || p === 'DEFENDER' || p === 'DEFENSA') return 'DEF';
  if (p === 'M' || p === 'MID' || p === 'MIDFIELDER' || p === 'MEDIOCAMPISTA') return 'MID';
  if (p === 'F' || p === 'FWD' || p === 'FORWARD' || p === 'ATTACKER' || p === 'DELANTERO') return 'FWD';
  return 'MID';
}
