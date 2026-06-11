/**
 * Get the snake draft order for all picks.
 * Snake: round 1 → 1,2,3,...,n; round 2 → n,n-1,...,1; etc.
 * Returns array of player indices (0-based) for each pick.
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
 * Given existing picks and players list, return the player whose turn it is.
 */
export function getCurrentPicker(picks, players) {
  if (!players || players.length === 0) return null;
  const totalRounds = 4; // 4 pots × 2 teams each
  const order = getSnakeOrder(players, totalRounds);
  const pickIndex = picks ? picks.length : 0;
  if (pickIndex >= order.length) return null;
  const playerIndex = order[pickIndex];
  return players[playerIndex] || null;
}

/**
 * Get which pot (1-4) corresponds to a given pick number (0-based).
 * Each player picks 2 teams per pot, so pot changes every 2*playersCount picks.
 */
export function getPotFromPickNumber(pickNumber, playersCount) {
  if (!playersCount) return 1;
  const picksPerPot = playersCount * 2;
  return Math.floor(pickNumber / picksPerPot) + 1;
}

/**
 * Get which round (1-based) within the current pot.
 */
export function getRoundFromPickNumber(pickNumber, playersCount) {
  if (!playersCount) return 1;
  const picksPerPot = playersCount * 2;
  const pickInPot = pickNumber % picksPerPot;
  return Math.floor(pickInPot / playersCount) + 1;
}
