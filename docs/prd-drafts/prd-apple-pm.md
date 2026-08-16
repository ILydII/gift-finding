# PRD — Onboarding & Friend-Adding

**Product:** Gift Recommendation Web App, V1 "Core Loop"
**Scope:** Giver first-run → add friend → pre-invite contribution → invite → Receiver claim → Receiver becomes Giver
**Status:** Proposed (v1.0)
**Owner:** Product

---

## 1. Summary & Product Philosophy

The first ninety seconds of this product are the product. Everything downstream — the recommendation quality, the network depth, the loop — is paid for by whether a stranger who arrived thinking "I have no idea what to get Emma" walks out having done something that felt like *thinking about Emma*, not like *filling out a form about Emma*.

Three convictions shape every call in this document.

**One: the first screen asks for one thing, and it is a name.** Not an account. Not a category. A first name. The single most important property of this flow is that the user's opening act is emotionally identical to the intent they arrived with. Any field that isn't "who is this for" is us interrupting them to talk about ourselves.

**Two: we charge the user for value already delivered, never in advance.** The account ask, the invite, the wishlist — each is placed at the exact moment it becomes *obviously necessary to the user's own goal*, so it reads as a fact of the situation rather than a toll. A user should never be able to form the sentence "why do you need that?"

**Three: this flow's real deliverable isn't data — it's a defensible feeling on the other end.** The Giver's contribution becomes a message a real person reads about themselves. We design the Giver flow backwards from the Receiver's first three seconds. If the pre-filled profile lands as "my friend was paying attention," the loop runs. If it lands as "people have a file on me," no amount of recommendation quality saves the product. Section 6 treats that as an engineering requirement, not a copy pass.

Competing approaches will optimize the Giver funnel and treat the Receiver screen as a confirmation dialog. That's backwards, and it's why we win: **the Receiver's claim screen is the highest-stakes screen in V1**, and we spend our craft budget there.

---

## 2. Goals & Non-Goals

**Goals**
1. A first-time Giver reaches a sent invite with ≥3 ranked interests in under 3 minutes on mobile web, having created an account without ever hitting a screen titled "Sign up."
2. Ordinal ranking feels like *deciding*, not *labor* — the user makes ~3 meaningful decisions, not 8.
3. The invited Receiver can see everything recorded about them, and delete it, **before** creating an account.
4. The Receiver's session ends with them adding a friend of their own. Loop closure is a designed screen, not a hope.
5. Every abandonment point is recoverable without data loss.

**Non-goals (V1)**
- Contact-list import, address-book scraping, or social-graph lookup. (Section 10.)
- SMS delivery, push, occasion reminders, scheduled nudges.
- Multi-friend batch add in the first run. One friend, done well.
- Giver gifting-style quiz — deferred to first recommendation view per BRD Flow 5. Explicitly *not* part of onboarding.
- Password-based accounts as the primary path (see §5).
- Profile photos, usernames, bios, any self-presentation surface.

---

## 3. Flows, Screen by Screen

### 3A. Giver first run

---

**G0 — The Prompt**

*Purpose:* Convert intent to a name in one action. This screen must load fast and be visually near-empty.

*Elements:* Wordmark (small). One headline. One text field, autofocused on desktop, not autofocused on mobile (avoids keyboard-slams-in on load). Primary button, disabled until 1 character.

*Copy:*
> **Who are you trying to find a gift for?**
> First name is fine.
> `[ Emma ]`
> **[ Let's figure it out ]**
> *Below, small:* Already have an account? Sign in

*Edge:* Emoji/very long input accepted and truncated at display. Blank submit does nothing (button disabled — no error state needed). No email field here. Contact details are collected at G5 where they're self-evidently for something.

---

**G1 — Relationship**

*Purpose:* One tap that materially changes recommendations, and warms the user up with an easy question. Earns its place because a coworker and a sibling get different gifts.

*Elements:* Chip grid: Partner · Parent · Sibling · Child · Close friend · Friend · Coworker · Someone else. Single select. Auto-advances on tap (no Next button — tap *is* the answer).

*Copy:* **How do you know Emma?**

---

**G2 — Pick (selection phase)**

*Purpose:* Externalize what the Giver already knows. Full spec in §4.

*Copy:*
> **What's Emma into?**
> Pick what you already know. You don't have to be right about all of it — her other friends will fill in the rest.

That second line is doing heavy lifting: it removes the fear of being *wrong about a friend*, which is the true drop-off risk on this screen, and it plants the crowdsourcing model without explaining it.

*Secondary action:* "I'm honestly not sure — let Emma tell me" (see §4, escape hatch).

---

**G3 — Order (ranking phase)**

*Purpose:* Turn a flat set into a weighted signal. Full spec in §4.

*Copy:*
> **Which of these is most Emma?**
> Drag the ones that define her to the top. Your top 3 do most of the work.

---

**G4 — Just for you (optional)**

*Purpose:* Capture private note, shared activity, and milestone in one skippable screen. Consolidated because three separate optional screens is three chances to quit.

*Elements:* Three collapsed rows, each expanding to a small input: "A note to yourself about Emma" · "Something you two do together" · "An occasion you're thinking about." Persistent lock-icon line: **Only you can see anything on this screen. Emma never sees it — not now, not ever.**

*Actions:* Primary **[ Next ]** · Secondary **[ Skip ]** (equal visual weight to Next; skipping is a legitimate answer).

---

**G5 — The Send screen (and, quietly, the account)**

*Purpose:* The most carefully engineered screen in the Giver flow. It does three jobs at once: shows the Giver exactly what Emma will receive, collects the Giver's identity as *the return address on that message*, and sends.

*Elements, in this vertical order:*
1. A real, rendered preview of the invite card — not a description of it.
2. "Send as" block: **Continue with Google** (primary) / "Use my email instead" → name + email fields.
3. Recipient: Emma's email (optional, with helper "Skip this and just copy a link instead").
4. Primary: **[ Send it to Emma ]**. Secondary: **[ Copy link ]**.

*Copy (the account ask):*
> **Emma should know who this is from.**
> Sign in so the invite comes from you, and so her answers come back to you.

Note what this copy does *not* say: "create an account to save your progress." That's our reason, not theirs. "So the invite comes from you" is true, checkable, and unarguable — an anonymous invite from nobody is worse for the user than signing in.

*Copy (the invite message itself — Giver may edit one line):*
> **Alex is trying to find you something good.**
> They added a few things they think you're into, and want to check if they got it right. Takes about a minute — and no, you don't have to write a wishlist.
> **[ See what Alex said ]**

*Edge states:* Invalid email → inline, non-blocking, offers Copy link instead. SSO popup blocked → inline fallback to email form. Send failure → invite is saved, link is live, error says "Couldn't email her, but your link works — copy it below." We never lose the work over a delivery failure.

---

**G6 — Sent**

*Purpose:* Pay off immediately. Never end a flow on a waiting state.

*Copy:*
> **Sent. Emma's up.**
> While you wait, here's what we'd get her based on what you told us.
> **[ See gift ideas for Emma ]** · Add someone else

This is the handoff to Flow 5/6. The Giver's outcome does not depend on Emma responding — critical, because most won't respond today.

---

### 3B. Receiver claim

---

**R1 — What we know (pre-account, read-only)**

*Purpose:* The trust moment. The single rule governing this screen: **you do not need an account to see what's been said about you.** Anything else converts a nice gesture into a hostage situation.

*Elements:* Giver's name and relationship at top. The interest list — as tags, in a neutral order, **with rank positions stripped** (see §6). Attribution on the set: "Alex added these." Three actions.

*Copy:*
> **Alex says you're into these.**
> Alex is putting together a gift and wanted to check with you first. Here's what they guessed:
> `baking` `hiking` `sci-fi` `vinyl` `a good knife`
> **Alex got it right — mostly** *(primary)*
> Let me fix a few things *(secondary)*
> I'd rather not be in this *(tertiary, quiet, always visible)*

*Why "mostly":* an unqualified "Yes, that's me" is a lie most people won't tell, and asking someone to endorse a friend's guess wholesale creates hesitation. "Mostly" is honest, low-stakes, and leads into edit anyway.

*Edge:* Zero-interest invite (escape hatch used) → headline becomes **"Alex is stuck."** / "They want to get you something good and admitted they need help. What are you actually into?" This converts a weak invite into a *more* compelling one — being needed beats being profiled.

---

**R2 — Confirm & edit**

*Purpose:* Give ownership immediately, with the lowest-friction removal in the product.

*Elements:* Each tag has an inline ✕ (one tap, no confirm dialog, no "are you sure — Alex added that"). Add field with taxonomy autocomplete. Optional "big passion" star per tag (FR-7), unlabeled until tapped, explained by a one-line hint.

*Copy:* **Fix anything that's off.** / Remove what's wrong, add what they missed. Alex won't be told what you changed.

That last clause is essential. Without it, honest editing has a social cost and people leave errors in place to be polite — which poisons the data.

---

**R3 — Account (the point, not a gate)**

*Copy:* **Save this so your friends see it.** / Continue with Google · Use email

By R3 the user has already received value (saw the tags), exercised control (edited them), and now the account is plainly the mechanism for the thing they just did to matter.

---

**R4 — Specifics (optional)**

*Copy:* **Want to make it easy for them?** / Add anything specific you've had your eye on. Totally optional — Alex has enough to go on. **[ Add something ]** · **[ Skip ]**

---

**R5 — Loop close**

*Purpose:* The BRD's most important metric lives here. Do not bury it in a dashboard.

*Copy:*
> **Now — who do *you* need to find something for?**
> You just made it easy for Alex. Return the favor for someone.
> `[ name field ]` · Maybe later

Identical to G0 by design: the second-time user is a first-time Giver, and familiarity is the point.

---

## 4. The Ordinal Ranking Interaction

**Model: pick, then order. Two screens, never one.** Combining selection and ordering into a single interaction is the classic failure here — the user is simultaneously recalling *and* comparing, which is why drag-to-rank pickers test badly.

**Selection (G2).** A grid of ~24 tag tiles drawn from the curated taxonomy (FR-5), pre-sorted by relationship type — coworker surfaces different defaults than partner. A search field reaches the full 150–300 tags. Tap toggles. Minimum 3 to proceed, soft maximum 8: at 8, further tiles dim with the hint **"That's plenty — the top ones matter most."** We cap because ranking cost is quadratic in perceived effort and marginal signal past 8 is near zero.

**The seeding trick.** Selection order carries into G3 as the initial ranking. People select the most obvious thing first — that's real signal. So G3 opens with a list that is already *roughly right*, and the user's job becomes **editing an answer rather than producing one**. Copy names this: "We put these in the order you picked them. Move anything that's off."

**Ordering (G3).** A vertical list of the selected chips. Positions 1–3 sit above a labeled hairline (**"Counts most"**); positions 4–8 sit below (**"Also true"**). Only crossing the hairline is a consequential move. This is the core opinionated call: **we ask for a full ordering but only *demand* a top 3.** Eight-item strict ordering is 8 decisions; a top-3 with a remainder bucket is ~3. The data model still stores a full ordinal `rank_value` per item (per FR/data model), so nothing is lost downstream — we simply don't charge the user for precision the engine barely uses.

**Mobile web mechanics.** Drag-and-drop on touch is the failure mode we're designing around, so it is never the only path:
- Long-press-free immediate drag via a dedicated handle (44×44pt), with the row lifting and neighbors parting. Auto-scroll when dragged within 60px of an edge.
- **Every row also has ▲/▼ buttons.** These are not an accessibility afterthought — they are faster than dragging for a one-position move and work with a thumb on a bus.
- Keyboard: Tab to row, Space to lift, arrows to move, Space to drop, Esc to cancel. Live-region announces "baking, now position 2 of 6." WCAG AA, per BRD §11.
- No horizontal gestures anywhere in the list (conflicts with browser back-swipe).

**Add your own (FR-6).** A persistent chip at the list end: **`+ Something specific`**. Opens a single field with a rotating placeholder — *"late-night baking" · "anything Formula 1" · "that one bakery on 5th"*. Custom entries join the ranking as normal rows and are flagged `free_text`. Placeholders are deliberately specific and slightly personal — they teach the user that the good answer here is idiosyncratic, not categorical.

**"Not sure" escape hatch.** Two forms:
- *Pre-invite (G2):* a persistent secondary — **"I'm honestly not sure — let Emma tell me."** Jumps straight to G5 with zero interests, and the invite reframes to "Alex is stuck" (§3B). We treat admitted ignorance as a first-class outcome because forcing guesses produces garbage signal *and* an embarrassing Receiver screen.
- *Post-join contribution (FR-21):* when ranking a list someone else owns, each row carries a **"don't know"** toggle that removes it from the ordering rather than sinking it — because "ranked last" and "no idea" are different data.

---

## 5. Account-Creation Timing — Decision

**Decision: full guest mode through naming, relationship, selection, ranking, and private notes. Account is required only at G5, and it is presented as the return address on the invite, not as a gate. The Receiver's account lands at R3, after they've seen and edited their own data.**

**Why not the BRD's Flow 1 step 3 (account right after naming the friend):** at that point the user has typed one word. "Save your progress" is not credible — there is no progress. Worse, we'd be asking a stranger for identity *before* they've received anything, so the ask is pure cost. The literature and my own scar tissue agree: the account wall's conversion damage is proportional to how little value precedes it. Naming a friend is nearly zero value delivered.

**Why not fully deferred past the invite:** the invite is an outbound artifact addressed to a real human, and it must carry a real sender. Anonymous invites are worse for the recipient, worse for deliverability, and an open spam relay. This is the rare case where the honest product need and the abuse constraint point the same direction — which is exactly what makes the ask persuasive rather than annoying.

**Why G5 is the right seam:** it's the first moment the user's goal *itself* requires identity. Emma needs to know who's asking; her answers need somewhere to come back to. The user can verify both claims by looking at the preview card sitting directly above the sign-in block. We are not gating; we are addressing an envelope.

**Craft constraint:** the account is a *block on the send screen*, never its own screen. A dedicated "Create your account" interstitial re-frames the moment as a wall no matter how gentle the copy. Google SSO is the primary path (one tap, no password, verified email for free). Email+password is available but secondary.

**Engineering & abuse tradeoffs, honestly:**
- *Cost:* a guest draft store separate from the real graph, plus a promotion step at sign-in. Realistically ~1 sprint of extra work versus an early gate, and it makes the write path bimodal for the flow's life. I'm buying it. The add-friend flow is, per the BRD, the highest-traffic interaction in the product; a few points of completion rate here compounds through every downstream metric.
- *Draft mechanics:* guest state in `localStorage` **plus** a server-side draft keyed by an opaque token (survives tab close, not device loss). 30-day TTL, hard-deleted after.
- *No `User` record is written for the target until an authenticated Giver sends.* Guests cannot create unclaimed people in the graph. This kills profile-pollution and scraping-for-graph attacks.
- *No email is ever sent by an unauthenticated actor.* Email delivery additionally requires a verified sender address (SSO satisfies this inherently; email+password requires clicking a verification link before the first send — the copy-link path stays open meanwhile so the user is never stranded).
- *Rate limits:* 5 drafts/IP/hour; 10 invites/account/day for accounts under 7 days old; recipient-side cap of 1 invite email per address per 72h regardless of sender.
- *Residual risk:* the copy-link path lets a verified account generate unlimited link invites. Accepted for V1; mitigated by per-account link caps and the fact that links require manual distribution.

---

## 6. Trust & Privacy for the Pre-Filled Profile

The BRD flags this as a top risk. The difference between "thoughtful" and "surveilled" is not tone — it's the balance of power on the R1 screen. Five structural commitments:

**6.1 — No login wall between a person and data about them.** R1 renders the full contribution read-only from the invite link alone. If we require an account to see what's been said about you, we've made ourselves the party with leverage. Non-negotiable.

**6.2 — Attribution is always present, and always a person.** Never "your friends think" when it's one person, never "our data suggests." "Alex added these." A named human accounting for every byte is the whole difference between a gesture and a dossier.

**6.3 — The subject sees the tags, never the ranks.** Per BRD §11, `rank_value` and per-contributor ordering are never exposed to the subject, ever, in any surface. "Alex thinks you're into baking" is warm. "Alex ranked you: baking #1, sci-fi #4" is a report card someone wrote about you. Enforced at the API layer — the receiver-facing profile endpoint must not serialize rank fields, verified by test.

**6.4 — Exit is one tap, costs nothing, and requires no account.** "I'd rather not be in this" on R1 → a single confirm → the unclaimed record and all contributions to it are hard-deleted, and the email is suppressed from future invites. Alex is told only "Emma isn't using this" — never that she declined, and never with an option to retry. No dark-pattern friction, no guilt copy, no "Alex will be disappointed." A cheap, dignified exit is what makes staying meaningful.

**6.5 — Private stays provably private.** Notes and milestones (FR-17/18) are labeled "only you" *at the moment of writing*, not in a policy page, and are excluded from every Receiver-facing serializer. Additionally: unclaimed profiles are `noindex`, never enumerable, and reachable only by unguessable token.

**6.6 — Disclosure at the right altitude.** One line on R1, expandable: *"How this works — Alex added these guesses when they were figuring out a gift. You control the list from here. Alex won't see your edits."* Three sentences, in-place, no modal, no legal voice.

---

## 7. Functional Requirements

| ID | Requirement |
|---|---|
| ON-1 | First screen collects a target's first name only; no auth, no email, no other field. |
| ON-2 | Guest users can complete naming, relationship, selection, ranking, and private notes with no account. |
| ON-3 | Guest progress persists in localStorage and a server-side draft (opaque token, 30-day TTL, hard delete after). |
| ON-4 | Authentication is required to send an email invite or generate a shareable link; presented inline on the send screen, never as a standalone interstitial. |
| ON-5 | Google SSO is the primary auth path; email+password is available and secondary. |
| ON-6 | Email invite delivery requires a verified sender address; copy-link remains available to unverified accounts. |
| ON-7 | On authentication, the draft is promoted atomically: unclaimed `User`, `FriendEdge`, `Interest`, `InterestRanking`, `RelationshipContext`, `FriendNote`, `MilestoneEntry`. Partial promotion must not be observable. |
| ON-8 | Selection requires ≥3 interests to proceed; soft cap of 8 with a non-blocking hint. |
| ON-9 | Selection order seeds the initial ordinal ranking. |
| ON-10 | Ranking supports drag, per-row ▲/▼ controls, and full keyboard operation with live-region announcements (WCAG AA). |
| ON-11 | Positions 1–3 are visually distinguished as "Counts most"; a full ordinal `rank_value` is persisted for all items. |
| ON-12 | Custom free-text interests can be added at selection and ranking, flagged `free_text`. |
| ON-13 | A "not sure" path allows sending an invite with zero interests; invite and Receiver copy adapt accordingly. |
| ON-14 | The send screen renders a live preview of the exact invite the Receiver will see. |
| ON-15 | Every invite produces both an email (when an address is provided) and a copyable link with identical claim behavior. |
| ON-16 | Invite links are unguessable, single-claim, and non-expiring in V1. |
| ON-17 | The claim screen renders the full contributed interest set read-only, with attribution, without authentication. |
| ON-18 | Rank values and per-contributor orderings are never returned by any Receiver-facing endpoint (test-enforced). |
| ON-19 | The Receiver can decline and hard-delete the record from the claim screen without creating an account. |
| ON-20 | Declining suppresses the address from future invites and reports only "not using this" to the Giver. |
| ON-21 | Receiver account creation occurs after viewing and editing; edits are never attributed back to the Giver. |
| ON-22 | Wishlist entry is presented as optional and skippable with equal visual weight. |
| ON-23 | Receiver onboarding terminates on an add-a-friend prompt identical to ON-1. |
| ON-24 | Private notes and milestones are labeled "only you" at write time and excluded from all Receiver-facing serializers. |
| ON-25 | Rate limits: 5 drafts/IP/hour; 10 invites/day for accounts <7 days old; 1 invite email per recipient address per 72h. |
| ON-26 | Nudge (FR-16) is manual, available 5 days after send, capped at 2 lifetime per invite. |

---

## 8. Edge Cases & Error States

| Case | Behavior |
|---|---|
| **Duplicate friend** (same name/email already in Giver's list) | Not an error. "You already added Emma — want to add to what you said?" → routes into the existing profile's contribution flow. |
| **Invite to an existing account** | No unclaimed record. Becomes a friend request with contributions attached. Recipient copy shifts: "Alex added a few things they think you're into." Same claim screen, no account step. |
| **Two Givers add the same person independently** | Dedupe on email → one unclaimed record, both contribution sets attached. Second invite email suppressed if within 72h; claim screen credits both: "Alex and Jordan both added things." |
| **Already-claimed link revisited** | "This one's already been claimed." + sign-in. No error styling. |
| **Forwarded link claimed by the wrong person** | Where an email was supplied, claim requires a match or a magic-link confirm to that address. For copy-link invites (no address known) we accept the identity assertion, log it, and the "this isn't me" path is prominent. |
| **Giver abandons mid-flow** | Draft resumes silently on return (30 days). No recovery email — we have no address for a guest, and that's the honest cost of guest mode. |
| **Giver abandons after account, before send** | Draft is a real saved friend. One resume email at 48h, once, ever. |
| **Receiver ignores the invite** | Nothing breaks. Giver still gets recommendations from their own contribution (BRD FR-30). Friend shows "Invited" — never "Failed" or a red state. |
| **Receiver declines** | §6.4. Giver sees "Emma isn't using this." No retry affordance. |
| **Email bounces** | Giver is told plainly and offered the link: "That address bounced. Here's a link you can send her." |
| **Giver adds themselves** | Detected on email match at send. "That's you — want to set up your own profile instead?" Contributions convert to self-authored interests. |
| **Zero interests sent** | Supported path (ON-13), not an error. |
| **Custom interest is abusive/PII** | Free-text is profanity-screened and length-capped; flagged entries are withheld from the Receiver's claim screen pending review rather than shown. |
| **Slow/offline network mid-rank** | Ranking is local-first; the order commits on advance with a retry queue. Never block a drag on a request. |
| **Browser back mid-flow** | Every screen is a real history entry with preserved state. Back never destroys work. |

---

## 9. Success Metrics

**Primary**
1. **Giver first-session completion** — % of G0 starts reaching a sent invite with ≥3 ranked interests. *Target: ≥45%.*
2. **Receiver claim rate** — % of invites viewed → account created. *Target: ≥35% at 14 days.*
3. **Loop closure** — % of claimed Receivers who add a friend in the same session. *Target: ≥20%.* The BRD's single most important number.

**Diagnostic**
4. Per-screen drop-off, G0→G6 and R1→R5. Expected weak points: G2→G3 and R1→R3.
5. **Ranking engagement** — % of G3 sessions with ≥1 reorder. If low, the selection-order seed is doing all the work and G3 may be theater.
6. **Custom interest rate** — % of contributions with ≥1 free-text entry. Our best proxy for genuine thinking-about-the-person.
7. **Account-ask conversion at G5** — % of G5 views reaching authentication. The number that validates §5. If it's below ~70%, my timing decision is wrong, not the copy.
8. **Decline rate at R1** — the trust canary. Above ~8% means the pre-fill reads as surveillance; the response is disclosure and framing, not friction.
9. Time-to-invite, p50 and p90 (target p50 < 3 min mobile web).
10. Nudge-to-claim lift.

---

## 10. Cuts, Deferrals & Risks

**Cut deliberately**
- **Contact-list import.** Would raise friend-add volume and destroy the product's premise. This app's asset is *considered* contributions; a bulk importer produces thin profiles for 200 people and turns the invite into spam. It also detonates §6 — permissioning a friend's address book against unclaimed profiles is exactly the surveillance read we're defending against.
- **Multi-friend add in first run.** The first session must be one person, thought about properly. Batch-add is a V1.1 candidate once the single-friend flow is proven.
- **Star ratings alongside ranking.** Two competing signals, double the effort, marginal engine gain. Ordinal only (locked decision, and I agree with it).
- **Gamified progress bars / completeness scores.** Turns knowing a friend into a score. Wrong emotional register.
- **A "why we're asking" onboarding carousel.** If the flow needs explaining, the flow is wrong.

**Deferred**
- SMS invites (locked out of V1), invite reminders on a schedule, Receiver-side "who else contributed" view, per-item "not sure" on the pre-invite path, taxonomy personalization beyond relationship-type defaults.

**Risks**
1. **Guest mode raises promotion complexity.** Atomic draft→graph promotion (ON-7) is the highest-risk engineering item in this PRD, and a partial promotion is a data-integrity bug the user sees. Mitigation: single-transaction promotion, idempotent by draft token, integration-tested against interrupted auth.
2. **Deferring the account to G5 concentrates all auth risk on one screen.** If G5 converts poorly we lose *everything* the user did, not just the tail. Mitigation: metric #7 is instrumented from day one, and the fallback (a soft account prompt after G3) is a copy-and-placement change, not a rebuild.
3. **The top-3 emphasis may under-collect ordering below rank 3.** Accepted — the engine's top-k tier (BRD §9) is where the weight lives anyway.
4. **The "not sure" escape hatch could become the default path** if G2 feels like a test. Watch its usage rate; above ~25% means the selection screen is intimidating, not that users are honest.
5. **Guest drafts are device-bound.** A user who starts on mobile and finishes on desktop loses work. Accepted for V1; it is the price of not asking for an email up front, and it's the right trade.
