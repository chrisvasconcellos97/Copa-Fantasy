// Copa — the Copa Fantasy mascot. A soccer ball with arms, legs and attitude.
//
// <Mascot pose="idle" size={120} />
// <Mascot pose="excited" size={80} />
// <Mascot pose="celebrating" size={160} />
// <Mascot pose="thinking" size={100} />
// <Mascot pose="waiting" size={100} />
//
// Drawn in a fixed 200x250 viewBox and scaled via `size` (width in px).

const INK = '#15152a';
const BALL_HI = '#ffffff';
const BALL_LO = '#d4d6e2';
const GOLD = '#FFD700';
const GOLD_DARK = '#b8960c';
const BLUSH = '#ff8fa3';
const TONGUE = '#ff6b81';

// Pentagon as an SVG points string
const pent = (cx, cy, r, rot = -Math.PI / 2) =>
  Array.from({ length: 5 }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / 5;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

// An outlined limb: ink underlay stroke + colored stroke on top
function Limb({ d, width = 10, fill = BALL_HI }) {
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth={width + 5} strokeLinecap="round" />
      <path d={d} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" />
    </>
  );
}

// Mitten glove hand
function Hand({ x, y, r = 10 }) {
  return <circle cx={x} cy={y} r={r} fill={BALL_HI} stroke={INK} strokeWidth="3.5" />;
}

// Gold boot. dir = -1 toe points left, 1 toe points right
function Boot({ x, y, dir = -1 }) {
  const toe = 19 * dir;
  return (
    <g>
      <path
        d={`M ${x - 8 * dir} ${y - 14}
            L ${x - 8 * dir} ${y - 2}
            Q ${x - 8 * dir} ${y + 4} ${x - 2 * dir} ${y + 4}
            L ${x + toe} ${y + 4}
            Q ${x + toe + 5 * dir} ${y + 4} ${x + toe + 5 * dir} ${y - 2}
            Q ${x + toe + 5 * dir} ${y - 8} ${x + toe - 6 * dir} ${y - 9}
            Q ${x + 6 * dir} ${y - 10} ${x + 4 * dir} ${y - 14}
            Z`}
        fill={GOLD}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* sole */}
      <path
        d={`M ${x - 8 * dir} ${y + 4} L ${x + toe + 5 * dir} ${y + 4}`}
        stroke={GOLD_DARK}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* lace */}
      <path
        d={`M ${x - 1 * dir} ${y - 10} L ${x + 3 * dir} ${y - 4}`}
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

// Four-point sparkle star
function Spark({ x, y, r, fill }) {
  const d = `M ${x} ${y - r}
             Q ${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y}
             Q ${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r}
             Q ${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y}
             Q ${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z`;
  return <path d={d} fill={fill} />;
}

export default function Mascot({ pose = 'idle', size = 120 }) {
  const p = ['idle', 'excited', 'thinking', 'celebrating', 'waiting'].includes(pose)
    ? pose
    : 'idle';

  // Ball: center (100,105), radius 68
  const arms = {
    idle: {
      left: 'M 40 116 Q 24 126 19 142',
      right: 'M 160 116 Q 176 126 181 142',
      hands: [[19, 142], [181, 142]],
    },
    excited: {
      left: 'M 42 96 Q 24 74 17 52',
      right: 'M 158 96 Q 176 74 183 52',
      hands: [[17, 52], [183, 52]],
    },
    thinking: {
      left: 'M 40 116 Q 24 126 19 142',
      right: 'M 161 112 Q 178 142 142 152',
      hands: [[19, 142], [138, 152]],
    },
    celebrating: {
      left: 'M 46 88 Q 32 56 28 32',
      right: 'M 154 88 Q 168 56 172 32',
      hands: [[28, 32], [172, 32]],
    },
    waiting: {
      left: 'M 40 110 Q 14 130 37 148',
      right: 'M 160 110 Q 186 130 163 148',
      hands: [[39, 148], [161, 148]],
    },
  }[p];

  const animClass = {
    idle: 'mascot-bob',
    excited: 'mascot-bounce',
    celebrating: 'mascot-cheer',
    waiting: 'mascot-tap',
  }[p] || '';

  const eyes = (() => {
    switch (p) {
      case 'celebrating':
        // closed happy arcs
        return (
          <>
            <path d="M 67 102 Q 78 90 89 102" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
            <path d="M 111 102 Q 122 90 133 102" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          </>
        );
      case 'waiting':
        // half-lidded, glancing sideways
        return (
          <>
            <ellipse cx="78" cy="104" rx="10" ry="12" fill={INK} />
            <ellipse cx="122" cy="104" rx="10" ry="12" fill={INK} />
            <path d="M 68 104 A 10 12 0 0 1 88 104 Z" fill="#e9eaf2" />
            <path d="M 112 104 A 10 12 0 0 1 132 104 Z" fill="#e9eaf2" />
            <path d="M 68 104 L 88 104" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 112 104 L 132 104" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="82.5" cy="108" r="2.2" fill="white" />
            <circle cx="126.5" cy="108" r="2.2" fill="white" />
          </>
        );
      case 'thinking': {
        // pupils up and to the side
        return (
          <>
            <ellipse cx="78" cy="102" rx="10" ry="13" fill={INK} />
            <ellipse cx="122" cy="102" rx="10" ry="13" fill={INK} />
            <circle cx="82" cy="97" r="3.6" fill="white" />
            <circle cx="126" cy="97" r="3.6" fill="white" />
            <circle cx="75.5" cy="106" r="1.8" fill="white" opacity="0.85" />
            <circle cx="119.5" cy="106" r="1.8" fill="white" opacity="0.85" />
          </>
        );
      }
      default:
        // big sparkly eyes (idle, excited)
        return (
          <>
            <ellipse cx="78" cy="102" rx="10" ry="13" fill={INK} />
            <ellipse cx="122" cy="102" rx="10" ry="13" fill={INK} />
            <circle cx="81.5" cy="97.5" r="3.8" fill="white" />
            <circle cx="125.5" cy="97.5" r="3.8" fill="white" />
            <circle cx="75" cy="106.5" r="1.9" fill="white" opacity="0.85" />
            <circle cx="119" cy="106.5" r="1.9" fill="white" opacity="0.85" />
          </>
        );
    }
  })();

  const brows = (() => {
    switch (p) {
      case 'excited':
        return (
          <>
            <path d="M 67 85 Q 78 79 89 85" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
            <path d="M 111 85 Q 122 79 133 85" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          </>
        );
      case 'thinking':
        return (
          <>
            <path d="M 68 87 Q 78 84 88 86" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
            <path d="M 112 82 Q 122 77 132 81" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          </>
        );
      case 'waiting':
        return (
          <>
            <path d="M 68 90 Q 78 88 88 90" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
            <path d="M 112 90 Q 122 88 132 90" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          </>
        );
      default:
        return null;
    }
  })();

  const mouth = (() => {
    switch (p) {
      case 'excited':
        return (
          <g>
            <path d="M 82 126 Q 100 152 118 126 Q 100 134 82 126 Z" fill={INK} />
            <clipPath id={`copa-mouth-${p}`}>
              <path d="M 82 126 Q 100 152 118 126 Q 100 134 82 126 Z" />
            </clipPath>
            <ellipse cx="100" cy="143" rx="11" ry="7" fill={TONGUE} clipPath={`url(#copa-mouth-${p})`} />
          </g>
        );
      case 'celebrating':
        return (
          <g>
            <path d="M 78 122 Q 100 158 122 122 Q 100 132 78 122 Z" fill={INK} />
            <clipPath id={`copa-mouth-${p}`}>
              <path d="M 78 122 Q 100 158 122 122 Q 100 132 78 122 Z" />
            </clipPath>
            <ellipse cx="100" cy="144" rx="13" ry="8" fill={TONGUE} clipPath={`url(#copa-mouth-${p})`} />
          </g>
        );
      case 'thinking':
        return <path d="M 90 134 Q 100 130 110 135" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
      case 'waiting':
        return <path d="M 88 136 Q 100 132 112 136" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
      default:
        return <path d="M 86 130 Q 100 142 114 130" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
    }
  })();

  const blush = (p === 'idle' || p === 'excited' || p === 'celebrating') && (
    <>
      <ellipse cx="60" cy="120" rx="9" ry="5.5" fill={BLUSH} opacity="0.55" />
      <ellipse cx="140" cy="120" rx="9" ry="5.5" fill={BLUSH} opacity="0.55" />
    </>
  );

  const extras = (() => {
    switch (p) {
      case 'celebrating':
        return (
          <g>
            <Spark x={34} y={62} r={9} fill={GOLD} />
            <Spark x={170} y={50} r={7} fill="#22c55e" />
            <Spark x={140} y={18} r={6} fill="#3b82f6" />
            <Spark x={62} y={22} r={7} fill={GOLD} />
            <Spark x={188} y={92} r={5} fill={BLUSH} />
            <circle cx="14" cy="92" r="3.5" fill="#22c55e" />
            <circle cx="104" cy="10" r="3" fill={BLUSH} />
          </g>
        );
      case 'thinking':
        return (
          <g>
            <circle cx="166" cy="58" r="4.5" fill="#8b93a3" opacity="0.6" />
            <circle cx="176" cy="42" r="6.5" fill="#8b93a3" opacity="0.6" />
            <circle cx="186" cy="22" r="11" fill="#cfd4de" />
            <text
              x="186" y="23.5"
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="Arial, sans-serif" fontSize="15" fontWeight="bold" fill={INK}
              style={{ userSelect: 'none' }}
            >?</text>
          </g>
        );
      case 'excited':
        return (
          <g>
            <Spark x={28} y={70} r={6} fill={GOLD} />
            <Spark x={174} y={66} r={5} fill={GOLD} />
          </g>
        );
      case 'waiting':
        return (
          <path
            d="M 158 56 Q 165 68 158 73 Q 151 68 158 56 Z"
            fill="#7cc4ff" stroke="#4ea3e8" strokeWidth="1.5"
          />
        );
      default:
        return null;
    }
  })();

  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 200 250"
      className={animClass ? `mascot-svg ${animClass}` : 'mascot-svg'}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <style>{`
          @keyframes mascot-bob-kf {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3%); }
          }
          @keyframes mascot-bounce-kf {
            0%, 100% { transform: translateY(0) scale(1, 1); }
            30% { transform: translateY(0) scale(1.04, 0.94); }
            60% { transform: translateY(-9%) scale(0.97, 1.04); }
          }
          @keyframes mascot-cheer-kf {
            0% { transform: rotate(-5deg) translateY(0); }
            50% { transform: rotate(0deg) translateY(-5%); }
            100% { transform: rotate(5deg) translateY(0); }
          }
          @keyframes mascot-tap-kf {
            0%, 86%, 100% { transform: translateY(0); }
            90% { transform: translateY(-1.5%); }
            94% { transform: translateY(0); }
            97% { transform: translateY(-1.5%); }
          }
          .mascot-bob    { animation: mascot-bob-kf 3.2s ease-in-out infinite; }
          .mascot-bounce { animation: mascot-bounce-kf 0.7s ease-in-out infinite; transform-origin: 50% 88%; }
          .mascot-cheer  { animation: mascot-cheer-kf 0.55s ease-in-out infinite alternate; transform-origin: 50% 70%; }
          .mascot-tap    { animation: mascot-tap-kf 2.6s ease-in-out infinite; transform-origin: 50% 88%; }
        `}</style>
        <radialGradient id="copa-ball" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor={BALL_HI} />
          <stop offset="70%" stopColor="#eceef5" />
          <stop offset="100%" stopColor={BALL_LO} />
        </radialGradient>
        <clipPath id="copa-ballclip">
          <circle cx="100" cy="105" r="66" />
        </clipPath>
      </defs>

      {/* ground shadow */}
      <ellipse cx="100" cy="226" rx="52" ry="8" fill="#000" opacity="0.35" />

      {extras}

      {/* arms (behind ball) */}
      <Limb d={arms.left} />
      <Limb d={arms.right} />

      {/* legs */}
      <Limb d="M 84 162 L 80 198" width={11} />
      <Limb d="M 116 162 L 120 198" width={11} />
      <Boot x={78} y={216} dir={-1} />
      <Boot x={122} y={216} dir={1} />

      {/* ball body */}
      <circle cx="100" cy="105" r="68" fill={INK} />
      <circle cx="100" cy="105" r="65" fill="url(#copa-ball)" />

      {/* soccer pattern, clipped to ball */}
      <g clipPath="url(#copa-ballclip)" fill={INK}>
        <polygon points={pent(100, 52, 21)} />
        <polygon points={pent(36, 96, 19, -Math.PI / 2 + 0.45)} />
        <polygon points={pent(164, 96, 19, -Math.PI / 2 - 0.45)} />
        <polygon points={pent(58, 165, 17, -Math.PI / 2 + 0.25)} />
        <polygon points={pent(142, 165, 17, -Math.PI / 2 - 0.25)} />
        {/* seams */}
        <g stroke={INK} strokeWidth="2.5" fill="none" opacity="0.55">
          <path d="M 100 31 L 100 40" />
          <path d="M 81 58 Q 64 70 52 84" />
          <path d="M 119 58 Q 136 70 148 84" />
          <path d="M 44 113 Q 50 138 52 152" />
          <path d="M 156 113 Q 150 138 148 152" />
          <path d="M 72 168 Q 100 176 128 168" />
        </g>
      </g>

      {/* glossy highlight */}
      <ellipse cx="72" cy="62" rx="22" ry="13" fill="white" opacity="0.5" transform="rotate(-28 72 62)" />

      {/* face */}
      {brows}
      {eyes}
      {blush}
      {mouth}

      {/* hands (in front of ball) */}
      <Hand x={arms.hands[0][0]} y={arms.hands[0][1]} />
      <Hand x={arms.hands[1][0]} y={arms.hands[1][1]} />
    </svg>
  );
}
