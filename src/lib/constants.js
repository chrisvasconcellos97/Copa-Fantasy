export const POTS = {
  1: [
    { code: "ARG", name: "Argentina", flag: "🇦🇷" },
    { code: "FRA", name: "France", flag: "🇫🇷" },
    { code: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { code: "BRA", name: "Brazil", flag: "🇧🇷" },
    { code: "POR", name: "Portugal", flag: "🇵🇹" },
    { code: "ESP", name: "Spain", flag: "🇪🇸" },
    { code: "NED", name: "Netherlands", flag: "🇳🇱" },
    { code: "GER", name: "Germany", flag: "🇩🇪" },
    { code: "BEL", name: "Belgium", flag: "🇧🇪" },
    { code: "CRO", name: "Croatia", flag: "🇭🇷" },
    { code: "MAR", name: "Morocco", flag: "🇲🇦" },
    { code: "USA", name: "United States", flag: "🇺🇸" },
  ],
  2: [
    { code: "URU", name: "Uruguay", flag: "🇺🇾" },
    { code: "COL", name: "Colombia", flag: "🇨🇴" },
    { code: "MEX", name: "Mexico", flag: "🇲🇽" },
    { code: "SEN", name: "Senegal", flag: "🇸🇳" },
    { code: "JPN", name: "Japan", flag: "🇯🇵" },
    { code: "KOR", name: "South Korea", flag: "🇰🇷" },
    { code: "SUI", name: "Switzerland", flag: "🇨🇭" },
    { code: "DEN", name: "Denmark", flag: "🇩🇰" },
    { code: "POL", name: "Poland", flag: "🇵🇱" },
    { code: "AUS", name: "Australia", flag: "🇦🇺" },
    { code: "ECU", name: "Ecuador", flag: "🇪🇨" },
    { code: "CAN", name: "Canada", flag: "🇨🇦" },
  ],
  3: [
    { code: "NGA", name: "Nigeria", flag: "🇳🇬" },
    { code: "CMR", name: "Cameroon", flag: "🇨🇲" },
    { code: "GHA", name: "Ghana", flag: "🇬🇭" },
    { code: "EGY", name: "Egypt", flag: "🇪🇬" },
    { code: "CIV", name: "Ivory Coast", flag: "🇨🇮" },
    { code: "TUN", name: "Tunisia", flag: "🇹🇳" },
    { code: "ALG", name: "Algeria", flag: "🇩🇿" },
    { code: "CRC", name: "Costa Rica", flag: "🇨🇷" },
    { code: "PAN", name: "Panama", flag: "🇵🇦" },
    { code: "PER", name: "Peru", flag: "🇵🇪" },
    { code: "CHI", name: "Chile", flag: "🇨🇱" },
    { code: "VEN", name: "Venezuela", flag: "🇻🇪" },
  ],
  4: [
    { code: "IRN", name: "Iran", flag: "🇮🇷" },
    { code: "SAU", name: "Saudi Arabia", flag: "🇸🇦" },
    { code: "QAT", name: "Qatar", flag: "🇶🇦" },
    { code: "NZL", name: "New Zealand", flag: "🇳🇿" },
    { code: "MLI", name: "Mali", flag: "🇲🇱" },
    { code: "SRB", name: "Serbia", flag: "🇷🇸" },
    { code: "UKR", name: "Ukraine", flag: "🇺🇦" },
    { code: "HUN", name: "Hungary", flag: "🇭🇺" },
    { code: "TUR", name: "Turkey", flag: "🇹🇷" },
    { code: "AUT", name: "Austria", flag: "🇦🇹" },
    { code: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
    { code: "WAL", name: "Wales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  ],
}

export const RESULT_TYPES = [
  { value: "group_win", label: "Group Win", defaultPoints: 3 },
  { value: "group_draw", label: "Group Draw", defaultPoints: 1 },
  { value: "group_loss", label: "Group Loss", defaultPoints: 0 },
  { value: "group_advance", label: "Advance from Group", defaultPoints: 5 },
  { value: "r32_win", label: "Round of 32 Win", defaultPoints: 8 },
  { value: "r16_win", label: "Round of 16 Win", defaultPoints: 13 },
  { value: "qf_win", label: "Quarter-Final Win", defaultPoints: 20 },
  { value: "sf_win", label: "Semi-Final Win", defaultPoints: 30 },
  { value: "runner_up", label: "Runner-Up", defaultPoints: 15 },
  { value: "champion", label: "Champion 🏆", defaultPoints: 40 },
]

export const BONUS_TYPES = [
  { value: "goal", label: "Goal", defaultPoints: 5 },
  { value: "assist", label: "Assist", defaultPoints: 3 },
  { value: "clean_sheet", label: "Clean Sheet (GK/CB)", defaultPoints: 4 },
  { value: "motm", label: "Man of the Match", defaultPoints: 3 },
  { value: "red_card", label: "Red Card", defaultPoints: -5 },
  { value: "own_goal", label: "Own Goal", defaultPoints: -5 },
  { value: "penalty_miss", label: "Penalty Miss", defaultPoints: -3 },
  { value: "golden_boot", label: "Golden Boot", defaultPoints: 15 },
  { value: "golden_ball", label: "Golden Ball", defaultPoints: 20 },
]

export function getAllTeams() {
  return Object.values(POTS).flat()
}

export function getTeamByCode(code) {
  return getAllTeams().find(t => t.code === code)
}
