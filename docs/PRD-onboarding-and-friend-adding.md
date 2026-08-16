# PRD — Onboarding & Friend-Adding (Final)

**Product:** Gift Recommendation Web App — V1 "Core Loop"
**Status:** Final v1.0 — adjudicated merge of two competing drafts
**Date:** 2026-08-16
**Source BRD:** Gift App BRD v1.1 (draft v0.2, Giver-first entry)

---

## 0. How this document was made — Judge's decision log

Two competing drafts were produced independently against the same BRD and the same locked decisions:

- **Draft A ("UX-first")** — authored from an experience-quality-above-all philosophy. Full text: `docs/prd-drafts/prd-apple-pm.md`
- **Draft B ("Ship-fast")** — authored from a speed-to-validation-above-all philosophy. Full text: `docs/prd-drafts/prd-ship-fast.md`

**Locked inputs (from the product owner, not relitigated):** Giver-first onboarding covering both sides of the loop; ordinal ranking as the primary contribution interaction with an add-your-own option; invite delivery via email + copyable shareable link; no SMS.

**The headline result:** both drafts independently arrived at the same answer on the open account-timing question — **full guest mode until the send/invite moment** — from opposite philosophies (Draft A: "charge for value already delivered"; Draft B: "an auth wall before the experiment invalidates the experiment"). When the craft argument and the speed argument agree, the decision is safe. It is adopted without reservation.

Every other contested call, with the ruling:

| # | Contested call | Draft A (UX-first) | Draft B (Ship-fast) | Ruling & rationale |
|---|---|---|---|---|
| 1 | Account timing | Guest until send; auth as inline "return address" block | Guest until send; single gate at invite | **Unanimous.** Adopt A's return-address framing and copy — it costs nothing and converts the gate into a self-evident need. |
| 2 | Guest data model | Separate draft store + atomic promotion at sign-in (self-flagged as the riskiest engineering item) | Write real rows with `is_guest=true`; signup is an in-place upgrade | **B wins decisively.** FR-12 already forces credential-less User rows; reusing that shape deletes A's own top-listed risk. Keep A's guardrails: no outbound email from unauthenticated actors, rate limits, 30-day sweep, unguessable/noindex unclaimed profiles. |
| 3 | Ranking capture | Pick screen, then order screen, with selection order seeding the ranking | Selection order **is** the rank, shown as numeric badges on the chips | **Merge — they're the same insight at different fidelity.** Badges make the seeding visible and teach the mechanic; the confirm screen refines it. |
| 4 | Reorder mechanics | Drag + per-row ▲/▼ + full keyboard support | Chevrons only; drag is a fast-follow | **B wins.** Drag on mobile web is days of device QA for identical data. Chevron buttons are keyboard- and screen-reader-accessible for free, satisfying the BRD's WCAG AA call on this exact flow. Drag ships as a fast-follow only if reorder abandonment exceeds 30%. |
| 5 | Minimum interests | Require ≥3 to proceed | Allow 1, nudge at 3 | **B wins.** Forcing 3 fights the honesty of "not sure" and manufactures garbage signal. Instrument it; raise the floor later if data supports it. |
| 6 | Top-3 emphasis | "Counts most" hairline above position 3; full order stored but only top 3 demanded | Not present | **A wins.** It's a label and a divider — near-zero cost — and it matches the engine's top-k tier (BRD §9). |
| 7 | Screen count | 7 Giver + 5 Receiver | 5 Giver + 3 Receiver | **B's skeleton, wearing A's copy.** A's extra screens (standalone relationship, standalone notes/milestone, standalone wishlist) don't earn their existence; A's sentences do. |
| 8 | Notes & milestones in onboarding | One consolidated optional screen | One optional note field on the rank screen; milestones out of the flow | **B wins.** Milestone logging (BRD FR-18) stays in the product but lives in the friend hub, addable any time — it never belonged in the first-run funnel. |
| 9 | Taxonomy size | Full 150–300 tags with search; ~24 shown, relationship-sorted | 60–80 tags, 8–10 category headers, no search | **B wins on size, A wins on ordering.** 60–80 tags fits one scannable screen, deletes the search feature, and defuses the BRD's unowned-content-work risk. Keep A's relationship-aware default ordering (coworker surfaces different defaults than partner). Custom entries become the expansion backlog. |
| 10 | Auth methods | Google SSO primary, email+password secondary (with sender verification before send) | Google SSO + email magic link; no passwords | **B wins.** Magic link deletes the reset flow and credential storage, and inherently satisfies A's verified-sender requirement. |
| 11 | Invite preview on send screen | Fully rendered live preview of the invite card | None | **Compromise.** Show the actual invite message as a styled text block with one editable line. Keeps A's persuasion mechanism ("you can see why we need your name") without building a rendered-card component. |
| 12 | Receiver claim CTA | "Alex got it right — mostly" | "Yes, that's me" | **A wins.** An unqualified "that's me" endorses a friend's guess wholesale and creates hesitation; "mostly" is honest, low-stakes, and leads into edit anyway. |
| 13 | Wishlist in the claim flow | Optional, skippable screen after account | Off the claim path entirely; a low-key card in the friend hub | **B wins.** The "help your friend succeed" framing is the thing under test; wishlist-during-claim dilutes it. BRD already positions wishlist as secondary. |
| 14 | Invite link lifetime | Non-expiring, single-claim | 30-day token | **B wins**, plus regenerate: expired links render "ask [Giver] for a fresh one," and the Giver can re-copy a new link from the friend card. |
| 15 | Duplicate friends | Detect and route into existing profile | Allow duplicates, dedupe in a batch job later | **Split.** Same-Giver exact match (name/email within your own list) is a cheap lookup — keep A's "You already added Emma" routing. Cross-Giver dedupe (two people independently adding the same person) is deferred to a fast-follow merge job, and the "2+ contributors" metric is read as a floor. |
| 16 | Forwarded / wrong-person claims | Email match or magic-link confirm to claim | Token is the authority | **B wins for V1.** Exposed data is a first name and hobby tags; every "anyone with the link" product works this way. "That's not me" stays prominent; link revocation is the first fast-follow if misuse is observed even once. |
| 17 | Decline handling | Hard delete + address suppression + Giver sees only "isn't using this," no retry affordance | Tombstone + notify Giver | **A wins.** The full dignified-exit treatment costs one endpoint and some copy, and it is the single strongest trust signal in the product. |
| 18 | Metrics | Targets + diagnostic canaries | Targets + explicit kill/pivot thresholds | **Union.** B's kill criteria are a genuine value-add; A's canaries (decline rate, custom-interest rate, ranking engagement) are cheap and diagnostic. |

---

## 1. Summary & Philosophy

The first ninety seconds of this product are the product. A stranger who arrived thinking "I have no idea what to get Emma" must, within about three minutes on mobile web, have done something that felt like *thinking about Emma* — not *filling out a form about Emma* — and sent her an invite.

Three principles govern this spec:

1. **Nothing sits between the first prompt and the ranking screen.** The contribution step is the riskiest assumption in the BRD (§13) and the experiment V1 exists to run. Every screen between intent and ranking that isn't the ranking is contamination — of both the experience and the funnel data.
2. **Charge the user only for value already delivered.** The account ask lands at the exact moment identity becomes self-evidently necessary to the user's own goal (the invite needs a sender), and never as a standalone interstitial.
3. **The Receiver's claim screen is the highest-stakes screen in V1.** The Giver flow is designed backwards from the Receiver's first three seconds. If the pre-filled profile lands as "my friend was paying attention," the loop runs; if it lands as "people have a file on me," nothing downstream saves the product. Trust here is structural (who sees what, what can be deleted, before any login) — copy alone is not the treatment, but copy is most of the budget.

**Eight surfaces total: five Giver, three Receiver — and the Receiver's final screen is the Giver's first screen, reused verbatim.** The loop closes visually, not just conceptually.

---

## 2. Goals & Non-Goals

**Goals**
1. Landing → invite sent, with ranked interests, at a median under 3 minutes on mobile web — without the user ever hitting a screen titled "Sign up."
2. Usable ordinal interest data (dense rank 1..n, top-3 emphasized) on an unclaimed Receiver record before the Receiver has ever heard of the product.
3. The invited Receiver can see everything recorded about them — and delete it — **before** creating an account.
4. The Receiver's session ends on an add-a-friend prompt: loop closure is a designed screen, not a hope.
5. Unconfounded drop-off instrumentation at every step (no auth wall before the experiment).

**Non-goals (V1)**
- Contact-list import, address-book access, social-graph sync, SMS. Manual entry only.
- Milestone/occasion entries **in the onboarding flow** (they live in the friend hub, addable any time, per BRD FR-18).
- Shared-interest tagging (FR-22 optional portion) and Receiver self-confidence flags (FR-7) — fast-follow.
- Wishlist entry inside the claim flow — it lives in the friend hub after onboarding.
- Password accounts. Google SSO + email magic link only.
- Multi-friend batch add in the first run; the gifting-style quiz (deferred to first recommendation view per BRD Flow 5); onboarding tours, carousels, progress theatrics.
- Drag-and-drop reordering (fast-follow, conditional — see §4).

---

## 3. Flows, Screen by Screen

### 3A. Giver flow (5 screens)

**[G1] Landing + first prompt** — *one screen, not two*

Purpose: convert intent into a name in a single interaction. No separate marketing page; the value prop is one line above the input. Near-empty screen: wordmark, headline, one field (autofocused on desktop only), one button enabled at 1+ character.

> **Who are you trying to find a gift for?**
> First name is fine — we'll do the hard part together.
> `[ Emma ]` → **Let's figure it out**
> *small:* Already have an account? Sign in · I was invited by a friend

Edge: blank submit does nothing (button disabled, no error state). Names over 40 chars truncate at display; emoji accepted and stored as-is.
Data: creates guest `User(is_guest=true)` bound to an httpOnly session cookie, unclaimed Receiver `User(claim_status=unclaimed)`, and `FriendEdge(status=draft)`.

**[G2] Relationship + interest selection** — *one screen*

Purpose: capture relationship type and the candidate interest set in one pass, with selection order recorded as the provisional rank.

- Top: "How do you know Emma?" — single-select chip row: Partner · Family · Close friend · Friend · Coworker · Someone else. Tap is the answer; no Next required for this row.
- Then the taxonomy: 60–80 interest chips under 8–10 plain category headers (Food & Drink, Outdoors, Home, Music, Games, Style, Wellness, Learning, Making, Screen time), **default-ordered by relationship type**. No search box — the list is deliberately short enough to scan.
- Each selected chip gets a **numeric badge showing selection order (1, 2, 3…)**. Past 10 selections, chips mark selected without badges; only the first 10 carry ordinal weight.

> **What's Emma into?**
> Tap what you already know — most Emma-ish first. You don't have to be right about all of it; her other friends will fill in the rest.

That second line removes the fear of being *wrong about a friend* — the true drop-off risk on this screen — and plants the crowdsourcing model without explaining it.

Primary: sticky bottom bar, "Next (3 picked)" — enabled at 1 selection, nudged below 3 ("A few more makes this much better").
Secondary (the escape hatch, a link, never a modal): **"I'm honestly not sure — let Emma tell me"** → skips to [G4] with zero interests; still a valid invite (see [R1] empty-state).

**[G3] Rank, refine, add** — *one screen*

Purpose: turn the noisy selection order into deliberate ordinal data, and catch what the taxonomy missed.

- A numbered vertical list of the selections in tap order. Each row: rank number, label, ▲/▼ chevron buttons (44×44pt targets), ✕ to remove.
- Positions 1–3 sit above a labeled hairline (**"Counts most"**); the rest below (**"Also true"**). Only crossing the hairline is a consequential move — we store a full ordering but only *demand* a top 3.
- `+ Something specific` — inline input, Enter to commit, appends to the bottom of the list (promotable by chevron). Rotating placeholder teaches idiosyncrasy: *"late-night baking" · "anything Formula 1" · "that one bakery on 5th."* Entries flagged `free_text`, capped at 50 chars ("Keep it short — like 'sourdough' or 'F1'").
- Below: one optional field — "Anything else worth knowing? (only you will ever see this)" — a single textarea writing to `FriendNote`.

> **Sound about right?**
> We put these in the order you picked them. Move anything that's off — your top 3 do most of the work.

Primary: Next. Secondary: "Not sure about the order" — keeps the set, nulls all ranks (`confidence='unsure'`).
Keyboard: chevrons are plain buttons — Tab/Enter operable, live-region announces "Baking, now position 2 of 6." WCAG AA on this screen is a launch requirement (BRD §11 names this flow specifically).

**[G4] Invite + account** — *one screen, the only gate*

Purpose: capture the Receiver's contact (optional), create the Giver's account, and send. Three jobs, one screen, one intent: "make this real."

Vertical order:
1. The invite message, shown as a styled block with one Giver-editable line — so the reason for the next block is sitting right above it.
2. **"Send as"** block: `Continue with Google` (primary) / `Use my email instead` (magic link — the link click verifies the sender address; no passwords exist in this product).
3. Recipient: "Where can we reach Emma?" — email, marked *optional*, helper: "Or skip it and just send her a link yourself."
4. Primary **[ Send it to Emma ]** · Secondary **[ Copy link ]**.

The account ask (this exact register — never "save your progress"):
> **Emma should know who this is from.**
> Sign in so the invite comes from you — and so her answers come back to you.

The invite message itself:
> **Alex is trying to find you something good.**
> They added a few things they think you're into and want to check they got it right. Takes about a minute — and no, you don't have to write a wishlist.
> **[ See what Alex said ]**

Edges: SSO popup blocked → full-page redirect fallback. Email already registered → sign in, guest draft merges into the existing account. Invalid recipient email → inline format validation only. Send failure → the work is saved and the link is live: "Couldn't email her, but your link works — copy it below." **We never lose the work over a delivery failure.**

**[G5] Sent** — *one screen*

Purpose: pay off immediately; never end a flow on a waiting state. The Giver's outcome must not depend on Emma responding — most won't respond today.

> **Sent. Emma will hear from you.**
> Or send it yourself: `gft.app/s/8fk2n1` **[Copy link]**
> While you wait — here's what we'd get her based on what you told us.
> **[ See gift ideas for Emma ]** · Add someone else

Friend card shows status "Invited" (never "Failed," never a red state). This screen is the handoff to BRD Flows 5/6.

### 3B. Receiver flow (3 screens)

**[R1] Claim landing — the trust moment** *(pre-account, read-only)*

The single rule governing this screen: **no account is needed to see what's been said about you.** Anything else converts a nice gesture into a hostage situation.

Elements: the Giver's actual first name and relationship at top; the contributed interests as tags in a neutral order with **rank positions stripped**; attribution on the set; three actions. One named human, never a plural — even if others have contributed, claim time shows only the inviting Giver.

> **Alex is trying to get your next gift right.**
> They guessed a few things you're into and wanted to check with you first — they can't see how you answer, just a better list.
> *Alex thinks you're into:* `baking` `hiking` `sci-fi` `vinyl` `a good knife`
> **Alex got it right — mostly** *(primary)*
> Let me fix a few things *(secondary)*
> I'd rather not be in this *(tertiary, quiet, always visible)*

A "Who can see this?" link opens a four-line modal (not a route): what Alex added, that Alex's private notes are never shown to you, that only accepted friends see your list, that nothing is public.

Empty-state (escape hatch was used): headline becomes **"Alex is stuck."** / "They want to get you something good and admitted they need help. What are you actually into?" — being needed beats being profiled.

Edges: expired token (>30 days): "This link's gone stale — ask Alex for a fresh one." Already-claimed: route to sign-in. Declined/tombstoned: neutral "This invite is no longer active."

**[R2] Confirm, edit & save** — *one screen*

Purpose: convert the inherited list into Receiver-owned data, then attach the account.

- Inherited interests as chips, each with a one-tap ✕ — no confirm dialog, no "are you sure, Alex added that." **The delete button is the trust treatment.**
- `+ Add your own` inline input with taxonomy autocomplete.
- Then the same account block as [G4] (Google SSO / magic link).

> **Fix anything that's off.**
> Ditch what's wrong, add what's missing — Alex won't be told what you changed. This is yours now.

"Won't be told what you changed" is load-bearing: without it, honest editing has a social cost and people leave errors in place to be polite, which poisons the data.

Primary: **Save my profile** — creates the account, links it to the unclaimed record, all pre-contributed data carries over (BRD FR-14).
Edges: removing everything is allowed (proceed with an empty list). SSO email differing from the invited email: the token is the authority; claim proceeds, event logged.

**[R3] Become a Giver** — *reuses [G1] verbatim*

The BRD's most important metric (loop continuation) gets a designed moment at peak goodwill — and zero incremental build, because it is literally the [G1] component.

> **Done. Now — who do *you* need to find a gift for?**
> You just made it easy for Alex. Return the favor for someone.
> `[ First name ]` → **Continue** · *(link)* Not right now

"Not right now" lands on the friend hub, where the wishlist entry point lives as a low-key card ("Want to make sure they nail it? Add specifics") alongside notes and milestone logging.

---

## 4. The Ordinal Ranking Interaction (consolidated spec)

- **Capture:** every chip tap on [G2] appends to an ordered array; the badge number is the array index. A full ordinal ranking falls out of an interaction the user was already performing.
- **Correction:** [G3] renders the array as a numbered list with ▲/▼ chevron buttons and per-row remove. **No drag-and-drop in V1** — touch drag fights the scroll container, breaks differently across iOS Safari and Chrome, and costs days of device QA to produce identical data. Chevrons are two `<button>` elements per row and are accessible for free. Drag ships as a fast-follow only if reorder abandonment exceeds 30%.
- **Emphasis:** the "Counts most" hairline above position 3. Full dense ranks 1..n are stored (ties impossible by construction, keeping BRD §9 aggregation trivial), but the interaction only demands ~3 decisions, not 8.
- **Bounds:** minimum 1 selection (nudged at 3), badges stop at 10; selections past 10 store `rank_value=null, confidence='unsure'`.
- **Add-your-own:** appends at the bottom by default — promotable if it matters, and default-bottom protects ordinal integrity from throwaway entries.
- **"Not sure," three tiers, all near-zero UI cost:**
  1. *Per-item, implicit:* selected but unranked → `rank_value=null, confidence='unsure'` (satisfies BRD FR-21 with no extra UI).
  2. *Per-screen:* "Not sure about the order" on [G3] nulls all ranks, keeps the set.
  3. *Whole-step:* "I'm honestly not sure — let Emma tell me" on [G2] → invite with an empty set, reframed on [R1] as "Alex is stuck." An invited Receiver with no data beats a bounced Giver with no invite.
  4. *Post-join contribution (BRD FR-20/21):* when ranking someone else's existing list, each row carries a "don't know" toggle that removes it from the ordering rather than sinking it — "ranked last" and "no idea" are different data.

---

## 5. Account-Creation Timing — Decision

**Full guest mode. A brand-new visitor can name a friend, set relationship, select and rank interests, add custom entries, and write a private note entirely anonymously. The account lands at [G4], inline on the send screen, framed as the return address on the invite — never as its own interstitial. The Receiver's account lands at [R2], after they've seen and edited their own data.**

Both drafts reached this independently; the combined rationale:

1. **Funnel data quality (decisive).** The riskiest assumption is "will a Giver rank interests for a friend?" An auth wall before the ranking screen contaminates every drop-off between name and rank: "won't sign up for an unproven product" and "won't do the ranking task" become indistinguishable, and those two failures demand opposite responses. An auth wall placed before the experiment invalidates the experiment.
2. **Value-for-identity honesty.** At the BRD's original placement (right after naming the friend) the user has typed one word; "save your progress" is not credible. At the send moment, identity is required by the user's own goal — an invite from nobody is worse for the recipient — so the ask reads as a fact of the situation, not a toll.
3. **Engineering cost is near zero.** FR-12 already forces credential-less `User` rows for unclaimed Receivers. A guest Giver is the same row shape with `is_guest=true`, keyed to an httpOnly session cookie; signup is an in-place `UPDATE` attaching an identity, not a migration from a parallel draft store. (This ruling deliberately rejects the separate-draft-store design, which was the UX-first draft's own top-listed engineering risk.)
4. **Abuse surface is small because the gate sits at the only outbound action.** Nothing leaves the system pre-auth: no email, no link, no visibility. The worst a guest can do is create orphan rows.

**Guardrails (all launch requirements):** no email is ever sent by an unauthenticated actor; email sending requires a verified sender (SSO inherently, magic-link click otherwise — the copy-link path stays open meanwhile); rate limits per §7; 30-day guest TTL with a nightly sweep; unclaimed profiles are `noindex`, never enumerable, reachable only by unguessable token.

**Accepted costs:** guest state is one browser (start on phone, finish on desktop = start over — the honest price of not asking for an email up front); abandoned guests leave orphan name-plus-tags rows, swept at 30 days.

**Pre-registered fallback:** account-ask conversion at [G4] is instrumented from day one. If it falls below ~65%, the fix is a soft account prompt after [G3] — a placement change, not a rebuild.

---

## 6. Trust & Privacy for the Pre-Filled Profile

The BRD flags this as a top risk. The ruling: **trust is structural, delivered through copy — no consent gates, no disclosure interstitials.** A dedicated screen would signal that something requiring explanation happened, manufacturing the exact suspicion it tries to dispel. Six commitments:

1. **No login wall between a person and data about them.** [R1] renders the full contribution read-only from the link alone. Requiring an account to see what's been said about you makes us the party with leverage. Non-negotiable.
2. **Attribution is always one named human.** "Alex added these" — never "your friends think," never "our data suggests," even when multiple contributors exist. A named person accounting for every byte is the difference between a gesture and a dossier.
3. **The subject sees tags, never ranks.** `rank_value` and per-contributor orderings are never serialized by any Receiver-facing endpoint — enforced at the API layer, verified by test. "Alex thinks you're into baking" is warm; "Alex ranked you: baking #1" is a report card.
4. **Exit is one tap, costs nothing, requires no account.** "I'd rather not be in this" → single confirm → the unclaimed record and all contributions hard-delete, and the address is suppressed from future invites. The Giver sees only "Emma isn't using this" — never that she declined, never a retry affordance, no guilt copy. A cheap, dignified exit is what makes staying meaningful.
5. **Private stays provably private.** Notes are labeled "only you will ever see this" at the moment of writing, and excluded from every Receiver-facing serializer as a data-layer rule, not a UI convention.
6. **Disclosure at the right altitude.** The "Who can see this?" modal: four lines, plain voice, no route, no legal register.

---

## 7. Functional Requirements

| # | Requirement | Ship |
|---|---|---|
| FR-1 | First screen collects a target's first name only — no auth, no email, no marketing interstitial. | MUST |
| FR-2 | Naming a friend creates a guest Giver (`is_guest=true`, httpOnly session cookie), an unclaimed Receiver record, and a draft FriendEdge — no account. | MUST |
| FR-3 | Guest session persists 30 days and survives reload and back-navigation; every screen is a real history entry and Back never destroys work. | MUST |
| FR-4 | Account creation is required only to send an invite or generate a share link, presented inline on the send screen — never as a standalone interstitial. | MUST |
| FR-5 | Auth is Google SSO + email magic link. No passwords anywhere. | MUST |
| FR-6 | On signup, guest rows upgrade in place; signing into an existing account merges the guest draft. No user-visible data loss. | MUST |
| FR-7 | Relationship type is single-select from a fixed 6-item list, captured on the selection screen. | MUST |
| FR-8 | Taxonomy renders 60–80 curated tags under 8–10 category headers, default-ordered by relationship type. No search in V1. | MUST |
| FR-9 | Chip selection order is recorded and displayed as numeric badges; badges stop at 10. | MUST |
| FR-10 | Rank screen lists selections in order with ▲/▼ buttons and per-row remove; positions 1–3 visually distinguished ("Counts most"); full keyboard operation with live-region announcements (WCAG AA). | MUST |
| FR-11 | Ranks persist as dense integers 1..n on InterestRanking, tagged pre-invite; unranked selections store `rank_value=null, confidence='unsure'`. | MUST |
| FR-12 | Custom free-text interests (≤50 chars, flagged `free_text`) can be added and append at the bottom of the rank list; server-side lowercase dedupe against taxonomy tags, silent to the user. | MUST |
| FR-13 | All three "not sure" tiers (per-item, per-screen, whole-step) proceed to a valid invite; the zero-interest invite adapts Giver and Receiver copy ("Alex is stuck"). | MUST |
| FR-14 | One optional private note field writes to FriendNote, labeled "only you" at write time, excluded from all Receiver-facing serializers. | MUST |
| FR-15 | The send screen shows the actual invite message (one Giver-editable line) above the auth block. | MUST |
| FR-16 | Invite email sends when an address is provided; a copyable share link (30-day unguessable token, clipboard API with visible copied-state and selectable fallback) is always generated. Identical claim behavior for both. | MUST |
| FR-17 | Email delivery requires a verified sender; no email is ever sent by an unauthenticated actor; copy-link remains available pre-verification. | MUST |
| FR-18 | Send failure preserves all work and surfaces the live link. | MUST |
| FR-19 | Claim landing renders the inviting Giver's first name and the full contributed interest set — unordered, read-only, no authentication. | MUST |
| FR-20 | No Receiver-facing endpoint serializes rank values or per-contributor orderings (test-enforced). | MUST |
| FR-21 | "I'd rather not be in this" hard-deletes the unclaimed record without an account, suppresses the address from future invites, and reports only "isn't using this" to the Giver. | MUST |
| FR-22 | Receiver can remove (one tap, no confirm) and add interests before account creation; edits are never attributed back to the Giver. | MUST |
| FR-23 | Claiming links the account to the unclaimed record with all contributed data carried over; the claim token is the authority even if the SSO email differs (logged). | MUST |
| FR-24 | Expired, already-claimed, and declined tokens each render distinct, calm, handled states. | MUST |
| FR-25 | Post-claim, the Receiver lands on the add-a-friend prompt (the [G1] component, verbatim). | MUST |
| FR-26 | Same-Giver duplicate detection (exact name/email match within own list): "You already added Emma — want to add to what you said?" routes into the existing record. | MUST |
| FR-27 | Rate limits: 10 guest friend-creations/IP/hour; 10 invites/day for accounts under 7 days old; 1 invite email per recipient address per 72h regardless of sender. Nightly sweep of unconverted guest data older than 30 days. | MUST |
| FR-28 | Unclaimed profiles are noindex, non-enumerable, and reachable only by token. | MUST |
| FR-29 | Full funnel instrumentation: every screen view, every drop, guest-vs-account state, per-step timing, escape-hatch usage, decline events. | MUST |
| FR-30 | Email to the Giver when their invite is claimed (BRD FR-32). | MUST |
| FR-31 | Wishlist, notes management, and milestone logging live in the friend hub post-onboarding (BRD FR-9/17/18) — outside this flow's critical path. | MUST |
| FF-1 | Drag-and-drop reordering (conditional: reorder abandonment > 30%). | FAST-FOLLOW |
| FF-2 | Taxonomy search and expansion toward 150–300 tags, seeded by observed `free_text` entries. | FAST-FOLLOW |
| FF-3 | Cross-Giver duplicate merge (batch job + claim-time credit to multiple contributors). | FAST-FOLLOW |
| FF-4 | Manual nudge for unresponsive invitees (5-day delay, 2 lifetime cap — BRD FR-16); "friend completed ranking" email (BRD FR-33). | FAST-FOLLOW |
| FF-5 | Link revocation UI (first priority if a forwarded-link incident is ever observed). | FAST-FOLLOW |
| FF-6 | Shared-interest tagging (BRD FR-22 optional portion); Receiver self-confidence flags (BRD FR-7). | FAST-FOLLOW |
| FF-7 | Free-text moderation/profanity screening beyond length caps. | FAST-FOLLOW |

---

## 8. Edge Cases

**Handled in V1:** duplicate friend within one Giver's list (routed, FR-26) · invite to an existing account (no unclaimed record — friend request with contributions attached, same claim screen minus the account step) · lost guest cookie (explicit restart message, logged as hard funnel failure, expected sub-1%) · already-registered email at the gate (sign in + merge) · SSO popup blocked (redirect fallback) · expired / claimed / declined tokens (distinct calm states) · zero-interest invite (a supported path, not an error) · Receiver deletes everything (allowed) · SSO-vs-invited email mismatch (token wins, logged) · custom tag colliding with taxonomy (silent server dedupe) · email bounce at send time (link offered: "That address bounced — here's a link you can send her") · Giver adds themselves (email match at send: "That's you — want to set up your own profile instead?") · slow network mid-rank (ranking is local-first; order commits on advance with a retry queue — never block a chevron tap on a request) · Receiver ignores invite (nothing breaks; Giver still gets recommendations from their own contribution per BRD FR-30; card shows "Invited," never a failure state).

**Consciously not handled in V1 (cheap fallback stated):**
- *Cross-Giver duplicates:* both unclaimed records exist; first claim wins, the other is merged later by FF-3. The "2+ contributors" metric is read as a floor.
- *Forwarded link claimed by the wrong person:* token is authority; exposed data is a first name and hobby tags; "That's not me" is prominent; the Giver is emailed on claim. Revocation is FF-5.
- *Post-send email bounce handling / retries:* none. The Giver has the link; the card shows "Invited" indefinitely.
- *Offensive custom tags:* length-capped only; blast radius is one friend pair. Screening is FF-7.
- *Multi-device guest continuation:* not supported; start over.
- *Never-claimed records:* no lifecycle beyond the guest sweep; authenticated Givers' unclaimed friends persist.

---

## 9. Success Metrics & Kill Criteria

| Metric | Target | Floor / read |
|---|---|---|
| **Giver contribution completion** (G1 start → invite sent with ≥3 ranked interests) | ≥40% | **<20% = the core mechanic is not viable as designed — pivot the contribution step, not the copy** |
| Name → rank screen reached | ≥70% | <50% = the taxonomy screen is the problem |
| Account-ask conversion at [G4] | ≥65% | <65% triggers the pre-registered fallback (§5); this validates the timing decision, not guest mode itself |
| Invite viewed → claim (account created) | ≥30% at 14 days | <10% = kill signal on the crowdsourcing premise |
| Claim → confirm/edit completion | ≥70% | <40% = the trust framing failed |
| **"I'd rather not be in this" rate** | <3% | **>8% = the surveillance reaction — rewrite [R1] immediately (framing fix, not friction fix)** |
| **Loop continuation** (claimed Receiver adds a friend, same session) | ≥15–20% | <5% = there is no loop, only a funnel |
| Median time to invite sent (mobile web) | <3 min | >6 min = too many steps |

**Diagnostics:** per-screen drop-off G1→G5 and R1→R3 (expected weak points: G2→G3 and R1→R2) · ranking engagement (% of [G3] sessions with ≥1 reorder — persistently low means selection-order seeding does all the work and [G3] can slim down) · custom-interest rate (best proxy for genuine thinking-about-the-person) · escape-hatch usage (>25% means [G2] feels like a test) · nudge-to-claim lift once FF-4 ships.

**Kill vs. pivot:** contribution completion <20% *and* claim-to-confirm <40% together mean neither side of the exchange is motivated — no copy fixes that. High contribution but low claim → the Giver side works; fix invite distribution and framing. The inverse → Receivers engage but Givers won't do the work; revisit the entry-point thesis.

---

## 10. Build Scope & Accepted Risks

**Relative sizing (this flow only):** auth + guest session **L** · the two contribution screens **L** · claim/confirm **M** · invite email + link infra **M** · taxonomy content **M** (non-engineering — needs a named owner, per BRD §13) · friend hub shell **S** · instrumentation **S**. Roughly two-thirds of the effort sits in the contribution screens plus auth — correct, because that is where the hypothesis lives.

**Accepted risks, explicitly:**
1. **Selection order as the rank seed adds noise below position 3.** Acceptable — the engine's top-k tier (BRD §9) carries the weight, and the hairline focuses effort exactly there.
2. **Chevrons-only reordering may frustrate a minority.** Instrumented; drag is a contained fast-follow behind a measured threshold.
3. **A 60–80-tag taxonomy will feel thin to power users.** Annoyed engaged users generate custom tags — which is the expansion dataset.
4. **All auth risk concentrates on one screen ([G4]).** If it converts poorly we lose everything the user did, not just the tail. Mitigated by day-one instrumentation and the pre-registered placement fallback.
5. **Guest orphan rows contain real first names.** Name-plus-tags only, no contact info required before [G4], swept at 30 days, never enumerable.
6. **Forwarded links.** Low-severity exposure; revocation is first in the queue if it happens even once.
7. **No A/B on trust framing at launch volume.** We ship the strongest single hypothesis and read the decline rate as the qualitative canary.
