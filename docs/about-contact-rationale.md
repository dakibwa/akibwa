# About And Contact Page Rationale

Updated: 2026-06-15

## Taste Direction

Dan's public Akibwa pages should feel cleaner, calmer, and less visually busy: practical, high-trust, lightly expressive, and specific without becoming corporate. The recurring phrase "send the messy bit" is useful because it sounds like Akibwa, but the surrounding page has to explain what a visitor should actually send.

## About Page Job

The About page should answer three questions quickly:

- Why trust Daniel with messy data, workflow, and AI-assisted systems?
- How does the BI background translate into practical Akibwa work?
- What kind of judgement, tools, and domains sit behind the offer?

The page now foregrounds the bridge from ten years of BI work to small AI-assisted systems, adds proof points, and introduces three working principles: start with the real work, build the smallest useful system, and leave the keys behind.

## Contact Page Job

The Contact page should reduce hesitation. It should make it obvious that a rough, imperfect message is welcome, while also steering people away from sending private raw material too early.

The form now asks for the closest type of work, the problem, what it touches today, what would make it worth doing, email, and timing. The action label is "Draft email" because the form opens a mailto draft rather than submitting to a backend. The side notes explain what to include and reinforce the privacy boundary.

## Implementation Notes

- Keep the pages code-native and static-export friendly.
- Avoid adding a backend form until there is a clear operational need.
- Use the shared `contactEmail` value for mailto links so the page does not drift from the rest of the site.
- Preserve the existing white, black, blue, and orange Akibwa palette.
- Prefer concise rows and proof lines over another dense card wall.
- Use public-safe language only; no private client details, raw personal records, or hidden source claims.
