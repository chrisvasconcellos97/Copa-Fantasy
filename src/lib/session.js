export function getOrCreateToken() {
  let t = localStorage.getItem('copa_token');
  if (!t) { t = crypto.randomUUID(); localStorage.setItem('copa_token', t); }
  return t;
}
export function setPlayerName(name) { localStorage.setItem('copa_name', name); }
export function getPlayerName() { return localStorage.getItem('copa_name') || ''; }
export function setGameId(id) { localStorage.setItem('copa_game_id', id); }
export function getGameId() { return localStorage.getItem('copa_game_id'); }
