// ============================================================
// Copa Fantasy 2026 – Draft Logic Helpers
// ============================================================

/**
 * Generate the full snake-draft pick order given a list of players
 * and a total number of rounds.
 *
 * Round 1: players[0], players[1], …, players[n-1]
 * Round 2: players[n-1], …, players[0]  (reversed)
 * … and so on.
 *
 * @param {Array<{id: string}>} players  – ordered list of game_players
 * @param {number} totalRounds
 * @returns {Array<string>} – array of player ids in pick order
 */
export function getSnakeOrder(players, totalRounds) {
  if (!players || players.length === 0) return [];
  const order = [];
  for (let round = 0; round < totalRounds; round++) {
    const roundOrder = round % 2 === 0 ? [...players] : [...players].reverse();
    for (const p of roundOrder) {
      order.push(p.id);
    }
  }
  return order;
}

/**
 * Return the id of the player whose turn it is next.
 *
 * @param {Array<{id: string, game_player_id: string}>} picks – draft_picks already made
 * @param {Array<{id: string}>} players
 * @param {number} totalRounds
 * @returns {string|null} – game_player id or null if draft is complete
 */
export function getCurrentPicker(picks, players, totalRounds) {
  if (!players || players.length === 0) return null;
  const order = getSnakeOrder(players, totalRounds);
  const picksMade = picks ? picks.length : 0;
  if (picksMade >= order.length) return null;
  return order[picksMade];
}

/**
 * Return the pot number (1-4) that a given pick number falls into.
 * Each pot has `potSize` picks.
 *
 * @param {number} pickNumber – 1-indexed
 * @param {number} potSize    – e.g. 12 teams per pot, so 12 picks per round per pot
 * @returns {number} 1-4
 */
export function getPotFromPickNumber(pickNumber, potSize = 12) {
  const idx = pickNumber - 1; // 0-indexed
  return Math.floor(idx / potSize) + 1;
}

/**
 * Return the round number (1-indexed) of a given pick.
 *
 * @param {number} pickNumber – 1-indexed
 * @param {number} numPlayers
 * @returns {number}
 */
export function getRoundFromPickNumber(pickNumber, numPlayers) {
  if (!numPlayers || numPlayers === 0) return 1;
  return Math.ceil(pickNumber / numPlayers);
}
