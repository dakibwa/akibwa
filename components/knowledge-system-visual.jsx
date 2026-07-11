"use client";

import { Fragment, useEffect, useRef, useState } from "react";

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function parseCount(value) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function AnimatedCount({ value }) {
  const target = parseCount(value);
  const ref = useRef(null);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (target == null) return undefined;

    const node = ref.current;
    if (!node || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setDisplay(target);
      return undefined;
    }

    let frameId;
    const duration = Math.min(1800, 800 + Math.log10(Math.max(10, target)) * 220);

    const run = () => {
      const startedAt = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        setDisplay(Math.round(target * easeOutCubic(progress)));
        if (progress < 1) frameId = window.requestAnimationFrame(tick);
      };
      frameId = window.requestAnimationFrame(tick);
    };

    setDisplay(0);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [target]);

  if (target == null) return <span ref={ref}>{value}</span>;
  return <span ref={ref}>{new Intl.NumberFormat("en-GB").format(display)}</span>;
}

export function KnowledgeSystemPipeline({ layers, updatedLabel }) {
  return (
    <div className="knowledge-pipeline">
      <header className="knowledge-pipeline-head">
        <h3>From raw records to durable memory</h3>
        {updatedLabel ? <span>updated {updatedLabel}</span> : null}
      </header>
      <div className="knowledge-pipeline-body">
        <span className="knowledge-pipeline-spine" aria-hidden="true">
          <i />
          <i style={{ "--drop-delay": "1.4s" }} />
          <i style={{ "--drop-delay": "2.8s" }} />
          <i style={{ "--drop-delay": "4.2s" }} />
        </span>
        <ol
          className="knowledge-pipeline-flow"
          aria-label="System layers, from raw evidence to the public projection"
        >
          {layers.map((layer, index) => (
            <Fragment key={layer.name}>
              {layer.isPublic ? (
                <li className="knowledge-pipeline-boundary">
                  <strong>Privacy boundary</strong>
                  <span>Only the public projection crosses this line.</span>
                </li>
              ) : null}
              <li
                className={`knowledge-pipeline-layer ${layer.isPublic ? "is-public" : ""}`}
                style={{
                  "--status-accent": layer.accent,
                  "--layer-delay": `${index * 80}ms`,
                  "--pulse-delay": `${index * 0.7}s`
                }}
              >
                <span className="knowledge-pipeline-node" aria-hidden="true" />
                <div className="knowledge-pipeline-copy">
                  <strong>
                    {layer.name}
                    <em>{layer.status}</em>
                  </strong>
                  <span>{layer.summary}</span>
                </div>
                <span className="knowledge-pipeline-figure">
                  {layer.count != null ? (
                    <>
                      <strong>
                        <AnimatedCount value={layer.count} />
                      </strong>
                      <small>{layer.countLabel}</small>
                    </>
                  ) : (
                    <>
                      <strong className="is-wordmark">akibwa.com</strong>
                      <small>you are here</small>
                    </>
                  )}
                </span>
              </li>
            </Fragment>
          ))}
        </ol>
      </div>
    </div>
  );
}

const cardParticles = [
  { left: "7%", delay: "-5.2s", duration: "7.4s" },
  { left: "14%", delay: "-1.6s", duration: "6.2s", tone: "orange" },
  { left: "22%", delay: "-3.9s", duration: "8.1s" },
  { left: "30%", delay: "-0.8s", duration: "5.6s" },
  { left: "37%", delay: "-6.3s", duration: "7.0s" },
  { left: "45%", delay: "-2.7s", duration: "6.6s", tone: "ink" },
  { left: "53%", delay: "-4.8s", duration: "7.8s" },
  { left: "61%", delay: "-1.2s", duration: "6.0s", tone: "orange" },
  { left: "69%", delay: "-5.7s", duration: "8.4s" },
  { left: "77%", delay: "-3.1s", duration: "6.9s" },
  { left: "85%", delay: "-0.4s", duration: "7.2s", tone: "ink" },
  { left: "92%", delay: "-4.3s", duration: "6.4s" }
];

export function KnowledgeCardArt() {
  return (
    <div className="knowledge-card-art" aria-hidden="true">
      {cardParticles.map((particle, index) => (
        <i
          key={index}
          className={particle.tone ? `is-${particle.tone}` : ""}
          style={{
            left: particle.left,
            "--fall-delay": particle.delay,
            "--fall-duration": particle.duration
          }}
        />
      ))}
      <em className="knowledge-card-boundary" />
      <b className="knowledge-card-fact" />
    </div>
  );
}
