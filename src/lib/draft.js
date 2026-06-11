/**
 * Returns the full snake draft order as an array of player indices.
 * Round 1: 0,1,2,...,n-1
 * Round 2: n-1,...,1,0
 * Round 3: 0,1,2,...  etc.
 */
export function getSnakeOrder(players, totalRounds) {
  const n = players.length;
  const order = [];
  for (let round = 0; round < totalRounds; round++) {
    const indices = Array.from({ length: n }, (_, i) => i);
    if (round % 2 === 1) indices.reverse();
    order.push(...indices);
  }
  return order;
}

/**
 * Returns the player object whose turn it currently is.
 * picks: current draft_picks array
 * players: game_players array (ordered by joined_at)
 */
export function getCurrentPicker(picks, players, totalRounds) {
  if (!players || players.length === 0) return null;
  const order = getSnakeOrder(players, totalRounds);
  const pickIndex = picks.length;
  if (pickIndex >= order.length) return null;
  const playerIndex = order[pickIndex];
  return players[playerIndex] || null;
}

/**
 * Returns pot number (1-based) for the given pick number (0-based).
 * potSize: how many teams per pot (default 12 for a 48-team tournament, 4 pots).
 */
export function getPotFromPickNumber(pickNumber, potSize = 12) {
  return Math.floor(pickNumber / potSize) + 1;
}

/**
 * Returns the round number (1-based) for the given pick number (0-based).
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  if (!numPlayers || numPlayers === 0) return 1;
  return Math.floor(pickNumber / numPlayers) + 1;
}
