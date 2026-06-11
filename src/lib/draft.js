/**
 * Returns the full snake draft order as an array of player indices.
 * e.g. players=[A,B,C], totalRounds=3 → [0,1,2, 2,1,0, 0,1,2]
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
 * Returns the index in the players array of who should currently be picking.
 * Returns -1 if draft is complete.
 */
export function getCurrentPicker(picks, players, totalRounds) {
  if (!players || players.length === 0) return -1;
  const order = getSnakeOrder(players, totalRounds);
  const picksMade = picks ? picks.length : 0;
  if (picksMade >= order.length) return -1;
  return order[picksMade];
}

/**
 * Returns the pot number (1-4) for a given pick number (1-indexed).
 * potSize is the number of teams per pot.
 */
export function getPotFromPickNumber(pickNumber, potSize) {
  if (!potSize || potSize <= 0) return 1;
  return Math.min(4, Math.ceil(pickNumber / potSize));
}

/**
 * Returns the round number (1-indexed) for a given pick number (1-indexed).
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  if (!numPlayers || numPlayers <= 0) return 1;
  return Math.ceil(pickNumber / numPlayers);
}
