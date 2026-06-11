/**
 * Returns the full snake-order array of player indices for all rounds.
 * e.g. 3 players, 2 rounds → [0,1,2, 2,1,0]
 */
export function getSnakeOrder(players, totalRounds) {
  const order = [];
  const n = players.length;
  for (let round = 0; round < totalRounds; round++) {
    const indices = round % 2 === 0
      ? Array.from({ length: n }, (_, i) => i)
      : Array.from({ length: n }, (_, i) => n - 1 - i);
    order.push(...indices);
  }
  return order;
}

/**
 * Returns the player index (in the players array) of the current picker.
 */
export function getCurrentPicker(picks, players, totalRounds) {
  if (!players || players.length === 0) return -1;
  const order = getSnakeOrder(players, totalRounds);
  const picksDone = picks ? picks.length : 0;
  if (picksDone >= order.length) return -1;
  return order[picksDone];
}

/**
 * Returns the pot number (1-4) for a given pick number (0-indexed).
 * potSize = number of teams per pot (default 12 for 48-team WC).
 */
export function getPotFromPickNumber(pickNumber, potSize = 12) {
  const pot = Math.floor(pickNumber / potSize) + 1;
  return Math.min(pot, 4);
}

/**
 * Returns the round number (0-indexed) for a given pick number and player count.
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  if (!numPlayers || numPlayers === 0) return 0;
  return Math.floor(pickNumber / numPlayers);
}
