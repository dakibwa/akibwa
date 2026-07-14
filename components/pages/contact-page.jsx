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

const interestEmailHref = `mailto:${contactEmail}?subject=${encodeURIComponent(
  "Interested in working with Akibwa"
)}&body=${encodeURIComponent(
  "Hi Daniel,\n\nI'm interested in talking about a project. Please get in touch and I'll share a little more context.\n\nThanks,"
)}`;

export function ContactPage() {
  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const note = formData.get("note")?.toString().trim();

    const subject = encodeURIComponent("Akibwa enquiry");
    const message = encodeURIComponent(
      note
        ? `Hi Daniel,\n\n${note}`
        : "Hi Daniel,\n\nI'm interested in talking about a project. Please get in touch.\n\nThanks,"
    );
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
          A one-click hello or rough note is enough. You&apos;ll get a practical first take back.
        </p>
      </section>

      <section className="page-grid contact-layout">
        <form
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <div className="contact-fast-start">
            <p>
              <strong>Want the easy route?</strong>
              <span>No brief needed. This opens a ready-to-send email in your mail app.</span>
            </p>
            <a className="contact-interest-button" href={interestEmailHref}>
              I&apos;m interested
              <ArrowRight size={18} strokeWidth={1.8} />
            </a>
          </div>
          <div className="contact-form-divider" aria-hidden="true">
            <span>or add a rough note</span>
          </div>
          <label>
            <span className="contact-label-row">
              <span>What do you need?</span>
              <em>Optional</em>
            </span>
            <textarea
              name="note"
              rows={5}
              placeholder="What's broken, what are you trying to do, or what keeps taking too much time? Rough is fine."
            />
          </label>
          <div className="contact-actions">
            <button type="submit">
              Draft email
              <ArrowRight size={18} strokeWidth={1.8} />
            </button>
            <p>
              <LockKeyhole size={18} strokeWidth={1.6} />
              <span>Opens in your email app. Nothing sends until you do.</span>
            </p>
            <a className="contact-direct" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </div>
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
                Either button opens a draft email, with your note if you added one.
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
