/**
 * Returns snake draft order: array of player indices for each pick slot.
 * E.g. 3 players, 2 rounds: [0,1,2, 2,1,0]
 */
export function getSnakeOrder(players, totalRounds) {
  const order = [];
  const n = players.length;
  for (let round = 0; round < totalRounds; round++) {
    if (round % 2 === 0) {
      for (let i = 0; i < n; i++) order.push(i);
    } else {
      for (let i = n - 1; i >= 0; i--) order.push(i);
    }
  }
  return order;
}

/**
 * Returns the index into players array of who should pick next.
 */
export function getCurrentPicker(picks, players, totalRounds) {
  const pickCount = picks ? picks.length : 0;
  const order = getSnakeOrder(players, totalRounds);
  if (pickCount >= order.length) return -1; // draft complete
  return order[pickCount];
}

/**
 * Returns pot number (1-4) based on pick number in the draft.
 * potSize = number of teams per pot (default 12 for 48-team tournament).
 */
export function getPotFromPickNumber(pickNumber, potSize = 12) {
  return Math.floor((pickNumber - 1) / potSize) + 1;
}

/**
 * Returns the round number (1-indexed) for a given pick number and number of players.
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  return Math.ceil(pickNumber / numPlayers);
}
