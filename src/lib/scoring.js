// ─────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for the points the scoring engine awards.
//
// These values MUST stay identical to the inlined constants in the two
// server-side scoring engines:
//   - supabase/functions/calculate-scores/index.ts  (host "Recalculate")
//   - supabase/functions/auto-sync/index.ts          (live cron)
// If you change a value here, change it in BOTH functions and redeploy them,
// or the leaderboard will disagree with this modal.
// ─────────────────────────────────────────────────────────────────────────

export const SCORING = {
  // Team results — awarded per finished fixture to whoever drafted the team.
  WIN: 3,   // any round (group or knockout)
  DRAW: 1,
  LOSS: 0,

  // Group-stage finish — final position in the group table.
  GROUP_FINISH_1ST: 15,
  GROUP_FINISH_2ND: 10,
  GROUP_FINISH_3RD: 5,

  // Giant-killing — a Pot 4 team you own beats a Pot 1 team in the group stage.
  UPSET: 8,

  // Player clean sheets — the player's team concedes 0 in a fixture.
  CLEAN_SHEET_GK: 12,
  CLEAN_SHEET_DEF: 8,

  // Player events.
  GOAL: 8,
  ASSIST: 5,
  PENALTY_SAVE: 10,
  YELLOW_CARD: -1,
  OWN_GOAL: -3,
  RED_CARD: -4,

  // Player single-match bonuses.
  BRACE: 10,         // 2 goals in one match
  HAT_TRICK: 25,     // 3+ goals in one match — IN ADDITION to the brace
  DOUBLE_ASSIST: 8,  // 2+ assists in one match

  // Tournament-wide.
  GOLDEN_BOOT: 30,   // most goals in the tournament, awarded once it completes
};

// Your chosen captain's player-derived points (events, clean sheets, match
// bonuses, Golden Boot) are doubled by the engine.
export const CAPTAIN_MULTIPLIER = 2;

// Rows rendered by PointsModal, derived from SCORING above so the displayed
// rules can never drift from the values.
export const TEAM_SCORING_ROWS = [
  { label: 'Win (any round)', value: SCORING.WIN },
  { label: 'Draw', value: SCORING.DRAW },
  { label: 'Loss', value: SCORING.LOSS, positive: false },
  { label: 'Finish 1st in group', value: SCORING.GROUP_FINISH_1ST },
  { label: 'Finish 2nd in group', value: SCORING.GROUP_FINISH_2ND },
  { label: 'Finish 3rd in group', value: SCORING.GROUP_FINISH_3RD },
  { label: 'Giant-killing (Pot 4 beats Pot 1, group stage)', value: SCORING.UPSET },
];

export const PLAYER_SCORING_ROWS = [
  { label: 'Goal', value: SCORING.GOAL },
  { label: 'Assist', value: SCORING.ASSIST },
  { label: 'Brace (2 goals in a match)', value: SCORING.BRACE },
  { label: 'Hat-trick (3+ goals) — on top of the brace', value: SCORING.HAT_TRICK },
  { label: 'Two assists in a match', value: SCORING.DOUBLE_ASSIST },
  { label: 'Clean sheet — Goalkeeper', value: SCORING.CLEAN_SHEET_GK },
  { label: 'Clean sheet — Defender', value: SCORING.CLEAN_SHEET_DEF },
  { label: 'Penalty save', value: SCORING.PENALTY_SAVE },
  { label: 'Golden Boot (tournament top scorer)', value: SCORING.GOLDEN_BOOT },
  { label: 'Yellow card', value: SCORING.YELLOW_CARD, positive: false },
  { label: 'Own goal', value: SCORING.OWN_GOAL, positive: false },
  { label: 'Red card', value: SCORING.RED_CARD, positive: false },
];
