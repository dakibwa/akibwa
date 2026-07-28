import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const examples = [
  ["Work you do by hand", "Copying, checking, updating, chasing. The bits that quietly eat the week."],
  ["Spreadsheets and reports", "Fix them, simplify them, or replace them with something that just runs."],
  ["Tools and websites", "Build one from scratch, or fix the one you already have."],
  ["Not sure what you need", "Tell me what's annoying. I'll tell you straight whether I can help."]
];

export function OfferPage() {
  return (
    <section className="studio-page offer-page">
      <section className="page-grid offer-studio-hero">
        <div className="offer-hero-title">
          <h1>Professional</h1>
          <p>
            If it can be done on a computer,
            <br />
            I can help you do it.
          </p>
        </div>
        <div className="offer-hero-aside">
          <p>
            Whatever it is. We work out what you're actually trying to do, I build the
            thing that does it, and you're left able to run it yourself.
          </p>
          <Link className="about-cta" href="/contact">
            <span className="about-cta-label">Tell me what&apos;s annoying you</span>
            <span className="about-cta-icon" aria-hidden="true">
              <ArrowRight size={17} strokeWidth={2} />
            </span>
          </Link>
        </div>
      </section>

      <section className="page-grid contact-notes" aria-label="What that looks like">
        <header>
          <span>What that looks like</span>
          <h2>Start anywhere. One sentence is enough.</h2>
        </header>
        <ul>
          {examples.map(([title, body]) => (
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

      <PageFooter />
    </section>
  );
}
