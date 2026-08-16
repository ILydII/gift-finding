# PRD — Onboarding & Friend-Adding
### Gift App V1 | "Ship-Fast" version | Owner: Product | Date: 2026-08-16

---

## 1. Summary & Product Philosophy

This document covers one thing: **a stranger lands on the site and, within three minutes, has ranked what they know about a friend and sent that friend an invite.** Everything downstream (recommendations, gifting-style quiz, wishlists) is out of scope here.

The BRD is honest about the riskiest assumption (Section 13): *will Givers actually do the contribution step, and will Receivers engage once invited?* Every design call in this PRD is subordinated to measuring that as fast and as cleanly as possible.

**Product philosophy, stated plainly:**

1. **The funnel is the product right now.** We are not building a gift app in V1; we are building a measurement instrument for one hypothesis. Any feature that does not change the numerator or denominator of "did the Giver rank and invite?" is deferred, including things the BRD lists as in-scope.
2. **Nothing may sit between the first prompt and the ranking screen.** The ranking interaction is the experiment. If we put an auth wall, a taxonomy browser, a milestone logger, or a relationship-metadata form in front of it, a drop-off tells us nothing about ranking — it tells us about the obstacle we invented.
3. **Five screens for the Giver, three for the Receiver, and the Receiver's third screen is the Giver's first.** The loop closes visually, not just conceptually.
4. **Copy is the cheapest feature we own.** The trust risk the BRD flags around pre-filled profiles gets solved with sentences and a delete button, not with consent screens and disclosure flows. Words ship in an hour.
5. **We accept a mess we can clean up later; we do not accept a delay.** Duplicate friends, forwarded links, and typo'd emails are all cheaper to fix in month three than to prevent in week one.

---

## 2. Goals & Non-Goals

**Goals**
- G1. Get a brand-new visitor from landing to "invite sent" with median time under 3 minutes.
- G2. Produce usable ordinal interest data (rank 1..n) on an unclaimed Receiver record.
- G3. Get invited Receivers to claim, confirm, and — critically — continue into their own first Giver action.
- G4. Instrument the whole funnel with an unconfounded drop-off signal at every step.

**Non-goals (deliberate cuts, argued in Section 10)**
- N1. Milestone/occasion entries at add-time (BRD FR-18). Not needed to test ranking. Deferred entirely.
- N2. A private-notes UI (FR-17). Collapsed to one optional free-text field; no dedicated screen, no editing UI in this flow.
- N3. Shared-interests tagging (FR-22, the optional 1–3 shared activities). Relationship type only.
- N4. Receiver-side wishlist during the claim flow (FR-9). It moves off the claim path entirely (see 3.8).
- N5. Receiver self-confidence flags (FR-7). Fast-follow.
- N6. Nudge/re-prompt (FR-16), and the "friend completed ranking" email (FR-33).
- N7. Password accounts. Google SSO plus email magic link only. No password reset flow to build, no password reset flow to break.
- N8. Contact-list import, address book, social graph sync, SMS. Manual entry only.
- N9. Any onboarding tour, progress bar with more than three dots, empty-state illustrations, or animation work.
- N10. A 150–300 tag taxonomy. V1 ships 60–80 tags (Section 10).

---

## 3. Flows, Screen by Screen

Eight surfaces total: five Giver, three Receiver — and Receiver screen 3 is Giver screen 1 re-used verbatim. Each is justified.

### 3.1 [G1] Landing + First Prompt — *one screen, not two*

**Purpose.** Convert curiosity into a named target in a single interaction. There is no separate marketing page in V1; the value prop is one line above the input.

**Why it exists.** It is the door. Merging landing and first input removes an entire click and an entire measurable drop-off point.

**UI.** One headline, one subhead, one text input (autofocused on desktop, not on mobile so the page is readable), one primary button. Nothing else above the fold. No nav, no footer links except a small privacy link.

**Copy direction.**
> **Who do you want to find a gift for?**
> Tell us who they are and what you already know about them. We'll do the hard part.
>
> `[ First name or nickname ]`  → **Continue**

**Primary action.** Continue (requires 1+ character).
**Secondary.** "I was invited by a friend" text link → claim-link entry (rare; catches people who lost the email).

**Edge/error.** Empty submit: inline "We just need a name — a nickname is fine." Name over 40 chars: truncate silently. Emoji/unicode: allowed, stored as-is.

**Data.** On Continue: create guest Giver `User(is_guest=true)` bound to an httpOnly session cookie; create unclaimed Receiver `User(claim_status=unclaimed, name=...)`; create `FriendEdge(status=draft)`.

---

### 3.2 [G2] Relationship + Interest Selection — *one screen*

**Purpose.** Capture relationship type and the candidate interest set in one pass, with **selection order recorded as provisional rank**.

**Why it exists.** This is half of the experiment. It is merged with relationship type because relationship is a single tap on a chip row and does not deserve its own screen.

**UI.**
- Header: "What's Sam to you?" — horizontal chip row, single-select: Partner / Family / Close friend / Friend / Coworker / Other.
- Then: "Tap what Sam's into — most Sam-ish first." A scrollable grid of ~60–80 interest chips grouped under 8–10 plain category headers (Food & Drink, Outdoors, Home, Music, Games, Style, Wellness, Learning, Making, Screen time).
- Selected chips get a **numeric badge showing selection order (1, 2, 3...)**. This is the entire ranking capture mechanism.
- Sticky bottom bar: "Next (3 picked)".

**Primary.** Next — enabled at 1 selection, nudged at 3 ("A few more makes this much better").
**Secondary.** "I'm not sure what they're into" text link → skips straight to [G4] with zero interests; still a valid invite (the Receiver fills it in). This is the escape hatch and it is a link, not a modal.

**Edge/error.** No search/filter box in V1 — the list is deliberately short enough to scan. If a user picks more than 10, we stop badging and just mark selected; only the first 10 carry ordinal weight.

---

### 3.3 [G3] Rank, Refine, Add — *one screen*

**Purpose.** Let the Giver correct the order they implicitly created and add anything the taxonomy missed.

**Why it exists.** Selection order is a noisy proxy. Showing the ranked list back is the confirmation step that turns noisy taps into deliberate ordinal data — and it is the moment where "add your own" naturally belongs, because the user has just been reminded of what is missing.

**UI.** A numbered vertical list of the selected interests, each row: rank number, label, up chevron, down chevron, X to remove. Below it: `+ Add something else` inline text input (Enter to commit, appends to the bottom of the list). Below that: one optional field — "Anything else worth knowing? (only you will see this)" — a single textarea writing to `FriendNote`.

**Copy direction.**
> **Sound about right?**
> Drag the ones that are most *them* to the top. Number 1 matters most.

**Primary.** "Next".
**Secondary.** "Not sure about the order" — accepts the list as an unordered set (all ranks null), continues.

**Edge/error.** Custom text longer than 50 chars is rejected inline ("Keep it short — like 'sourdough' or 'F1'"). Duplicate custom entries against an existing tag: accept, dedupe server-side by lowercase match, never tell the user.

---

### 3.4 [G4] Invite + Account — *one screen, and the only gate*

**Purpose.** Capture the Receiver's email (optional), create the Giver's account, and send/produce the invite. Three jobs, one screen, because they are one intent: "make this real."

**Why it exists.** This is the value-capture moment and therefore the correct and only place to ask for an account (Section 5).

**UI.** Two stacked blocks.
- Block A: "Where can we reach Sam?" — email input, marked *optional*, with helper text "Or skip it and just send them a link yourself."
- Block B: "Save this and send it" — `Continue with Google` button, plus `Use email instead` (magic link). One-line legal microcopy under the buttons.

**Copy direction.**
> **Almost there.**
> Create an account so Sam's profile is saved to you — and so we know who the invite is from.
>
> *(button)* Continue with Google
> *(link)* Use my email instead

**Primary.** Google SSO.
**Secondary.** Email magic link. Tertiary: back arrow (state preserved).

**Edge/error.** SSO popup blocked → fall back to full-page redirect. Session cookie lost mid-flow → guest work is gone; show "Looks like we lost that — want to start over?" and log it as a hard funnel failure (should be sub-1%). Email already registered → sign in and merge the guest draft into the existing account. Invalid Receiver email → inline validation on format only; no deliverability check.

---

### 3.5 [G5] Sent — *one screen*

**Purpose.** Confirm, hand over the copyable link, and offer the next action.

**Why it exists.** The shareable link is a locked V1 requirement and it needs somewhere to live. This screen doubles as the loop's launch pad.

**UI.** Confirmation line, a read-only link field with a big **Copy link** button (copy state changes to "Copied"), the friend card showing status "Invited", and two CTAs: "Add someone else" and "See gift ideas for Sam".

**Copy direction.**
> **Sent. Sam will hear from you.**
> Or send it yourself: `gft.app/s/8fk2n1` **[Copy link]**

---

### 3.6 [R1] Claim Landing — *the trust moment*

**Purpose.** Convert an invited person from "what is this" to "yes, that's me" in one screen. Reached from the invite email or the pasted link.

**Why it exists.** It is the single highest-risk screen in the product (BRD Section 13, trust framing). It must do its work above the fold with no interstitial.

**UI.** Named-person framing at the top with the Giver's actual first name, a short set of the contributed interests displayed as **an unordered set — never showing rank order** (per BRD Section 11), then the primary CTA. A "Who can see this?" text link opens a modal, not a screen.

**Copy direction — the claim moment (critical):**
> **Dana is trying to get your next gift right.**
> She guessed a few things you're into. Take ten seconds to tell her if she's close — she can't see how you answer, just a better list.
>
> *Dana thinks you're into:* Coffee · Hiking · Board games · Sci-fi
>
> **[ Yes, that's me ]**
> *(link)* That's not me / remove me

Note the deliberate choices: singular named human ("Dana"), not "your friends"; the verb is *guessed*, not *ranked* or *profiled*; the framing is *helping Dana succeed*; and an exit is offered in the same breath as the ask. Plural anonymous attribution is what makes pre-filled data feel like surveillance — so V1 only ever shows one named contributor at claim time, even if more exist.

**Primary.** "Yes, that's me".
**Secondary.** "That's not me / remove me" → one-click tombstone on the unclaimed record, no account required, confirmation screen, Giver notified. This costs one endpoint and removes the entire class of "creepy" objection.

**Edge/error.** Expired token (>30 days): "This link's gone stale — ask Dana for a new one." Already-claimed token: route to sign-in.

---

### 3.7 [R2] Confirm & Add — *one screen*

**Purpose.** Convert the inherited list into Receiver-owned data, then create the account.

**Why it exists.** Confirmation is the BRD's core value promise to the Receiver and the second thing we are measuring.

**UI.** The inherited interests as removable chips (X on each), a `+ Add your own` inline input, then the same account block as [G4]. Removal is instant with no confirm dialog — *the delete button is the trust treatment*.

**Copy direction.**
> **Fix anything she got wrong.**
> Ditch what's off, add what's missing. This is yours now.

**Primary.** "Save my profile" (creates the account, links it to the unclaimed record, carries all pre-contributed data per FR-14).

**Edge/error.** Receiver removes everything: allowed, proceed with an empty list. Receiver's SSO email differs from the invited email: allow the claim — the token is the authority, not the email match.

---

### 3.8 [R3] Become a Giver — *reuses [G1] verbatim*

**Purpose.** Close the loop immediately, at the moment of peak goodwill.

**Why it exists.** Loop continuation rate is a top-line BRD metric. It gets a dedicated moment, not a buried menu item. Crucially this is **the same component as [G1]** — zero incremental design or build.

**Copy direction.**
> **Done. Now — who do *you* need a gift for?**
> `[ First name or nickname ]` → **Continue**
> *(link)* Not right now

"Not right now" lands on the friend hub, where the deferred wishlist entry point lives as a low-key card ("Want to make sure they nail it? Add specifics"). Wishlist is off the critical path on purpose.

---

## 4. The Ordinal Ranking Interaction

**Cheapest acceptable implementation: selection-order capture on [G2], plus chevron reorder on [G3].**

- **Capture.** Every tap on a chip appends to an ordered array. The badge number is just the array index. Cost: a state array and a CSS badge. This means we get a full ordinal ranking *for free from an interaction the user was already performing.*
- **Correction.** [G3] renders that array as a numbered list with up/down chevron buttons. **We are explicitly not building drag-and-drop in V1.** Touch drag on mobile web fights the scroll container, breaks differently in iOS Safari than Chrome, and needs either a library plus integration time or hand-rolled pointer-event code plus a week of device QA. Chevron buttons are two `<button>` elements per row, work with a screen reader for free (satisfying the BRD's WCAG AA call on this exact flow), and produce identical data. Drag is a **fast-follow** if we observe reorder-abandonment above 30%.
- **Data.** `InterestRanking.rank_value` = dense integer 1..n by final list position. Ties are impossible by construction, which keeps the aggregation logic in BRD Section 9 trivial.
- **"Add your own."** Inline text input on [G3] that appends to the *bottom* of the ranked list. Deliberate: the user can promote it with chevrons if it matters, and default-bottom keeps the taxonomy's ordinal integrity when someone dumps in a throwaway.
- **"Not sure" escape hatches — three tiers, all cheap.**
  1. *Per-item, implicit:* interests selected on [G2] but left unranked (positions beyond 10, or after the user taps "Not sure about the order") are stored with `rank_value = null, confidence = 'unsure'`. This satisfies FR-21 with zero additional UI.
  2. *Per-screen:* "Not sure about the order" on [G3] nulls all ranks, keeps the set.
  3. *Whole-step:* "I'm not sure what they're into" on [G2] skips to invite with an empty set. The invite still goes out. We would rather have an invited Receiver with no data than a bounced Giver with no invite.

---

## 5. Account-Creation Timing — Decision & Rationale

**Decision: full guest mode. No account is required until [G4] — the moment the Giver saves the friend and sends the invite. A brand-new visitor can name a friend, pick interests, rank them, add custom entries, and write a private note entirely anonymously.**

The rationale, in the order I actually weigh it:

**1. Funnel data quality — this is decisive.** Our riskiest assumption is "will a Giver rank interests for a friend?" If we gate the account after naming the friend, then every drop-off between name and rank is contaminated: we cannot separate "this person won't sign up for an unproven product" from "this person won't do the ranking task." Those two failures demand opposite responses — one is a marketing/trust problem, one kills the product concept. A V1 whose central measurement is confounded is a V1 that has to be re-run. **An auth wall placed before the experiment invalidates the experiment.**

**2. Engineering cost is near zero, because we are already building this primitive.** FR-12 forces us to build credential-less `User` records for unclaimed Receivers. A guest Giver is the *same row shape* with `is_guest=true`, keyed to an httpOnly session cookie. Account creation is then a single `UPDATE` attaching an identity — not a data migration from some parallel anonymous store. The trap people fall into is building a separate "draft" model and then writing merge code; we sidestep it by writing real rows from keystroke one. Realistic incremental cost: **under a day**, versus multiple days for the merge-on-signup design most teams accidentally build.

**3. Abuse surface is genuinely small, because the gate sits exactly at the only outbound action.** Nothing leaves our system before account creation: no email is sent, no link is generated, no data is visible to anyone. The worst a guest can do is create orphan rows. Mitigations, all trivial: IP rate-limit of 10 friend-creations/hour, 30-day guest TTL with a nightly sweep of guest sessions that never converted, and no email send without a verified account identity. Compare with the alternative — gating right after the name — which buys us protection against a threat (junk rows) that costs pennies in Postgres.

**4. Time to ship favors guest mode once you account for the auth-first design's hidden work.** Gating early means building sign-in, account-exists handling, and a "come back and finish" resume flow *before* we can test anything at all. Guest mode lets us build one auth surface at one point in the flow.

**Rejected alternatives.** *Gate after naming the friend:* maximum funnel contamination at the exact step we need clean; rejected. *Gate after ranking but before invite:* nearly identical to my recommendation — I put it after the ranking screen and merged it with the invite step so it reads as "finish the thing you came to do" rather than "pay a toll." *No gate at all (invite as pure anonymous link):* rejected outright — an invite from nobody has no trust, and the Receiver's claim screen depends on a real named Giver.

**Risk I am consciously accepting:** guests who abandon leave orphan unclaimed Receiver records with real names in them. Fine. They are name-plus-tags, sweep them at 30 days.

---

## 6. Trust & Privacy for the Pre-Filled Profile

Minimum viable treatment: **copy plus one delete button plus one modal. No dedicated screens, no consent gate, no disclosure interstitial.** Adding a screen here would signal that something requiring explanation happened — which manufactures the exact suspicion we are trying to avoid.

The five rules, all enforced in [R1]/[R2]:
1. **One named human, never a plural.** "Dana guessed" reads as thoughtfulness. "Your friends have been adding data about you" reads as a dossier. At claim time we show only the inviting Giver, even when others have contributed.
2. **Never expose rank order to the subject.** Contributed interests render as an unordered set. This honors BRD Section 11 and removes the "my friend ranked me" reaction entirely.
3. **The frame is service, not surveillance.** The Receiver is being asked to help Dana succeed, never to correct a file about themselves.
4. **Control precedes disclosure.** An X on every chip and a "That's not me / remove me" link that works with no account. Demonstrated deletability beats a paragraph of policy.
5. **One modal, four lines.** "Who can see this?" → what Dana entered, that her private note is never shown to you, that only accepted friends see your list, and that nothing is public. One component, no route.

Notes and milestone entries remain owner-only forever and are never rendered on any Receiver surface. This is a hard rule in the data layer, not a UI concern.

---

## 7. Functional Requirements

| # | Requirement | Ship |
|---|---|---|
| FR-A1 | First screen is the "who do you want a gift for" prompt with a name field; no auth, no marketing interstitial. | MUST |
| FR-A2 | Naming a friend creates an unclaimed Receiver record and a draft FriendEdge without an account. | MUST |
| FR-A3 | A guest session persists via httpOnly cookie for 30 days and survives reload/back-nav. | MUST |
| FR-A4 | Account creation is required only to save the friend and send/produce an invite. | MUST |
| FR-A5 | Auth supports Google SSO and email magic link. No passwords. | MUST |
| FR-A6 | On signup, the guest record is upgraded in place; all draft data persists with no user-visible loss. | MUST |
| FR-A7 | Signing in with an existing account from a guest session merges the draft into that account. | MUST |
| FR-B1 | Relationship type is single-select from a fixed 6-item list, captured on the selection screen. | MUST |
| FR-B2 | Interest taxonomy renders 60–80 tags under 8–10 category headers, scrollable, no search. | MUST |
| FR-B3 | Chip selection order is recorded and displayed as a numeric badge. | MUST |
| FR-B4 | Rank screen lists selections in order with up/down controls and per-row remove. | MUST |
| FR-B5 | Ranks persist as dense integers 1..n on InterestRanking, tagged pre-invite. | MUST |
| FR-B6 | Custom free-text interests can be added and are appended at the bottom of the rank list. | MUST |
| FR-B7 | Unranked-but-selected interests store `confidence='unsure'` with null rank. | MUST |
| FR-B8 | Both "not sure" escape hatches (skip ordering, skip interests entirely) proceed to invite. | MUST |
| FR-B9 | One optional private note field writes to FriendNote; never visible to the subject. | MUST |
| FR-C1 | Invite email sends when a Receiver email is provided, from the named Giver, with the Section 3.6 framing. | MUST |
| FR-C2 | A copyable share link with a 30-day token is always generated, email or not. | MUST |
| FR-C3 | Copy-link uses the clipboard API with a visible copied state and a selectable fallback. | MUST |
| FR-C4 | Claim landing shows the inviting Giver's first name and the contributed interests as an unordered set. | MUST |
| FR-C5 | "That's not me / remove me" tombstones the unclaimed record with no account required. | MUST |
| FR-C6 | Claiming links the new account to the unclaimed record and carries over all contributed data. | MUST |
| FR-C7 | Receiver can remove any inherited interest and add their own before saving. | MUST |
| FR-C8 | Post-claim, the Receiver is immediately shown the Giver first-prompt screen. | MUST |
| FR-C9 | Expired, already-claimed, and tombstoned tokens each render distinct handled states. | MUST |
| FR-D1 | Full funnel instrumentation: every screen view, every drop, guest-vs-account, timing per step. | MUST |
| FR-D2 | Email notification to the Giver when their invite is claimed. | MUST |
| FR-E1 | Drag-and-drop reordering. | FAST-FOLLOW |
| FR-E2 | Taxonomy search/filter and expansion to 150–300 tags. | FAST-FOLLOW |
| FR-E3 | Milestone entries and a private-notes management UI. | FAST-FOLLOW |
| FR-E4 | Shared-interest tagging per relationship. | FAST-FOLLOW |
| FR-E5 | Nudge an unresponsive invitee; "friend completed ranking" email. | FAST-FOLLOW |
| FR-E6 | Receiver self-confidence flags; wishlist entry inside the claim flow. | FAST-FOLLOW |
| FR-E7 | Duplicate-friend detection and merge. | FAST-FOLLOW |

---

## 8. Edge Cases

**Handled in V1:** lost session cookie (explicit restart message, logged); email already registered at the gate (sign in and merge); SSO popup blocked (redirect fallback); expired/claimed/tombstoned tokens; empty interest set (invite still valid); Receiver deleting every inherited interest; Receiver SSO email differing from the invited email (token wins); custom interest colliding with a taxonomy tag (silent server-side dedupe).

**Consciously NOT handled, with the cheap fallback:**
- *Duplicate friend added twice.* Allow it. Two records, two invites. Fallback: the second invite claims into whichever record it points at; we dedupe by contact hash in a fast-follow batch job.
- *Invite link forwarded to the wrong person.* Anyone with the link can claim. Accepted — this is how every "anyone with the link" invite on the internet works, and the exposed data is a first name and a handful of hobby tags. Fallback: the Giver is emailed on claim and can report it. Revocation UI is fast-follow.
- *Bounced invite email.* No bounce handling, no retry. Fallback: the Giver has the copyable link and the friend card shows "Invited" indefinitely.
- *Two Givers independently create unclaimed records for the same person.* Both exist; whichever is claimed first wins, the other stays orphaned. Fallback: merge job later. This slightly understates our "2+ contributors per Receiver" metric — we will read that metric as a floor.
- *Offensive or nonsense custom interests.* No moderation. They are private to a friend pair.
- *Someone invites a person who never joins.* No lifecycle at all. The record sits there.
- *Multi-device guest continuation.* Not supported. Guest state is one browser. Fallback: start over.
- *Accessibility beyond keyboard/screen-reader basics on the ranking control.* We hit AA on the ranking list specifically and take our chances elsewhere in V1.

---

## 9. Success Metrics & Kill Criteria

**Primary (the hypothesis).** *Giver contribution completion:* % of sessions that name a friend and reach "invite sent" with 3+ ranked interests. **Target 40%.** Below 20% and the core mechanic is not viable as designed — pivot the contribution step, not the copy.

**Secondary, with thresholds:**
| Metric | Target | Read |
|---|---|---|
| Name → rank screen reached | 70% | Below 50% means the taxonomy screen is the problem |
| Guest → account conversion at [G4] | 60% | Below 35% means the gate is misplaced, not that guest mode failed |
| Invite → claim rate | 25% | Below 10% is a kill signal on the crowdsourcing premise |
| Claim → confirm/edit completion | 70% | Below 40% means the trust framing failed |
| "That's not me" rate | under 3% | Above 8% is the surveillance reaction; rewrite [R1] immediately |
| Loop continuation (Receiver adds a friend) | 15% | Below 5% means there is no loop, only a funnel |
| Median time to invite sent | under 3 min | Over 6 min means we have too many steps |

**What tells us to kill.** Contribution completion under 20% *combined with* claim-to-confirm under 40% means neither side of the exchange is motivated, and no amount of copy fixes that. **What tells us to pivot rather than kill:** high contribution but low claim (the Giver side works, the invite does not — go fix distribution and framing) or the inverse (Receivers love it, Givers won't do the work — flip the entry point back and eat the self-promotion problem).

---

## 10. Build Scope, Cuts, and Accepted Risks

**Relative sizing (this flow only):** auth and guest session L; the two contribution screens L; claim/confirm M; invite email plus link M; taxonomy content M (non-engineering); friend hub S; instrumentation S. Roughly **two-thirds of the effort sits in the two contribution screens plus auth** — which is correct, because that is where the hypothesis lives.

**What this cuts versus the BRD, and why each cut is safe:**
- **Taxonomy 150–300 tags → 60–80.** The single biggest schedule risk in the BRD is content work with no named owner (Section 13). 60–80 tags fits on one scrollable screen without search, which also deletes the search feature. Coverage gaps are absorbed by "add your own" — and the custom entries become our free, real-user-generated taxonomy expansion list.
- **Milestones and notes UI dropped.** Zero effect on either hypothesis. Combined savings: roughly a screen and a half plus two data surfaces.
- **Shared interests and self-confidence flags dropped.** These are recommendation-quality refinements. We have no evidence anyone will supply the base signal yet; refining it is premature.
- **Wishlist off the claim path.** The BRD already positions it as secondary; making it *invisible* during claim protects the "help your friend" framing, which is the thing under test.
- **Drag-and-drop dropped.** Days of mobile-web QA for identical data.
- **Passwords dropped.** No reset flow, no credential storage, meaningfully less security surface.

**Risks I am accepting, explicitly:**
1. **Guest orphan data.** Names of real people in rows nobody claimed. Mitigated by a 30-day sweep; acceptable given no contact info is required to reach [G3].
2. **Forwarded invite links.** Low-severity data exposure, high-severity if it happens to a public figure. Accepted for V1; revocation is the first fast-follow if it occurs even once.
3. **Selection order as a rank proxy.** Some users tap semi-randomly and only fix the top two. This adds noise to positions 4+. Acceptable — the recommendation engine's top-k tier only really needs positions 1–3 to be honest.
4. **A thin taxonomy will annoy power users.** Accepted. Annoyed engaged users generate custom tags, which is data.
5. **No moderation anywhere.** Accepted at this scale; the blast radius of a free-text field visible to one friend is one friend.
6. **We are testing copy, not running a copy test.** No A/B on the trust framing in V1 — insufficient volume for significance. We ship the strongest hypothesis and read the "that's not me" rate as our qualitative canary.
