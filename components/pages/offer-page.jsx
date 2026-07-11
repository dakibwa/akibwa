import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const offerSteps = [
  {
    number: "01",
    title: "Workflow teardown",
    body: "We map how the work actually happens and find where automation earns its keep.",
    output: "Clarity report",
    art: "/area-art/professional-teardown.webp",
    artPosition: "50% 52%"
  },
  {
    number: "02",
    title: "Prototype sprint",
    body: "A focused prototype, built fast and tested on real data with real users.",
    output: "Working prototype",
    art: "/area-art/professional-prototype.webp",
    artPosition: "50% 58%"
  },
  {
    number: "03",
    title: "Operating system build",
    body: "The prototype becomes a dependable system — documented, safeguarded, ready to run.",
    output: "Production system",
    art: "/area-art/professional-system.webp",
    artPosition: "52% 54%"
  }
];

const goodFit = [
  "You have a messy or manual process you want to fix.",
  "You work with data, content, or knowledge at scale.",
  "You value clarity, automation, and repeatable systems.",
  "You want a partner who thinks in systems, not tasks."
];

const notFit = [
  "You're looking for off-the-shelf software.",
  "You need a one-off task or quick fix.",
  "You're not ready to improve how work gets done.",
  "You prefer manual work over better systems."
];

const workflow = [
  ["1", "Scope", "Align on the goal and define success."],
  ["2", "Design", "Design the system, interfaces, and flows."],
  ["3", "Build", "Build, test, and iterate in short cycles."],
  ["4", "Handover", "Document, train, and hand over the keys."]
];

export function OfferPage() {
  return (
    <section className="studio-page offer-page">
      <section className="page-grid offer-studio-hero">
        <div className="offer-hero-title">
          <h1>Professional</h1>
          <p>
            When the real work still runs
            <br />
            on spreadsheets, copy-paste, and memory.
          </p>
        </div>
        <div className="offer-hero-aside">
          <p>
            I help small teams replace the manual workflow that quietly eats hours
            every week with a small system that hands the time back. Ten years in BI,
            pointed at your actual work.
          </p>
          <Link className="about-cta" href="/contact">
            <span className="about-cta-label">Book a short workflow triage</span>
            <span className="about-cta-icon" aria-hidden="true">
              <ArrowRight size={17} strokeWidth={2} />
            </span>
          </Link>
        </div>
      </section>

      <section className="page-grid offer-step-grid">
        {offerSteps.map((step) => (
          <article
            className="studio-card offer-step-card"
            key={step.title}
            style={{
              "--offer-art": `url("${step.art}")`,
              "--offer-art-position": step.artPosition
            }}
          >
            <div>
              <span>{step.number}</span>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
              <footer>
                <strong>Output</strong>
                <ArrowRight size={15} strokeWidth={1.7} />
                <em>{step.output}</em>
              </footer>
            </div>
          </article>
        ))}
      </section>

      <section className="page-grid fit-panel">
        <article>
          <h2>Good fit</h2>
          {goodFit.map((item) => (
            <p key={item}>
              <Check size={13} strokeWidth={1.8} />
              {item}
            </p>
          ))}
        </article>
        <article>
          <h2>Not a fit</h2>
          {notFit.map((item) => (
            <p key={item}>
              <X size={13} strokeWidth={1.8} />
              {item}
            </p>
          ))}
        </article>
        <div className="fit-art" aria-hidden="true">
          <img
            src="/area-art/professional-structure.webp"
            alt=""
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </div>
      </section>

      <section className="page-grid how-we-work-panel">
        <header className="how-we-work-head">
          <h2>How we work</h2>
          <Link href="/contact">
            Start a conversation
            <ArrowRight size={16} strokeWidth={1.7} />
          </Link>
        </header>
        <div>
          {workflow.map(([number, title, body]) => (
            <article key={title}>
              <header>
                <span>{number}</span>
                <h3>{title}</h3>
              </header>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <PageFooter />
    </section>
  );
}
