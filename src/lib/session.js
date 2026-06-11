const KEY = 'copa_fantasy_session'

export function getSession() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export function setSession(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

export function getOrCreateToken() {
  const s = getSession() || {}
  if (!s.token) { s.token = crypto.randomUUID(); setSession(s) }
  return s.token
}

export function getPlayerName() { return getSession()?.playerName || '' }
export function setPlayerName(name) { setSession({ ...getSession(), playerName: name }) }
export function getGameId() { return getSession()?.gameId || null }
export function setGameId(id) { setSession({ ...getSession(), gameId: id }) }
