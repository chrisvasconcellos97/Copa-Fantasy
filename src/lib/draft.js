export function getSnakeOrder(numPlayers, totalRounds = 8) {
  const order = [];
  for (let r = 0; r < totalRounds; r++) {
    const round = Array.from({length: numPlayers}, (_, i) => i);
    if (r % 2 === 1) round.reverse();
    order.push(...round);
  }
  return order;
}
export function getCurrentPicker(picks, players) {
  const numPlayers = players.length;
  if (numPlayers === 0) return null;
  const order = getSnakeOrder(numPlayers, 8);
  const pickIndex = picks.length;
  if (pickIndex >= order.length) return null;
  return players[order[pickIndex]] || null;
}
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  return Math.floor((pickNumber - 1) / numPlayers) + 1;
}
export function getPotFromPickNumber(pickNumber, numPlayers) {
  const round = getRoundFromPickNumber(pickNumber, numPlayers);
  if (round <= 2) return 1;
  if (round <= 4) return 2;
  if (round <= 6) return 3;
  return 4;
}
