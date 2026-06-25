// NOTE: The authoritative point values live in src/lib/scoring.js (and the
// server engines). RESULT_TYPES below is only used by the host's manual
// "Add team result" panel in LeaderboardView and will be reconciled into the
// add_team_result RPC during the security migration; do not treat it as the
// scoring source of truth.
export const RESULT_TYPES = [
  { value: 'group_win', label: 'Group Stage Win', points: 3 },
  { value: 'group_draw', label: 'Group Stage Draw', points: 1 },
  { value: 'group_loss', label: 'Group Stage Loss', points: 0 },
  { value: 'r32_win', label: 'Round of 32 Win', points: 5 },
  { value: 'r16_win', label: 'Round of 16 Win', points: 8 },
  { value: 'qf_win', label: 'Quarter-Final Win', points: 13 },
  { value: 'sf_win', label: 'Semi-Final Win', points: 21 },
  { value: 'final_win', label: 'Final Win', points: 34 },
  { value: 'champion', label: 'Champion Bonus', points: 55 },
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
