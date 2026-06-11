export function getSnakeOrder(players, totalRounds) {
  const order = [];
  const n = players.length;
  for (let r = 0; r < totalRounds; r++) {
    const isReverse = r % 2 === 1;
    for (let i = 0; i < n; i++) {
      order.push(isReverse ? n - 1 - i : i);
    }
  }
  return order;
}

export function getCurrentPicker(picks, players, currentPickNumber) {
  if (!players.length) return null;
  const n = players.length;
  const pickIndex = currentPickNumber - 1;
  const roundIndex = Math.floor(pickIndex / n);
  const posInRound = pickIndex % n;
  const isReverse = roundIndex % 2 === 1;
  const playerIndex = isReverse ? n - 1 - posInRound : posInRound;
  return players[playerIndex] || null;
}

export function getPotFromPickNumber(pickNumber, numPlayers) {
  const roundIndex = Math.floor((pickNumber - 1) / numPlayers);
  return Math.floor(roundIndex / 2) + 1;
}

export function getRoundFromPickNumber(pickNumber, numPlayers) {
  return Math.floor((pickNumber - 1) / numPlayers) + 1;
}
