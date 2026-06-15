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

const enquiryTypes = [
  "Workflow / operations",
  "Dashboard / reporting",
  "Automation / internal tool",
  "Private knowledge system",
  "Prototype / rough idea",
  "Not sure yet"
];

export function ContactPage() {
  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const fields = [
      ["Type of work", formData.get("type")],
      ["What are you trying to fix?", formData.get("problem")],
      ["What does it touch today?", formData.get("current")],
      ["What would make it worth doing?", formData.get("outcome")],
      ["Best reply email", formData.get("email")],
      ["Preferred timing", formData.get("timing")]
    ];
    const body = fields
      .map(([label, value]) => [label, value?.toString().trim()])
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}\n${value}`)
      .join("\n\n");

    const subject = encodeURIComponent("Akibwa enquiry");
    const message = encodeURIComponent(body || "Hi Daniel,");
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${message}`;
  };

  return (
    <section className="studio-page contact-page-new">
      <section className="page-grid contact-layout">
        <div className="contact-form-side">
          <header>
            <h1>Contact</h1>
            <p>Send the messy bit.</p>
            <span>
              A short note is enough:
              <br />
              what is broken, what it touches,
              <br />
              and what good would look like.
            </span>
          </header>

          <form
            className="contact-form"
            onSubmit={handleSubmit}
          >
            <label>
              What kind of work is it?
              <select name="type" defaultValue="">
                <option value="" disabled>
                  Choose the closest shape
                </option>
                {enquiryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              What are you trying to fix?
              <textarea
                name="problem"
                placeholder="What is broken, missing, or in the way?"
                required
              />
            </label>
            <label>
              What does it touch today?
              <input name="current" placeholder="Tools, files, dashboards, people." />
            </label>
            <label>
              What would make it worth doing?
              <input name="outcome" placeholder="Clearer report, fewer steps, reusable process." />
            </label>
            <label>
              Best reply email
              <input name="email" type="email" placeholder="hello@company.com" required />
            </label>
            <label>
              Preferred timing
              <input name="timing" placeholder="e.g. this month, Q3, exploring options" />
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
        </div>

        <div className="contact-art-side">
          <div className="contact-redon-art" aria-hidden="true">
            <img
              src="/area-art/contact-redon-star.jpg"
              alt=""
              width="500"
              height="668"
              loading="eager"
              decoding="async"
              draggable="false"
            />
          </div>

          <aside className="contact-note-card" aria-label="What to include">
            <header>
              <span>Good first note</span>
              <h2>Make the shape visible.</h2>
            </header>
            {contactNotes.map(([title, body]) => (
              <div key={title}>
                <i />
                <p>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </p>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <PageFooter />
    </section>
  );
}
