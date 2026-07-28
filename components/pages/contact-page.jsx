"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { PageFooter } from "@/components/page-footer";
import { contactEmail } from "@/components/site-data";

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
          A rough note is enough. You get a straight answer back.
        </p>
      </section>

      <section className="page-grid contact-layout">
        <form
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span className="contact-label-row">
              <span>What do you need?</span>
              <em>Optional</em>
            </span>
            <textarea
              name="note"
              rows={5}
              placeholder="What's broken, or what keeps eating the time. Rough is fine."
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
          <div className="page-art-panel" aria-hidden="true">
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

      <section className="page-grid contact-next" aria-label="What happens next">
        <header>
          <span>What happens next</span>
          <h2>Send it. I&apos;ll take a look.</h2>
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
              <strong>I find the smallest fix</strong>
              <span>Whatever solves it with the least new machinery, by email.</span>
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
