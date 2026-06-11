// <Mascot pose="idle" size={120} />
// <Mascot pose="excited" size={80} />
// <Mascot pose="celebrating" size={160} />
// <Mascot pose="thinking" size={100} />
// <Mascot pose="waiting" size={100} />

export default function Mascot({ pose = 'idle', size = 120 }) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.32;

  // Arm configs per pose
  const arms = {
    idle: {
      left:  { x1: cx - r * 0.85, y1: cy + r * 0.1,  x2: cx - r * 1.5, y2: cy + r * 0.55 },
      right: { x1: cx + r * 0.85, y1: cy + r * 0.1,  x2: cx + r * 1.5, y2: cy + r * 0.55 },
    },
    excited: {
      left:  { x1: cx - r * 0.85, y1: cy - r * 0.1, x2: cx - r * 1.6, y2: cy - r * 0.85 },
      right: { x1: cx + r * 0.85, y1: cy - r * 0.1, x2: cx + r * 1.6, y2: cy - r * 0.85 },
    },
    thinking: {
      left:  { x1: cx - r * 0.85, y1: cy + r * 0.1, x2: cx - r * 1.5, y2: cy + r * 0.55 },
      right: { x1: cx + r * 0.85, y1: cy - r * 0.1, x2: cx + r * 0.6,  y2: cy - r * 0.7 },
    },
    celebrating: {
      left:  { x1: cx - r * 0.85, y1: cy - r * 0.2, x2: cx - r * 1.7, y2: cy - r * 1.1 },
      right: { x1: cx + r * 0.85, y1: cy - r * 0.2, x2: cx + r * 1.7, y2: cy - r * 1.1 },
    },
    waiting: {
      left:  { x1: cx - r * 0.85, y1: cy + r * 0.1, x2: cx - r * 0.2, y2: cy + r * 0.6 },
      right: { x1: cx + r * 0.85, y1: cy + r * 0.1, x2: cx + r * 0.2, y2: cy + r * 0.6 },
    },
  };

  // Mouth path per pose
  const mouths = {
    idle:        `M ${cx - r*0.25} ${cy + r*0.3} Q ${cx} ${cy + r*0.5} ${cx + r*0.25} ${cy + r*0.3}`,
    excited:     `M ${cx - r*0.3}  ${cy + r*0.25} Q ${cx} ${cy + r*0.58} ${cx + r*0.3} ${cy + r*0.25}`,
    thinking:    `M ${cx - r*0.2}  ${cy + r*0.32} Q ${cx + r*0.05} ${cy + r*0.38} ${cx + r*0.2} ${cy + r*0.28}`,
    celebrating: `M ${cx - r*0.35} ${cy + r*0.22} Q ${cx} ${cy + r*0.65} ${cx + r*0.35} ${cy + r*0.22}`,
    waiting:     `M ${cx - r*0.25} ${cy + r*0.38} Q ${cx} ${cy + r*0.28} ${cx + r*0.25} ${cy + r*0.38}`,
  };

  // Eyebrow tilt per pose
  const brows = {
    idle:        { lx1: cx-r*0.38, ly1: cy-r*0.18, lx2: cx-r*0.12, ly2: cy-r*0.22, rx1: cx+r*0.12, ry1: cy-r*0.22, rx2: cx+r*0.38, ry2: cy-r*0.18 },
    excited:     { lx1: cx-r*0.38, ly1: cy-r*0.28, lx2: cx-r*0.12, ly2: cy-r*0.18, rx1: cx+r*0.12, ry1: cy-r*0.18, rx2: cx+r*0.38, ry2: cy-r*0.28 },
    thinking:    { lx1: cx-r*0.38, ly1: cy-r*0.14, lx2: cx-r*0.12, ly2: cy-r*0.24, rx1: cx+r*0.12, ry1: cy-r*0.28, rx2: cx+r*0.38, ry2: cy-r*0.14 },
    celebrating: { lx1: cx-r*0.38, ly1: cy-r*0.30, lx2: cx-r*0.12, ly2: cy-r*0.16, rx1: cx+r*0.12, ry1: cy-r*0.16, rx2: cx+r*0.38, ry2: cy-r*0.30 },
    waiting:     { lx1: cx-r*0.38, ly1: cy-r*0.20, lx2: cx-r*0.12, ly2: cy-r*0.14, rx1: cx+r*0.12, ry1: cy-r*0.14, rx2: cx+r*0.38, ry2: cy-r*0.20 },
  };

  const arm = arms[pose] || arms.idle;
  const mouth = mouths[pose] || mouths.idle;
  const brow = brows[pose] || brows.idle;
  const armWidth = Math.max(3, r * 0.22);
  const legW = r * 0.28;
  const legH = r * 0.55;
  const footW = r * 0.38;
  const footH = r * 0.22;
  const legY = cy + r * 0.88;
  const eyeR = r * 0.13;
  const pupilR = eyeR * 0.55;

  // Pupil offset (thinking looks left, waiting looks right)
  const pupilOff = { idle: 0, excited: 0, thinking: -eyeR*0.35, celebrating: 0, waiting: eyeR*0.3 };
  const po = pupilOff[pose] || 0;

  // Animation class
  const animClass = {
    excited: 'mascot-bounce',
    celebrating: 'mascot-wiggle',
    waiting: 'mascot-tap',
  }[pose] || '';

  // Soccer ball pentagon patches (simplified pattern)
  const patches = [
    `M ${cx} ${cy - r*0.45} l ${r*0.18} ${r*0.28} l ${-r*0.36} 0 Z`,
    `M ${cx - r*0.38} ${cy + r*0.12} l ${r*0.22} ${-r*0.18} l ${r*0.14} ${r*0.32} l ${-r*0.28} ${r*0.1} Z`,
    `M ${cx + r*0.38} ${cy + r*0.12} l ${-r*0.22} ${-r*0.18} l ${-r*0.14} ${r*0.32} l ${r*0.28} ${r*0.1} Z`,
  ];

  return (
    <svg
      width={s}
      height={s * 1.35}
      viewBox={`0 0 ${s} ${s * 1.35}`}
      className={animClass}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <style>{`
          @keyframes mascot-bounce-kf {
            0%,100% { transform: translateY(0); }
            50% { transform: translateY(-${r * 0.22}px); }
          }
          @keyframes mascot-wiggle-kf {
            0% { transform: rotate(-8deg); }
            100% { transform: rotate(8deg); }
          }
          @keyframes mascot-tap-kf {
            0%,90%,100% { transform: translateY(0); }
            95% { transform: translateY(-${r * 0.08}px); }
          }
          .mascot-bounce { animation: mascot-bounce-kf 0.65s ease-in-out infinite; transform-origin: center bottom; }
          .mascot-wiggle { animation: mascot-wiggle-kf 0.5s ease-in-out infinite alternate; transform-origin: center center; }
          .mascot-tap    { animation: mascot-tap-kf 2.8s ease-in-out infinite; transform-origin: center bottom; }
        `}</style>
        <radialGradient id={`mg-${pose}`} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d8d8d8" />
        </radialGradient>
      </defs>

      {/* Sparkles for celebrating */}
      {pose === 'celebrating' && <>
        <text x={cx - r*1.5} y={cy - r*0.6} fontSize={r*0.45} style={{userSelect:'none'}}>✨</text>
        <text x={cx + r*0.95} y={cy - r*0.8} fontSize={r*0.38} style={{userSelect:'none'}}>⭐</text>
        <text x={cx - r*0.3} y={cy - r*1.1} fontSize={r*0.35} style={{userSelect:'none'}}>🌟</text>
      </>}

      {/* Thinking bubble */}
      {pose === 'thinking' && <>
        <circle cx={cx + r*1.0} cy={cy - r*0.8} r={r*0.08} fill="#8b93a3" opacity="0.5"/>
        <circle cx={cx + r*1.2} cy={cy - r*1.1} r={r*0.13} fill="#8b93a3" opacity="0.5"/>
        <circle cx={cx + r*1.45} cy={cy - r*1.4} r={r*0.22} fill="#8b93a3" opacity="0.4"/>
        <text x={cx + r*1.3} y={cy - r*1.3} textAnchor="middle" dominantBaseline="middle" fontSize={r*0.28} style={{userSelect:'none'}}>?</text>
      </>}

      {/* Left arm */}
      <line
        x1={arm.left.x1} y1={arm.left.y1}
        x2={arm.left.x2} y2={arm.left.y2}
        stroke="#1a1a2e" strokeWidth={armWidth} strokeLinecap="round"
      />
      {/* Right arm */}
      <line
        x1={arm.right.x1} y1={arm.right.y1}
        x2={arm.right.x2} y2={arm.right.y2}
        stroke="#1a1a2e" strokeWidth={armWidth} strokeLinecap="round"
      />

      {/* Legs */}
      <rect x={cx - legW*1.4} y={legY} width={legW} height={legH} rx={legW*0.4} fill="#1a1a2e"/>
      <rect x={cx + legW*0.4}  y={legY} width={legW} height={legH} rx={legW*0.4} fill="#1a1a2e"/>

      {/* Boots */}
      <ellipse cx={cx - legW*1.05} cy={legY + legH} rx={footW*0.6} ry={footH*0.6} fill="#c8963a"/>
      <ellipse cx={cx + legW*0.8}  cy={legY + legH} rx={footW*0.6} ry={footH*0.6} fill="#c8963a"/>

      {/* Ball body */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#mg-${pose})`} stroke="#e0e0e0" strokeWidth={r*0.04}/>

      {/* Soccer patches */}
      {patches.map((d, i) => (
        <path key={i} d={d} fill="#1a1a2e" opacity="0.85"/>
      ))}

      {/* Eyebrows */}
      <line x1={brow.lx1} y1={brow.ly1} x2={brow.lx2} y2={brow.ly2} stroke="#1a1a2e" strokeWidth={r*0.08} strokeLinecap="round"/>
      <line x1={brow.rx1} y1={brow.ry1} x2={brow.rx2} y2={brow.ry2} stroke="#1a1a2e" strokeWidth={r*0.08} strokeLinecap="round"/>

      {/* Eyes */}
      <circle cx={cx - r*0.25} cy={cy - r*0.04} r={eyeR} fill="white" stroke="#1a1a2e" strokeWidth={r*0.04}/>
      <circle cx={cx + r*0.25} cy={cy - r*0.04} r={eyeR} fill="white" stroke="#1a1a2e" strokeWidth={r*0.04}/>
      {/* Pupils */}
      <circle cx={cx - r*0.25 + po} cy={cy - r*0.04} r={pupilR} fill="#1a1a2e"/>
      <circle cx={cx + r*0.25 + po} cy={cy - r*0.04} r={pupilR} fill="#1a1a2e"/>
      {/* Eye shine */}
      <circle cx={cx - r*0.25 + po + pupilR*0.3} cy={cy - r*0.04 - pupilR*0.35} r={pupilR*0.28} fill="white"/>
      <circle cx={cx + r*0.25 + po + pupilR*0.3} cy={cy - r*0.04 - pupilR*0.35} r={pupilR*0.28} fill="white"/>

      {/* Mouth */}
      <path d={mouth} fill="none" stroke="#1a1a2e" strokeWidth={r*0.09} strokeLinecap="round"/>

      {/* Rosy cheeks for excited/celebrating */}
      {(pose === 'excited' || pose === 'celebrating') && <>
        <ellipse cx={cx - r*0.48} cy={cy + r*0.18} rx={r*0.15} ry={r*0.09} fill="#ff9999" opacity="0.45"/>
        <ellipse cx={cx + r*0.48} cy={cy + r*0.18} rx={r*0.15} ry={r*0.09} fill="#ff9999" opacity="0.45"/>
      </>}
    </svg>
  );
}
