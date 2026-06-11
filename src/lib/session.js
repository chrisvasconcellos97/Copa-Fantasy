const SESSION_KEY = 'copa_session';

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : { playerId: null, playerName: null, hostToken: null };
  } catch {
    return { playerId: null, playerName: null, hostToken: null };
  }
}

export function setSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Legacy helpers kept for compatibility
export function getOrCreateToken() {
  let t = localStorage.getItem('copa_token');
  if (!t) { t = crypto.randomUUID(); localStorage.setItem('copa_token', t); }
  return t;
}
export function setPlayerName(name) { localStorage.setItem('copa_name', name); }
export function getPlayerName() { return localStorage.getItem('copa_name') || ''; }
export function setGameId(id) { localStorage.setItem('copa_game_id', id); }
export function getGameId() { return localStorage.getItem('copa_game_id'); }
