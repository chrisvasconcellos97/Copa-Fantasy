import { v4 as uuidv4 } from 'uuid'

export function getOrCreateToken() {
  let token = localStorage.getItem('cf_session_token')
  if (!token) {
    token = uuidv4()
    localStorage.setItem('cf_session_token', token)
  }
  return token
}

export function setPlayerName(name) {
  localStorage.setItem('cf_player_name', name)
}

export function getPlayerName() {
  return localStorage.getItem('cf_player_name') || ''
}

export function setGameId(id) {
  localStorage.setItem('cf_game_id', id)
}

export function getGameId() {
  return localStorage.getItem('cf_game_id')
}
