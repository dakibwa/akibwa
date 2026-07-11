# Akibwa brand architecture

Updated: 2026-07-10

## Decision

Akibwa is one public brand with five top-level route jobs. Daniel's personal projects and BI career are two kinds of evidence for the same promise:

> Small AI-assisted systems that turn messy workflows into useful tools.

The site should not split into a personal identity and a consultancy identity. It should let a visitor move from recognition, to proof, to trust, to a commercial offer, to a privacy-safe first contact.

```text
Home: recognise the promise and choose a path
  ├─ Personal: inspect product and systems taste
  ├─ About: establish judgement and career credibility
  └─ Professional: understand the offer and fit
                         ├─ Personal / About / Systems: verify proof
                         └─ Contact: start safely
```

`/professional` owns the commercial offer. Other routes may point towards it, but should not grow their own service menus, buying paths, or competing calls to action.

## Route contracts

| Route | Visitor question | It owns | Primary next step | It must not become |
| --- | --- | --- | --- | --- |
| `/` | What is Akibwa, and where should I go? | The umbrella promise and four clear paths: Personal, Professional, About, Contact. | Choose the route that matches intent. | A project catalogue, full biography, or long consultancy landing page. |
| `/personal` | Can Daniel build thoughtful, useful things? | Public-safe product evidence: working surfaces, constraints, build decisions, and systems taste. | Inspect a project; then understand the professional application. | A private-life archive, generic hobby gallery, or second services page. |
| `/professional` | Is this for me, what can I buy, and what happens next? | Problem framing, offer ladder, fit, proof links, working model, and the buying path. | Book a short workflow triage through `/contact`. | A CV, exhaustive tool list, or vague AI-transformation pitch. |
| `/about` | Why should I trust Daniel with real work? | The bridge from ten years of BI work to current AI-assisted systems, plus judgement, principles, and a human amount of personality. | See the professional offer. | A duplicate portfolio, long life story, or another conversion funnel. |
| `/contact` | How do I start without over-sharing? | Privacy-safe intake, useful prompts, delivery mechanism, response expectations, and the hand-off to a real conversation. | Draft and review an email. | A lead-capture maze, account flow, or restatement of every service. |

`/systems` is a supporting explainer, not a sixth brand identity. It shows the operating loop behind the offer and should normally be reached from `/professional` or a relevant proof story.

## How personal work becomes professional proof

Personal projects support the offer when they make a reusable capability visible. Each public project story should answer, in this order:

1. **Wanted outcome** — the useful thing Daniel wanted to exist.
2. **Messy input or constraint** — the data, workflow, privacy boundary, device constraint, or unreliable source involved.
3. **System response** — what was modelled, automated, designed, or made operable.
4. **Evidence** — a working public surface, bounded screenshot, verified behaviour, or clearly labelled status.
5. **Transferable proof** — the capability a client can reasonably infer from that evidence.

The transferable proof should be one restrained sentence, not a sales card. Examples include:

- Chorus demonstrates API integration, data modelling, caching, and readable reporting from inconsistent source data.
- One-Bag demonstrates constraint modelling, decision support, evidence provenance, and local-first product design.
- Meditator demonstrates real-time state, privacy-aware product choices, and calm cross-device interaction.
- Canta Porto demonstrates structured learning loops, content provenance, and low-cost AI assistance within a bounded teaching system.

Do not claim client outcomes that a personal project did not produce. Do not expose private records, credentials, raw messages, health detail, financial detail, or unpublished personal-memory material to make the proof feel stronger.

## The commercial path

The offer should remain a progression rather than a menu of unrelated services:

1. **Short workflow triage** — confirm the shape of the problem and whether a deeper diagnosis is useful.
2. **Workflow teardown** — map the current work, friction, ownership, safeguards, and highest-leverage intervention; produce a clarity report.
3. **Prototype sprint** — test one bounded intervention with real or safely anonymised inputs; produce a working prototype.
4. **Operating system build** — productionise the useful part with documentation, safeguards, ownership, and handover.

The unresolved commercial decision remains whether a teardown is paid from day one. Until that decision is made, public copy should keep the current low-friction triage CTA and avoid inventing prices, guarantees, or a free diagnostic deliverable.

## Cross-route linking rules

- Home links equally clearly to the four top-level destinations; it does not force every visitor through Professional.
- Personal keeps project interaction primary. A single quiet route to Professional can follow the proof, not interrupt it.
- Professional may use Personal, About, and Systems as evidence, but every buying-path CTA resolves to Contact.
- About points to Professional once the BI-to-AI bridge is established.
- Contact minimises exits. Footer navigation can remain, but the page body should focus on completing and reviewing the draft email.
- Legacy aliases may redirect, but visible navigation uses only `/personal`, `/professional`, `/about`, and `/contact`.

## Language and evidence guardrails

- Prefer **small AI-assisted systems** over AI-first, autonomous, transformation, or platform language.
- Prefer **messy workflows, reporting, internal tools, and knowledge reuse** over broad digital-consultancy language.
- Describe what a system does and what was verified before naming the technology.
- Keep the voice calm, practical, specific, and first-person. Avoid inflated agency language or a sudden corporate plural.
- Treat public demos as evidence with limits. Label local, preview, live, fallback, and external states honestly.
- Keep public proof source-disciplined. A plausible inference is not a client result, testimonial, or production claim.
- Preserve the Contact rule: send the shape, not secrets.

## Current implementation audit

| Surface | Current alignment | Smallest useful follow-on |
| --- | --- | --- |
| Home | Aligned. The hero states the umbrella promise and the four area cards provide clear route choice. | Keep it short. Only tighten area descriptors if another route changes materially. |
| Personal | Strong product-faithful previews and honest live/local states. The route demonstrates taste, but the professional inference is mostly left to the visitor. | Add one public-safe transferable-proof line per project and one quiet route to Professional after the explorer. Do not add service cards. |
| Professional | Aligned. It owns the problem, offer ladder, fit, proof links, working model, and triage CTA. | Add a compact proof shelf using existing project evidence; resolve the paid-teardown decision before changing the offer promise. |
| About | Aligned. It bridges ten years of BI work to current AI-assisted systems and links to Professional. | Keep career facts and tool claims current; avoid expanding the personal-interest section into a second Personal route. |
| Contact | Aligned. It owns privacy-safe intake, mailto review, and clear next steps. | Update the response promise only when there is an operational service-level commitment to support it. |
| Systems | Correctly subordinate. It explains the operating loop and is linked as supporting proof. | Keep it conceptual and route commercial next steps back through Professional or Contact. |

## Implementation backlog

These are separate delivery packets, not part of this documentation-only change:

1. **Personal proof translation** — add a `proves` field to the public project model, render one restrained line in the expanded detail, and add a single post-explorer link to `/professional`.
2. **Professional proof shelf** — reuse curated public project data instead of duplicating claims in `offer-page.jsx`; show the problem, verified system response, and transferable capability.
3. **Commercial gate** — decide free triage versus paid teardown, then update Professional and Contact together so the promise and intake stay consistent.
4. **Route-contract check** — extend the publication check with lightweight assertions for canonical navigation, the single commercial CTA destination, and required privacy language.

## Source ownership

- Route map and public project metadata: `components/site-data.js`
- Home: `components/pages/home-page.jsx`
- Personal: `components/pages/personal-page.jsx`
- Professional: `components/pages/offer-page.jsx`
- About: `components/pages/about-page.jsx`
- Contact: `components/pages/contact-page.jsx`
- Supporting operating model: `components/pages/systems-page.jsx`
- Navigation and legacy route matching: `components/site-shell.jsx`
- Public/private publication boundary: `docs/publication-workflow.md`
- About and Contact rationale: `docs/about-contact-rationale.md`

Future route work should update this note when it changes a route's job, buying path, proof contract, or public/private boundary. Visual or copy polish that preserves those contracts does not need an architecture rewrite.
