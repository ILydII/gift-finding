# Product Requirements Document (PRD)
## Gift Recommendation Web App — Processing & Output Layer (V1)
**Doc status:** Draft v1.0 — derived from BRD v0.2, Section 9 deep-dive
**Doc owner:** Product
**Scope of this PRD:** This document covers *only* the processing and output side of the recommendation engine described in BRD Section 9 — how the three input streams are combined, weighted, and turned into the four gift ideas a Giver sees for a given milestone. It does not re-litigate onboarding, invite flows, or the data model, except where those need to change to support the logic below.

---

## 1. Why this PRD exists
The BRD establishes *what* data the app collects (wishlist, giver notes/ranks, community rankings, relationship context, gifting style, milestone) and a first-pass description of how it's weighted (Section 9). What it doesn't yet answer:
- What happens, mechanically, when those three streams disagree?
- In what order do milestone type, relationship context, and gifting style get applied — as tiebreakers, filters, or multipliers?
- Why 4 outputs instead of the BRD's 5–8, and what does "4" have to guarantee?
- Does an algorithm picking gifts *for* someone undermine the point of gift-giving?

That last question turned out to be the most useful one to argue out loud, so before the spec, here's the debate that shaped it.

---

## 2. Persona Debate
**Persona 1 — "Jordan," chronically bad at gifts.** Genuinely loves their friends, has given three different people the same scented candle in the last two years, wants to be better and is willing to use a tool to get there.

**Persona 2 — "Sam," gift-giving purist.** Believes a gift's entire value comes from the giver's own attention — noticing, remembering, connecting dots. Deeply skeptical that any tool can replace that, and worried this app quietly does.

---

**Sam:** I'll say the quiet part first — I think this whole engine is a shortcut around the one thing that makes a gift a gift. If a piece of software hands you four options, you didn't give a gift, you picked from a menu.

**Jordan:** I hear that, but the menu doesn't exist without me. I'm the one who added my friend, wrote the note about her getting into ceramics, tagged that we've been doing pottery classes together. The "menu" is built out of things *I* noticed. That's not nothing.

**Sam:** Sure, but Section 9 of the BRD weights the *crowd* — the aggregated interest rankings from all her friends — as a primary driver, same tier as your own note. So my objection is specific: right now, my personal knowledge of her and some acquaintance's guess get blended together and I can't tell which is which in the output. That's the part that feels like it's replacing effort instead of amplifying it.

**Jordan:** That's fair, actually. I'd want to know if a suggestion came from *me* noticing something versus three coworkers agreeing she "likes cooking stuff" in the abstract.

**Sam:** Right. So my first ask: whatever comes out of me — my private note, the relationship context I set, the milestone I logged — should outrank generic crowd corroboration when they compete for the same slot. Not because crowd data is worthless, it's a fine cold-start signal, but because the entire premise of the product should be "help the giver do what they already started," not "let the crowd decide."

**Jordan:** Okay, I actually like that as a rule, but I want to push back on where it stops. If I've only met this friend three times, my "personal knowledge" is thin. In that case I *want* the crowd and her own wishlist to carry more weight, because I don't have much to contribute. Don't force my thin input to outrank better signal just because it's mine.

**Sam:** That's reasonable. I'm not saying "giver input always wins," I'm saying "when giver input exists and is specific, it shouldn't get drowned out by volume." A note like "into ceramics, we take a class together" is more specific than five friends independently tagging "crafts."

**Jordan:** Which is really a specificity/confidence question, not a stream-identity question. I think that's the right framing — weight by how *specific and corroborated* a signal is, but tag its origin, and when I look at the four results, tell me plainly which one came from something I put in.

**Sam:** Good. Second thing — milestone. If it's her birthday, I don't want the same output I'd get for "just because." A birthday gift can be more sentimental, can cost more, can be a bigger swing. "Just because" should skew smaller and lower-risk almost by default, regardless of what her wishlist says. Right now milestone is described as adjusting "tone and price banding" — that's underspecified. I want it to actually gate what's eligible, not just nudge a number.

**Jordan:** Agreed, and honestly this is the part I most need help with — I'm the person who gives a coworker-tier gift for an anniversary because I didn't stop to think about what the occasion calls for. If the app enforces "this category of thing doesn't fit a milestone this significant," that alone fixes half of why I'm bad at this.

**Sam:** Then we agree milestone should sit *above* relationship and gifting style in the ordering — it's the most objective, least personal-taste-dependent filter. Relationship context comes next, because it determines what's even appropriate to suggest (you don't want an intimate gift suggested for a coworker). Gifting style comes last in priority, because it's about *how* Jordan likes to shop, not about what the receiver needs — it should shape the flavor of the four, not override milestone or relationship appropriateness.

**Jordan:** One more thing I want: I don't want four versions of the same idea. If all four are "cooking-related," that's not four choices, that's one idea said four times. I want the app to force itself to be a little more diverse, even if the data all points the same direction.

**Sam:** Agreed, and I'd add: at least one of the four has to trace back to something *specific* Jordan personally knows or logged — a note, a shared activity, a milestone-specific idea — not purely to community or wishlist data. If Jordan added nothing personal at all, fine, the app can say so honestly rather than fabricating a personal-sounding rationale.

**Jordan:** And show me *why* each one is there. Not a black box. If I can see "this is because you two take pottery classes together" versus "three friends tagged crafts as a strong interest," I trust the good ones more, and I know exactly where the gaps are in what I know about her — which, honestly, is useful information for me as a friend, independent of the gift.

**Sam:** ...I'll grant that. If the tool's honest about its own confidence and shows its work, it stops being "the algorithm decided" and starts being closer to "your own notes, organized." I still think the ideal use of this app is as a prompt to go notice something new about her, not a replacement for noticing. So one ask: somewhere in the flow, give the giver a chance to add their own reasoning before they act — even a one-line "why I think this is right" — so the last step is still a human decision, not a click-through.

**Jordan:** I can live with that. That actually makes me more confident hitting "get her this," not less.

---

## 3. Design Principles (resolved from the debate)
These four principles govern every rule in Section 4 below:

1. **Specificity and corroboration outrank volume alone.** A single specific, first-party signal (a giver's note, a logged shared activity) can outweigh multiple low-specificity crowd tags — it is not automatically outweighed by them just because there are more of them.
2. **Milestone is a gate, not a nudge.** Occasion determines what's *eligible* to appear at all (price band, sentimentality tier), before relationship or gifting style are applied. It sits at the top of the priority order specified for this feature: milestone type → relationship context → gifting style.
3. **The output must be traceable and diverse.** Every one of the four suggestions carries a rationale that names its source stream(s). At least one of the four must be anchored in something the requesting Giver personally contributed (note, shared interest/activity, or milestone-specific idea) whenever any such signal exists — never four ideas that all reduce to the same underlying signal or subcategory.
4. **The app is a decision aid, not a decision maker.** The final screen treats the Giver as the one closing the loop — they see rationale, can adjust, and are prompted (optionally) to add their own line of reasoning before acting.

---

## 4. Input Streams — Detailed Processing Spec

### 4.1 Stream A — Receiver-declared (wishlist + self-tagged interests)
| Field | Processing behavior |
|---|---|
| Wishlist item | Treated as the highest-*certainty* (not automatically highest-rank) signal — the Receiver said it directly. Enters the candidate pool pre-scored, subject only to the milestone/budget eligibility gate (Section 5.2). If it clears the gate, it is the default candidate for output Slot 1 (Section 6). |
| Wishlist visibility = private | Excluded from all Giver-facing processing entirely; used only as an internal signal that the Receiver engaged with the product (not surfaced to any Giver). |
| Self-confidence flag ("big passion" vs "casual") | Multiplies that interest tag's base weight before it's aggregated with anyone else's ranking of the same tag (Section 4.4). A Receiver's own "big passion" flag is a strong prior — it should meaningfully outweigh a single outside contributor's guess at the same tag, though not an entire corroborated group. |

### 4.2 Stream B — Giver-contributed (notes, interest ranks, relationship context, milestone note, gifting style)
| Field | Processing behavior |
|---|---|
| Private note (free text) | Not directly scorable as structured data, but lightly parsed for taxonomy-tag keyword matches at request time; any match gets a "personally noted" origin tag and a specificity boost (Design Principle 1). Full note text is also surfaced verbatim alongside the rationale for the one slot it informed, so the Giver sees their own words reflected back, not a black-box paraphrase. |
| Interest tags/ranks contributed by this Giver | Enter the same aggregation pipeline as any other contributor's ranking (Section 4.4), but are flagged `origin: requesting_giver` so they can be prioritized as tiebreakers and referenced explicitly in rationale. |
| Relationship type | Sets the **intimacy tier** used as a hard eligibility gate on candidate gift categories (Section 5.3) — e.g., categories tagged "intimate/personal" are ineligible for `coworker` or `acquaintance` tiers regardless of how well they'd otherwise score. |
| Shared interests/activities (1–3 tags) | The single strongest lever for the "personally anchored" guaranteed slot (Design Principle 3) — a shared activity ("we take pottery together") produces a more specific, more trustworthy rationale than any aggregated ranking, and is checked first when filling that slot. |
| Milestone/occasion label + gift-idea note | Drives the milestone eligibility gate (Section 5.2). If a gift-idea note exists ("thinking something cooking-related"), it's treated like a soft wishlist item: high-certainty, subject to the same eligibility gate, eligible for Slot 1 if a wishlist item doesn't already claim it. |
| Gifting style profile (budget, philosophy, risk tolerance) | Applied last, as a re-ranking and price-banding pass over whatever survives the milestone and relationship gates (Section 5.4) — it shapes *which flavor* of eligible idea rises to the top, not whether an idea is eligible at all. |

### 4.3 Stream C — Community (other friends' interest rankings)
| Field | Processing behavior |
|---|---|
| Per-contributor rank value | Aggregated into a per-tag confidence score (Section 4.4). No single outside contributor's ranking is shown or attributed individually to protect against gaming/awkwardness (per BRD Section 11); only the aggregate and its corroboration count are used. |
| "Not sure / don't know enough" | Excluded from aggregation entirely — treated as an abstention, not a low rank. |
| Corroboration count | The primary lever for how much the crowd stream can compete with Stream B for the same slot: a tag independently corroborated by several contributors gains confidence, but per Design Principle 1, it competes against — it does not automatically beat — a specific single signal from the requesting Giver. |
| Recency | Older rankings decay in weight; a ranking never revisited since first entered contributes less than one confirmed recently, consistent with BRD FR-8/FR-23. |

### 4.4 Cross-stream aggregation — how conflicts resolve
Every interest tag associated with a Receiver ends up with one **Aggregated Interest Score**, built as follows, before any milestone/relationship/style modulation is applied:

1. Collect every ranking of that tag, tagged with `origin` (receiver-self / requesting-giver / other-contributor), `confidence flag` (if self), `recency`, and `pre- or post-invite`.
2. Weight each ranking by: `origin priority × confidence flag × recency decay`. Origin priority order (highest to lowest): Receiver self-flagged "big passion" ≳ Requesting Giver's own specific note/rank ≳ Corroborated community aggregate ≳ Single uncorroborated community rank.
3. Sum weighted rankings per tag; normalize corroboration so it produces diminishing, not linear, returns (five agreeing contributors should not simply out-vote one very specific note — additional corroboration matters, but with a ceiling).
4. Output: a ranked list of taxonomy tags with an Aggregated Interest Score and an **origin trace** (which stream(s) fed it), used by candidate generation (Section 5.1) and by rationale generation (Section 7).

This is the mechanism that answers Sam's objection directly: the crowd is a real input, but it competes for influence rather than automatically winning on volume.

---

## 5. Processing Pipeline

### 5.1 Stage 1 — Candidate generation
- Map each high-scoring taxonomy tag (top-k tier from Section 4.4) and each eligible wishlist/gift-idea-note item to one or more gift ideas via the taxonomy→gift-category mapping (item-level and category-level, per BRD FR-28).
- Produce a candidate pool larger than 4 (target: 15–25 candidates) so the later gating/diversity steps have room to work — a pool that's already been pruned to 4 before gating is too brittle to guarantee diversity or the personally-anchored slot.

### 5.2 Stage 2 — Milestone eligibility gate (highest priority)
Each milestone tag maps to a profile that **filters**, not just reorders, the candidate pool:

| Milestone | Sentimentality floor | Price band multiplier | Notes |
|---|---|---|---|
| Birthday | Medium–high | 1.0x (baseline) | Category-level novelty allowed |
| Anniversary/relationship milestone | High | 1.1–1.3x | Purely practical/utilitarian candidates are demoted or excluded unless paired with a personal angle |
| Congratulations | Medium | 1.0–1.2x | Achievement-linked categories get a boost |
| Holiday | Low–medium | 0.7–1.0x | Wider net, casual categories fully eligible |
| Just because | Low | 0.5–0.8x | High-risk/high-price candidates excluded by default; low-effort in cost, not in thoughtfulness |
| Other (free text) | Inherit from closest matched profile, or neutral default | 1.0x | Flagged for lighter-touch fallback copy |

A candidate that fails the sentimentality floor or falls outside the price band (after the Giver's own budget override, if set) is dropped from the pool before any relationship or style scoring happens — this is the mechanism for Design Principle 2 ("gate, not nudge").

### 5.3 Stage 3 — Relationship context gate
- `relationship_type` maps to an **intimacy tier** (e.g., acquaintance/coworker → low; friend → medium; close friend/family/partner → high).
- Candidate gift categories are pre-tagged with a minimum intimacy tier required to be eligible (this extends the existing taxonomy, per BRD Section 8.5/9 — see Section 8 of this PRD for the data-model addition). A candidate requiring a higher intimacy tier than the relationship supports is excluded, not merely down-weighted.
- Shared interests/activities tagged for this specific Giver–Receiver pair are checked here first for the personally-anchored slot (Section 6, Slot 2).

### 5.4 Stage 4 — Gifting style re-ranking
Applied only to candidates that survived Stages 2–3:
- **Philosophy tags** (practical / experiential / sentimental / surprise-me) reweight the surviving pool — e.g., a `surprise-me` Giver sees novelty/category-level candidates rise; a `practical` Giver sees fewer experience-based suggestions.
- **Risk tolerance** controls how much weight low-corroboration/exploratory candidates get relative to safe, well-corroborated ones.
- **Budget comfort range** (or per-request override) does final price-band trimming within whatever the milestone band already allowed.

### 5.5 Stage 5 — Final composite score
For every surviving candidate:
```
FinalScore = AggregatedInterestScore(candidate)
             × MilestoneFit(candidate)      // 0 if gated out in 5.2
             × RelationshipFit(candidate)   // 0 if gated out in 5.3
             × GivingStyleFit(candidate)    // re-ranking multiplier from 5.4
```
Candidates are sorted descending by `FinalScore` going into composition (Section 6).

---

## 6. Output Composition — The Top 4
Four slots, filled in this fixed order, each with its own rule (not just "top 4 by score" — this is the direct answer to the persona debate):

| Slot | Rule | Fallback if unavailable |
|---|---|---|
| **1 — Certainty match** | Highest-scoring live wishlist item or Giver-logged gift-idea note that clears the milestone gate | Highest-scoring pure interest-derived candidate |
| **2 — Personally anchored** | Best candidate traceable to *this requesting Giver's* own note, rank, or shared interest/activity (Design Principle 3) | If no such signal exists at all, this slot is filled by the next-highest candidate and the rationale honestly states it's community/crowd-derived rather than fabricating a personal angle |
| **3 — Best remaining, distinct category** | Highest `FinalScore` candidate not sharing a subcategory with Slots 1–2 | If the pool is too thin to diversify, allow a repeat subcategory but flag it internally for taxonomy/coverage gaps |
| **4 — Best remaining, distinct category** | Same diversity rule as Slot 3, applied against Slots 1–3 | Same as above |

**Composition target**, restated for 4 (replacing the BRD's 5–8 target of "1–2 wishlist / 3–4 interest / 1–2 relationship"): **1 certainty match + 1 personally-anchored + 2 diversified interest/community-derived**, always milestone-gated, always relationship-gated.

---

## 7. Rationale & Transparency Requirements
Each of the four results carries a one-line rationale that must name its dominant origin stream(s) in plain language, e.g.:
- *"You mentioned you two take pottery classes together — this fits that."* (personally anchored, Stream B)
- *"On her own wishlist, and fits a birthday budget."* (certainty match, Stream A)
- *"Four of her friends have flagged cooking as a strong interest."* (community, Stream C)
- *"A bolder pick, since you said you like to surprise her — no one's confirmed this one yet."* (low corroboration, flagged honestly per gifting-style risk tolerance)

Rationale generation must never blend two origins into a vague composite claim ("your friends and her wishlist suggest...") when a specific, single-stream claim is more accurate — specificity in the rationale mirrors specificity in the scoring logic.

After the four are shown, the Giver is offered (not forced) a lightweight prompt — *"Add a note on why this one feels right"* — before marking a final choice. This is optional, logged privately (extends `FriendNote`), and exists solely to keep the last step a human one, per Design Principle 4.

---

## 8. Data Model Additions (delta on BRD Section 10)
- `Interest` (taxonomy): add `min_intimacy_tier` (low/medium/high) and `milestone_sentimentality_tier` fields to support Sections 5.2–5.3.
- `InterestRanking`: add computed field `weighted_score` (output of Section 4.4, cached per request rather than recomputed from raw rankings each time, for performance).
- `RecommendationResult`: extend `suggestion_list` entries with `origin_trace` (array: which stream(s)/signals produced this candidate) and `slot_type` (certainty / personally_anchored / diversified) so the rationale layer and future analytics can both use it.
- `RecommendationRequest`: no change, but `budget_override` now explicitly documented as applying *after* the milestone price band, not replacing it.

---

## 9. Edge Cases & Fallback Matrix
| Scenario | Behavior |
|---|---|
| No wishlist, but rich Giver note + community data | Normal pipeline; Slot 1 falls back to best gated interest match, Slot 2 uses the Giver's note as designed. |
| No wishlist, no community data, but a Giver note/shared-interest exists (early cold start) | The Giver's own signal alone drives Slots 1–2; Slots 3–4 draw from milestone-appropriate category-level defaults with an honest "limited data" disclaimer, consistent with BRD FR-30/FR-31 — but note that in this scenario the *Giver's own effort matters even more*, not less. |
| No signals of any kind | Do not fabricate a "personally anchored" slot. Show milestone-appropriate category-level suggestions only, with a direct nudge: *"You haven't added anything you know about them yet — even one note will make these sharper."* |
| Wishlist/gift-idea note exists but fails the milestone or budget gate | Demote to a category-level suggestion that references it: *"Close to what she asked for, adjusted to fit a [milestone] budget."* Never silently drop a Receiver-declared want without acknowledging it. |
| Conflicting community rankings on the same tag | Resolved by the weighted aggregation in Section 4.4 (confidence-weighted average, not majority vote) — never surfaced to the Giver as "friends disagree," to avoid awkwardness per BRD Section 11. |
| Relationship type not yet set for this pair | Default to the lowest (most conservative) intimacy tier until set, to avoid over-personal suggestions by default. |

---

## 10. Metrics Specific to Processing/Output Quality
In addition to BRD Section 14's product-level metrics, this layer should instrument:
- **Slot-2 fill rate:** % of recommendation requests where a genuine personally-anchored candidate was available (vs. falling back to community-only). Directly measures whether the "amplify the giver's effort" premise is holding up in practice.
- **Origin-stream feedback split:** like/"not for them" rate broken out by `origin_trace`, to see whether personally-anchored suggestions actually outperform pure community/wishlist ones (validates or challenges Design Principle 1's weighting).
- **Diversity violation rate:** % of results where Slots 3–4 had to repeat a subcategory due to a thin candidate pool — a proxy for taxonomy coverage gaps.
- **Milestone-gate rejection rate:** % of otherwise-high-scoring candidates dropped purely for failing the milestone gate — useful for tuning price bands and sentimentality tiers post-launch.

---

## 11. Open Questions Carried Forward From BRD Section 13 (processing-specific)
- **Ranking UX** (ordinal vs. 1–5 rating) directly affects the precision of the weighted aggregation in Section 4.4 — an ordinal "top 3 picks" is cheaper for contributors but yields coarser confidence data than a 1–5 scale per tag. Needs a decision before the aggregation formula's constants can be tuned.
- **Recommendation engine implementation approach** (rules-based per this PRD vs. an LLM/agent reasoning directly over the structured inputs): this PRD assumes the rules-based approach for V1 auditability and rationale-traceability (Section 7 depends on being able to name the exact origin of each candidate); an LLM-driven approach would need equivalent traceability guarantees before it could replace this pipeline without weakening Design Principle 3.
- **Taxonomy ownership** matters more here than in the original BRD estimate — the `min_intimacy_tier` and `milestone_sentimentality_tier` fields in Section 8 add real editorial judgment calls to taxonomy curation, not just tagging.
