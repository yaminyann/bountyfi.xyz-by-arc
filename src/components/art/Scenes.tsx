import type { CSSProperties, ReactNode } from 'react'
import { Scene } from '@/components/motion/Reveal'

/**
 * Original artwork for the landing page and docs, drawn as hard-edged pixel scenes so it matches the payout ladder.
 * Every scene shows the real mechanics of the contract (escrow, ranked places, the two fees) and nothing invented:
 * the only numbers are the fee rates and an example prize, which is labelled as an example where it appears.
 * Palette: ink, sky (the cool ground), signal yellow as the single accent.
 */
const INK = '#0E1621'
const SKY = '#D4E2EE'
const SKY_DEEP = '#B4C8DA'
const PAPER = '#F7FAFC'
const SIGNAL = '#FDE047'
const SIGNAL_DEEP = '#EAB308'

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

function Svg({ viewBox, children }: { viewBox: string; children: ReactNode }) {
  return (
    <svg viewBox={viewBox} className="block h-auto w-full" shapeRendering="crispEdges" aria-hidden focusable="false">
      {children}
    </svg>
  )
}

function Label({ x, y, children, fill = INK, anchor = 'start' }: { x: number; y: number; children: ReactNode; fill?: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} fill={fill} textAnchor={anchor} className="font-pixel" fontSize="9" letterSpacing="0.5">
      {children}
    </text>
  )
}

/** A stack of coins is just squares: it stays legible at any size. */
function Coin({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g className="a-drop" style={d(delay)}>
      <rect x={x} y={y} width="14" height="14" fill={SIGNAL} stroke={INK} strokeWidth="2" />
      <rect x={x + 4} y={y + 4} width="6" height="6" fill={SIGNAL_DEEP} />
    </g>
  )
}

function Vault({ x, y, w = 124, h = 150, label = 'ESCROW' }: { x: number; y: number; w?: number; h?: number; label?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={INK} />
      <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} fill="none" stroke={SKY_DEEP} strokeWidth="2" />
      <rect x={x + w / 2 - 14} y={y + h / 2 - 22} width="28" height="30" fill={SIGNAL} />
      <rect x={x + w / 2 - 8} y={y + h / 2 - 34} width="16" height="14" fill="none" stroke={SIGNAL} strokeWidth="4" />
      <rect x={x + w / 2 - 3} y={y + h / 2 - 8} width="6" height="10" fill={INK} />
      <Label x={x + w / 2} y={y + h - 18} anchor="middle" fill={PAPER}>
        {label}
      </Label>
    </g>
  )
}

/** Hero: a prize goes into escrow and comes out as a ranked payout ladder. */
export function HeroScene() {
  const bars = [
    { x: 236, h: 150, label: '1ST', pct: '50%', fill: SIGNAL, delay: 900 },
    { x: 306, h: 90, label: '2ND', pct: '30%', fill: INK, delay: 1100 },
    { x: 376, h: 60, label: '3RD', pct: '20%', fill: INK, delay: 1300 },
  ]
  return (
    <Scene label="A prize locked in escrow is paid out as ranked places: first 50 percent, second 30, third 20." className="w-full">
      <Svg viewBox="0 0 480 360">
        <rect width="480" height="360" fill={SKY} />
        <rect x="0" y="300" width="480" height="60" fill={SKY_DEEP} />
        <rect x="0" y="298" width="480" height="4" fill={INK} />
        {/* dither band under the ground line, the print texture of the brand */}
        {Array.from({ length: 40 }).map((_, i) => (
          <rect key={i} x={i * 12 + (i % 2) * 6} y={316 + (i % 2) * 8} width="4" height="4" fill={INK} opacity="0.18" />
        ))}
        <Vault x={44} y={148} />
        <Coin x={92} y={134} delay={200} />
        <Coin x={92} y={118} delay={420} />
        <Coin x={92} y={102} delay={640} />
        <path
          d="M176 224 H204 V224 H218"
          fill="none"
          stroke={INK}
          strokeWidth="4"
          strokeDasharray="6 6"
          className="a-draw"
          style={{ ...d(700), ['--len' as string]: 60 } as CSSProperties}
        />
        {bars.map((b) => (
          <g key={b.label}>
            <rect className="a-grow-y" style={d(b.delay)} x={b.x} y={298 - b.h} width="52" height={b.h} fill={b.fill} stroke={INK} strokeWidth="3" />
            <Label x={b.x + 26} y={298 - b.h - 10} anchor="middle">
              {b.pct}
            </Label>
            <Label x={b.x + 26} y={324} anchor="middle">
              {b.label}
            </Label>
          </g>
        ))}
        <g className="a-pop" style={d(1700)}>
          <rect x="398" y="38" width="64" height="34" fill={PAPER} stroke={INK} strokeWidth="3" />
          <Label x={430} y={52} anchor="middle">
            PAID BY
          </Label>
          <Label x={430} y={64} anchor="middle">
            CONTRACT
          </Label>
        </g>
      </Svg>
    </Scene>
  )
}

/** Step 1: the creator funds a bounty. The prize is escrowed and a small fee goes to the treasury. */
export function FundScene() {
  return (
    <Scene label="The creator funds the bounty: the prize goes into escrow and a 0.5 percent fee goes to the treasury." className="w-full">
      <Svg viewBox="0 0 360 260">
        <rect width="360" height="260" fill={SKY} />
        <rect y="218" width="360" height="42" fill={SKY_DEEP} />
        <rect y="216" width="360" height="4" fill={INK} />
        <Vault x={40} y={62} w={130} h={154} />
        <Coin x={98} y={48} delay={150} />
        <Coin x={98} y={32} delay={350} />
        <rect x="226" y="150" width="96" height="66" fill={PAPER} stroke={INK} strokeWidth="3" />
        <Label x={274} y={176} anchor="middle">
          TREASURY
        </Label>
        <Label x={274} y={196} anchor="middle">
          0.5%
        </Label>
        <path d="M170 128 H210 V150 H226" fill="none" stroke={INK} strokeWidth="3" strokeDasharray="5 5" className="a-draw" style={{ ...d(500), ['--len' as string]: 100 } as CSSProperties} />
        <Coin x={196} y={118} delay={800} />
      </Svg>
    </Scene>
  )
}

/** Step 2: contributors submit. Each submission is recorded on-chain as a hash, so the text cannot be swapped later. */
export function SubmitScene() {
  const cards = [
    { x: 36, y: 118, delay: 150 },
    { x: 134, y: 96, delay: 350 },
    { x: 232, y: 118, delay: 550 },
  ]
  return (
    <Scene label="Three submissions arrive, each recorded on-chain as a hash of its text." className="w-full">
      <Svg viewBox="0 0 360 260">
        <rect width="360" height="260" fill={SKY} />
        <rect y="218" width="360" height="42" fill={SKY_DEEP} />
        <rect y="216" width="360" height="4" fill={INK} />
        {cards.map((c, i) => (
          <g key={i} className="a-drop" style={d(c.delay)}>
            <rect x={c.x} y={c.y} width="92" height="98" fill={PAPER} stroke={INK} strokeWidth="3" />
            <rect x={c.x + 10} y={c.y + 12} width="52" height="6" fill={INK} />
            <rect x={c.x + 10} y={c.y + 26} width="70" height="4" fill={SKY_DEEP} />
            <rect x={c.x + 10} y={c.y + 36} width="62" height="4" fill={SKY_DEEP} />
            <rect x={c.x + 10} y={c.y + 46} width="68" height="4" fill={SKY_DEEP} />
            <rect x={c.x + 10} y={c.y + 70} width="72" height="16" fill={SKY} stroke={INK} strokeWidth="2" />
            <Label x={c.x + 14} y={c.y + 81}>
              SHA-256
            </Label>
          </g>
        ))}
        <g className="a-pop" style={d(1000)}>
          <rect x="150" y="30" width="60" height="26" fill={SIGNAL} stroke={INK} strokeWidth="3" />
          <Label x={180} y={47} anchor="middle">
            ON-CHAIN
          </Label>
        </g>
      </Svg>
    </Scene>
  )
}

/** Step 3: the creator picks winners and fills places from the top. */
export function PickScene() {
  const rows = [
    { y: 54, w: 190, fill: SIGNAL, tag: '1ST', delay: 150 },
    { y: 110, w: 150, fill: PAPER, tag: '2ND', delay: 350 },
    { y: 166, w: 110, fill: PAPER, tag: '3RD', delay: 550 },
  ]
  return (
    <Scene label="The creator picks winners. Places fill from the top and any unused place returns to the creator." className="w-full">
      <Svg viewBox="0 0 360 260">
        <rect width="360" height="260" fill={SKY} />
        {rows.map((r) => (
          <g key={r.tag}>
            <rect className="a-grow-x" style={d(r.delay)} x="56" y={r.y} width={r.w} height="40" fill={r.fill} stroke={INK} strokeWidth="3" />
            <Label x={22} y={r.y + 25}>
              {r.tag}
            </Label>
            <rect x="72" y={r.y + 12} width="36" height="6" fill={INK} className="a-pop" style={d(r.delay + 400)} />
            <rect x="72" y={r.y + 24} width="64" height="4" fill={SKY_DEEP} className="a-pop" style={d(r.delay + 500)} />
          </g>
        ))}
        <g className="a-pop" style={d(1100)}>
          <rect x="268" y="196" width="72" height="34" fill={PAPER} stroke={INK} strokeWidth="3" strokeDasharray="6 4" />
          <Label x={304} y={210} anchor="middle">
            UNUSED
          </Label>
          <Label x={304} y={222} anchor="middle">
            BACK TO YOU
          </Label>
        </g>
      </Svg>
    </Scene>
  )
}

/** Step 4: the winner claims, keeping the prize minus the 5% claim fee. */
export function ClaimScene() {
  return (
    <Scene label="The winner claims from the contract and receives the prize minus the 5 percent claim fee." className="w-full">
      <Svg viewBox="0 0 360 260">
        <rect width="360" height="260" fill={SKY} />
        <rect y="218" width="360" height="42" fill={SKY_DEEP} />
        <rect y="216" width="360" height="4" fill={INK} />
        <rect x="40" y="96" width="128" height="120" fill={PAPER} stroke={INK} strokeWidth="3" />
        <rect x="40" y="96" width="128" height="26" fill={INK} />
        <Label x={104} y={113} anchor="middle" fill={PAPER}>
          YOUR WALLET
        </Label>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} className="a-drop" style={d(200 + i * 160)}>
            <rect x={56 + (i % 3) * 34} y={186 - Math.floor(i / 3) * 18} width="28" height="14" fill={SIGNAL} stroke={INK} strokeWidth="2" />
          </g>
        ))}
        <path d="M168 150 H214" fill="none" stroke={INK} strokeWidth="3" strokeDasharray="5 5" className="a-draw" style={{ ...d(300), ['--len' as string]: 50 } as CSSProperties} />
        <rect x="226" y="126" width="96" height="90" fill={PAPER} stroke={INK} strokeWidth="3" />
        <Label x={274} y={156} anchor="middle">
          TREASURY
        </Label>
        <Label x={274} y={178} anchor="middle">
          5%
        </Label>
        <g className="a-pop" style={d(1000)}>
          <rect x="226" y="60" width="96" height="40" fill={SIGNAL} stroke={INK} strokeWidth="3" />
          <Label x={274} y={78} anchor="middle">
            YOU KEEP
          </Label>
          <Label x={274} y={92} anchor="middle">
            THE REST
          </Label>
        </g>
      </Svg>
    </Scene>
  )
}

/** A receipt for one example prize. The figures are the contract's fixed rates applied to 100 USDC, and the card says so. */
export function ReceiptScene() {
  const rows: [string, string, boolean?][] = [
    ['Prize locked', '100.00'],
    ['Post fee, 0.5%', '+ 0.50'],
    ['You pay to fund', '100.50', true],
    ['Claim fee, 5%', '- 5.00'],
    ['Winner receives', '95.00', true],
  ]
  return (
    <Scene label="Example receipt for a 100 USDC prize with one winner: 100.50 leaves the creator, the winner receives 95.00." className="w-full">
      <Svg viewBox="0 0 360 260">
        <rect width="360" height="260" fill={SKY} />
        <g className="a-grow-y" style={d(100)}>
          <rect x="36" y="16" width="288" height="228" fill={PAPER} stroke={INK} strokeWidth="3" />
        </g>
        <Label x={52} y={42}>
          EXAMPLE RECEIPT
        </Label>
        <rect x="52" y="52" width="256" height="2" fill={INK} />
        {rows.map(([label, value, strong], i) => (
          <g key={label} className="a-pop" style={d(500 + i * 200)}>
            <text x="52" y={80 + i * 30} fontSize="12" fill={INK} fontWeight={strong ? 700 : 400} fontFamily="DM Sans, sans-serif">
              {label}
            </text>
            <text x="308" y={80 + i * 30} fontSize="13" textAnchor="end" fill={INK} fontWeight={strong ? 700 : 400} fontFamily="JetBrains Mono, monospace">
              {value}
            </text>
            <rect x="52" y={86 + i * 30} width="256" height="1" fill={SKY_DEEP} />
          </g>
        ))}
        <g className="a-pop" style={d(1700)}>
          <rect x="232" y="212" width="76" height="22" fill={SIGNAL} stroke={INK} strokeWidth="3" />
          <Label x={270} y={227} anchor="middle">
            USDC
          </Label>
        </g>
      </Svg>
    </Scene>
  )
}

/** Arc settles in under a second. A row of blocks fills in and the last one is final. */
export function FinalityScene() {
  return (
    <Scene label="Blocks fill in one after another and the last is marked final." className="w-full">
      <Svg viewBox="0 0 360 260">
        <rect width="360" height="260" fill={SKY} />
        <rect y="196" width="360" height="64" fill={SKY_DEEP} />
        <rect y="194" width="360" height="4" fill={INK} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i} className="a-pop" style={d(150 + i * 180)}>
            <rect x={30 + i * 52} y={126} width="40" height="68" fill={i === 5 ? SIGNAL : PAPER} stroke={INK} strokeWidth="3" />
            <rect x={38 + i * 52} y={138} width="24" height="4" fill={INK} />
            <rect x={38 + i * 52} y={148} width="16" height="4" fill={SKY_DEEP} />
          </g>
        ))}
        <path d="M30 100 H322" fill="none" stroke={INK} strokeWidth="3" className="a-draw" style={{ ...d(100), ['--len' as string]: 292 } as CSSProperties} />
        <g className="a-pop" style={d(1400)}>
          <rect x="278" y="56" width="52" height="24" fill={INK} />
          <Label x={304} y={72} anchor="middle" fill={PAPER}>
            FINAL
          </Label>
        </g>
        <Label x={180} y={232} anchor="middle">
          UNDER 1 SECOND
        </Label>
      </Svg>
    </Scene>
  )
}

/** Project workspace: coordination cards that sit beside the escrow and never hold money. */
export function BoardScene() {
  const cols = [
    { x: 20, title: 'MILESTONES', rows: 3 },
    { x: 132, title: 'REVIEWS', rows: 2 },
    { x: 244, title: 'TEAM', rows: 3 },
  ]
  return (
    <Scene label="A project board with columns for milestones, reviews and team roles." className="w-full">
      <Svg viewBox="0 0 360 260">
        <rect width="360" height="260" fill={SKY} />
        {cols.map((c, ci) => (
          <g key={c.title}>
            <rect x={c.x} y="20" width="96" height="220" fill={PAPER} stroke={INK} strokeWidth="3" />
            <rect x={c.x} y="20" width="96" height="24" fill={INK} />
            <Label x={c.x + 48} y={36} anchor="middle" fill={PAPER}>
              {c.title}
            </Label>
            {Array.from({ length: c.rows }).map((_, r) => (
              <g key={r} className="a-drop" style={d(200 + ci * 160 + r * 140)}>
                <rect x={c.x + 8} y={56 + r * 56} width="80" height="44" fill={r === 0 ? SIGNAL : SKY} stroke={INK} strokeWidth="2" />
                <rect x={c.x + 14} y={64 + r * 56} width="44" height="6" fill={INK} />
                <rect x={c.x + 14} y={78 + r * 56} width="60" height="4" fill={r === 0 ? SIGNAL_DEEP : SKY_DEEP} />
              </g>
            ))}
          </g>
        ))}
      </Svg>
    </Scene>
  )
}

/** An address with nothing at it: an empty tray and a dashed card that never landed. */
export function NotFoundScene() {
  return (
    <Scene label="An empty tray with a dashed outline where a page should be." className="w-full">
      <Svg viewBox="0 0 360 260">
        <rect width="360" height="260" fill={SKY} />
        <rect y="196" width="360" height="64" fill={SKY_DEEP} />
        <rect y="194" width="360" height="4" fill={INK} />
        <rect x="96" y="70" width="168" height="124" fill="none" stroke={INK} strokeWidth="3" strokeDasharray="8 6" className="a-pop" style={d(200)} />
        <g className="a-drop" style={d(500)}>
          <rect x="132" y="102" width="96" height="60" fill={PAPER} stroke={INK} strokeWidth="3" />
          <rect x="144" y="116" width="40" height="6" fill={INK} />
          <rect x="144" y="130" width="68" height="4" fill={SKY_DEEP} />
          <rect x="144" y="140" width="52" height="4" fill={SKY_DEEP} />
        </g>
        <g className="a-pop" style={d(900)}>
          <rect x="140" y="36" width="80" height="26" fill={SIGNAL} stroke={INK} strokeWidth="3" />
          <Label x={180} y={53} anchor="middle">
            NOT FOUND
          </Label>
        </g>
      </Svg>
    </Scene>
  )
}

/**
 * Footer artwork on the dark ground: a chain of blocks, the escrow vault, a payout ladder and a receipt, drawn in
 * the same pixel language as the rest of the site. It is decoration, so it carries no text.
 */
export function FooterScene() {
  const LINE = '#4A6785'
  const FILL = '#16263A'
  const DIM = '#2A3F57'
  return (
    <Scene label="Decorative pixel artwork: a chain of blocks, an escrow vault, a payout ladder and a receipt." className="w-full">
      <svg viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice" className="block h-32 w-full sm:h-48" shapeRendering="crispEdges" aria-hidden focusable="false">
        <rect y="124" width="1200" height="36" fill="#0B121C" />
        <rect y="122" width="1200" height="4" fill={LINE} />
        {Array.from({ length: 50 }).map((_, i) => (
          <rect key={i} x={i * 24 + (i % 2) * 12} y={136 + (i % 3) * 6} width="4" height="4" fill={DIM} />
        ))}

        {/* a chain of blocks */}
        {Array.from({ length: 11 }).map((_, i) => (
          <g key={i} className="a-pop" style={d(100 + i * 90)}>
            <rect x={24 + i * 52} y={74} width="40" height="48" fill={i === 10 ? SIGNAL : FILL} stroke={i === 10 ? INK : LINE} strokeWidth="3" />
            <rect x={32 + i * 52} y={86} width="24" height="4" fill={i === 10 ? INK : LINE} />
            <rect x={32 + i * 52} y={96} width="14" height="4" fill={i === 10 ? SIGNAL_DEEP : DIM} />
          </g>
        ))}

        {/* escrow vault */}
        <g className="a-grow-y" style={d(700)}>
          <rect x="648" y="38" width="96" height="84" fill={FILL} stroke={LINE} strokeWidth="3" />
          <rect x="658" y="48" width="76" height="64" fill="none" stroke={DIM} strokeWidth="2" />
          <rect x="686" y="70" width="20" height="22" fill={SIGNAL} />
          <rect x="690" y="60" width="12" height="12" fill="none" stroke={SIGNAL} strokeWidth="4" />
        </g>
        <Coin x={688} y={22} delay={1100} />
        <Coin x={688} y={6} delay={1300} />

        {/* payout ladder */}
        {[
          { x: 800, h: 80, fill: SIGNAL, stroke: INK, delay: 900 },
          { x: 848, h: 52, fill: FILL, stroke: LINE, delay: 1050 },
          { x: 896, h: 32, fill: FILL, stroke: LINE, delay: 1200 },
        ].map((b) => (
          <rect key={b.x} className="a-grow-y" style={d(b.delay)} x={b.x} y={122 - b.h} width="36" height={b.h} fill={b.fill} stroke={b.stroke} strokeWidth="3" />
        ))}

        {/* receipt */}
        <g className="a-drop" style={d(1400)}>
          <rect x="980" y="48" width="84" height="74" fill={FILL} stroke={LINE} strokeWidth="3" />
          <rect x="992" y="60" width="36" height="5" fill={LINE} />
          <rect x="992" y="74" width="60" height="3" fill={DIM} />
          <rect x="992" y="84" width="48" height="3" fill={DIM} />
          <rect x="992" y="94" width="60" height="3" fill={DIM} />
          <rect x="992" y="106" width="30" height="8" fill={SIGNAL} />
        </g>

        {/* a second, smaller run of blocks on the right edge */}
        {Array.from({ length: 3 }).map((_, i) => (
          <g key={i} className="a-pop" style={d(1500 + i * 90)}>
            <rect x={1096 + i * 36} y={96 - i * 0} width="28" height="26" fill={FILL} stroke={LINE} strokeWidth="3" />
          </g>
        ))}
      </svg>
    </Scene>
  )
}
