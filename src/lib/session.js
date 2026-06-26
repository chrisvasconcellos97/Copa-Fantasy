import { FUNCTIONS_URL, SUPABASE_ANON_KEY, setAuthJwt, getAuthJwt } from './supabase'

const KEY = 'copa_fantasy_session'

export function getSession() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export function setSession(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function clearSession() {
  localStorage.removeItem(KEY)
  setAuthJwt(null)
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

// Exchange the player's secret token for a signed JWT (claims: player_id,
// game_id, is_host) and attach it to the supabase client. Best-effort: if the
// auth-issue function isn't reachable / configured yet, we fall back to anon so
// the app keeps working (RLS cut-over happens only once this path is verified).
// Returns the player payload on success, or null on failure.
export async function bootstrapAuth(playerToken) {
  if (!playerToken) return null
  try {
    const res = await fetch(`${FUNCTIONS_URL}/auth-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ token: playerToken }),
    })
    if (!res.ok) { setAuthJwt(null); return null }
    const data = await res.json()
    if (data?.jwt) { setAuthJwt(data.jwt); return data.player ?? null }
    setAuthJwt(null)
    return null
  } catch {
    setAuthJwt(null)
    return null
  }
}

// Guarantee a JWT is attached before a write/RPC that needs the caller's
// identity. Mints one from the stored session token on first use. Safe to call
// repeatedly (no-op once a JWT is held).
export async function ensureAuth() {
  if (getAuthJwt()) return getAuthJwt()
  const s = getSession()
  if (s?.playerToken) await bootstrapAuth(s.playerToken)
  return getAuthJwt()
}
