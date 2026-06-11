const API_KEY = '1e60025d01a19a0d02428500673187e4'
const BASE = 'https://v3.football.api-sports.io'
const ORIGIN = 'https://copa-fantasy-psi.vercel.app'

export async function apiFetch(path, params = {}) {
  const url = new URL(`${BASE}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY, 'Origin': ORIGIN }
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length > 0) throw new Error(JSON.stringify(json.errors))
  return json.response
}
