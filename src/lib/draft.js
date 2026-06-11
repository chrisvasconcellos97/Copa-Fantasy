/**
 * Generate snake draft order given player array and total rounds.
 * Returns array of player indices in pick order.
 * Round 1: 0,1,2,...,n-1
 * Round 2: n-1,...,1,0  (reversed)
 * etc.
 */
export function getSnakeOrder(players, totalRounds) {
  if (!players || players.length === 0) return [];
  const order = [];
  for (let round = 0; round < totalRounds; round++) {
    const indices = players.map((_, i) => i);
    if (round % 2 === 1) indices.reverse();
    order.push(...indices);
  }
  return order;
}

/**
 * Get the index in `players` array whose turn it is to pick,
 * given current picks already made.
 */
export function getCurrentPicker(picks, players, totalRounds) {
  if (!players || players.length === 0) return null;
  const order = getSnakeOrder(players, totalRounds);
  const pickIndex = picks ? picks.length : 0;
  if (pickIndex >= order.length) return null;
  return order[pickIndex];
}

/**
 * Given a 1-based pick number and pot size (teams per pot),
 * return which pot (1-4) the pick belongs to (based on rounds).
 * In a 4-pot draft, every `numPlayers` picks advances to next pot.
 */
export function getPotFromPickNumber(pickNumber, potSize) {
  if (!pickNumber || pickNumber < 1) return 1;
  return Math.min(4, Math.ceil(pickNumber / potSize));
}

/**
 * Get the round number (1-based) for a given pick number.
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  if (!pickNumber || !numPlayers || numPlayers === 0) return 1;
  return Math.ceil(pickNumber / numPlayers);
}
