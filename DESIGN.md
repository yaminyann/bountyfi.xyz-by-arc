# BountyFi design direction

Read with `antislop.md`. This file is the direction; antislop is the filter.

## Product

An on-chain work and contribution ecosystem. Anyone can lock a USDC prize for a piece of work (code, design, research, community, testing), contributors submit, the creator reviews and picks winners, and each winner claims from the contract. Projects group bounties into public workspaces. The audience reads addresses, hashes and receipts, so the primary job of every screen is to make money state obvious: what is locked, who gets what, what is a fee, what happens next, and which facts can be verified on-chain.

## Dials

ENERGY 2 / RHYTHM 3 / MOTION 2

Soft retro-print minimalism. A cool, pale ground, hard 1px ink lines, stepped pixel artwork and almost no copy. Motion is scroll-reveal, artwork that plays once when it enters the screen, and hover or press transitions. Nothing loops.

## Palette

| Role | Value | Use |
|---|---|---|
| Ink | `#0E1621` | Text, primary buttons, artwork outlines, the closing band |
| Paper | `#E8EEF3` | Page ground (cool, soft) |
| Surface | `#F7FAFC` | Raised content, inputs, header, footer |
| Sky | `#D4E2EE` (deep `#B4C8DA`) | Artwork ground, the notice bar |
| Line | `#CFDAE3` | Hairlines |
| Mute | `#54626F` | Secondary text (5.3:1 on Paper) |
| Signal | `#FDE047` (deep `#EAB308`, soft `#FEF9C3`) | The one accent: the brand mark, the single main action, coins and the first place |
| State | OK `#15803D`, Warn `#B45309`, Danger `#B91C1C`, Info `#1D4ED8` | Status badges, validation, callouts only |

Core colours are ink and the cool paper family. Yellow is the only accent. No gradients and no gradient text.

## Type

Bricolage Grotesque for headings (a characterful grotesque with a slightly retro editorial feel against calm body text), DM Sans for body, JetBrains Mono for addresses, hashes and amounts (tabular numerals), Silkscreen only for tiny labels inside artwork and stepped counters. Scale 12 / 14 / 16 / 20 / 26 / 32 / 44. Headings are semibold. Sentence case everywhere, except the pixel labels.

## Shape

Radius 6px on controls, 8 to 12px on containers. One-pixel Line borders. The one retro gesture is a hard offset shadow (`shadow-retro`, 4px) on the featured artwork and the single primary panel of a screen, and a 2px offset on the accent button. No other shadows except menus and dialogs. Prefer ruled lists to stacks of cards.

## Artwork

Artwork is original, drawn in code (`src/components/art/Scenes.tsx`) as hard-edged pixel scenes: escrow vault, payout ladder, submissions, claim, receipt, finality blocks, project board. Each scene shows a real mechanic of the contract and carries only the fee rates or a labelled example. Scenes play once when they enter the screen (`Scene`, `Reveal` in `components/motion`). Dither dots are allowed inside artwork only, never as a page background.

## Information architecture

- Header: Explore, Categories, Projects, Leaderboard, Workspace, Docs, notifications, Post a bounty, account.
- Below 1024px a bottom bar carries Explore, Projects, Post a bounty, Docs and More. More opens a sheet with the account steps and every other page. The page reserves the bar's height and the device safe area.
- Workspace sidebar (signed in): Workspace (contributor dashboard, project dashboard, my projects, my contributions, team bounties), Activity (submissions, reward history, notifications), Profile (contributor profile, settings and wallet). On small screens the same groups live in the header menu.
- Bounty page: Overview, Milestones, Team, Submissions, History as tabs. Prize and actions stay in one sticky column.

## Motifs

The **payout ladder** (stepped bars per prize place) wherever a prize appears, drawn as pixel steps in artwork, and the **ledger line** (label, leader, amount) for every fee breakdown.

## Verifiable versus recorded

Every number that can be read from the contract is marked "Verified on-chain". Things only BountyFi stores (listing details, milestones, reviews, team roles, recurring programs, profile text) are marked "Recorded on BountyFi" or explained in a callout. Never present a database value as if it were on-chain.

## Content rules

- Only real data. Counts and totals come from the API and are hidden when zero. No testimonials, no logo bar, no invented activity, no scores or ratings.
- Fees are stated as they are: 0.5% added when a bounty is funded, 5% taken from each winner's payout.
- Empty, loading and error states say what happened and what to do next. Use skeletons while loading, toasts for results and confirmation dialogs for destructive actions; never browser alerts.
