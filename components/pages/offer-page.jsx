import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const offerSteps = [
  {
    number: "01",
    title: "Workflow teardown",
    body: "We map how the work actually happens, then find the part worth automating first.",
    output: "A written map",
    art: "/area-art/professional-teardown.webp",
    artPosition: "50% 52%"
  },
  {
    number: "02",
    title: "Prototype sprint",
    body: "One prototype, built fast and tested on your real data by the people who'll use it.",
    output: "Working prototype",
    art: "/area-art/professional-prototype.webp",
    artPosition: "50% 58%"
  },
  {
    number: "03",
    title: "System build",
    body: "The prototype hardens into something documented, safe to run, and yours to keep.",
    output: "Production system",
    art: "/area-art/professional-system.webp",
    artPosition: "52% 54%"
  }
];

const goodFit = [
  "Something that matters still runs on copy-paste.",
  "There's more data or context than one person can hold.",
  "You'd rather fix the process than keep working around it.",
  "You want the whole workflow looked at, not one ticket closed."
];

const notFit = [
  "Off-the-shelf software already does the job.",
  "You need one task done, once.",
  "Nobody has the appetite to change how the work happens.",
  "The manual version is working fine."
];

const workflow = [
  {
    number: "1",
    title: "Scope",
    body: "Agree what finished looks like.",
    art: "/area-art/professional-teardown.webp",
    artPosition: "50% 52%"
  },
  {
    number: "2",
    title: "Design",
    body: "Draw the system before building it.",
    art: "/area-art/professional-prototype.webp",
    artPosition: "50% 58%"
  },
  {
    number: "3",
    title: "Build",
    body: "Short cycles. You see it every week.",
    art: "/area-art/professional-system.webp",
    artPosition: "52% 54%"
  },
  {
    number: "4",
    title: "Handover",
    body: "Documented, demoed, and handed over.",
    art: "/area-art/professional-structure.webp",
    artPosition: "70% 50%"
  }
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
            Most small teams have one workflow quietly eating a day a week. I find it and
            replace it with something that runs itself. Ten years in BI, pointed at your
            actual work.
          </p>
          <Link className="about-cta" href="/contact">
            <span className="about-cta-label">Start with one workflow</span>
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
            Tell me the problem
            <ArrowRight size={16} strokeWidth={1.7} />
          </Link>
        </header>
        <div>
          {workflow.map(({ number, title, body, art, artPosition }) => (
            <article
              key={title}
              style={{
                "--workflow-art": `url("${art}")`,
                "--workflow-art-position": artPosition
              }}
            >
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
