// The full "AI Board of Directors" prompt pack (companion to the Gumroad
// Notion template of the same name) — bundled as a one-click import for
// PromptDeck Pro users. Free users get a 2-prompt taste via STARTER_PRESET.
const BOARD_OF_DIRECTORS_PRESET = [
  {
    title: 'Strategy — Blank-Slate Opportunity Scan',
    body: `You are my Strategy Exec. Do NOT reference [existing product/project] — evaluate this
completely from scratch, as if it didn't exist.

Constraints (do not violate):
- Initial validation budget: [$X], zero-cost ideas strongly preferred
- Time I can invest: [Y hours/week], mostly [evenings/weekends]
- [Any hard constraint: e.g. "no LLC yet", "day job conflicts", "solo, no team"]

Task: Propose 3 opportunities that fit these constraints. For each: one-line concept,
why now (trend evidence, not vibes), target customer, a concrete validation test
that fits the budget, and the specific number/signal that would prove or kill it.
End with your top pick and why.`,
  },
  {
    title: 'Strategy — Steelman the Case Against This',
    body: `I'm about to commit to: [idea/decision]. Do not validate me. Your job is to build
the strongest possible case that this is a mistake — pretend you're a skeptical
investor who has seen 200 pitches like this fail. Cite the specific failure mode,
not generic risk language ("competition exists" is not enough — name who, and why
they'd beat me specifically).`,
  },
  {
    title: 'Strategy — Positioning Check (STP)',
    body: `Here's my product: [description]. Here are 3 competitors I found: [list, with prices].
Segment this market into 2-3 groups. Tell me honestly which segment I'm strong
enough to win, which I'd lose, and write one positioning sentence that only makes
sense for the segment I should target.`,
  },
  {
    title: 'Strategy — Pricing Sanity Check',
    body: `I'm about to price [product] at [$X]. Here's what comparable products charge: [list].
Tell me if I'm anchoring too low (signals "cheap/low-trust") or too high (signals
"overpriced for an unproven seller"), and give me the specific number range with reasoning.`,
  },
  {
    title: 'Strategy — Kill/Keep Decision',
    body: `It's been [timeframe] since I started [initiative]. Here's what happened: [data/results].
I need a KEEP or KILL verdict, not "it depends." State the one number that would have
made you say KEEP, and whether we hit it.`,
  },
  {
    title: 'Tech — Zero-Touch Audit',
    body: `Can [business idea] run with ZERO ongoing involvement from me after initial setup —
not "low effort," literally zero? Check each of: content creation, publishing/delivery,
payment collection, customer inquiries. For each, say KEEP (truly automatable) or
PASS (requires recurring human judgment) with the specific mechanism, not a guess.`,
  },
  {
    title: 'Tech — Platform-Native Automation Check',
    body: `Does [platform, e.g. "Etsy", "YouTube", "Naver Webnovel"] officially support automation
(a public API, an official CLI) for [action], or would I be scripting around a UI meant
for humans (ToS risk, ban risk)? This distinction is the single biggest predictor of
whether "automated" actually survives contact with the platform.`,
  },
  {
    title: 'Tech — Build vs. Buy Feasibility',
    body: `I want to build [feature/product]. Given my stack is [languages/tools I know], estimate:
realistic build time, the one part most likely to be harder than it looks, and whether
an off-the-shelf tool already solves 80% of this for less effort.`,
  },
  {
    title: 'Tech — MVP Scope Cutter',
    body: `Here's my full plan for [product]: [description]. Cut it down to the smallest version
that tests the ONE riskiest assumption — not the smallest version that's technically
impressive. Name the assumption and why testing it first de-risks everything else.`,
  },
  {
    title: 'Tech — Recurring-Cost Audit',
    body: `List every cost in [plan] that recurs (subscriptions, renewal fees, API usage-based
costs) vs. one-time costs. Flag anything that scales with success in a way that could
eat margin, and anything that's a fixed cost regardless of whether the business works.`,
  },
  {
    title: 'Growth — Channel-Fit Scan',
    body: `For [product], does it live on a platform with its own built-in discovery (marketplace
search, app store, algorithm-fed feed) — or do I need to bring my own audience with
zero ad budget? Be specific about which channels apply and which don't; "post on social
media" is not specific enough.`,
  },
  {
    title: 'Growth — Persona Sharpening',
    body: `My target customer is "[vague description, e.g. 'solo founders']". That's too broad.
Narrow it to a specific, findable group (a subreddit, a community, a job title with a
specific pain point) and tell me why that narrower group converts better than the
broad one.`,
  },
  {
    title: 'Growth — Cold-Start Distribution Plan',
    body: `I have $[X] and [Y hours/week]. Give me a concrete distribution plan for the first
[N] customers — name actual channels/communities, not "build a following." Rank by
speed-to-first-signal, not by long-term potential.`,
  },
  {
    title: 'Growth — Landing Page Structure',
    body: `Draft a 10-section landing page outline for [product] targeting [persona], following:
hook → problem → feature list → proof (screenshot/demo) → how-it-works → comparison
table vs named competitors → social proof → FAQ (objections first) → price+urgency → CTA.`,
  },
  {
    title: 'Growth — Objection Pre-Empt',
    body: `List the top 5 reasons someone in [target persona] would talk themselves out of buying
[product], ranked by how often you'd expect to hear them. Turn each into one FAQ answer
that kills the objection in 2 sentences.`,
  },
];

const STARTER_PRESET = [
  BOARD_OF_DIRECTORS_PRESET[1], // Steelman the Case Against This
  BOARD_OF_DIRECTORS_PRESET[8], // MVP Scope Cutter
];

if (typeof window !== 'undefined') {
  window.BOARD_OF_DIRECTORS_PRESET = BOARD_OF_DIRECTORS_PRESET;
  window.STARTER_PRESET = STARTER_PRESET;
}
