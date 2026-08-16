# Business Requirements Document (BRD)
## Gift Recommendation Web App — V1 "Core Loop"

| | |
|---|---|
| **Doc status** | Draft v0.2 — reframed around Giver-first entry |
| **Doc owner** | Product |
| **Audience** | Eng, Design, Data Science — internal build reference |
| **Scope of this version** | V1 only: Add friends → Rank interests → Get recommendations. No occasions/reminders, no group gifting, no monetization. |

**What changed in v0.2:** the entry point of the product is now the **Giver**, not the Receiver. Earlier drafts started the loop with a person building their own interest/wishlist profile — which, on reflection, front-loads a self-promoting action ("here's what I want") as the very first thing a new user does. V0.2 flips this: the product's first-touch action is always "I want to find a gift for someone," and a person only builds/edits their own profile as a byproduct of being invited by a friend who's already trying to do something nice for them. See Section 6 for the reworked flows.

---

## 1. Executive Summary

This app helps people give better gifts by combining three signals that normally live in someone's head, scattered across group chats and guesswork: **what the receiver actually wants**, **what the people who know them best believe about their interests**, and **how the giver personally likes to give gifts**. The product is entered through the **Giver's** intent — "I want to find something for [friend]" — not through a Receiver building a profile of their own wants. A Giver adds a friend as a gifting target, contributes what they already know about that friend's interests, and only then does an invite go out framed around the friend receiving thoughtful gifts, not around the friend advertising a wishlist. When the friend joins, they inherit a head start of interest data their friends already contributed, and can confirm, edit, or add to it. Every Receiver naturally becomes a Giver for their own friends, which is what sustains the loop.

V1 scopes to the **core loop**: Giver-initiated onboarding, friend-adding with pre-invite interest contribution, Receiver onboarding/confirmation, and recommendation generation. Occasion/reminder systems, group gifting, and monetization remain deferred (Section 12).

---

## 2. Problem Statement

- Gift-givers often don't know what to buy, even for close friends and family, because interest signals are fragmented (mentioned once in a text, inferred from social media, guessed from stereotypes).
- Existing gift-recommendation tools rely almost entirely on the **receiver's own stated wishlist**, which is often incomplete, stale, or nonexistent — and ignore the fact that *friends and family often know things about a person's interests that the person hasn't explicitly listed.*
- Recommendations rarely account for **who is doing the giving** — a sibling and a coworker should get different suggestions for the same receiver, same occasion.
- **A subtler adoption problem:** if the product's first ask of a new user is "list what you want people to give you," it reads as self-promoting and can feel awkward to start or to share with friends ("hey, come build a wishlist about yourself"). Leading with the Giver's motivation — wanting to do something nice for someone else — is a more natural, socially comfortable front door, and is the framing this version of the BRD is built around.

## 3. Goals & Objectives

**Product goal:** Build a network-effect-driven interest graph where the quality of gift recommendations improves as more of a person's friends contribute knowledge about them — entered through an other-oriented action, not a self-oriented one.

**V1 objectives:**
1. Validate that people will start the product via "find a gift for someone" rather than needing to be talked into building their own profile first.
2. Validate that friends will actually engage with contributing/ranking another person's interests (still the riskiest assumption in the product, whichever direction the flow starts from).
3. Validate that combining wishlist + crowdsourced interests + giver style produces recommendations people rate as more useful than a generic "gift ideas for X" search.
4. Establish the core data model and recommendation logic that later phases (occasions, group gifting, monetization) will build on top of.

**Non-goals for V1:** growth/virality mechanics beyond the natural Giver→Receiver→Giver loop, purchase flow, revenue, notifications/reminders tied to calendar dates.

---

## 4. Scope

### In scope (V1)
- Giver-initiated onboarding ("find a gift for someone" as the first action)
- Adding a friend as a gifting target, including pre-invite contribution of what the Giver already knows about them
- Invite flow to the Receiver, framed around receiving thoughtful gifts
- Receiver onboarding: confirm/edit inherited interest data, personal info, optional wishlist
- Giver gifting-style profile (short quiz, one-time, introduced lazily — see Flow 3)
- On-demand gift recommendation generation (Giver selects a Receiver + occasion, gets ranked suggestions)
- Basic relationship metadata between Giver and Receiver (relationship type, shared interests)
- Private notes and milestone/gift-idea logging against a friend (non-automated, no reminders)

### Out of scope (V1) — see Section 12 for phasing
- Occasion/date tracking and reminder notifications
- Group gifting / pooled contributions
- In-app purchase, checkout, or affiliate links
- Monetization of any kind
- Mobile native apps (web only)

---

## 5. User Personas

Every user is potentially both a **Receiver** (has a profile that gets contributed to and ranked) and a **Giver** (contributes to others' profiles, ranks interests, requests recommendations). There is no fixed role — it's contextual per relationship. The key design point: **every user's first action in the product is as a Giver**, even if they later spend most of their time as someone else's Receiver.

| Persona | Description | Core need | Entry point |
|---|---|---|---|
| **Giver (first-time user)** | Arrives wanting to find a gift for a specific person | Wants a confident, specific, non-generic gift idea fast, without an awkward "build your own wishlist" ask first | **Primary entry point** — this is how new users almost always arrive |
| **Receiver (invited user)** | Was added by a Giver as a gifting target; joins via invite | Wants friends to eventually give them things they actually want, without having to spell everything out themselves | Secondary entry — arrives via invite, already has a head start of data contributed by friends |
| **Friend-contributor** | A Giver in the act of ranking/contributing to a Receiver's interest profile | Wants contributing to be quick (low effort), not feel like a chore or a test | Same session as Giver's first action |

---

## 6. Core User Flows

### Flow 1 — Giver's first action (entry point)
1. New user arrives and the first prompt is **"Who do you want to find a gift for?"** — not a personal profile builder.
2. User adds that person as a gifting target: name + contact (email/phone) — this creates an **unclaimed Receiver record** in the system (a placeholder profile that doesn't require the target to have signed up yet).
3. User creates their own account (email/SSO) at this point, as a natural continuation of "save your progress on this gift search" — framed as necessary to keep working on the thing they came to do, not as a standalone ask.

### Flow 2 — Pre-invite contribution (still the Giver, same session)
1. Giver is shown a curated interest taxonomy and asked to pick/tag what they believe fits the Receiver, based on what they already know.
2. Giver can add a **private note** about the Receiver (visible only to the Giver).
3. Giver can log a **milestone entry**: occasion label + optional gift-idea note (e.g. "Birthday — Nov, thinking something cooking-related"). Purely a personal reference log — no automated reminders or notifications triggered by this in V1.
4. Giver indicates **relationship type** to the Receiver and optionally 1–2 shared interests/activities they do together.
5. This step doubles as the seed data for the Receiver's profile — solves cold start, since the Receiver's profile is never fully empty by the time they're invited.

### Flow 3 — Invite sent to the Receiver
1. An invite goes out framed around the Receiver, not the Giver: e.g. *"[Giver] is working on finding you something you'll actually like — want to help them get it right?"*
2. This framing matters: the Receiver is being asked to **help their friend succeed at gift-giving**, not to advertise their own wants. The wishlist/personal-info step (Flow 4, step 3 below) is positioned as optional and secondary to that framing.

### Flow 4 — Receiver onboarding (triggered by invite)
1. Receiver accepts invite, creates account.
2. Receiver sees what's already been contributed about them (interest tags picked by the Giver, framed as *"here's what your friends think you're into"*) and can confirm, edit, remove, or add to it.
3. Receiver optionally completes personal info and adds specific **wishlist items** — presented as an optional add-on ("want to make sure they nail it? add specifics") rather than the headline ask.
4. Receiver can invite their own friends, at which point they become a first-time Giver themselves (loop continues — this is the mechanism that sustains growth without needing a separate "build your own profile" motivation).

### Flow 5 — Giver gifting-style profile
Introduced lazily — first surfaced right before a Giver views their first set of recommendation results, not as an onboarding gate. Short quiz (~5 questions):
- Budget comfort range (default gift spend)
- Gifting philosophy (practical/useful vs. experiential vs. sentimental/personal vs. surprise-me/novel)
- Planning style (plans ahead vs. last-minute) — informational only in V1
- Risk tolerance (safe choice vs. bold/unusual choice)

### Flow 6 — Requesting a recommendation
1. Giver selects a Receiver from their friend list (or continues directly from Flow 2 for the person they just added).
2. Giver selects an occasion from a simple dropdown (birthday, holiday, just because, congratulations, other — free text), pulling from any milestone note logged earlier if one exists.
3. Giver optionally sets a budget for this specific gift (overrides their default gifting-style budget).
4. App generates a ranked list of gift suggestions (target: 5–8 suggestions), mixing item-level and category-level suggestions, each with a short rationale.
5. Giver can mark suggestions "like" / "not for them" — a relevance-feedback signal, not a monetization mechanic.

---

## 7. High-Level Flow Diagram

```
Giver (first-time user)                    Receiver (invited friend)
   |
   |-- "Who do you want a gift for?"
   |-- Add Receiver (unclaimed record created)
   |-- Create own account (to save progress)
   |-- Contribute known interests, note, milestone
   |-- Set relationship type / shared interests
   |
   |-- Invite sent -------------------------->|
   |                                           |-- Onboard
   |                                           |-- Sees friend-contributed interests
   |                                           |-- Confirms / edits / adds to profile
   |                                           |-- Optionally adds wishlist
   |                                           |-- (becomes a Giver for their own friends)
   |
   |-- Request recommendation
   |     (select occasion, budget)
   |
   |-- [Recommendation Engine]
   |
   |<-- Ranked gift suggestions (item + category level)
```

---

## 8. Functional Requirements

### 8.1 Account & Onboarding
- **FR-1:** First-time user flow begins with "who do you want to find a gift for?" — not a self-profile builder. Account creation (email/password or SSO, Google minimum for V1) is prompted only after this first action, framed as saving progress.
- **FR-2:** User completes their own personal info at their own pace (name, age or birth year — optional, gender — optional, location — optional, city-level only); this is never the first-screen ask.
- **FR-3:** User can edit personal info and interests at any time post-onboarding.

### 8.2 Interest List (Receiver-side, with Giver pre-fill)
- **FR-4:** A Receiver's interest list can be initiated by a Giver (pre-invite, Flow 2) and/or by the Receiver themselves post-onboarding — both write to the same underlying interest list, tagged by who contributed each entry.
- **FR-5:** Interests are chosen from a structured taxonomy (categories + subcategories) — needs a starter taxonomy built pre-launch (~150–300 curated interest tags).
- **FR-6:** Users (Giver or Receiver) can add custom free-text interests not in the taxonomy.
- **FR-7:** Receiver can mark their own interests with a personal confidence/importance flag (e.g. "big passion" vs. "casual interest") — separate from friend-contributed rank.
- **FR-8:** Interest list is versioned/timestamped (edits retain prior version) so ranking data can later be checked for staleness (not surfaced to users in V1, just logged).

### 8.3 Wishlist (Receiver-side)
- **FR-9:** Receiver can add specific wishlist items: title, description, optional link, optional price. Positioned in the Receiver's onboarding as optional/secondary, not the headline ask (see Flow 4).
- **FR-10:** Receiver can mark a wishlist item as visible to all friends, or private (visible to no one, used only as a signal — open question, Section 13).
- **FR-11:** Receiver can remove/edit wishlist items at any time.

### 8.4 Friend Graph, Adding & Invites
- **FR-12:** User can add a person as a gifting target before that person has an account — this creates an unclaimed Receiver record (name + contact info) that the Giver can immediately start contributing to.
- **FR-13:** Invite is sent to the unclaimed Receiver, framed around them receiving thoughtful gifts (see Flow 3 copy direction), not around building their own wishlist.
- **FR-14:** When the invited person accepts, their account is linked to the previously-unclaimed record, and all pre-contributed interest data, notes context, and relationship metadata carry over automatically.
- **FR-15:** User can see a list of their added friends/targets and, for each, status: unclaimed (invited, not yet joined) vs. claimed-and-ranked vs. claimed-not-yet-ranked.
- **FR-16:** User can re-prompt a friend who hasn't accepted or hasn't completed ranking (simple nudge, no scheduled reminders in V1).
- **FR-17:** User can attach a private note (visible only to self) about a friend/target, addable at any time, not just at initial add.
- **FR-18:** User can log free-text milestone entries against a friend/target (occasion label + optional gift-idea note). No automated reminders/notifications triggered by these in V1 — retrievable later when requesting a recommendation.

### 8.5 Interest Ranking (Friend-contributor side)
- **FR-19:** When a Giver adds a new friend/target, they're immediately prompted to rank/tag interests for that person as part of the add flow (not a separate later step) — this is the pre-invite contribution from Flow 2.
- **FR-20:** Once a Receiver has joined, any of their other friends who haven't yet contributed are still prompted to rank the Receiver's (now-visible) interest list on first view of that profile.
- **FR-21:** Contributor can mark an interest "not sure / don't know enough" rather than being forced to rank everything.
- **FR-22:** Contributor specifies relationship type from a fixed list, and can optionally tag 1–3 shared interests/activities specific to that relationship.
- **FR-23:** Contributor can revisit and update their ranking later if the Receiver's list changes.

### 8.6 Gifting Style Profile (Giver-side)
- **FR-24:** User completes a short one-time quiz capturing default budget range, gifting philosophy, and risk tolerance — first surfaced right before viewing their first recommendation results (Flow 5), not as an onboarding gate.
- **FR-25:** User can edit their gifting style profile at any time.

### 8.7 Recommendation Engine
- **FR-26:** Giver initiates a recommendation request by selecting: Receiver, occasion tag (optionally pulled from a logged milestone note), optional budget override.
- **FR-27:** Engine combines the following inputs (see Section 9 for weighting logic):
  - Receiver's explicit wishlist items
  - Receiver's aggregated, confidence-weighted interest rankings (across all contributors, including pre-invite contributions)
  - Receiver's personal info (age/life-stage, general demographic context)
  - Requesting Giver's gifting style profile
  - Occasion tag
  - Relationship type + shared interests between this specific Giver-Receiver pair
- **FR-28:** Engine returns 5–8 ranked suggestions, each with a one-line rationale referencing which input(s) drove the suggestion. Suggestions mix two forms:
  - **Item-level**: a specific, concrete thing (e.g. "wireless earbuds," "cast iron pan").
  - **Category-level**: a broader gift category/interest area, for when the engine has directional confidence but not enough signal to get specific.
- **FR-29:** Giver can give lightweight feedback (thumbs up/down or "not for them") per suggestion; logged for model iteration, not user-facing analytics in V1.
- **FR-30:** If a Receiver has little to no data, engine falls back to a generic recommendation based on whatever pre-invite contribution and stated interests exist, with a message indicating limited data. Because pre-invite contribution (FR-19) seeds data before the Receiver even joins, true zero-data cases should be rare.
- **FR-31 (edge cases):** Defined fallback messaging is required for each low-data scenario — e.g. "no wishlist yet," "no friends have ranked interests yet," "not enough budget/occasion context" — each degrading gracefully with a clear explanation rather than a blank/thin result.

### 8.8 Notifications (minimal, transactional only)
- **FR-32:** Email notification when an invited target accepts and claims their profile.
- **FR-33:** Email notification when a friend completes ranking a user's interests.
- No occasion/date-based notifications in V1 (explicitly deferred).

---

## 9. Recommendation Engine — Input Weighting Logic (V1 approach)

This is a first-pass heuristic model for V1, not a trained ML system (a likely Phase 2+ investment once there's enough interaction data to train against).

| Input | Role in V1 logic |
|---|---|
| **Wishlist items** | Highest priority signal — if a live, unclaimed wishlist item fits budget, surface it near the top. |
| **Aggregated interest rankings** | Weighted by (a) average rank across contributors, (b) number of contributors (more corroboration = more confidence), (c) recency, (d) whether the entry came from pre-invite contribution vs. post-join contribution (both count, but recency/corroboration matter more than origin). Split into a **top-k** tier (highest-confidence interests — primary driver of suggestions) and a **rest** tier (lower-rank/lower-corroboration — secondary/diversity signal). |
| **Personal info** | Used as a filter/context layer (age-appropriateness, general demographic norms), not a primary driver. |
| **Giver's gifting style** | Filters/reorders candidate gift *types* — e.g. a "practical" Giver sees fewer novelty items, a "sentimental" Giver sees more experience/personalized options. |
| **Occasion** | Adjusts tone and price banding. |
| **Relationship + shared interests** | Boosts candidates tied to interests this specific Giver-Receiver pair share, and can unlock more personal categories for closer relationships. |

**Output composition target:** for 5–8 results — 1–2 direct wishlist matches (if available), 3–4 interest-derived suggestions, 1–2 relationship/shared-interest-derived suggestions.

---

## 10. High-Level Data Model

- **User**: id, name, age/birth_year, gender (optional), location (optional), claim_status (unclaimed / claimed), created_at
  - *Unclaimed* User records are created by a Giver adding a target (FR-12) and don't require login credentials until the invite is accepted.
- **Interest**: id, taxonomy_tag or free_text, owner_user_id (the Receiver), contributed_by_user_id (who added it — could be the Receiver or a Giver pre/post-invite), self_confidence_flag (Receiver-only), created_at, updated_at
- **WishlistItem**: id, owner_user_id, title, description, link, price, visibility (public/private)
- **FriendEdge**: user_id_a, user_id_b, status (invited/accepted), created_at
- **InterestRanking**: id, ranker_user_id, subject_user_id, interest_id, rank_value, confidence ("not sure" flag), contributed_pre_or_post_invite, created_at, updated_at
- **RelationshipContext**: ranker_user_id, subject_user_id, relationship_type, shared_interests[]
- **FriendNote**: owner_user_id (the Giver), subject_user_id, note_text, created_at — private, visible only to owner
- **MilestoneEntry**: owner_user_id (the Giver), subject_user_id, occasion_label, gift_idea_note, created_at — private, no reminder logic attached in V1
- **GiftingStyleProfile**: user_id, default_budget_range, philosophy_tags[], risk_tolerance
- **RecommendationRequest**: id, giver_user_id, receiver_user_id, occasion_tag, budget_override, created_at
- **RecommendationResult**: id, request_id, suggestion_list (ordered, item-level/category-level flag, rationale per item), feedback (per item, optional)

---

## 11. Non-Functional Requirements

- **Privacy:** A Receiver's interests are visible to their accepted friends; wishlist visibility is user-controlled (public/private per item). Friend-contributed interest *rankings* about a Receiver should likely NOT be individually visible to the subject (to avoid awkwardness/gaming), though the Receiver should be able to see the aggregated interest tags themselves (since they need to confirm/edit them per Flow 4). Private notes and milestone entries (FR-17, FR-18) are visible only to the Giver who created them — never to the subject.
- **Data sensitivity:** No sensitive personal categories (health, financial, etc.) should be collected as "interests." Taxonomy must be curated to avoid this.
- **Trust/messaging:** Because a Receiver's profile now often has data in it before they've ever logged in, invite and first-login copy needs careful handling so this reads as "your friends are thoughtfully getting ready to give you something" rather than "your friends have been talking about you without your knowledge." This is a copywriting/trust risk worth user-testing (see Section 13).
- **Performance:** Recommendation generation should return results in a few seconds; a heuristic scoring pass in V1, not a heavy ML inference call.
- **Scalability:** Design the interest taxonomy and ranking schema so it can later support ML-based scoring without a data model rewrite.
- **Accessibility:** Standard web accessibility (WCAG AA) for core flows, particularly the add-friend/contribution flow, which is now the single most important, highest-traffic interaction in the product.

---

## 12. Future Phases (explicitly out of scope for V1, noted for context)

1. **Occasion & reminder system:** promote milestone entries (FR-18) into a real calendar/reminder system with proactive notifications ahead of dates.
2. **Group gifting / pooling:** multiple Givers contribute to one gift, split cost, coordinate to avoid duplicate gifts.
3. **Monetization:** affiliate commissions on purchased items, or marketplace checkout.
4. **Purchase integration:** direct "buy" links, price tracking, retailer integration.
5. **ML-based recommendation model:** replace V1 heuristics with a model trained on accumulated ranking + feedback data.
6. **Mobile native app.**

---

## 13. Open Questions / Risks

- **Ranking UX:** Is ranking (ordinal, "put these in order") or rating (1–5 scale per item) the right interaction for the pre-invite contribution step? Needs a design decision, ideally tested given this is now the very first interaction a new user has with the product.
- **Trust framing for pre-filled profiles:** A Receiver's first login now shows data friends already entered about them. This needs explicit user-testing — does it feel thoughtful ("my friends are looking out for me") or does it feel surveilled ("people have been building a file on me")? Copy and disclosure design here materially affects adoption.
- **Wishlist visibility to subject vs. friends:** unchanged from prior draft — should a Receiver see their own aggregated interest rankings, and does that reduce friends' willingness to rank honestly?
- **Account-creation timing:** Flow 1 asks a brand-new user to add a friend/target *before* creating an account. Needs a decision on how much can happen pre-account (e.g. can they browse the taxonomy and tag interests as a guest, with account creation only required to save/send the invite?) versus requiring an account immediately.
- **When to prompt ("do I need a gift?"):** should V1 surface any lightweight in-app nudge based on a Giver's own logged milestone notes (FR-18), even without a full reminder system — purely "here's a note you left yourself," not a push notification? Still an open scope call.
- **Recommendation engine implementation approach:** rules-based scorer (Section 9) vs. an agent/LLM-driven approach that reasons over the structured inputs directly — worth a short technical spike before committing.
- **Taxonomy ownership:** building and maintaining a quality interest taxonomy (150–300+ tags) is real content work, not just engineering — needs an owner.
- **Engagement risk (still the biggest one):** the crowdsourcing mechanic depends on Givers actually completing the pre-invite contribution step, and on Receivers actually confirming/engaging once invited. Flipping the entry point to the Giver should make the *first* touch easier, but doesn't remove the need for the Receiver to eventually engage — recommend instrumenting completion rate at both steps as the top two early metrics.

---

## 14. Success Metrics (V1)

- **% of new sign-ups that complete the "add a friend + contribute interests" step** in their first session (validates the Giver-first entry actually reduces friction, the core hypothesis of this version)
- **% of invited Receivers who accept and confirm/edit their inherited profile** (validates that the other-oriented invite framing works, and that pre-filled data doesn't feel invasive)
- **% of Receivers with at least 2 friends who've contributed interest data** (validates network depth, not just breadth)
- **Recommendation feedback rate:** % of generated suggestions marked "like" vs. "not for them"
- **Recommendation request completion rate:** % of Givers who start a request and get to viewing results
- **Loop continuation rate:** % of Receivers who, after onboarding, go on to add a friend/target of their own (i.e. become a first-time Giver) — this is the metric that most directly validates the sustaining loop

---

## 15. Glossary

- **Receiver:** the person whose interests are being profiled and contributed to by friends.
- **Giver:** the person contributing knowledge about someone else and/or requesting a gift recommendation for them.
- **Unclaimed record:** a placeholder Receiver profile created when a Giver adds a target who doesn't yet have an account; becomes a full account once the invite is accepted.
- **Interest:** a broad category/hobby/topic associated with a Receiver.
- **Wishlist item:** a specific, concrete thing a Receiver has stated they want.
- **Ranking/contribution:** a friend's assessment of how well an interest fits the Receiver, based on their own knowledge — can happen before or after the Receiver has joined.
- **Milestone entry:** a private, free-text occasion + gift-idea note a Giver logs against a friend — not a calendar/reminder feature in V1.
- **Gifting style:** a Giver's personal preferences/tendencies around how they like to give gifts (budget, philosophy, risk tolerance).
