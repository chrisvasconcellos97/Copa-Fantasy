export const SCORING = {
  team: { group_win:3, group_draw:1, group_advance:5, r32_win:8, r16_win:13, qf_win:20, sf_win:30, runner_up:15, champion:40 },
  player: { goal:5, assist:3, clean_sheet_def:4, clean_sheet_mid:2, motm:3, red_card:-5, own_goal:-5, penalty_miss:-3, golden_boot:15, golden_ball:20 }
};
export const RESULT_TYPES = ['group_win','group_draw','group_advance','r32_win','r16_win','qf_win','sf_win','runner_up','champion'];
export const BONUS_TYPES = ['goal','assist','clean_sheet_def','clean_sheet_mid','motm','red_card','own_goal','penalty_miss','golden_boot','golden_ball'];
export const FALLBACK_POTS = {
  1: ['Mexico','Canada','USA','Argentina','Brazil','France','England','Germany','Portugal','Netherlands','Spain','Belgium'],
  2: ['Croatia','Morocco','Colombia','Uruguay','Switzerland','Japan','Senegal','Iran','South Korea','Ecuador','Austria','Australia'],
  3: ['Norway','Panama','Egypt','Algeria','Scotland','Paraguay','Tunisia','Ivory Coast','Uzbekistan','Qatar','Saudi Arabia','South Africa'],
  4: ['Jordan','Cape Verde','Ghana','Curaçao','Haiti','New Zealand','Bosnia & Herzegovina','Sweden','Türkiye','Czechia','DR Congo','Iraq']
};
export function normalizePosition(pos) {
  if (!pos) return 'MID';
  const p = pos.toUpperCase();
  if (p === 'GK' || p === 'GOALKEEPER') return 'GK';
  if (p === 'DEF' || p === 'DEFENDER') return 'DEF';
  if (p === 'MID' || p === 'MIDFIELDER') return 'MID';
  if (p === 'FWD' || p === 'ATT' || p === 'FORWARD' || p === 'ATTACKER') return 'FWD';
  return 'MID';
}
