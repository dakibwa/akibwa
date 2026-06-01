import Image from "next/image";
import { ArrowRight, Check, X } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const offerSteps = [
  {
    number: "01",
    title: "Workflow teardown",
    body:
      "We map your current workflow, uncover friction and waste, and identify the highest-leverage opportunities for automation or AI assistance.",
    output: "Clarity report",
    image: "/area-art/work.png"
  },
  {
    number: "02",
    title: "Prototype sprint",
    body:
      "We design and build a focused prototype that solves the core problem fast, validating the approach with real data and real users.",
    output: "Working prototype",
    image: "/area-art/systems.png"
  },
  {
    number: "03",
    title: "Operating system build",
    body:
      "We turn the prototype into a robust, scalable system with documentation, safeguards, and a plan for continuous improvement.",
    output: "Production system",
    image: "/area-art/offer.png"
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
  ["1", "Scope", "We align on goals, map the problem, and define success.", "/area-art/knowledge.png"],
  ["2", "Design", "We design the system, interfaces, and flows.", "/area-art/signals.png"],
  ["3", "Build", "We build, test, and iterate in short, focused cycles.", "/area-art/work.png"],
  ["4", "Handover", "We document, train, and hand over the keys.", "/area-art/contact.png"]
];

export function OfferPage() {
  return (
    <section className="studio-page offer-page">
      <section className="page-grid offer-studio-hero">
        <div>
          <h1>Professional</h1>
          <p>
            Commission a useful system
            <br />
            for a messy workflow.
          </p>
        </div>
        <p>
          I design and build small, AI-assisted systems that bring order to messy
          workflows, turn data into decisions, and make knowledge easy to find
          and reuse.
        </p>
      </section>

      <section className="page-grid offer-step-grid">
        {offerSteps.map((step) => (
          <article className="studio-card offer-step-card" key={step.title}>
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
            <Image src={step.image} alt="" width={700} height={260} sizes="(max-width: 900px) 100vw, 33vw" />
          </article>
        ))}
      </section>

      <section className="page-grid fit-panel">
        <div className="fit-orbit" aria-hidden="true">
          <span />
        </div>
        <article>
          <h2>
            <i />
            Good fit
          </h2>
          {goodFit.map((item) => (
            <p key={item}>
              <Check size={13} strokeWidth={1.8} />
              {item}
            </p>
          ))}
        </article>
        <article>
          <h2>
            <i />
            Not a fit
          </h2>
          {notFit.map((item) => (
            <p key={item}>
              <X size={13} strokeWidth={1.8} />
              {item}
            </p>
          ))}
        </article>
        <div className="fit-map" aria-hidden="true">
          <Image src="/area-art/contact.png" alt="" width={420} height={220} />
        </div>
      </section>

      <section className="page-grid how-we-work-panel">
        <h2>How we work</h2>
        <div>
          {workflow.map(([number, title, body, image], index) => (
            <article key={title}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <Image src={image} alt="" width={120} height={90} />
              {index < workflow.length - 1 && <ArrowRight size={20} strokeWidth={1.4} />}
            </article>
          ))}
        </div>
      </section>

      <PageFooter />
    </section>
  );
}
