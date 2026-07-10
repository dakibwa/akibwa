"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { PageFooter } from "@/components/page-footer";
import { contactEmail } from "@/components/site-data";

const contactNotes = [
  ["Bring the awkward middle", "A process, report, spreadsheet, source folder, or rough idea that is taking too much attention."],
  ["Send the shape, not secrets", "A sanitized screenshot, tool list, or example flow is useful. Keep raw credentials and identifiers out."],
  ["Expect a practical read", "I will look for the smallest useful system, not a theatre demo or a giant transformation programme."],
  ["Manchester-based", "UK time, remote-friendly, happy to work async until a live conversation is genuinely useful."]
];

export function ContactPage() {
  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const note = formData.get("note")?.toString().trim();

    const subject = encodeURIComponent("Akibwa enquiry");
    const message = encodeURIComponent(note || "Hi Daniel,");
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${message}`;
  };

  return (
    <section className="studio-page contact-page-new">
      <section className="page-grid contact-hero">
        <div className="contact-hero-title">
          <h1>Contact</h1>
          <p>Send the messy bit.</p>
        </div>
        <p className="contact-hero-note">
          A rough note is enough — send it as it comes, and you&apos;ll get a practical first take back.
        </p>
      </section>

      <section className="page-grid contact-layout">
        <form
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <label>
            What do you need?
            <textarea
              name="note"
              placeholder="Rough notes are fine — what's broken, what you're trying to do, what would make it worth it. Send it exactly as it is in your head."
              required
            />
          </label>
          <div className="contact-actions">
            <button type="submit">
              Draft email
              <ArrowRight size={18} strokeWidth={1.8} />
            </button>
            <p>
              <LockKeyhole size={18} strokeWidth={1.6} />
              <span>
                Private by default.
                <br />
                No spam, ever.
              </span>
            </p>
          </div>
          <p className="contact-direct">
            <i aria-hidden="true" />
            <span>
              Prefer plain email? <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </span>
          </p>
        </form>

        <div className="contact-art-side">
          <div className="contact-signal-art" aria-hidden="true">
            <img
              src="/area-art/contact-blue-clouds.webp"
              alt=""
              width="899"
              height="1198"
              loading="eager"
              decoding="async"
              draggable="false"
            />
          </div>
        </div>
      </section>

      <section className="page-grid contact-notes" aria-label="What to include">
        <header>
          <span>Good first note</span>
          <h2>Make the shape visible.</h2>
        </header>
        <ul>
          {contactNotes.map(([title, body]) => (
            <li key={title}>
              <i aria-hidden="true" />
              <p>
                <strong>{title}</strong>
                <span>{body}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="page-grid contact-next" aria-label="What happens next">
        <header>
          <span>What happens next</span>
          <h2>From a draft email to a practical read.</h2>
        </header>
        <ol>
          <li>
            <span className="contact-next-step">01</span>
            <p>
              <strong>You send the shape</strong>
              <span>
                The button opens a draft email with your note in it.
                You read it, edit anything, and hit send — nothing leaves your machine until you do.
              </span>
            </p>
          </li>
          <li>
            <span className="contact-next-step">02</span>
            <p>
              <strong>I run a quick diagnostic</strong>
              <span>
                I read it as a short workflow diagnostic: where the time goes, and what the
                smallest useful system looks like — not a sales pitch or a giant transformation plan.
              </span>
            </p>
          </li>
          <li>
            <span className="contact-next-step">03</span>
            <p>
              <strong>We talk only if it helps</strong>
              <span>
                You get a practical first take by email. If there is a clear fit, we book a short call.
                If there is not, I will say so and point you somewhere useful.
              </span>
            </p>
          </li>
        </ol>
      </section>

      <PageFooter />
    </section>
  );
}
