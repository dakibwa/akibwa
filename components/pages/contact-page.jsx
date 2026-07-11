"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { PageFooter } from "@/components/page-footer";
import { contactEmail } from "@/components/site-data";

const contactNotes = [
  ["Bring the awkward middle", "The process, report, or spreadsheet that takes too much of your attention."],
  ["Send the shape, not secrets", "Sanitised screenshots and tool lists help. Keep credentials and identifiers out."],
  ["Expect a practical read", "I look for the smallest useful system — not a transformation programme."],
  ["Manchester-based", "UK time, remote-friendly, async until a call earns its place."]
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
          A rough note is enough. You&apos;ll get a practical first take back.
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
              placeholder="Rough is fine — what's broken, what you're trying to do, what it's worth. Write it as it comes."
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
                The button opens a draft email with your note.
                Nothing leaves your machine until you hit send.
              </span>
            </p>
          </li>
          <li>
            <span className="contact-next-step">02</span>
            <p>
              <strong>I run a quick diagnostic</strong>
              <span>
                I read for where the time goes and what the smallest useful system looks like.
              </span>
            </p>
          </li>
          <li>
            <span className="contact-next-step">03</span>
            <p>
              <strong>We talk only if it helps</strong>
              <span>
                A first take by email. If there&apos;s a fit, we book a short call;
                if not, I&apos;ll say so and point you somewhere useful.
              </span>
            </p>
          </li>
        </ol>
      </section>

      <PageFooter />
    </section>
  );
}
