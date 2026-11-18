import { useId } from 'react'

/**
 * Two illustrations for the dark showcase bands, drawn in code in the same black and signal-yellow language as the
 * supplied shield image: a vault on a glowing podium, and a podium of ranked places. They show the contract's real
 * mechanics (escrow, ranked prize places) and contain no invented numbers.
 */

const YELLOW = '#FBBF24'
const YELLOW_DEEP = '#B7790A'

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={YELLOW} stopOpacity="0.55" />
        <stop offset="100%" stopColor={YELLOW} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="45%" stopColor={YELLOW} />
        <stop offset="100%" stopColor={YELLOW_DEEP} />
      </linearGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3b3b3b" />
        <stop offset="55%" stopColor="#1a1a1a" />
        <stop offset="100%" stopColor="#0d0d0d" />
      </linearGradient>
      <linearGradient id={`${id}-disc`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#242424" />
        <stop offset="100%" stopColor="#090909" />
      </linearGradient>
      <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
    </defs>
  )
}

function Podium({ id }: { id: string }) {
  return (
    <g>
      <ellipse cx="400" cy="520" rx="360" ry="62" fill={`url(#${id}-glow)`} />
      <path d="M90 498 v24 a310 54 0 0 0 620 0 v-24 z" fill="#0b0b0b" />
      <ellipse cx="400" cy="498" rx="310" ry="54" fill={`url(#${id}-disc)`} stroke={YELLOW} strokeOpacity="0.35" strokeWidth="2" />
      <path d="M185 470 v22 a215 38 0 0 0 430 0 v-22 z" fill="#0b0b0b" />
      <ellipse cx="400" cy="470" rx="215" ry="38" fill={`url(#${id}-disc)`} stroke={YELLOW} strokeOpacity="0.25" strokeWidth="2" />
      <ellipse cx="400" cy="452" rx="170" ry="28" fill="none" stroke={YELLOW} strokeWidth="9" filter={`url(#${id}-blur)`} opacity="0.9" />
      <ellipse cx="400" cy="452" rx="170" ry="28" fill="#0e0e0e" stroke={YELLOW} strokeWidth="4" />
    </g>
  )
}

function Coin({ id, cx, cy, r = 44, label = '$' }: { id: string; cx: number; cy: number; r?: number; label?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 6} fill={YELLOW_DEEP} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-gold)`} stroke="#6b4505" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke="#7a5206" strokeWidth="3" opacity="0.7" />
      <text x={cx} y={cy + r * 0.3} textAnchor="middle" fontSize={r * 0.95} fontWeight="700" fontFamily="Bricolage Grotesque, DM Sans, sans-serif" fill="#4a2f02">
        {label}
      </text>
    </g>
  )
}

function CoinStack({ id, cx, base, count }: { id: string; cx: number; base: number; count: number }) {
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const y = base - i * 15
        return (
          <g key={i}>
            <path d={`M${cx - 50} ${y} v13 a50 15 0 0 0 100 0 v-13 z`} fill={YELLOW_DEEP} />
            <ellipse cx={cx} cy={y} rx="50" ry="15" fill={`url(#${id}-gold)`} stroke="#6b4505" strokeWidth="2" />
          </g>
        )
      })}
    </g>
  )
}

/** A vault on a glowing podium, with coins beside it: the prize waiting in escrow. */
export function VaultShowcase() {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 800 600" className="block h-full w-full" role="img" aria-label="A yellow and black vault with a combination dial, standing on a glowing podium next to stacks of coins." focusable="false">
      <Defs id={id} />
      <ellipse cx="400" cy="320" rx="340" ry="112" transform="rotate(-12 400 320)" fill="none" stroke={YELLOW} strokeOpacity="0.55" strokeWidth="2" />
      <Podium id={id} />
      <CoinStack id={id} cx={205} base={438} count={5} />
      <CoinStack id={id} cx={598} base={438} count={3} />
      <g>
        <rect x="312" y="158" width="228" height="262" rx="28" fill={YELLOW_DEEP} />
        <rect x="290" y="172" width="228" height="262" rx="28" fill={`url(#${id}-metal)`} stroke={`url(#${id}-gold)`} strokeWidth="14" />
        <rect x="318" y="200" width="172" height="206" rx="14" fill="#141414" stroke="#000" strokeWidth="3" />
        <circle cx="404" cy="303" r="58" fill="#0c0c0c" stroke={`url(#${id}-gold)`} strokeWidth="11" />
        <circle cx="404" cy="303" r="38" fill="#1b1b1b" stroke="#2f2f2f" strokeWidth="3" />
        {[0, 60, 120].map((a) => (
          <rect key={a} x="398" y="266" width="12" height="74" rx="6" fill={YELLOW} transform={`rotate(${a} 404 303)`} />
        ))}
        <circle cx="404" cy="303" r="11" fill={`url(#${id}-gold)`} stroke="#6b4505" strokeWidth="2" />
        <rect x="470" y="292" width="40" height="22" rx="10" fill={`url(#${id}-gold)`} stroke="#6b4505" strokeWidth="2" />
        {[
          [330, 214],
          [478, 214],
          [330, 392],
          [478, 392],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#2c2c2c" stroke="#555" strokeWidth="1.5" />
        ))}
        <path d="M296 190 q60 -6 120 -6 l-90 240 q-30 -2 -30 -30 z" fill="#fff" opacity="0.07" />
      </g>
      <Coin id={id} cx={662} cy={168} r={42} />
    </svg>
  )
}

/** Three podium blocks for first, second and third place: the payout ladder as an object. */
export function LadderShowcase() {
  const id = useId().replace(/:/g, '')
  const steps = [
    { n: '2', x: 130, top: 318, w: 150 },
    { n: '1', x: 325, top: 236, w: 150 },
    { n: '3', x: 520, top: 368, w: 150 },
  ]
  const floor = 462
  return (
    <svg viewBox="0 0 800 600" className="block h-full w-full" role="img" aria-label="Three podium blocks numbered one, two and three on a glowing base, with a coin on the first place." focusable="false">
      <Defs id={id} />
      <ellipse cx="400" cy="300" rx="350" ry="120" transform="rotate(-10 400 300)" fill="none" stroke={YELLOW} strokeOpacity="0.5" strokeWidth="2" />
      <Podium id={id} />
      {steps.map((s) => (
        <g key={s.n}>
          <polygon points={`${s.x + s.w},${s.top} ${s.x + s.w + 26},${s.top - 14} ${s.x + s.w + 26},${floor - 14} ${s.x + s.w},${floor}`} fill="#0a0a0a" stroke="#000" strokeWidth="2" />
          <polygon points={`${s.x},${s.top} ${s.x + 26},${s.top - 14} ${s.x + s.w + 26},${s.top - 14} ${s.x + s.w},${s.top}`} fill={s.n === '1' ? `url(#${id}-gold)` : '#3a3a3a'} stroke={YELLOW} strokeWidth="3" />
          <rect x={s.x} y={s.top} width={s.w} height={floor - s.top} fill={`url(#${id}-metal)`} stroke={YELLOW} strokeOpacity={s.n === '1' ? 1 : 0.55} strokeWidth="3" />
          <text x={s.x + s.w / 2} y={s.top + 78} textAnchor="middle" fontSize="72" fontWeight="700" fontFamily="Bricolage Grotesque, DM Sans, sans-serif" fill="#fff">
            {s.n}
          </text>
        </g>
      ))}
      <Coin id={id} cx={415} cy={170} r={50} />
      <Coin id={id} cx={205} cy={262} r={28} />
      <Coin id={id} cx={595} cy={314} r={28} />
    </svg>
  )
}
