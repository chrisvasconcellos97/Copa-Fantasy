/**
 * Returns an array of player indices in snake draft order.
 * e.g. 3 players, 2 rounds => [0,1,2, 2,1,0]
 */
export function getSnakeOrder(players, totalRounds = 8) {
  const n = Array.isArray(players) ? players.length : players;
  const order = [];
  for (let r = 0; r < totalRounds; r++) {
    const round = Array.from({ length: n }, (_, i) => i);
    if (r % 2 === 1) round.reverse();
    order.push(...round);
  }
  return order;
}

/**
 * Given current picks array and players array, return the player object
 * whose turn it is to pick.
 */
export function getCurrentPicker(picks, players, totalRounds = 8) {
  const n = players.length;
  if (n === 0) return null;
  const order = getSnakeOrder(n, totalRounds);
  const pickIndex = picks.length;
  if (pickIndex >= order.length) return null;
  return players[order[pickIndex]] || null;
}

/**
 * Returns the current round number (1-based) given a 1-based pick number and
 * number of players.
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  return Math.floor((pickNumber - 1) / numPlayers) + 1;
}

/**
 * Maps pick number to a pot (1-4) using a 2-rounds-per-pot convention.
 * Rounds 1-2 → Pot 1, Rounds 3-4 → Pot 2, Rounds 5-6 → Pot 3, Rounds 7-8 → Pot 4
 */
export function getPotFromPickNumber(pickNumber, numPlayers) {
  const round = getRoundFromPickNumber(pickNumber, numPlayers);
  if (round <= 2) return 1;
  if (round <= 4) return 2;
  if (round <= 6) return 3;
  return 4;
}
