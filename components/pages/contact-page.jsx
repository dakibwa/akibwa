"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const contactNotes = [
  ["Small teams", "We work with focused teams and lean organisations."],
  ["Practical systems", "Clear, useful systems you can run and evolve."],
  ["UK-based", "Manchester, UK. Local time, global perspective."],
  ["Remote-friendly", "Async by default, aligned when it matters."]
];

export function ContactPage() {
  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const fields = [
      ["What are you trying to fix?", formData.get("problem")],
      ["What does it currently involve?", formData.get("current")],
      ["What would make it useful?", formData.get("outcome")],
      ["Email", formData.get("email")],
      ["Preferred timing", formData.get("timing")]
    ];
    const body = fields
      .map(([label, value]) => [label, value?.toString().trim()])
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}\n${value}`)
      .join("\n\n");

    const subject = encodeURIComponent("Akibwa enquiry");
    const message = encodeURIComponent(body || "Hi Daniel,");
    window.location.href = `mailto:hello@akibwa.com?subject=${subject}&body=${message}`;
  };

  return (
    <section className="studio-page contact-page-new">
      <section className="page-grid contact-layout">
        <div className="contact-form-side">
          <header>
            <h1>Contact</h1>
            <p>Send the messy bit.</p>
            <span>
              Workflows, reporting, systems,
              <br />
              private knowledge, or a rough idea
              <br />
              that needs structure.
            </span>
          </header>

          <form
            className="contact-form"
            onSubmit={handleSubmit}
          >
            <label>
              What are you trying to fix?
              <textarea name="problem" placeholder="Describe the problem, the goal, or what's getting in the way." />
            </label>
            <label>
              What does it currently involve?
              <input name="current" placeholder="People, tools, steps, files, or anything in the mix." />
            </label>
            <label>
              What would make it useful?
              <input name="outcome" placeholder="The outcome you're hoping for." />
            </label>
            <label>
              Email
              <input name="email" type="email" placeholder="hello@company.com" />
            </label>
            <label>
              Preferred timing
              <input name="timing" placeholder="e.g. this month, Q3, exploring options" />
            </label>
            <div className="contact-actions">
              <button type="submit">
                Send inquiry
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
                Prefer plain email? <a href="mailto:hello@akibwa.com">hello@akibwa.com</a>
              </span>
            </p>
          </form>
        </div>

        <div className="contact-art-side">
          <div className="door-art" aria-hidden="true">
            <span className="door-plane" />
            <span className="door-frame" />
            <span className="door-path" />
            <span className="door-cursor" />
          </div>

          <aside className="contact-note-card">
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
