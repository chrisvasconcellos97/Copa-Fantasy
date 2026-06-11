const TOKEN_KEY = 'copa_fantasy_token';
const NAME_KEY = 'copa_fantasy_name';
const GAME_KEY = 'copa_fantasy_game_id';

function generateToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateToken() {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = generateToken();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function setPlayerName(name) {
  localStorage.setItem(NAME_KEY, name);
}

export function getPlayerName() {
  return localStorage.getItem(NAME_KEY) || '';
}

export function setGameId(id) {
  localStorage.setItem(GAME_KEY, id);
}

export function getGameId() {
  return localStorage.getItem(GAME_KEY) || null;
}
