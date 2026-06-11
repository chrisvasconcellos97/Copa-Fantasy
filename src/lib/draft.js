/**
 * Returns the full snake order of [playerIndex, ...] for each pick slot.
 * Snake: round 1 goes 0,1,2,...,n-1 and round 2 goes n-1,...,1,0, etc.
 */
export function getSnakeOrder(players, totalRounds) {
  const n = players.length;
  const order = [];
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
 * Returns the index in players array of who should pick next.
 */
export function getCurrentPicker(picks, players, totalRounds) {
  if (!players || players.length === 0) return 0;
  const order = getSnakeOrder(players, totalRounds);
  const pickCount = picks ? picks.length : 0;
  if (pickCount >= order.length) return -1; // draft complete
  return order[pickCount];
}

/**
 * Returns which pot number a given pick falls into.
 * potSize: number of teams per pot (default 12)
 * Picks are 1-indexed.
 */
export function getPotFromPickNumber(pickNumber, potSize = 12) {
  return Math.ceil(pickNumber / potSize);
}

/**
 * Returns which round (1-indexed) a pick number belongs to,
 * given the number of players in the draft.
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  return Math.ceil(pickNumber / numPlayers);
}
