/**
 * Generate the full snake draft order as an array of player indices.
 * Round 1: 0,1,2,...,n-1
 * Round 2: n-1,...,1,0
 * Round 3: 0,1,...  etc.
 *
 * Returns array of length (numPlayers * totalRounds) containing player indices.
 */
export function getSnakeOrder(players, totalRounds) {
  const n = players.length;
  const order = [];
  for (let r = 0; r < totalRounds; r++) {
    const ascending = r % 2 === 0;
    for (let i = 0; i < n; i++) {
      order.push(ascending ? i : n - 1 - i);
    }
  }
  return order;
}

/**
 * Given existing picks, players array, and total rounds,
 * returns the index in the players array of who picks next,
 * or null if the draft is complete.
 */
export function getCurrentPicker(picks, players, totalRounds) {
  if (!players || players.length === 0) return null;
  const totalPicks = players.length * totalRounds;
  if (picks.length >= totalPicks) return null;
  const order = getSnakeOrder(players, totalRounds);
  return order[picks.length];
}

/**
 * Given a 1-based pick number and a pot size (e.g. 12 teams per pot),
 * returns which pot (1-4) that pick falls into for a 4-round snake.
 * This is a rough approximation useful when players pick 1 team per pot.
 */
export function getPotFromPickNumber(pickNumber, potSize) {
  return Math.min(4, Math.floor((pickNumber - 1) / potSize) + 1);
}

/**
 * Given a 1-based pick number and number of players,
 * returns which round (1-based) that pick is in.
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  if (!numPlayers || numPlayers === 0) return 1;
  return Math.floor((pickNumber - 1) / numPlayers) + 1;
}
