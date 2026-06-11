/**
 * Generate a snake draft order.
 * @param {Array} players - array of player objects with id
 * @param {number} totalRounds - number of rounds
 * @returns {Array<string>} ordered array of player ids
 */
export function getSnakeOrder(players, totalRounds) {
  if (!players || players.length === 0) return [];
  const order = [];
  for (let round = 0; round < totalRounds; round++) {
    const roundPlayers = round % 2 === 0
      ? [...players]
      : [...players].reverse();
    for (const p of roundPlayers) {
      order.push(p.id);
    }
  }
  return order;
}

/**
 * Get the index (in players array) of who should pick next.
 * @param {Array} picks - existing draft picks
 * @param {Array} players - array of player objects
 * @param {number} totalRounds - number of rounds
 * @returns {number} index into players array
 */
export function getCurrentPicker(picks, players, totalRounds) {
  if (!players || players.length === 0) return 0;
  const snakeOrder = getSnakeOrder(players, totalRounds);
  const pickCount = picks ? picks.length : 0;
  if (pickCount >= snakeOrder.length) return -1;
  const nextPickerId = snakeOrder[pickCount];
  const idx = players.findIndex(p => p.id === nextPickerId);
  return idx === -1 ? 0 : idx;
}

/**
 * Determine which pot a pick number falls into.
 * @param {number} pickNumber - 1-based pick number
 * @param {number} potSize - size of each pot (typically numPlayers)
 * @returns {number} 1-based pot number
 */
export function getPotFromPickNumber(pickNumber, potSize) {
  return Math.ceil(pickNumber / potSize);
}

/**
 * Determine which round a pick number falls into.
 * @param {number} pickNumber - 1-based pick number
 * @param {number} numPlayers - number of players in the draft
 * @returns {number} 1-based round number
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  if (!numPlayers || numPlayers === 0) return 1;
  return Math.ceil(pickNumber / numPlayers);
}
