/**
 * Returns the full snake draft order as an array of player indices.
 * e.g. 3 players, 3 rounds => [0,1,2, 2,1,0, 0,1,2]
 */
export function getSnakeOrder(players, totalRounds) {
  const order = [];
  const n = players.length;
  for (let round = 0; round < totalRounds; round++) {
    const indices = Array.from({ length: n }, (_, i) => i);
    if (round % 2 === 1) indices.reverse();
    order.push(...indices);
  }
  return order;
}

/**
 * Returns the index into players[] of whoever should be picking next.
 * Returns -1 if draft is complete.
 */
export function getCurrentPicker(picks, players, totalRounds) {
  const n = players.length;
  const totalPicks = n * totalRounds;
  if (picks.length >= totalPicks) return -1;
  const order = getSnakeOrder(players, totalRounds);
  return order[picks.length];
}

/**
 * Given a 1-based pick number and the pot size (teams per pot),
 * returns which pot round we are in (1-indexed).
 */
export function getPotFromPickNumber(pickNumber, potSize) {
  return Math.ceil(pickNumber / potSize);
}

/**
 * Given a 1-based pick number and number of players,
 * returns the round number (1-indexed).
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  return Math.ceil(pickNumber / numPlayers);
}
