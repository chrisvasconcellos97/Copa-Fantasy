import { v4 as uuidv4 } from 'uuid'

const TOKEN_KEY = 'copa_session_token'
const NAME_KEY = 'copa_player_name'
const GAME_ID_KEY = 'copa_game_id'

export function getOrCreateToken() {
  let token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    token = uuidv4()
    localStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export function getPlayerName() {
  return localStorage.getItem(NAME_KEY) || ''
}

export function setPlayerName(name) {
  localStorage.setItem(NAME_KEY, name)
}

export function getGameId() {
  return localStorage.getItem(GAME_ID_KEY) || ''
}

export function setGameId(id) {
  localStorage.setItem(GAME_ID_KEY, id)
}
