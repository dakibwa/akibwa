"use client";

import { ArrowRight, HeartPulse, Radio } from "lucide-react";
import { useEffect } from "react";

const icons = {
  chorus: Radio,
  vitals: HeartPulse
};

export function ProjectAppGate({
  appUrl,
  description,
  envHint,
  kind = "chorus",
  name,
  previewHref
}) {
  const Icon = icons[kind] ?? Radio;

  useEffect(() => {
    if (!appUrl) return;
    window.location.replace(appUrl);
  }, [appUrl]);

  if (appUrl) {
    return (
      <section className="project-app-gate" aria-label={`Opening ${name}`}>
        <div className="project-app-gate-mark" aria-hidden="true">
          <Icon size={24} strokeWidth={1.8} />
        </div>
        <h1>Opening {name}.</h1>
        <p>{description}</p>
        <a href={appUrl}>
          Open live app
          <ArrowRight size={17} strokeWidth={1.8} />
        </a>
      </section>
    );
  }

  return (
    <section className="project-app-gate" aria-label={`${name} app`}>
      <div className="project-app-gate-mark" aria-hidden="true">
        <Icon size={24} strokeWidth={1.8} />
      </div>
      <h1>{name} live app not connected yet.</h1>
      <p>Set {envHint} in the website build once the app deployment exists.</p>
      <a href={previewHref}>
        View public preview
        <ArrowRight size={17} strokeWidth={1.8} />
      </a>
    </section>
  );
}
