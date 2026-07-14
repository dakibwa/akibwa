"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { PageFooter } from "@/components/page-footer";
import { contactEmail } from "@/components/site-data";

const contactNotes = [
  ["Repetitive work", "Copying, checking, updating and chasing."],
  ["Spreadsheets and reports", "Fix them, simplify them or replace them."],
  ["Tools and websites", "Build something new or improve what you use."],
  ["Not sure what you need?", "Tell me what’s annoying. I’ll suggest a useful fix."]
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

      <section className="page-grid contact-notes" aria-label="What I can help with">
        <header>
          <span>What I can help with</span>
          <h2>If it’s done on a computer, I can probably help.</h2>
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
          <h2>Send it. I’ll take a look.</h2>
        </header>
        <ol>
          <li>
            <span className="contact-next-step">01</span>
            <p>
              <strong>Tell me the problem</strong>
              <span>One sentence is enough.</span>
            </p>
          </li>
          <li>
            <span className="contact-next-step">02</span>
            <p>
              <strong>I find the simplest fix</strong>
              <span>You’ll get a practical first take by email.</span>
            </p>
          </li>
          <li>
            <span className="contact-next-step">03</span>
            <p>
              <strong>We go from there</strong>
              <span>A short call only if it helps.</span>
            </p>
          </li>
        </ol>
      </section>

      <PageFooter />
    </section>
  );
}
