# Privacy-friendly client-acquisition measurement

Updated: 2026-07-10

## Decision

Start with a manual funnel that measures real commercial progress. Do not add a third-party analytics service, cookies, fingerprinting, contact enrichment, session replay, or raw visitor logging.

Akibwa does not yet need to identify visitors. It needs to learn whether clear positioning and relevant warm outreach produce replies, useful conversations, paid diagnosis, and bounded implementation work.

## The funnel

| Stage | Event | Count when | Evidence source | Keep out |
| --- | --- | --- | --- | --- |
| Attention | `professional_view` | Optional future aggregate instrumentation records a view of `/professional`. | Aggregate daily route counter only. | IP, user agent, referrer detail, cookie, identity, session trail. |
| Intent | `contact_click` | Optional future aggregate instrumentation records a move from Professional to Contact. | Aggregate daily event counter only. | Visitor identity or cross-page profile. |
| Intent | `diagnostic_download` | A future public diagnostic is actually downloaded. Do not record this event until that asset exists. | Aggregate daily asset counter only. | Identity, document fingerprint, or follow-on tracking. |
| Targeting | `outreach_sent` | Dan sends one personalised message to an approved target. | Private local lead log; weekly aggregate in Notion. | Name, contact details, or message body in Notion/public repo. |
| Response | `reply_received` | The person sends a substantive reply, positive or negative. | Private local lead log; weekly aggregate in Notion. | Message text, private context, or inferred sentiment. |
| Conversation | `triage_booked` | A short workflow triage is scheduled. | Private local lead log; aggregate count. | Calendar notes or attendee details in public/aggregate surfaces. |
| Conversation | `triage_held` | The triage takes place. | Private local lead log; aggregate count. | Call transcript, raw notes, business data, or private identifiers. |
| Paid diagnosis | `teardown_proposed` | A fixed-scope paid teardown is offered in writing. | Proposal ID and aggregate count. | Proposal contents or client identity outside the private folder. |
| Paid diagnosis | `teardown_paid` | Payment for a teardown is received or contractually confirmed. | Private invoice/proposal record; aggregate count and value band if useful. | Bank data, invoice number, address, tax ID, or exact payment detail in Notion. |
| Build | `prototype_proposed` | A bounded prototype proposal is sent. | Proposal ID and aggregate count. | Private proposal text in Notion/public repo. |
| Build | `paid_pilot` | A prototype or implementation pilot is accepted and paid/contracted. | Private contract/invoice record; aggregate count. | Client-sensitive delivery data or credentials. |
| Outcome | `closed_lost` | The opportunity is explicitly declined, not pursued, or inactive after the agreed follow-up. | Opaque reason code in private log. | Blame, speculative personal notes, or copied messages. |

The current operating funnel is:

```text
approved target
  → outreach sent
  → substantive reply
  → triage booked
  → triage held
  → teardown proposed
  → teardown paid
  → prototype proposed
  → paid pilot
```

Site attention metrics are optional context. They should not be allowed to replace the commercial funnel or create pressure to track people.

## Phase 1: manual operating log

Keep the detailed lead log in a private local file or private system. Give each lead an opaque ID such as `L-001`; keep the name-to-ID mapping in that same private location, not in Notion or this repo.

Recommended event-log columns:

```text
event_date,lead_id,stage,source_category,offer,amount_band,next_action_date,outcome_code
```

Allowed values:

- `source_category`: `warm_colleague`, `warm_operator`, `referral`, `linkedin_reply`, `inbound_site`, `other`
- `offer`: `triage`, `teardown`, `prototype`, `operating_build`, `unknown`
- `amount_band`: `none`, `under_500`, `500_999`, `1000_2999`, `3000_plus`, `not_recorded`
- `outcome_code`: `active`, `not_now`, `no_fit`, `no_budget`, `no_owner`, `no_reply`, `won`, `other`

Do not put free-text notes, names, email addresses, company-private information, message bodies, call transcripts, invoice identifiers, or credentials in the event table.

Keep working notes separately per active lead, with the minimum private detail required to do the work. Delete or archive notes when they are no longer operationally needed.

## Notion aggregate

Notion should show the health of the funnel, not become a contact database. Record one weekly row or a compact weekly update with:

```text
week_start
approved_targets
outreach_sent
replies_received
triage_booked
triage_held
teardowns_proposed
teardowns_paid
prototypes_proposed
paid_pilots
closed_lost
next_experiment
```

No names, contact details, message snippets, company-confidential facts, health or finance material, invoice data, or exact identifiers belong in that aggregate.

## Useful rates

Calculate rates only when the denominator is meaningful and always show the count beside the percentage.

- Reply rate = `replies_received / outreach_sent`
- Triage booking rate = `triage_booked / replies_received`
- Triage attendance rate = `triage_held / triage_booked`
- Paid-teardown conversion = `teardowns_paid / triage_held`
- Paid-pilot conversion = `paid_pilots / teardowns_paid`
- Overall warm-outreach conversion = `paid_pilots / outreach_sent`

Do not interpret a rate from one or two events as evidence. Review first after ten relevant messages or four weeks, whichever comes later.

## Weekly review

Answer five questions:

1. Did the selected people plausibly own or influence the workflow named in the message?
2. Which problem wording produced substantive replies?
3. Did triage expose a paid diagnosis problem, or drift into unpaid consulting?
4. Where did the funnel stop: relevance, urgency, trust, price, ownership, or scope?
5. What one change will be tested next week without changing the whole offer at once?

Change one variable per small batch: audience, workflow hypothesis, proof item, CTA, or offer framing. Do not optimise copy against page views while the sample of real conversations is still tiny.

## Optional Phase 2: aggregate first-party site events

Only implement this after an explicit decision that route-level attention data would change a real decision.

A privacy-preserving Akibwa pattern would be:

- a small first-party Cloudflare Worker endpoint;
- an allow-list of event names: `professional_view`, `contact_click`, and `diagnostic_download`;
- date and coarse event count only in KV or D1;
- no cookies, local identifiers, fingerprinting, cross-site IDs, raw IP storage, user-agent storage, or full referrer storage;
- immediate rejection of arbitrary properties;
- public documentation of what is counted;
- retention of daily aggregates only;
- a status/export route that returns counts, not event rows.

Before implementation, decide:

- whether `professional_view` is useful enough to justify any request at all;
- whether bot filtering can remain coarse without retaining identifying data;
- the aggregate retention window;
- whether consent or notice obligations change for the final design and visitor locations;
- who owns the Worker, data deletion, and incident response.

This document is a measurement plan, not legal advice. The implementation packet should check current privacy and cookie requirements for the actual design before launch.

## Explicitly rejected for now

- Google Analytics, Meta Pixel, LinkedIn Insight Tag, session replay, heatmaps, or ad retargeting.
- Email open pixels or click tracking in personal outreach.
- Contact enrichment, scraped profile data, or automated relationship scoring.
- Raw Cloudflare logs as a lead-identification system.
- Storing names, companies, messages, or contact details in a public repo or visible aggregate board.
- Treating traffic as success while replies, calls, proposals, and paid work remain absent.

## Separate implementation tickets

1. Create the private local lead event log and a weekly aggregate export.
2. Add the aggregate funnel fields to the visible Project Control or Notion review surface.
3. Decide whether a public diagnostic asset exists and what `diagnostic_download` would mean.
4. Only if justified, build the bounded first-party aggregate Worker and add public disclosure.
5. Review retention and privacy requirements before enabling any live site event.
